/* pages/fitness.js — 健身日记：体重追踪(斤·双线) / 运动记录 / 卡项管理 / 技能掌握 */
(function () {
  window.App = window.App || {};
  window.Pages = window.Pages || {};
  const App = window.App, D = App.date, S = App.store;

  const CARD_TYPES = ["次卡", "通卡", "购物卡", "充值卡"];
  const DEFAULT_SKILL_TAGS = ["生活技能", "运动技能", "学习技能", "旅游技能"];
  const DEFAULT_EX_TYPES = ["跳舞", "撸铁"];
  const DEFAULT_CARD_TAGS = ["舞蹈室", "健身房"];

  /* 体重存储：weight 日期 -> { bed:斤|null, morning:斤|null } */
  function wAll() { return S.val("weight", {}); }
  function wGet(k) { return wAll()[k] || { bed: null, morning: null }; }

  Pages.fitness = function (root) {
    root.innerHTML = `
      <div class="stack page-pad">
        <!-- 体重追踪 -->
        <div class="card">
          <h3 class="section-title">⚖️ 体重追踪 <span class="tag" id="wt-view-tag">周视图</span></h3>
          <div class="row" style="margin-bottom:14px;align-items:flex-end;justify-content:flex-end">
            <div class="cal-nav">
              <button class="chip active" data-wtview="week">周</button>
              <button class="chip" data-wtview="month">月</button>
            </div>
          </div>
          <div class="row" style="margin-bottom:14px;align-items:flex-end">
            <div class="grow" style="max-width:160px">
              <label class="field">🌅 晨起空腹 (斤)</label>
              <input class="input" type="number" step="0.1" id="wt-morning" placeholder="如 107.2">
            </div>
            <div class="grow" style="max-width:160px">
              <label class="field">🌙 睡前 (斤)</label>
              <input class="input" type="number" step="0.1" id="wt-bed" placeholder="如 108.5">
            </div>
            <div><button class="btn primary" id="wt-save">记录体重</button></div>
          </div>
          <div class="chart-wrap" id="wt-chart"></div>
        </div>

        <!-- 运动记录 -->
        <div class="card">
          <h3 class="section-title">
            <span id="ex-title">🏃 运动记录</span>
            <span class="spacer"></span>
            <button class="btn sm primary" id="ex-add">＋ 添加记录</button>
          </h3>
          <div class="tagwrap" id="ex-tags" style="margin:6px 0 12px"></div>
          <div id="ex-timeline" class="tl-scroll"></div>
        </div>

        <!-- 卡项管理 -->
        <div class="card">
          <h3 class="section-title">🎫 健身卡项管理
            <span class="spacer"></span>
            <button class="btn sm primary" id="card-add">＋ 添加卡项</button>
          </h3>
          <div class="tagwrap" id="card-tags" style="margin:6px 0 12px"></div>
          <div id="card-list" class="tl-scroll"></div>
        </div>

        <!-- 技能掌握 -->
        <div class="card">
          <h3 class="section-title">🎓 技能掌握
            <span class="spacer"></span>
            <button class="btn sm primary" id="skill-add">＋ 添加技能</button>
          </h3>
          <div class="tagwrap" id="skill-tags" style="margin:6px 0 12px"></div>
          <div id="skill-list" class="tl-scroll"></div>
        </div>
      </div>`;

    /* ---------- 体重 ---------- */
    let wtView = "week";

    function cleanupWeight() {
      const all = wAll();
      const cutoff = D.addDays(D.today(), -30);
      let changed = false;
      Object.keys(all).forEach(k => { if (k < cutoff) { delete all[k]; changed = true; } });
      if (changed) S.setVal("weight", all);
    }
    function renderWeight() {
      cleanupWeight();
      const base = D.today();
      const all = wAll();
      const morn = [], bed = [];
      if (wtView === "month") {
        const cutoff = D.addDays(base, -30);
        Object.keys(all).filter(k => k >= cutoff).sort().forEach(k => {
          const w = all[k];
          if (w.morning != null) morn.push({ label: D.md(k), value: w.morning });
          if (w.bed != null) bed.push({ label: D.md(k), value: w.bed });
        });
      } else {
        const mon = D.mondayOf(base);
        for (let i = 0; i < 7; i++) { const k = D.addDays(mon, i); const w = all[k];
          if (w && w.morning != null) morn.push({ label: D.md(k), value: w.morning });
          if (w && w.bed != null) bed.push({ label: D.md(k), value: w.bed });
        }
      }
      App.multiLineChart(root.querySelector("#wt-chart"), [
        { name: "🌅 晨起空腹", color: "#4f8fd1", data: morn },
        { name: "🌙 睡前", color: "#d96a9c", data: bed }
      ], { unit: "斤" });
      root.querySelector("#wt-view-tag").textContent = wtView === "month" ? "月视图" : "周视图";
    }
    root.querySelector("#wt-save").onclick = () => {
      const mk = parseFloat(root.querySelector("#wt-morning").value);
      const bk = parseFloat(root.querySelector("#wt-bed").value);
      if (isNaN(mk) && isNaN(bk)) { App.toast("请至少填写一项体重", "⚠️"); return; }
      const all = wAll(); const dk = D.today(); const cur = wGet(dk);
      cur.morning = isNaN(mk) ? cur.morning : mk;
      cur.bed = isNaN(bk) ? cur.bed : bk;
      if (cur.morning == null && cur.bed == null) { App.toast("记录失败，请重试", "⚠️"); return; }
      all[dk] = cur; S.setVal("weight", all);
      root.querySelector("#wt-morning").value = ""; root.querySelector("#wt-bed").value = "";
      renderWeight(); App.toast("体重已记录 ⚖️", "⚖️");
    };
    root.querySelectorAll("[data-wtview]").forEach(b => b.onclick = () => {
      wtView = b.dataset.wtview;
      root.querySelectorAll("[data-wtview]").forEach(x => x.classList.toggle("active", x === b));
      renderWeight();
    });
    renderWeight();

    /* ---------- 通用标签渲染 ---------- */
    function renderTagWrap(container, tags, activeTag, opts = {}) {
      const box = typeof container === 'string' ? root.querySelector(container) : container;
      if (!box) return;
      let html = tags.map(t => {
        const isActive = t === activeTag;
        return `<span class="chip ${isActive ? 'active' : ''}" data-tag="${escapeHtml(t)}" title="${opts.title || ''}">
          ${escapeHtml(t)}${opts.editable ? `<button class="tag-x" data-deltag="${escapeHtml(t)}" title="删除">×</button>` : ""}
        </span>`;
      }).join("");
      if (opts.showAdd) html += `<span class="chip add-tag" data-addtag="1">＋ 新建</span>`;
      if (opts.all) html = `<span class="chip ${!activeTag ? 'active' : ''}" data-tag="">全部</span>` + html;
      box.innerHTML = html;
    }
    function bindTagWrap(elId, state, renderFn) {
      const box = root.querySelector(elId);
      box.onclick = (e) => {
        const tagEl = e.target.closest("[data-tag]");
        if (tagEl) { state.active = tagEl.dataset.tag || ""; renderFn(); }
      };
    }

    /* ---------- 运动记录（按月覆盖） ---------- */
    const curMonth = D.today().slice(0, 7);
    const savedMonth = S.val("exercise_month", "");
    if (savedMonth !== curMonth) {
      S.setVal("exercise_month", curMonth);
      S.setVal("exercise_types", []);
      S.setVal("exercise_records", []);
    }
    const exState = {
      month: curMonth,
      tags: S.val("exercise_types", DEFAULT_EX_TYPES.slice()),
      records: S.val("exercise_records", []),
      active: ""
    };
    if (!exState.tags.length) exState.tags = DEFAULT_EX_TYPES.slice();
    function exSave() {
      S.setVal("exercise_types", exState.tags);
      S.setVal("exercise_records", exState.records);
    }
    function exFiltered() {
      const tag = exState.active;
      return exState.records
        .filter(r => !tag || r.type === tag)
        .sort((a, b) => b.date.localeCompare(a.date) || ((b.at || 0) - (a.at || 0)));
    }

    // 联动：运动类型 -> 关联卡项分类
    const EX_LINK = { "跳舞": "舞蹈室", "撸铁": "健身房" };
    function linkedCards(type) { return cardState.list.filter(c => c.tag === EX_LINK[type]); }
    function applyCardUse(cardId, count) {
      const c = cardState.list.find(x => x.id === cardId); if (!c || !count) return;
      if (c.type === "次卡") {
        let base = c.remain;
        if (base == null) base = c.total || 0;
        c.remain = Math.max(0, base - count);
      } else if (c.type === "通卡") {
        c.used = (c.used || 0) + count;
      }
      S.listUpdate("gym_cards", c.id, c);
    }

    function renderEx() {
      root.querySelector("#ex-title").innerHTML = `🏃 ${exState.month.replace("-", "年")}月 运动记录`;
      renderTagWrap("#ex-tags", exState.tags, exState.active, { title: "切换查看", all: true });
      const list = exFiltered();
      const box = root.querySelector("#ex-timeline");
      if (!list.length) { box.innerHTML = `<div class="empty">还没有运动记录，点右上角「＋ 添加记录」开始吧～</div>`; return; }
      const groups = {};
      list.forEach(r => { groups[r.date] = groups[r.date] || []; groups[r.date].push(r); });
      const dates = Object.keys(groups).sort().reverse();
      const WK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      box.innerHTML = dates.map(dk => `
        <div class="news-node">
          <div class="news-date"><span class="news-dot"></span><b>${dk}</b> <span class="muted" style="font-size:12px">${WK[D.parse(dk).getDay()]}</span></div>
          <div style="margin-top:8px">
            ${groups[dk].map(r => `
              <div class="item" style="padding:9px 11px;margin-bottom:7px">
                <span class="chip active" style="pointer-events:none">${escapeHtml(r.type)}</span>
                <div class="grow">
                  <div class="title">${r.dur != null ? (r.dur + " 小时") : "记录"}${r.cardName ? ` · ${escapeHtml(r.cardName)}${r.useCount ? " ×"+r.useCount : ""}` : ""}</div>
                  ${r.note ? `<div class="meta">${escapeHtml(r.note)}</div>` : ""}
                </div>
                <button class="btn sm icon danger" data-exdel="${r.id}">🗑️</button>
              </div>`).join("")}
          </div>
        </div>`).join("");
    }
    bindTagWrap("#ex-tags", exState, renderEx);
    root.querySelector("#ex-timeline").onclick = (e) => {
      const del = e.target.closest("[data-exdel]");
      if (del) {
        exState.records = exState.records.filter(r => r.id !== del.dataset.exdel);
        exSave(); renderEx(); App.toast("已删除", "🗑️");
      }
    };
    root.querySelector("#ex-add").onclick = () => {
      if (!exState.tags.length) {
        App.modal.open("＋ 新建运动类型", `
          <label class="field">运动类型名称</label>
          <input class="input" name="nt" placeholder="如：瑜伽、游泳、撸铁">`, {
          okText: "添加", cancel: false,
          onOk(m) {
            const v = (m.querySelector('[name="nt"]').value || "").trim();
            if (!v) { App.toast("请填写名称", "⚠️"); return false; }
            if (exState.tags.includes(v)) { App.toast("该类型已存在", "ℹ️"); return false; }
            exState.tags.push(v); exState.active = v; exSave(); renderEx();
            setTimeout(() => openExAdd(v), 220);
          }
        });
        return;
      }
      openExAdd(exState.active || exState.tags[0]);
    };
    function openExAdd(type) {
      const isLink = EX_LINK.hasOwnProperty(type);
      const cards = isLink ? linkedCards(type) : [];
      App.modal.open("＋ 添加运动记录", `
        <label class="field">运动类型</label>
        <div class="tagwrap" id="ex-modal-tags" style="margin-bottom:10px"></div>
        <div class="row">
          <div class="grow" style="max-width:160px"><label class="field">时长 (小时)</label><input class="input" type="number" step="0.1" name="dur" placeholder="如 1.5"></div>
          <div class="grow"><label class="field">备注</label><input class="input" name="note" placeholder="强度、感受…"></div>
        </div>
        <div id="ex-link-wrap" style="${isLink && cards.length ? '' : 'display:none'}">
          <div class="row" style="margin-top:10px">
            <div class="grow">
              <label class="field">关联卡项</label>
              <select class="input" name="cardId" id="ex-card-id">
                <option value="">不关联</option>
                ${cards.map(c => `<option value="${c.id}">${escapeHtml(c.name)} · ${escapeHtml(c.type)}</option>`).join("")}
              </select>
            </div>
            <div style="max-width:120px">
              <label class="field">今日使用次数</label>
              <input class="input" type="number" name="useCount" value="1" min="1">
            </div>
          </div>
        </div>
        <div id="ex-link-hint" class="muted" style="font-size:12px;margin-top:8px;${isLink && !cards.length ? '' : 'display:none'}">暂无对应分类「${escapeHtml(EX_LINK[type]||"")}」的卡项，先去「健身卡项管理」添加吧～</div>
      `, {
        okText: "添加", cancel: false,
        onOpen(m) {
          let selType = type;
          const tagBox = m.querySelector("#ex-modal-tags");
          function renderModalTags() {
            renderTagWrap(tagBox, exState.tags, selType, { editable: true, showAdd: true });
          }
          renderModalTags();
          tagBox.onclick = (e) => {
            const add = e.target.closest("[data-addtag]");
            const del = e.target.closest("[data-deltag]");
            const tagEl = e.target.closest("[data-tag]");
            if (add) {
              App.modal.open("＋ 新建运动类型", `<label class="field">运动类型名称</label><input class="input" name="nt" placeholder="如：骑行">`, {
                okText: "添加", cancel: false,
                onOk(m2) {
                  const v = (m2.querySelector('[name="nt"]').value || "").trim();
                  if (!v) { App.toast("请填写名称", "⚠️"); return false; }
                  if (exState.tags.includes(v)) { App.toast("该类型已存在", "ℹ️"); return false; }
                  exState.tags.push(v); exState.active = v; exSave(); renderEx();
                  selType = v;
                  App.modal.close();
                  setTimeout(() => openExAdd(v), 220);
                }
              });
              return;
            }
            if (del) {
              const t = del.dataset.deltag;
              const hasRec = exState.records.some(r => r.type === t);
              const doDel = () => {
                exState.tags = exState.tags.filter(x => x !== t);
                if (selType === t) selType = exState.tags[0] || "";
                exSave(); renderEx(); renderModalTags();
                App.toast("已删除标签：" + t, "🗑️");
              };
              if (hasRec) App.confirm("该标签下已有记录，删除会同时清空相关记录，是否继续？", doDel);
              else doDel();
              return;
            }
            if (tagEl) {
              selType = tagEl.dataset.tag;
              renderModalTags();
              const link = EX_LINK.hasOwnProperty(selType);
              const cs = link ? linkedCards(selType) : [];
              const wrap = m.querySelector("#ex-link-wrap");
              const hint = m.querySelector("#ex-link-hint");
              if (link && cs.length) {
                wrap.style.display = "";
                const sel = m.querySelector("#ex-card-id");
                sel.innerHTML = `<option value="">不关联</option>` + cs.map(c => `<option value="${c.id}">${escapeHtml(c.name)} · ${escapeHtml(c.type)}</option>`).join("");
                hint.style.display = "none";
              } else {
                wrap.style.display = "none";
                hint.style.display = link && !cs.length ? "" : "none";
                hint.textContent = link ? `暂无对应分类「${EX_LINK[selType]}」的卡项，先去「健身卡项管理」添加吧～` : "";
              }
            }
          };
          m.dataset.selType = selType;
        },
        onOk(m) {
          const selType = m.querySelector('#ex-modal-tags .chip.active[data-tag]')?.dataset.tag || m.dataset.selType || exState.tags[0];
          const v = App.formVals(m);
          const dur = parseFloat(v.dur);
          if (isNaN(dur) || dur <= 0) { App.toast("请填写有效时长（小时，需大于 0）", "⚠️"); return false; }
          const cardId = (v.cardId || "").trim();
          const useCount = Math.max(0, parseInt(v.useCount, 10) || 0);
          const card = cardId ? cardState.list.find(x => x.id === cardId) : null;
          let emptyCardName = "";
          if (card) {
            applyCardUse(card.id, useCount);
            const updated = cardState.list.find(x => x.id === card.id);
            if (updated && updated.type === "次卡" && updated.remain === 0) emptyCardName = updated.name;
          }
          exState.records.push({
            id: "ex" + Date.now() + Math.random().toString(36).slice(2,5),
            date: D.today(), type: selType, dur, note: v.note.trim(), at: Date.now(),
            cardId: card ? card.id : "", cardName: card ? card.name : "", useCount: card ? useCount : 0
          });
          exState.active = selType;
          exSave(); renderCards(); renderEx();
          App.toast("已记录 " + selType + (card ? " · 卡项已更新" : ""), "🏃");
          if (emptyCardName) setTimeout(() => App.toast(`「${emptyCardName}」已用完，可以删除该卡项`, "🎫"), 400);
        }
      });
    }

    /* ---------- 卡项管理 ---------- */
    function initCardTags() {
      const saved = S.val("gym_card_tags", null);
      // 强制默认标签顺序：舞蹈室在前、健身房在后，自定义标签保留在后面
      const customs = (saved || []).filter(t => !DEFAULT_CARD_TAGS.includes(t));
      const merged = DEFAULT_CARD_TAGS.slice().concat(customs);
      if (JSON.stringify(saved) !== JSON.stringify(merged)) S.setVal("gym_card_tags", merged);
      return merged;
    }
    const cardState = {
      tags: initCardTags(),
      active: "",
      list: S.listGet("gym_cards")
    };
    function cardSave() { S.setVal("gym_card_tags", cardState.tags); }
    function cardFiltered() {
      const tag = cardState.active;
      return cardState.list.filter(c => !tag || c.tag === tag)
        .sort((a, b) => a.expire.localeCompare(b.expire));
    }
    function cardDays(c) {
      if (c.type !== "通卡" || !c.openDate || !c.expire) return 0;
      return Math.max(0, D.diffDays(c.expire, c.openDate));
    }
    function repairCards() {
      // 数据健康检查：次卡 remain 为空则同步为 total；通卡 used 为空则置 0
      let changed = false;
      cardState.list.forEach(c => {
        if (c.type === "次卡" && c.remain == null && c.total != null) { c.remain = c.total; changed = true; }
        if (c.type === "通卡" && c.used == null) { c.used = 0; changed = true; }
      });
      if (changed) S.listSet("gym_cards", cardState.list);
    }
    function renderCards() {
      renderTagWrap("#card-tags", cardState.tags, cardState.active, { all: true, title: "切换查看分类" });
      const arr = cardFiltered();
      const today = D.today();
      root.querySelector("#card-list").innerHTML = arr.length ? arr.map(c => {
        const left = D.diffDays(c.expire, today);
        let badge = "";
        if (left < 0) badge = `<span class="badge danger">已过期</span>`;
        else if (left <= 7) badge = `<span class="badge warn">${left} 天后到期</span>`;
        let sub = "";
        if (c.type === "次卡") {
          const remain = c.remain != null ? c.remain : (c.total || 0);
          sub = `<div class="meta">总次数 ${c.total || 0} · 剩余 ${remain} 次
            <button class="btn sm" data-creset="${c.id}" style="margin-left:8px">↺ 重置剩余次数</button></div>`;
        } else if (c.type === "通卡") {
          const days = cardDays(c);
          sub = `<div class="meta">总天数 ${days} 天 · 已用 ${c.used || 0} 次
            <button class="btn sm" data-creset="${c.id}" style="margin-left:8px">↺ 重置已用次数</button></div>`;
        } else {
          sub = `<div class="meta">${c.type} · 余额 ¥${c.remain != null ? c.remain : 0}</div>`;
        }
        return `<div class="item">
          <div class="grow">
            <div class="title">${escapeHtml(c.name)} ${badge}</div>
            <div class="meta">${escapeHtml(c.tag)} · ${c.type}${c.type !== "购物卡" && c.type !== "充值卡" ? " · 到期 " + c.expire : ""}${c.openDate && c.type === "通卡" ? " · 开卡 " + c.openDate : ""}${c.cost != null ? " · 花费 ¥" + c.cost : ""}</div>
            ${sub}
          </div>
          <button class="btn sm icon" data-cedit="${c.id}">✏️</button>
          <button class="btn sm icon danger" data-cdel="${c.id}">🗑️</button>
        </div>`;
      }).join("") : `<div class="empty">还没有卡项，点右上角「＋ 添加卡项」管理你的健身卡吧</div>`;
    }
    bindTagWrap("#card-tags", cardState, renderCards);
    root.querySelector("#card-list").onclick = (e) => {
      const ed = e.target.closest("[data-cedit]"), dl = e.target.closest("[data-cdel]"), rs = e.target.closest("[data-creset]");
      if (ed) editCard(ed.dataset.cedit);
      if (dl) App.confirm("确定删除该卡项？", () => { S.listRemove("gym_cards", dl.dataset.cdel); cardState.list = S.listGet("gym_cards"); renderCards(); App.toast("已删除", "🗑️"); });
      if (rs) {
        const c = cardState.list.find(x => x.id === rs.dataset.creset);
        if (!c) return;
        const label = c.type === "次卡" ? "剩余次数" : "已用次数";
        App.modal.open(`↺ 重置 ${c.name} ${label}`, `
          <input class="input" type="number" name="newCount" value="0" min="0" placeholder="输入 ${label}" style="text-align:center;font-size:18px;margin-top:6px">
        `, {
          okText: "保存", cancel: false,
          onOk(m) {
            const n = Math.max(0, parseInt(m.querySelector('[name="newCount"]').value, 10) || 0);
            if (c.type === "次卡") c.remain = n;
            else if (c.type === "通卡") c.used = n;
            S.listUpdate("gym_cards", c.id, c);
            renderCards(); App.toast(`${label}已设为 ${n}`, "↺");
          }
        });
      }
    };
    root.querySelector("#card-add").onclick = () => {
      if (!cardState.tags.length) {
        App.modal.open("＋ 新建卡项分类", `<label class="field">分类名称</label><input class="input" name="nt" placeholder="如：舞蹈室">`, {
          okText: "添加", cancel: false,
          onOk(m) {
            const v = (m.querySelector('[name="nt"]').value || "").trim();
            if (!v) { App.toast("请填写名称", "⚠️"); return false; }
            if (cardState.tags.includes(v)) { App.toast("该分类已存在", "ℹ️"); return false; }
            cardState.tags.push(v); cardState.active = v; cardSave(); renderCards();
            setTimeout(() => editCard(null, v), 220);
          }
        });
        return;
      }
      editCard(null, cardState.active || cardState.tags[0]);
    };
    function editCard(id, defaultTag) {
      const arr = S.listGet("gym_cards");
      const c = id ? arr.find(x => x.id === id) : { name:"", tag: defaultTag || cardState.tags[0] || "", type:"通卡", openDate:D.today(), expire:"", total:0, remain:0, used:0, cost:"" };
      // 兼容旧数据
      if (id && c.type === "次卡" && c.total == null && c.remain != null) c.total = c.remain;
      if (id && c.type === "次卡" && c.remain == null && c.total != null) c.remain = c.total;
      const isMoney = c.type === "购物卡" || c.type === "充值卡";
      const isCount = c.type === "次卡";
      const isPass = c.type === "通卡";
      App.modal.open(id ? "✏️ 编辑卡项" : "＋ 添加卡项", `
        <label class="field">卡项分类</label>
        <div class="tagwrap" id="card-modal-tags" style="margin-bottom:10px"></div>
        <label class="field">卡项名称</label>
        <input class="input" name="name" value="${escapeHtml(c.name)}" placeholder="如：年卡 / 10次卡">
        <div class="row">
          <div class="grow"><label class="field">卡类型</label>
            <select class="input" name="type" id="ct-type">${CARD_TYPES.map(t=>`<option ${t===c.type?'selected':''}>${t}</option>`).join("")}</select></div>
          <div class="grow" id="open-wrap" style="${isPass?'':'display:none'}"><label class="field">开卡时间</label>
            <input class="input" type="date" name="openDate" value="${c.openDate||D.today()}"></div>
          <div class="grow" id="expire-wrap" style="${!isMoney?'':'display:none'}"><label class="field">到期时间</label>
            <input class="input" type="date" name="expire" value="${c.expire||D.today()}"></div>
        </div>
        <div class="row">
          <div class="grow" id="total-wrap" style="${isCount?'':'display:none'}"><label class="field">总次数</label>
            <input class="input" type="number" name="total" value="${c.total??''}" placeholder="如 10"></div>
          <div class="grow" id="remain-wrap" style="${isMoney?'':'display:none'}"><label class="field">剩余金额</label>
            <input class="input" type="number" name="remain" value="${c.remain??''}" placeholder="如 300"></div>
          <div class="grow" id="cost-wrap" style="${isCount || isPass?'':'display:none'}"><label class="field">花费金额 (¥)</label>
            <input class="input" type="number" name="cost" value="${c.cost??''}" placeholder="如 1999"></div>
        </div>
      `, {
        okText: id ? "保存" : "添加",
        cancel: false,
        onOpen(m) {
          let selTag = c.tag;
          const tagBox = m.querySelector("#card-modal-tags");
          function renderModalTags() {
            renderTagWrap(tagBox, cardState.tags, selTag, { editable: true, showAdd: true });
          }
          renderModalTags();
          tagBox.onclick = (e) => {
            const add = e.target.closest("[data-addtag]");
            const del = e.target.closest("[data-deltag]");
            const tagEl = e.target.closest("[data-tag]");
            if (add) {
              App.modal.open("＋ 新建卡项分类", `<label class="field">分类名称</label><input class="input" name="nt" placeholder="如：瑜伽馆">`, {
                okText: "添加", cancel: false,
                onOk(m2) {
                  const v = (m2.querySelector('[name="nt"]').value || "").trim();
                  if (!v) { App.toast("请填写名称", "⚠️"); return false; }
                  if (cardState.tags.includes(v)) { App.toast("该分类已存在", "ℹ️"); return false; }
                  cardState.tags.push(v); cardState.active = v; cardSave(); renderCards();
                  App.modal.close();
                  setTimeout(() => editCard(id, v), 220);
                }
              });
              return;
            }
            if (del) {
              const t = del.dataset.deltag;
              const hasItem = cardState.list.some(x => x.tag === t);
              const doDel = () => {
                cardState.tags = cardState.tags.filter(x => x !== t);
                if (selTag === t) selTag = cardState.tags[0] || "";
                cardSave(); renderCards(); renderModalTags();
                App.toast("已删除分类：" + t, "🗑️");
              };
              if (hasItem) App.confirm("该分类下已有卡项，删除会同时清空相关卡项，是否继续？", doDel);
              else doDel();
              return;
            }
            if (tagEl) { selTag = tagEl.dataset.tag; renderModalTags(); }
          };
          m.dataset.selTag = selTag;
          const typeSel = m.querySelector("#ct-type");
          typeSel.onchange = () => {
            const t = typeSel.value;
            const money = t === "购物卡" || t === "充值卡";
            const count = t === "次卡";
            const pass = t === "通卡";
            m.querySelector("#open-wrap").style.display = pass ? "" : "none";
            m.querySelector("#expire-wrap").style.display = money ? "none" : "";
            m.querySelector("#total-wrap").style.display = count ? "" : "none";
            m.querySelector("#remain-wrap").style.display = money ? "" : "none";
            m.querySelector("#cost-wrap").style.display = count || pass ? "" : "none";
          };
        },
        onOk(m) {
          const v = App.formVals(m);
          const selTag = m.querySelector('#card-modal-tags .chip.active[data-tag]')?.dataset.tag || m.dataset.selTag || cardState.tags[0];
          if (!v.name.trim()) { App.toast("请填写卡项名称", "⚠️"); return false; }
          const t = v.type;
          let total = null, remain = null, used = null, cost = null, openDate = "", expire = "";
          if (t === "次卡") {
            total = parseInt(m.querySelector('[name="total"]').value, 10) || 0;
            cost = parseFloat(m.querySelector('[name="cost"]').value) || 0;
            expire = v.expire || D.today();
          } else if (t === "通卡") {
            openDate = v.openDate || D.today();
            expire = v.expire || D.today();
            used = 0;
            cost = parseFloat(m.querySelector('[name="cost"]').value) || 0;
          } else {
            remain = parseFloat(m.querySelector('[name="remain"]').value) || 0;
          }
          const rec = { name: v.name.trim(), tag: selTag, type: t, openDate, expire, total, remain, used, cost };
          if (id) {
            const old = arr.find(x => x.id === id);
            if (old) {
              // 类型未变：次卡保留剩余次数，通卡保留已用次数；类型改变：次卡按 total 初始化 remain，通卡 used=0
              if (t === old.type && t === "次卡") rec.remain = old.remain != null ? old.remain : total;
              else if (t === "次卡") rec.remain = total;
              if (t === old.type && t === "通卡") rec.used = old.used || 0;
            }
            S.listUpdate("gym_cards", id, rec);
          } else {
            // 新建次卡：remain 初始等于 total
            if (t === "次卡") rec.remain = total;
            S.listAdd("gym_cards", rec);
          }
          cardState.active = selTag; cardState.list = S.listGet("gym_cards");
          renderCards(); App.toast(id ? "已更新" : "已添加卡项", "🎫");
        }
      });
    }

    /* ---------- 技能掌握（1–5 星） ---------- */
    const skillState = {
      tags: S.val("skill_tags", DEFAULT_SKILL_TAGS.slice()),
      active: "",
      list: S.listGet("skill_master")
    };
    function skillSave() { S.setVal("skill_tags", skillState.tags); }
    function skillFiltered() {
      const tag = skillState.active;
      return skillState.list.filter(s => !tag || s.cat === tag);
    }
    function starCount(s) {
      let m = s.stars || s.maturity || 0;
      if (m > 5) m = Math.ceil(m / 20);
      return Math.max(1, Math.min(5, m || 1));
    }
    function starHTML(n) { return "★".repeat(n) + "☆".repeat(5 - n); }
    function renderSkills() {
      renderTagWrap("#skill-tags", skillState.tags, skillState.active, { all: true, title: "切换查看分类" });
      const arr = skillFiltered();
      const box = root.querySelector("#skill-list");
      if (!arr.length) { box.innerHTML = `<div class="empty">还没有技能记录，点右上角「＋ 添加技能」开始积累你的能力树 🌱</div>`; return; }
      box.innerHTML = arr.map(s => {
        const n = starCount(s);
        return `<div class="item">
          <div class="grow">
            <div class="title">${escapeHtml(s.name)} <span class="chip" style="pointer-events:none;font-size:11px;padding:3px 9px">${escapeHtml(s.cat||"未分类")}</span></div>
            <div class="stars" style="margin-top:6px;font-size:16px;letter-spacing:2px;color:var(--gold)">${starHTML(n)}</div>
            ${s.note ? `<div class="meta" style="margin-top:4px">${escapeHtml(s.note)}</div>` : ""}
          </div>
          <button class="btn sm" data-supdate="${s.id}" title="更新星级">🔄 更新</button>
          <button class="btn sm icon" data-sedit="${s.id}" title="编辑">✏️</button>
          <button class="btn sm icon danger" data-sdel="${s.id}" title="删除">🗑️</button>
        </div>`;
      }).join("");
    }
    bindTagWrap("#skill-tags", skillState, renderSkills);
    root.querySelector("#skill-list").onclick = (e) => {
      const up = e.target.closest("[data-supdate]");
      const ed = e.target.closest("[data-sedit]");
      const dl = e.target.closest("[data-sdel]");
      if (up) updateSkill(up.dataset.supdate);
      if (ed) editSkill(ed.dataset.sedit);
      if (dl) App.confirm("确定删除该技能？", () => { S.listRemove("skill_master", dl.dataset.sdel); skillState.list = S.listGet("skill_master"); renderSkills(); App.toast("已删除", "🗑️"); });
    };
    root.querySelector("#skill-add").onclick = () => {
      if (!skillState.tags.length) {
        App.modal.open("＋ 新建技能分类", `<label class="field">分类名称</label><input class="input" name="nt" placeholder="如：工作技能">`, {
          okText: "添加", cancel: false,
          onOk(m) {
            const v = (m.querySelector('[name="nt"]').value || "").trim();
            if (!v) { App.toast("请填写名称", "⚠️"); return false; }
            if (skillState.tags.includes(v)) { App.toast("该分类已存在", "ℹ️"); return false; }
            skillState.tags.push(v); skillState.active = v; skillSave(); renderSkills();
            setTimeout(() => editSkill(null, v), 220);
          }
        });
        return;
      }
      editSkill(null, skillState.active || skillState.tags[0]);
    };
    function starPicker(val) {
      let html = `<div class="star-picker" id="star-pick" style="display:flex;gap:8px;font-size:26px;color:var(--line);cursor:pointer;margin:6px 0 10px">`;
      for (let i = 1; i <= 5; i++) html += `<span data-n="${i}" style="${i<=val?'color:var(--gold)':''}">★</span>`;
      html += `</div><input type="hidden" name="stars" value="${val}">`;
      return html;
    }
    function bindStarPicker(modal) {
      const wrap = modal.querySelector("#star-pick");
      const input = modal.querySelector('[name="stars"]');
      const update = (n) => { input.value = n; wrap.querySelectorAll("span").forEach(s => s.style.color = parseInt(s.dataset.n) <= n ? "var(--gold)" : "var(--line)"); };
      wrap.querySelectorAll("span").forEach(s => s.onclick = () => update(parseInt(s.dataset.n)));
    }
    function editSkill(id, defaultTag) {
      const arr = S.listGet("skill_master");
      const s = id ? arr.find(x => x.id === id) : { name:"", cat: defaultTag || skillState.tags[0] || "", stars:1, note:"" };
      const val = starCount(s);
      App.modal.open(id ? "✏️ 编辑技能" : "＋ 添加技能", `
        <label class="field">技能分类</label>
        <div class="tagwrap" id="skill-modal-tags" style="margin-bottom:10px"></div>
        <label class="field">技能名称</label>
        <input class="input" name="name" value="${escapeHtml(s.name)}" placeholder="如：游泳、做手账、日语五十音">
        <label class="field">掌握程度（点击星星选择 1–5 星）</label>
        ${starPicker(val)}
        <label class="field">备注（可选）</label>
        <input class="input" name="note" value="${escapeHtml(s.note||"")}" placeholder="小技巧、心得…">
      `, {
        okText: id ? "保存" : "添加",
        cancel: false,
        onOpen(m) {
          let selTag = s.cat;
          const tagBox = m.querySelector("#skill-modal-tags");
          function renderModalTags() {
            renderTagWrap(tagBox, skillState.tags, selTag, { editable: true, showAdd: true });
          }
          renderModalTags();
          tagBox.onclick = (e) => {
            const add = e.target.closest("[data-addtag]");
            const del = e.target.closest("[data-deltag]");
            const tagEl = e.target.closest("[data-tag]");
            if (add) {
              App.modal.open("＋ 新建技能分类", `<label class="field">分类名称</label><input class="input" name="nt" placeholder="如：工作技能">`, {
                okText: "添加", cancel: false,
                onOk(m2) {
                  const v = (m2.querySelector('[name="nt"]').value || "").trim();
                  if (!v) { App.toast("请填写名称", "⚠️"); return false; }
                  if (skillState.tags.includes(v)) { App.toast("该分类已存在", "ℹ️"); return false; }
                  skillState.tags.push(v); skillState.active = v; skillSave(); renderSkills();
                  App.modal.close();
                  setTimeout(() => editSkill(id, v), 220);
                }
              });
              return;
            }
            if (del) {
              const t = del.dataset.deltag;
              const hasItem = skillState.list.some(x => x.cat === t);
              const doDel = () => {
                skillState.tags = skillState.tags.filter(x => x !== t);
                if (selTag === t) selTag = skillState.tags[0] || "";
                skillSave(); renderSkills(); renderModalTags();
                App.toast("已删除分类：" + t, "🗑️");
              };
              if (hasItem) App.confirm("该分类下已有技能，删除会同时清空相关技能，是否继续？", doDel);
              else doDel();
              return;
            }
            if (tagEl) { selTag = tagEl.dataset.tag; renderModalTags(); }
          };
          m.dataset.selTag = selTag;
          bindStarPicker(m);
        },
        onOk(m) {
          const v = App.formVals(m);
          const selTag = m.querySelector('#skill-modal-tags .chip.active[data-tag]')?.dataset.tag || m.dataset.selTag || skillState.tags[0];
          if (!v.name.trim()) { App.toast("请填写技能名称", "⚠️"); return false; }
          const stars = Math.max(1, Math.min(5, parseInt(v.stars)||1));
          const rec = { name: v.name.trim(), cat: selTag, stars, note: v.note.trim() };
          if (id) S.listUpdate("skill_master", id, rec); else S.listAdd("skill_master", rec);
          skillState.active = selTag; skillState.list = S.listGet("skill_master");
          renderSkills(); App.toast(id ? "已更新" : "已添加技能", "🎓");
        }
      });
    }
    function updateSkill(id) {
      const arr = S.listGet("skill_master");
      const s = arr.find(x => x.id === id); if (!s) return;
      const val = starCount(s);
      App.modal.open("🔄 更新星级 · " + s.name, `
        <label class="field">当前掌握程度</label>
        ${starPicker(val)}
      `, {
        okText: "更新", cancel: false,
        onOpen(m) { bindStarPicker(m); },
        onOk(m) {
          const stars = Math.max(1, Math.min(5, parseInt(m.querySelector('[name="stars"]').value)||1));
          s.stars = stars; delete s.maturity;
          S.listUpdate("skill_master", id, s); skillState.list = S.listGet("skill_master"); renderSkills(); App.toast("星级已更新", "🔄");
        }
      });
    }

    repairCards();
    renderEx();
    renderCards();
    renderSkills();
  };

  function escapeHtml(s){return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}
})();
