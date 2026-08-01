/* calendar.js — 可复用日历：月/周视图、重要安排编辑、节气/节假日标记 */
(function () {
  window.App = window.App || {};
  const App = window.App;
  const D = App.date;
  const META = App.calendarMeta;

  // 可选表情（装饰当日安排），不选则统一用 ★ 五角星
  const EMOJIS = ["⭐","🎯","💡","❤️","💕","💍","🥂","🎂","🎉","🌹","🌸","💼","🏥","✈️","🍰","🌟","🏊","🤿","👠","🏄","🥾","🎾","🚄","🚗","🚢"];

  function eventsAll() { return App.raw.get("events", {}); }
  function eventGet(k) { return eventsAll()[k] || null; }

  function buildEvent(items) {
    const valid = items.filter(i => i.text && i.text.trim());
    if (valid.length === 0) return null;
    return { text: valid.map(i => i.text).join("\n"), emoji: valid[0].emoji || "", items: valid };
  }

  function eventSet(k, v) {
    const a = eventsAll();
    const ev = a[k];
    let items = [];
    if (ev) {
      if (Array.isArray(ev.items)) items = ev.items.slice();
      else if (ev.text && ev.text.trim()) items.push({ text: ev.text, emoji: ev.emoji, _src: ev._src || "manual" });
    }
    if (!v) { delete a[k]; App.raw.set("events", a); return; }
    if (v.items && Array.isArray(v.items)) {
      const src = v._src || "manual";
      items = items.filter(i => i._src !== src).concat(v.items.filter(i => i.text && i.text.trim()));
    } else {
      const src = v._src || "manual";
      const newItem = { text: v.text, emoji: v.emoji, _src: src };
      const idx = items.findIndex(i => i._src === src);
      if (newItem.text && newItem.text.trim()) {
        if (idx >= 0) items[idx] = newItem; else items.push(newItem);
      } else if (idx >= 0) {
        items.splice(idx, 1);
      }
    }
    const built = buildEvent(items);
    if (built) a[k] = built; else delete a[k];
    App.raw.set("events", a);
  }

  function eventRemoveSrc(k, src) {
    const a = eventsAll(); const ev = a[k]; if (!ev) return;
    if (Array.isArray(ev.items)) {
      const filtered = ev.items.filter(i => i._src !== src && (src !== "manual" || i._src));
      if (filtered.length === 0) delete a[k];
      else { ev.items = filtered; ev.text = filtered.map(i => i.text).join("\n"); ev.emoji = filtered[0].emoji || ""; }
    } else if (ev._src === src || (!ev._src && src === "manual")) {
      delete a[k];
    }
    App.raw.set("events", a);
  }

  // 当某日没有手动安排时，自动把未来就医计划整理进详情
  function medicalEventFor(dateKey) {
    if (!App.store) return null;
    const plans = App.store.listGet("medical_plan") || [];
    const p = plans.find(x => x.planDate === dateKey && !x.done);
    if (!p) return null;
    return {
      text: `就医：${p.dept}${p.hospital ? " · " + p.hospital : ""}${p.note ? "\n" + p.note : ""}`,
      emoji: "🏥"
    };
  }

  /* ---------- 事件编辑弹窗（单一保存键 · 星标 + 可选表情） ---------- */
  function editEvent(dateKey, after) {
    let ev = eventGet(dateKey) || { text: "", emoji: "", items: [] };
    if (ev && !ev.items && ev.text) ev = { text: ev.text, emoji: ev.emoji, items: [{ text: ev.text, emoji: ev.emoji, _src: ev._src || "manual" }] };
    const items = ev.items || [];
    const manualItem = items.find(i => i._src === "manual" || !i._src) || { text: "", emoji: "" };
    const medItem = items.find(i => i._src === "medical");
    const annItems = items.filter(i => i._src === "anniversary");
    const fallbackMed = !medItem && items.length === 0 ? medicalEventFor(dateKey) : null;
    const hasText = !!manualItem.text;
    App.modal.open(`📅 ${D.pretty(dateKey)}`, `
      <div id="ev-meta" class="row" style="margin-bottom:12px;align-items:center;flex-wrap:wrap;gap:6px">
        <div class="grow" id="ev-meta-txt"></div>
        ${hasText ? `<button class="btn sm icon danger" id="ev-del" title="删除当日安排">🗑️</button>` : ""}
      </div>
      <label class="field">当日重要安排</label>
      <textarea class="textarea" name="text" placeholder="写写今天要紧的事、约会、待办…（支持多行）" style="min-height:120px">${escapeHtml(manualItem.text)}</textarea>
      <div class="tagwrap" id="ev-emojis">
        <span class="chip ${!manualItem.emoji ? 'active' : ''}" data-emoji="">★ 默认</span>
        ${EMOJIS.map(e => `<span class="chip ${manualItem.emoji === e ? 'active' : ''}" data-emoji="${e}">${e}</span>`).join("")}
      </div>
    `, {
      okText: "保存安排", cancel: false,
      onOpen(modal) {
        const metaTxt = modal.querySelector("#ev-meta-txt");
        const h = META.holiday(dateKey), t = META.term(dateKey);
        let html = "";
        if (h) html += `<span class="badge ${h.type === 'makeup' ? 'danger' : 'ok'}">${h.type === 'makeup' ? '调休上班 · ' + h.name : '节假日 · ' + h.name}</span> `;
        if (t) html += `<span class="badge" style="color:var(--lav-deep)">节气 · ${t}</span>`;
        if (medItem) html += `<span class="badge" style="background:rgba(111,176,230,.18);color:var(--blue-deep);border-color:rgba(79,143,209,.35)">🏥 ${escapeHtml(medItem.text.split("\n")[0])}</span> `;
        annItems.forEach(a => {
          html += `<span class="badge" style="background:rgba(243,169,140,.18);color:#c76d4a;border-color:rgba(243,169,140,.4)">${a.emoji || "💖"} ${escapeHtml(a.text.split("\n")[0])}</span> `;
        });
        if (fallbackMed) html += `<span class="badge" style="background:rgba(111,176,230,.18);color:var(--blue-deep);border-color:rgba(79,143,209,.35)">🏥 ${escapeHtml(fallbackMed.text.split("\n")[0])}</span> `;
        metaTxt.innerHTML = html || "";
        modal.querySelectorAll("#ev-emojis .chip").forEach(s => s.onclick = () => {
          modal.querySelectorAll("#ev-emojis .chip").forEach(x => x.classList.remove("active"));
          s.classList.add("active"); s.dataset.picked = "1";
        });
        const delBtn = modal.querySelector("#ev-del");
        if (delBtn) delBtn.onclick = () => {
          eventRemoveSrc(dateKey, "manual"); App.modal.close(); App.toast("已删除当日安排", "🗑️"); after && after();
        };
      },
      onOk(modal) {
        const text = modal.querySelector('[name="text"]').value;
        const picked = modal.querySelector('#ev-emojis .chip[data-picked="1"]');
        const emoji = picked ? picked.dataset.emoji : manualItem.emoji;
        if (text.trim()) eventSet(dateKey, { text, emoji: emoji || null, _src: "manual" });
        else eventRemoveSrc(dateKey, "manual");
        App.toast(text.trim() ? "已保存当日安排" : "已清空当日安排", text.trim() ? "📌" : "🗑️");
        after && after();
      }
    });
  }

  /* ---------- 渲染 ---------- */
  function render(container, opts = {}) {
    opts = Object.assign({ view: "month", date: D.today(), onSelect: editEvent }, opts);
    const state = {
      view: opts.view,
      cursor: opts.date,           // 当前基准日期
      container
    };

    function draw() {
      const [y, m] = state.cursor.split("-").map(Number);
      const today = D.today();
      const evs = eventsAll();

      let html = "";
      // 头部
      html += `<div class="cal-head">
        <div class="month">
          ${state.view === "month" ? `${y} 年 ${m} 月` : `本周 · ${D.md(D.mondayOf(state.cursor))} ~ ${D.md(D.addDays(D.mondayOf(state.cursor),6))}`}
        </div>
        <div class="row" style="gap:8px">
          <div class="cal-nav">
            <button class="btn sm" data-nav="-1">‹</button>
            <button class="btn sm" data-today="1">今天</button>
            <button class="btn sm" data-nav="1">›</button>
          </div>
          <div class="cal-nav">
            <button class="chip ${state.view==='week'?'active':''}" data-view="week">周</button>
            <button class="chip ${state.view==='month'?'active':''}" data-view="month">月</button>
          </div>
        </div>
      </div>`;

      if (state.view === "month") {
        const dows = ["一","二","三","四","五","六","日"];
        html += `<div class="cal-grid">`;
        dows.forEach(d => html += `<div class="cal-dow">${d}</div>`);
        const cells = D.monthMatrix(y, m);
        cells.forEach(ck => {
          const cd = D.parse(ck);
          const out = cd.getMonth() + 1 !== m;
          const isToday = ck === today;
          const ev = evs[ck];
          const items = ev && Array.isArray(ev.items) ? ev.items : (ev && ev.text ? [ev] : []);
          const sources = new Set(items.map(i => i._src || "manual"));
          const h = META.holiday(ck), t = META.term(ck);
          // 背景优先级：就医蓝 > 纪念日蜜桃橙 > 手动重要安排樱粉 > 调休紫 > 节假日绿
          let markCls = "";
          if (sources.has("medical")) markCls = "cell-medical";
          else if (sources.has("anniversary")) markCls = "cell-anniversary";
          else if (sources.has("manual")) markCls = "cell-event";
          else if (h && h.type === 'makeup') markCls = "cell-makeup";
          else if (h) markCls = "cell-holiday";
          const emojiHtml = items.length ? `<div class="mk-wrap">${items.map(i => `<span class="mk">${i.emoji || "★"}</span>`).join("")}</div>` : "";
          html += `<div class="cal-cell ${out?'out':''} ${isToday?'today':''} ${markCls}" data-date="${ck}">
            <span>${cd.getDate()}</span>
            ${t ? `<span class="term">${t}</span>` : ""}
            ${h ? `<span class="holi">${h.type==='makeup'?'班':h.name}</span>` : ""}
            ${emojiHtml}
          </div>`;
        });
        html += `</div>`;
      } else {
        // 周视图
        const mon = D.mondayOf(state.cursor);
        html += `<div class="week-grid">`;
        for (let i = 0; i < 7; i++) {
          const ck = D.addDays(mon, i);
          const cd = D.parse(ck);
          const isToday = ck === today;
          const ev = evs[ck];
          const items = ev && Array.isArray(ev.items) ? ev.items : (ev && ev.text ? [ev] : []);
          const sources = new Set(items.map(i => i._src || "manual"));
          const h = META.holiday(ck), t = META.term(ck);
          const dows = ["周一","周二","周三","周四","周五","周六","周日"];
          let markCls = "";
          if (sources.has("medical")) markCls = "col-medical";
          else if (sources.has("anniversary")) markCls = "col-anniversary";
          else if (sources.has("manual")) markCls = "col-event";
          else if (h && h.type === 'makeup') markCls = "col-makeup";
          else if (h) markCls = "col-holiday";
          const eventHtml = items.map(it => `<div class="ev" data-date="${ck}"><span class="mk" style="position:static;margin-right:5px">${it.emoji || "★"}</span>${escapeHtml(it.text.split("\n")[0])}</div>`).join("");
          html += `<div class="week-col ${isToday?'today':''} ${markCls}" data-date="${ck}">
            <div class="wd">${dows[i]}<small>${cd.getMonth()+1}/${cd.getDate()}</small></div>
            ${h ? `<div class="ev" style="cursor:default"><span class="d" style="background:${h.type==='makeup'?'var(--lav-deep)':'var(--done)'}"></span>${h.type==='makeup'?'调休班':h.name}</div>` : ""}
            ${t ? `<div class="ev" style="cursor:default;color:var(--lav-deep)"><span class="d" style="background:var(--lav-deep)"></span>${t}</div>` : ""}
            ${eventHtml}
          </div>`;
        }
        html += `</div>`;
      }

      // 图例
      html += `<div class="cal-legend">
        <span><i style="background:var(--mark-holiday)"></i>节假日</span>
        <span><i style="background:var(--mark-makeup)"></i>调休上班</span>
        <span><i style="background:var(--lav-deep)"></i>节气</span>
        <span><i style="background:var(--mark-event)"></i>重要安排</span>
        <span><i style="background:var(--mark-anniversary)"></i>纪念日</span>
        <span><i style="background:var(--mark-medical)"></i>就医</span>
      </div>`;

      container.innerHTML = html;

      // 事件绑定
      container.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => {
        const step = parseInt(b.dataset.nav);
        if (state.view === "month") {
          const [yy, mm] = state.cursor.split("-").map(Number);
          state.cursor = D.key(new Date(yy, mm - 1 + step, 1));
        } else {
          state.cursor = D.addDays(state.cursor, step * 7);
        }
        draw();
      });
      container.querySelector("[data-today]") && (container.querySelector("[data-today]").onclick = () => { state.cursor = today; draw(); });
      container.querySelectorAll("[data-view]").forEach(b => b.onclick = () => { state.view = b.dataset.view; draw(); });
      container.querySelectorAll("[data-date]").forEach(c => c.onclick = () => {
        const dk = c.dataset.date; state.cursor = dk; opts.onSelect(dk, () => draw());
      });
    }
    draw();
    return { redraw: draw, setState: (s) => Object.assign(state, s) };
  }

  function escapeHtml(s) { return (s || "").replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }

  App.Calendar = { render, editEvent, eventsAll, eventGet, eventSet, eventRemoveSrc };
})();
