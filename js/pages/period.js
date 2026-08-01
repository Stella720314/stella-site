/* pages/period.js — 姨妈周期记录：来潮记录 / 时间线 / 医学标准四期色块日历 + 排卵预测 */
(function () {
  window.App = window.App || {};
  window.Pages = window.Pages || {};
  const App = window.App, D = App.date, S = App.store;

  const DEFAULT_DAYS = 6; // 默认月经期天数
  function rawEntries() {
    return (S.listGet("period") || []).map(x => {
      if (typeof x === "string") return { id: x, date: x, note: "", days: DEFAULT_DAYS };
      if (!x.days) x.days = DEFAULT_DAYS;
      return x;
    });
  }
  function dates() { return rawEntries().map(e => e.date).slice().sort(); }
  function avgPeriodDays() {
    const es = rawEntries().filter(e => e.days > 0);
    return es.length ? Math.round(es.reduce((a, e) => a + e.days, 0) / es.length) : DEFAULT_DAYS;
  }

  // 周期参数
  function cycleLen() {
    const ds = dates();
    if (ds.length < 2) return 28;
    return Math.round(ds.slice(1).reduce((a, _, i) => a + D.diffDays(ds[i + 1], ds[i]), 0) / (ds.length - 1));
  }
  const L = () => Math.min(45, Math.max(21, cycleLen()));
  const OVU = () => L() - 14; // 排卵日（周期第几天，0 起）

  // 判断某日所属周期阶段
  function phaseOf(dk) {
    const ds = dates();
    if (!ds.length) return null;
    // 已记录的月经期（按每次实际填写的天数）
    const recorded = rawEntries();
    for (const e of recorded) {
      const off = D.diffDays(dk, e.date);
      if (off >= 0 && off < e.days) return { key: "mens", recorded: true };
    }
    const start = ds[ds.length - 1]; // 最近一次来潮
    const diff = D.diffDays(dk, start);
    const len = L();
    const pos = ((diff % len) + len) % len;
    const pd = avgPeriodDays();
    if (pos < pd) return { key: "mens", recorded: false };
    if (pos < OVU() - 1) return { key: "fol" };
    if (pos <= OVU() + 1) return { key: "ovu", isOvuDay: pos === OVU() };
    return { key: "lut" };
  }

  Pages.period = function (root) {
    root.innerHTML = `
      <div class="stack page-pad">
        <div class="grid-2">
          <div class="card">
            <h3 class="section-title">🩸 周期追踪
              <span class="spacer"></span>
              <input class="input" type="date" id="p-add-date" value="${D.today()}" style="width:150px">
            </h3>
            <button class="btn primary sm" id="p-add" style="margin-top:4px;width:100%">＋ 记录来潮第一天</button>
            <div id="p-list" style="margin-top:14px"></div>
          </div>
          <div class="card">
            <h3 class="section-title">📅 周期日历</h3>
            <div class="row" style="margin-bottom:10px">
              <button class="btn sm" id="p-prev">‹</button>
              <span id="p-cal-m" style="flex:1;text-align:center;font-weight:600"></span>
              <button class="btn sm" id="p-next">›</button>
            </div>
            <div class="cal-grid" id="p-cal"></div>
            <div class="cal-legend">
              <span><i style="background:var(--cyc-mens)"></i>月经期</span>
              <span><i style="background:var(--cyc-fol)"></i>卵泡期</span>
              <span><i style="background:var(--cyc-ovu)"></i>排卵期</span>
              <span><i style="background:var(--cyc-lut)"></i>黄体期</span>
              <span><i style="background:var(--lav-deep)"></i>💡预测排卵日</span>
            </div>
          </div>
        </div>
      </div>`;

    let cursor = D.today();
    const WK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const PHASE_CLASS = { mens: "phase-mens", fol: "phase-fol", ovu: "phase-ovu", lut: "phase-lut" };

    function renderList() {
      const es = rawEntries().slice().sort((a, b) => b.date.localeCompare(a.date));
      if (!es.length) { root.querySelector("#p-list").innerHTML = `<div class="empty">还没有记录，点上方「＋ 记录来潮第一天」添加第一次日期</div>`; return; }
      const ds = dates();
      const avg = ds.length > 1 ? Math.round(ds.slice(1).reduce((a, _, i) => a + D.diffDays(ds[i + 1], ds[i]), 0) / (ds.length - 1)) : null;
      root.querySelector("#p-list").innerHTML = `
        <div class="tl-scroll">
          ${es.map((e, i) => {
            const older = es[i + 1];
            const interval = older ? D.diffDays(e.date, older.date) : null;
            const flag = interval == null ? `<span class="muted">首次</span>`
              : (interval < 21 || interval > 35 ? `<span class="badge warn">${interval}天·偏离</span>` : `<span class="badge ok">${interval}天·正常</span>`);
            return `<div class="news-node">
              <div class="news-date"><span class="news-dot" style="background:var(--cyc-mens)"></span><b>${e.date}</b> <span class="muted" style="font-size:12px">${WK[D.parse(e.date).getDay()]}</span> ${flag}</div>
              <div style="margin-top:8px">
                <div class="item" style="padding:9px 11px">
                  <div class="grow"><div class="meta">备注</div><div style="margin-top:2px;line-height:1.6">${e.note ? escapeHtml(e.note) : '<span class="muted">备注待补充</span>'}</div></div>
                  <button class="btn sm" data-editnote="${e.date}">编辑备注</button>
                  <button class="btn sm icon danger" data-del="${e.date}">🗑️</button>
                </div>
              </div>
            </div>`;
          }).join("")}
        </div>
        ${avg ? `<div class="muted" style="font-size:12px;margin-top:10px">平均周期约 <b>${avg}</b> 天，平均经期 <b>${avgPeriodDays()}</b> 天，下次预计：${D.addDays(es[0].date, avg)}</div>` : ""}`;
    }

    function renderCal() {
      const [y, m] = cursor.split("-").map(Number);
      root.querySelector("#p-cal-m").textContent = `${y} 年 ${m} 月`;
      const cells = D.monthMatrix(y, m);
      root.querySelector("#p-cal").innerHTML = cells.map(ck => {
        const cd = D.parse(ck); const out = cd.getMonth() + 1 !== m;
        const ph = phaseOf(ck);
        const cls = ph ? PHASE_CLASS[ph.key] : "";
        const ovuMark = ph && ph.isOvuDay ? `<span class="ovu-mark">💡</span>` : "";
        return `<div class="cal-cell ${out ? 'out' : ''} ${cls}">
          <span>${cd.getDate()}</span>
          ${ovuMark}
        </div>`;
      }).join("");
    }

    function editNote(dk) {
      const arr = S.listGet("period");
      const ex = arr.find(x => (typeof x === "string" ? x : x.date) === dk);
      const obj = ex ? (typeof ex === "string" ? { id: ex, date: ex, note: "", days: DEFAULT_DAYS } : ex) : { id: "p" + Date.now(), date: dk, note: "", days: DEFAULT_DAYS };
      if (!obj.days) obj.days = DEFAULT_DAYS;
      App.modal.open("编辑备注 · " + dk, `
        <label class="field">备注（颜色 / 总量 / 其他情况）</label>
        <textarea class="textarea" name="note" style="min-height:80px" placeholder="如：颜色正常、量偏少、无明显不适…">${escapeHtml(obj.note || "")}</textarea>
        <label class="field">本次月经期天数</label>
        <input class="input" type="number" name="days" value="${obj.days}" min="1" max="15" style="width:140px">
      `, {
        okText: "保存备注", cancel: false,
        onOk(m) {
          const note = m.querySelector('[name="note"]').value.trim();
          const days = parseInt(m.querySelector('[name="days"]').value, 10) || DEFAULT_DAYS;
          if (ex) { const o = (typeof ex === "string") ? { id: ex, date: ex, note, days } : ex; o.note = note; o.days = days; const i = arr.indexOf(ex); arr[i] = o; }
          else arr.push({ id: "p" + Date.now(), date: dk, note, days });
          S.listSet("period", arr); renderList(); renderCal(); App.toast("备注已保存", "🩸");
        }
      });
    }

    root.querySelector("#p-add").onclick = () => {
      const d = root.querySelector("#p-add-date").value;
      const arr = S.listGet("period");
      const exists = arr.find(x => (typeof x === "string" ? x : x.date) === d);
      if (exists) { App.toast("该日已记录来潮，可在时间线编辑备注", "ℹ️"); return; }
      S.listAdd("period", { id: "p" + Date.now(), date: d, note: "", days: DEFAULT_DAYS });
      App.toast("已记录来潮第一天 🩸", "🩸");
      renderList(); renderCal();
    };
    root.querySelector("#p-list").onclick = (e) => {
      const ed = e.target.closest("[data-editnote]");
      const dl = e.target.closest("[data-del]");
      if (ed) { editNote(ed.dataset.editnote); return; }
      if (dl) App.confirm("删除该来潮记录？", () => {
        S.listSet("period", rawEntries().filter(x => x.date !== dl.dataset.del));
        renderList(); renderCal(); App.toast("已删除", "🗑️");
      });
    };
    root.querySelector("#p-prev").onclick = () => { const [y, m] = cursor.split("-").map(Number); cursor = D.key(new Date(y, m - 2, 1)); renderCal(); };
    root.querySelector("#p-next").onclick = () => { const [y, m] = cursor.split("-").map(Number); cursor = D.key(new Date(y, m, 1)); renderCal(); };
    renderList(); renderCal();
  };
  function escapeHtml(s){return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
})();
