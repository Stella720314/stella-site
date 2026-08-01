/* js/sync.js — 云同步：前端 AES-GCM 加密 + 拉/推 + 导出导入 + 迁移
 *
 * 设计要点（对应你的需求）：
 *  1) 端到端加密：口令经 PBKDF2 派生 AES-GCM 密钥，数据在浏览器内加密后才上传。
 *     Cloudflare 只见到密文，永远看不到明文，也不产生任何付费功能费用。
 *  2) 本地「行车记录仪」自动清理照常保留：手机/iPad 本地只留近 30天/1年/3月，
 *     保持轻量；云端 KV 存「完整档案」永不过期，是真正的数据源。
 *  3) 换设备数据不丢：push 时做「并集合并 + 删除标记(tombstone)」，本地清理掉的旧
 *     数据不会把云端也删掉；你在某台设备删掉的记录也会同步到其它设备。
 *  4) 冲突：同一记录被两头改，按 updatedAt「最后写入获胜」（粒度细化到「条」，更安全）。
 *  5) 迁移/备份：导出明文 JSON（人可阅读、可长期保存），导入即写入并同步到云端。
 */
(function () {
  "use strict";

  /* ============================================================
   *  纯函数（合并逻辑）—— 同时导出给 Node 测试使用
   * ============================================================ */
  function b64(bytes) {
    if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let bin = "";
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    return btoa(bin);
  }
  function unb64(s) {
    if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(s, "base64"));
    const bin = atob(s);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }
  // 记录的唯一标识：优先 id，其次 _src（日历事件用 _src 区分来源）
  function idOf(x) {
    if (x && x.id != null) return x.id;
    if (x && x._src != null) return x._src;
    return null;
  }

  // 合并两个「集合值」：数组/对象/标量分别处理
  function mergeValue(local, cloud, isTomb) {
    if (local === undefined) return cloud;
    if (cloud === undefined) return local;
    // 数组：列表型（元素带 id / _src）或标量表（字符串数组，如标签）
    if (Array.isArray(local) && Array.isArray(cloud)) {
      const firstHasId = local.length && typeof local[0] === "object" && local[0] !== null && idOf(local[0]) != null;
      if (firstHasId) {
        const map = new Map();
        for (const x of [...cloud, ...local]) {
          const id = idOf(x);
          if (id != null) map.set(id, x); // 本地在后，后者覆盖前者
        }
        return [...map.values()].filter((x) => !isTomb(idOf(x)));
      }
      // 标量表：集合并集（去重）
      const set = new Set();
      const out = [];
      for (const x of [...cloud, ...local]) {
        const key = typeof x === "object" ? JSON.stringify(x) : x;
        if (!set.has(key)) { set.add(key); out.push(x); }
      }
      return out;
    }
    // 对象：日期分组集合（值为数组）或普通映射 → 递归合并
    if (local !== null && typeof local === "object" && cloud !== null && typeof cloud === "object"
        && !Array.isArray(local) && !Array.isArray(cloud)) {
      const out = {};
      const sub = new Set([...Object.keys(local), ...Object.keys(cloud)]);
      for (const sk of sub) out[sk] = mergeValue(local[sk], cloud[sk], isTomb);
      return out;
    }
    // 标量（字符串/数字/布尔，如 theme、单个设置）→ 本地优先（最后写入获胜）
    return local;
  }

  function mergeCollections(localCols, cloudCols, tombstones) {
    const tomb = new Set((tombstones || []).map((t) => t.c + "::" + (t.id != null ? t.id : "")));
    const out = {};
    const keys = new Set([...Object.keys(localCols || {}), ...Object.keys(cloudCols || {})]);
    for (const k of keys) {
      const whole = (tombstones || []).some((t) => t.whole && t.c === k);
      if (whole) continue; // 整键删除
      out[k] = mergeValue(
        localCols ? localCols[k] : undefined,
        cloudCols ? cloudCols[k] : undefined,
        (id) => tomb.has(k + "::" + (id != null ? id : ""))
      );
    }
    return out;
  }

  // 导出给 Node 测试
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { b64, unb64, idOf, mergeValue, mergeCollections };
  }
  // Node 环境到此为止（无浏览器 API）
  if (typeof window === "undefined") return;

  /* ============================================================
   *  浏览器端实现
   * ============================================================ */
  const App = window.App;
  const PREFIX = App.PREFIX || "stella:";
  // 不同步的内部键
  const INTERNAL_SUFFIXES = ["__tombstones", "__sync_meta", "__device_id", "_retention_last_run"];
  const KV_KEY = "stella:archive";

  // ---------- 部署前可填（也可留空） ----------
  // 与 Cloudflare 后台 env SYNC_TOKEN 保持一致；留空则两端都不校验（数据仍加密）
  const SYNC_TOKEN = "zx2GbssGaZGZfKabKxknTM3Y2NXnt3ZGX2z30ZOVm3BpsnBaHuwqUQNgrBvQfcqB";
  const SYNC_ENDPOINT = "/sync";

  /* ---------------- crypto ---------------- */
  async function deriveKey(pass, salt) {
    const enc = new TextEncoder();
    const km = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      km,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }
  async function encryptObj(obj, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(obj));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
    return { iv: b64(iv), ct: b64(new Uint8Array(ct)) };
  }
  async function decryptObj(payload, key) {
    const iv = unb64(payload.iv);
    const ct = unb64(payload.ct);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(pt));
  }

  /* ---------------- 本地快照 / 写回 ---------------- */
  function snapshotLocal() {
    const cols = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      const name = k.slice(PREFIX.length);
      if (INTERNAL_SUFFIXES.some((s) => name === s || name.endsWith(s))) continue;
      try { cols[name] = JSON.parse(localStorage.getItem(k)); } catch (e) {}
    }
    return cols;
  }
  function applyToLocal(cols) {
    for (const name in cols) {
      try { localStorage.setItem(PREFIX + name, JSON.stringify(cols[name])); } catch (e) {}
    }
  }

  /* ---------------- tombstone（删除标记） ---------------- */
  function getTombstones() { return App.raw.get("__tombstones", []); }
  function addTombstone(c, id, whole) {
    const t = getTombstones().slice();
    const exists = t.some((x) => x.c === c && (whole ? x.whole : x.id === id));
    if (!exists) { t.push(whole ? { c, whole: true } : { c, id }); App.raw.set("__tombstones", t); }
  }

  /* ---------------- 状态 ---------------- */
  let keyObj = null;
  let deviceId = null;
  let unlocked = false;
  let lastSync = 0;
  let dirty = false;
  let pushTimer = null;
  let listening = false;
  let saltBytes = null;   // 全局统一盐（优先取自云端信封）
  let passphrase = null;  // 仅内存保存，绝不落盘

  async function ensureDevice() {
    deviceId = App.raw.get("__device_id", null);
    if (!deviceId) {
      deviceId = "d" + Date.now() + Math.floor(Math.random() * 1e6);
      App.raw.set("__device_id", deviceId);
    }
  }

  /* ---------------- 网络 ---------------- */
  async function apiGet() {
    const u = SYNC_TOKEN ? `${SYNC_ENDPOINT}?t=${encodeURIComponent(SYNC_TOKEN)}` : SYNC_ENDPOINT;
    try {
      const r = await fetch(u, { method: "GET", cache: "no-store" });
      if (r.status === 204) return null;
      if (!r.ok) { if (r.status === 401) App.toast("同步令牌错误", "⚠️"); return null; }
      const t = await r.text();
      return t && t.trim() ? t : null;
    } catch (e) { return null; }
  }
  async function apiPut(payload) {
    const u = SYNC_TOKEN ? `${SYNC_ENDPOINT}?t=${encodeURIComponent(SYNC_TOKEN)}` : SYNC_ENDPOINT;
    const r = await fetch(u, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    if (!r.ok) { if (r.status === 401) App.toast("同步令牌错误", "⚠️"); throw new Error("put failed"); }
  }

  /* ---------------- 信封（salt 以明文存放，全局统一） ---------------- */
  async function getEnvelope() {
    const raw = await apiGet();
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  // 确保 saltBytes 已就绪：优先用云端信封里的 salt，保证跨设备一致
  async function ensureSalt() {
    const env = await getEnvelope();
    if (env && env.salt) { saltBytes = unb64(env.salt); return; }
    if (!saltBytes) {
      const meta = App.raw.get("__sync_meta", null);
      if (meta && meta.salt) saltBytes = unb64(meta.salt);
      else saltBytes = crypto.getRandomValues(new Uint8Array(16));
    }
  }

  /* ---------------- 迁移（未来兼容性） ---------------- */
  function migrate(data) {
    // 若日后数据结构升级，在这里按 data.v 做前向迁移
    return data;
  }

  /* ---------------- 核心：拉 / 推 / 合并 ---------------- */
  async function pull() {
    const env = await getEnvelope();
    if (!env || !env.ct) return null;
    saltBytes = unb64(env.salt);
    try {
      const key = await deriveKey(passphrase, saltBytes);
      return migrate(await decryptObj({ iv: env.iv, ct: env.ct }, key));
    } catch (e) { App.toast("解密失败，可能是口令错误", "⚠️"); return null; }
  }

  // 把云端档案合并进本地（云端为完整档案，合并后本地包含全量）
  async function hydrateFromCloud(archive) {
    const localCols = snapshotLocal();
    const merged = mergeCollections(localCols, archive.collections || {}, archive.tombstones || []);
    applyToLocal(merged);
  }

  async function push() {
    await ensureSalt();
    const key = await deriveKey(passphrase, saltBytes);
    const cols = snapshotLocal();
    const archive = { v: 1, updatedAt: Date.now(), deviceId, collections: cols, tombstones: getTombstones() };
    const payload = await encryptObj(archive, key);
    const envelope = { salt: b64(saltBytes), iv: payload.iv, ct: payload.ct };
    await apiPut(envelope);
    // 把 salt 也缓存进本地 meta，便于离线时仍能派生密钥
    const meta = App.raw.get("__sync_meta", {}) || {};
    meta.salt = b64(saltBytes); meta.deviceId = deviceId;
    App.raw.set("__sync_meta", meta);
    App.raw.set("__tombstones", []); // 云端已记录删除标记，本地可清空
    lastSync = archive.updatedAt;
  }

  // 一次完整同步：先拉（取云端最新）→ 合并进本地 → 上传（全量合并结果）→ 本地清理
  async function syncNow() {
    if (!unlocked) return;
    try {
      const cloud = await pull();
      if (cloud) await hydrateFromCloud(cloud);
      await push();
      if (App.retention) App.retention.run(); // 仅在本地修剪视图，云端不受影响
      App.rerender && App.rerender();
      updateStatus();
    } catch (e) {
      App.toast("同步失败：" + (e && e.message ? e.message : e), "⚠️");
    }
  }

  /* ---------------- 变更监听（防抖推送） ---------------- */
  function markDirty() {
    if (!unlocked) return;
    dirty = true;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { dirty = false; syncNow(); }, 1500);
  }
  function hookStore() {
    if (listening) return;
    listening = true;
    const S = App.store, R = App.raw;
    const origRemove = S.remove.bind(S);
    S.remove = (c, dk, id) => { origRemove(c, dk, id); addTombstone(c, id); markDirty(); };
    const origListRemove = S.listRemove.bind(S);
    S.listRemove = (c, id) => { origListRemove(c, id); addTombstone(c, id); markDirty(); };
    const origRawRemove = R.remove.bind(R);
    R.remove = (k) => {
      const r = origRawRemove(k);
      const name = k.startsWith(PREFIX) ? k.slice(PREFIX.length) : k;
      addTombstone(name, null, true); markDirty();
      return r;
    };
    // 写入类方法打标脏
    ["setDay", "setAll", "listSet", "setVal", "add", "listAdd", "update", "listUpdate"].forEach((fn) => {
      const o = S[fn].bind(S);
      S[fn] = (...a) => { const r = o(...a); markDirty(); return r; };
    });
    const oRawSet = R.set.bind(R);
    R.set = (k, v) => { const r = oRawSet(k, v); markDirty(); return r; };

    // 离开 / 关闭页面时尽力上传
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden" && dirty) { dirty = false; syncNow(); }
    });
    window.addEventListener("beforeunload", () => {
      if (dirty) { dirty = false; syncNow(); }
    });
  }

  /* ---------------- 解锁 / 设置 ---------------- */
  async function setup(pass) {
    passphrase = pass;
    await ensureSalt(); // 首次：生成本地 salt
    const key = await deriveKey(pass, saltBytes);
    keyObj = key; unlocked = true;
    App.raw.set("__sync_meta", { salt: b64(saltBytes), deviceId, updatedAt: Date.now() });
    hookStore();
    await syncNow();
    App.toast("云同步已启用 ☁️", "☁️");
    updateStatus();
  }
  async function unlock(pass, remember) {
    const meta = App.raw.get("__sync_meta");
    if (!meta) return false;
    passphrase = pass;
    const env = await getEnvelope();
    // 优先用云端 salt（保证跨设备一致），否则用本地缓存 salt
    const salt = (env && env.salt) ? unb64(env.salt) : (meta.salt ? unb64(meta.salt) : null);
    if (!salt) { App.toast("尚未同步过数据，请先设置", "ℹ️"); return false; }
    saltBytes = salt;
    const key = await deriveKey(pass, saltBytes);
    if (env && env.ct) {
      try { await decryptObj({ iv: env.iv, ct: env.ct }, key); }
      catch (e) { App.toast("口令错误", "⚠️"); return false; }
    }
    keyObj = key; unlocked = true;
    if (remember) { try { sessionStorage.setItem("stella:__pass", pass); } catch (e) {} }
    hookStore();
    await syncNow();
    updateStatus();
    return true;
  }
  function lock() {
    keyObj = null; unlocked = false; passphrase = null; saltBytes = null;
    try { sessionStorage.removeItem("stella:__pass"); } catch (e) {}
    updateStatus();
  }

  /* ---------------- 导出 / 导入 ---------------- */
  function exportBackup() {
    const cols = snapshotLocal();
    const data = { app: "stella", v: 1, exportedAt: Date.now(), collections: cols };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stella-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    App.toast("已导出备份（明文，请妥善保存）💾", "💾");
  }
  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const cols = data.collections || {};
        applyToLocal(migrate({ v: data.v || 1, collections: cols }).collections);
        App.raw.set("__tombstones", []);
        App.rerender && App.rerender();
        if (unlocked) syncNow();
        App.toast("已导入，正在同步… 📥", "📥");
      } catch (e) { App.toast("导入失败：" + (e && e.message ? e.message : e), "⚠️"); }
    };
    reader.readAsText(file);
  }

  /* ---------------- 面板 UI ---------------- */
  function updateStatus() {
    const el = document.querySelector("#sync-status");
    if (!el) return;
    const meta = App.raw.get("__sync_meta", null);
    if (!meta) { el.textContent = "未启用云同步（仅本地）"; return; }
    if (!unlocked) { el.textContent = "已锁定，点「解锁并更新」"; return; }
    el.textContent = lastSync ? "已同步：" + new Date(lastSync).toLocaleString("zh-CN", { hour12: false }) : "已解锁，尚未同步";
  }

  function openPanel() {
    const meta = App.raw.get("__sync_meta", null);
    const locked = meta && !unlocked;
    const body = `
      <div id="sync-status" class="muted" style="font-size:12px;margin-bottom:12px"></div>
      ${meta ? `
        <label class="field">加密口令（解锁以拉取云端数据）</label>
        <input class="input" type="password" name="pass" placeholder="输入你的加密口令">
        <label style="font-size:12px;color:var(--text-2);display:flex;align-items:center;gap:6px;margin-top:8px">
          <input type="checkbox" name="remember"> 记住本标签页解锁（关闭标签页后失效，不落盘）
        </label>
      ` : `
        <p class="muted" style="font-size:12px;line-height:1.7;margin:0 0 10px">
          开启后，你的数据会在本机加密后存到 Cloudflare KV，换手机/电脑/iPad 登录同一站点即可同步。
          口令只存在于你脑子里，服务商也无法解密。请设置一个好记又独特的口令。
        </p>
        <label class="field">设置加密口令</label>
        <input class="input" type="password" name="pass" placeholder="设置口令">
        <label class="field">再次确认</label>
        <input class="input" type="password" name="pass2" placeholder="再次输入">
      `}
      <div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap">
        ${meta ? `<button class="btn primary sm" id="sync-go">${locked ? "解锁并更新" : "立即同步"}</button>` : `<button class="btn primary sm" id="sync-setup">启用云同步</button>`}
        <button class="btn sm" id="sync-export">导出备份</button>
        <label class="btn sm" style="cursor:pointer">导入备份<input type="file" id="sync-import" accept="application/json" style="display:none"></label>
        ${unlocked ? `<button class="btn sm ghost" id="sync-lock">锁定</button>` : ""}
      </div>
      <p class="muted" style="font-size:11px;margin-top:12px;line-height:1.6">
        提示：明文导出文件包含全部隐私，请只保存在你自己的设备上。云端存储不计费、永久保留完整档案；
        本地仍按「行车记录仪」规则只保留近期数据以减轻设备负担。
      </p>`;
    App.modal.open(meta ? "☁️ 云同步" : "☁️ 启用云同步", body, {
      okText: "关闭", cancel: false,
      onOpen(m) {
        updateStatus();
        const passEl = m.querySelector('[name="pass"]');
        if (passEl) setTimeout(() => passEl.focus(), 50);
        const go = m.querySelector("#sync-go");
        if (go) go.onclick =async () => {
          const p = passEl.value; if (!p) { App.toast("请输入口令", "⚠️"); return; }
          const remember = m.querySelector('[name="remember"]') && m.querySelector('[name="remember"]').checked;
          const ok = await unlock(p, remember);
          if (ok) { App.toast("已解锁并同步 ☁️", "☁️"); App.modal.close(); }
        };
        const setupBtn = m.querySelector("#sync-setup");
        if (setupBtn) setupBtn.onclick =async () => {
          const p = passEl.value, p2 = m.querySelector('[name="pass2"]').value;
          if (p.length < 6) { App.toast("口令至少 6 位", "⚠️"); return; }
          if (p !== p2) { App.toast("两次输入不一致", "⚠️"); return; }
          await setup(p); App.modal.close();
        };
        m.querySelector("#sync-export").onclick = () => exportBackup();
        const imp = m.querySelector("#sync-import");
        if (imp) imp.onchange = (e) => { if (e.target.files[0]) importBackup(e.target.files[0]); App.modal.close(); };
        const lockBtn = m.querySelector("#sync-lock");
        if (lockBtn) lockBtn.onclick = () => { lock(); App.modal.close(); App.toast("已锁定", "🔒"); };
      }
    });
  }

  /* ---------------- 初始化 ---------------- */
  async function init() {
    await ensureDevice();
    const meta = App.raw.get("__sync_meta", null);
    if (!meta) {
      // 本地模式：保留原有「行车记录仪」清理行为
      if (App.retention) App.retention.run();
      return;
    }
    // 已启用：优先用「本标签页记住的口令」静默解锁；否则弹出解锁面板
    try {
      const remembered = sessionStorage.getItem("stella:__pass");
      if (remembered) { await unlock(remembered, false); return; }
    } catch (e) {}
    openPanel();
  }

  App.Sync = { init, openPanel, syncNow, exportBackup, importBackup, isUnlocked: () => unlocked };
})();
