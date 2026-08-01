/* store.js — 轻量本地存储 + 日期工具
   所有数据按日期归档，统一以 localStorage 持久化。 */
(function () {
  window.App = window.App || {};
  const App = window.App;

  const PREFIX = "stella:";
  App.PREFIX = PREFIX;

  /* ---------- 存储原语 ---------- */
  const raw = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(PREFIX + key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch (e) {}
    },
    remove(key) { localStorage.removeItem(PREFIX + key); }
  };
  App.raw = raw;

  /* ---------- 集合：以日期为键的对象集合 ---------- */
  // collection 形如 { "2026-07-28": [...] }
  const store = {
    // 读取某日期下的记录数组
    getDay(collection, dateKey) {
      const all = raw.get(collection, {});
      return Array.isArray(all[dateKey]) ? all[dateKey] : [];
    },
    // 写入某日期下的记录数组
    setDay(collection, dateKey, arr) {
      const all = raw.get(collection, {});
      all[dateKey] = arr;
      raw.set(collection, all);
      return arr;
    },
    // 读取整个集合对象
    getAll(collection) { return raw.get(collection, {}); },
    setAll(collection, obj) { raw.set(collection, obj); return obj; },
    // 在指定日期追加一条（带 id）
    add(collection, dateKey, item) {
      const arr = store.getDay(collection, dateKey);
      item.id = item.id || ("id" + Date.now() + Math.floor(Math.random() * 999));
      item.createdAt = Date.now();
      arr.push(item);
      store.setDay(collection, dateKey, arr);
      return item;
    },
    update(collection, dateKey, id, patch) {
      const arr = store.getDay(collection, dateKey);
      const i = arr.findIndex(x => x.id === id);
      if (i >= 0) { arr[i] = Object.assign({}, arr[i], patch); store.setDay(collection, dateKey, arr); }
      return arr[i];
    },
    remove(collection, dateKey, id) {
      let arr = store.getDay(collection, dateKey);
      arr = arr.filter(x => x.id !== id);
      store.setDay(collection, dateKey, arr);
      return arr;
    },
    // 在「全量数组」型集合里增删改（非按日期分组，如卡项、歌手收藏）
    listGet(collection) { return raw.get(collection, []); },
    listSet(collection, arr) { raw.set(collection, arr); return arr; },
    listAdd(collection, item) {
      const arr = raw.get(collection, []);
      item.id = item.id || ("id" + Date.now() + Math.floor(Math.random() * 999));
      arr.push(item); raw.set(collection, arr); return item;
    },
    listUpdate(collection, id, patch) {
      const arr = raw.get(collection, []);
      const i = arr.findIndex(x => x.id === id);
      if (i >= 0) { arr[i] = Object.assign({}, arr[i], patch); raw.set(collection, arr); }
      return arr[i];
    },
    listRemove(collection, id) {
      let arr = raw.get(collection, []);
      arr = arr.filter(x => x.id !== id);
      raw.set(collection, arr); return arr;
    },
    // 单值型（如计划文本、设置）
    val(collection, fallback) { return raw.get(collection, fallback); },
    setVal(collection, v) { raw.set(collection, v); }
  };
  App.store = store;

  /* ---------- 日期工具 ---------- */
  const D = {
    // Date -> "YYYY-MM-DD"
    key(d) {
      d = d instanceof Date ? d : new Date(d);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    },
    // "YYYY-MM-DD" -> Date (本地正午，避免时区偏移)
    parse(s) {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    },
    today() { return D.key(new Date()); },
    addDays(s, n) {
      const d = D.parse(s); d.setDate(d.getDate() + n); return D.key(d);
    },
    diffDays(a, b) { // a-b 天数
      return Math.round((D.parse(a) - D.parse(b)) / 86400000);
    },
    // 某月天数
    daysInMonth(y, m) { return new Date(y, m, 0).getDate(); },
    weekday(s) { return D.parse(s).getDay(); }, // 0=日
    // 周一为一周起始，返回该周周一日期
    mondayOf(s) {
      const d = D.parse(s); const w = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - w); return D.key(d);
    },
    // 返回该月所有日期键（含上下月补位）
    monthMatrix(y, m) {
      const first = new Date(y, m - 1, 1);
      const startW = (first.getDay() + 6) % 7; // 周一为首列
      const gridStart = new Date(y, m - 1, 1 - startW);
      const cells = [];
      for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart); d.setDate(gridStart.getDate() + i);
        cells.push(D.key(d));
      }
      return cells;
    },
    // 该月第一天的 "YYYY-MM"
    monthLabel(y, m) { return `${y} 年 ${m} 月`; },
    // 友好显示
    pretty(s) {
      const d = D.parse(s);
      const wk = ["周日","周一","周二","周三","周四","周五","周六"][d.getDay()];
      return `${d.getMonth() + 1}月${d.getDate()}日 ${wk}`;
    },
    // 中文月日
    md(s) { const d = D.parse(s); return `${d.getMonth()+1}/${d.getDate()}`; }
  };
  App.date = D;

  /* ---------- 主题 ---------- */
  App.theme = {
    get() { return raw.get("theme", "light"); },
    set(t) { raw.set("theme", t); document.body.classList.toggle("theme-dark", t === "dark"); },
    toggle() { const n = App.theme.get() === "dark" ? "light" : "dark"; App.theme.set(n); return n; }
  };

  /* ---------- 数据自动覆盖（行车记录仪模式） ---------- */
  function purgeDateObject(key, cutoff) {
    const obj = raw.get(key, {}); let changed = false;
    Object.keys(obj).forEach(k => { if (k < cutoff) { delete obj[k]; changed = true; } });
    if (changed) raw.set(key, obj);
  }
  function purgeDateCollection(key, cutoff) { purgeDateObject(key, cutoff); }
  function purgePrefixedDateKeys(prefix, cutoff) {
    const all = { ...localStorage };
    Object.keys(all).forEach(k => {
      if (!k.startsWith(PREFIX + prefix)) return;
      const datePart = k.slice((PREFIX + prefix).length);
      if (datePart < cutoff) localStorage.removeItem(k);
    });
  }
  function purgeListByDate(key, cutoff, dateFn) {
    const arr = raw.get(key, []); const keep = arr.filter(r => (dateFn(r) || "") >= cutoff);
    if (keep.length !== arr.length) raw.set(key, keep);
  }
  function purgeHappy(cutoff) {
    // happy:YYYY-MM-DD
    purgePrefixedDateKeys("happy:", cutoff);
    const ck = raw.get("happy_ck", {}); let ckChanged = false;
    Object.keys(ck).forEach(k => { if (k < cutoff) { delete ck[k]; ckChanged = true; } });
    if (ckChanged) raw.set("happy_ck", ck);
    const hist = raw.get("happy_hist", []);
    const keep = hist.filter(r => (r.date || "") >= cutoff);
    if (keep.length !== hist.length) raw.set("happy_hist", keep);
  }
  App.retention = {
    run() {
      const today = D.today();
      try {
        if (raw.get("_retention_last_run") === today) return;
        const m1 = D.addDays(today, -30);
        const y1 = D.addDays(today, -365);
        // 1 个月
        purgeDateObject("weight", m1);
        purgeDateCollection("exercise", m1);
        purgePrefixedDateKeys("checkins:", m1);
        // 1 年
        purgeDateObject("events", y1);
        ["eng_listen", "eng_read", "eng_speak", "eng_write"].forEach(k => purgeDateCollection(k, y1));
        purgeHappy(y1);
        purgeListByDate("game", y1, r => r.date);
        purgeListByDate("period", y1, r => r.date);
        purgeListByDate("medical_plan", y1, r => r.planDate);
        // 早睡记录：仅保留近 3 个自然月
        const td = D.parse(today); const sy = td.getFullYear(), sm = td.getMonth() + 1;
        const sleepCut = D.key(new Date(sy, sm - 1 - 2, 1));
        purgePrefixedDateKeys("sleep:", sleepCut);
        raw.set("_retention_last_run", today);
      } catch (e) {}
    }
  };
})();
