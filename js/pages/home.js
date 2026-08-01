/* pages/home.js — 首页：迷你日历 + 公告喇叭 + 今日打卡 + 短期/长期目标 */
(function () {
  window.App = window.App || {};
  window.Pages = window.Pages || {};
  const App = window.App, D = App.date, S = App.store;

  const DEFAULT_DEFS = [
    { id: "d_fit", name: "健身打卡" },
    { id: "d_study", name: "AI学习打卡" },
    { id: "d_chat", name: "碎碎念打卡" },
    { id: "d_english", name: "英语练习打卡" },
    { id: "d_media", name: "自媒体策划" }
  ];
  function defs() {
    let d = S.listGet("checkin_defs");
    const meta = S.val("checkin_defs_meta", {});
    const today = D.today();
    // 每天凌晨 0 点后首次进入首页，自动重置为默认打卡项（覆盖前一天数据）
    if (!d || !d.length || meta.date !== today) {
      d = JSON.parse(JSON.stringify(DEFAULT_DEFS));
      S.listSet("checkin_defs", d);
      S.setVal("checkin_defs_meta", { date: today, resetAt: Date.now() });
      // 清空历史打卡状态，只保留今天的空状态
      const prefix = App.PREFIX + "checkins:";
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(prefix)) localStorage.removeItem(k);
      });
    }
    return d;
  }
  function doneMap(dateKey) { return S.val("checkins:" + dateKey, {}); }
  function setDone(dateKey, id, v) { const m = doneMap(dateKey); m[id] = v; S.setVal("checkins:" + dateKey, m); }

  // 公告喇叭：未来一周重要安排 / 随机语录
  const HORN_QUOTES = [
    "做长期正确的事，时间会给你复利。",
    "平静是力量的来源。",
    "今天也是值得期待的一天。",
    "把注意力放在你能控制的事上。",
    "小进步，也值得被看见。",
    "健康、学习、好心情，三者不可偏废。",
    " Naval：The best investment is the one you make in yourself.",
    " Naval：Play stupid games, win stupid prizes.",
    " Naval：Happiness is a choice and a skill.",
    "你正在慢慢成为自己喜欢的样子。"
  ];
  function hornText() {
    const today = D.today();
    const candidates = [];
    const evs = App.Calendar.eventsAll();
    for (let i = 0; i < 7; i++) {
      const dk = D.addDays(today, i);
      if (evs[dk] && evs[dk].text && evs[dk].text.trim()) {
        candidates.push({ type: "安排", date: dk, text: evs[dk].text.split("\n")[0].trim(), days: i });
      }
    }
    const plans = S.listGet("medical_plan") || [];
    plans.filter(p => !p.done).forEach(p => {
      const d = D.diffDays(p.planDate, today);
      if (d >= 0 && d < 7) candidates.push({ type: "就医", date: p.planDate, text: p.dept + (p.hospital ? " · " + p.hospital : ""), days: d });
    });
    // 纪念日提醒
    if (App.Anniversary && App.Anniversary.upcoming) {
      App.Anniversary.upcoming(7).forEach(a => candidates.push({ type: "纪念日", date: a.date, text: a.text, days: a.days }));
    }
    if (candidates.length) {
      candidates.sort((a, b) => a.days - b.days);
      const c = candidates[0];
      const dayText = c.days === 0 ? "今天" : c.days === 1 ? "明天" : `${c.days}天后`;
      return `📢 ${dayText}有个重要安排：${c.text}`;
    }
    return `📢 ${HORN_QUOTES[Math.floor(Math.random() * HORN_QUOTES.length)]}`;
  }

  Pages.home = function (root) {
    root.innerHTML = `
      <div class="home-grid">
        <div class="card" id="cal-card">
          <div class="horn-bar" id="horn-bar" title="未来一周重要安排"></div>
          <h3 class="section-title">🗓️ 迷你日历 <span class="tag" id="cal-tag">月视图</span></h3>
          <div id="cal-mount"></div>
        </div>
        <div class="home-right">
          <div class="card" id="checkin-card">
            <h3 class="section-title">✅ 今日打卡
              <span class="spacer"></span>
              <button class="btn sm" id="ck-add">＋ 新增项</button>
            </h3>
            <div id="ck-list"></div>
            <div class="row" style="margin-top:6px">
              <div class="progress-ring" id="ck-ring" style="--p:0"><b id="ck-pct">0%</b></div>
            </div>
          </div>
          <div class="card" id="plans-card">
            <h3 class="section-title">🎯 计划与目标
              <span class="spacer"></span>
              <button class="btn sm" id="plan-add-short">＋ 短期</button>
              <button class="btn sm primary" id="plan-add-long">＋ 长期</button>
            </h3>
            <div id="plan-short" class="plan-group" style="margin-top:4px"></div>
            <div id="plan-long" class="plan-group" style="margin-top:10px"></div>
          </div>
        </div>
      </div>`;

    /* 公告喇叭 */
    const horn = root.querySelector("#horn-bar");
    function renderHorn() { horn.textContent = hornText(); }
    renderHorn();
    horn.onclick = () => { renderHorn(); };

    /* 日历 */
    const calMount = root.querySelector("#cal-mount");
    App.Calendar.render(calMount, { onSelect: (dk, after) => App.Calendar.editEvent(dk, after) });
    root.querySelector("#cal-tag").textContent = "月视图";

    /* 打卡 */
    const ckList = root.querySelector("#ck-list");
    const today = D.today();
    function renderCk() {
      const dk = today;
      const dm = doneMap(dk);
      const ds = defs();
      ckList.innerHTML = ds.map(d => {
        const done = !!dm[d.id];
        return `<div class="checkin-item ${done?'done':''}" data-id="${d.id}">
          <div class="check-btn" data-toggle="${d.id}">✓</div>
          <div class="grow">
            <div class="ci-name">${escapeHtml(d.name)}</div>
          </div>
          <div class="ci-ops">
            <button class="btn sm icon" data-edit="${d.id}" title="编辑">✏️</button>
            <button class="btn sm icon danger" data-del="${d.id}" title="删除">🗑️</button>
          </div>
        </div>`;
      }).join("") || `<div class="empty">还没有打卡项，点右上「＋ 新增项」添加吧～</div>`;
      const total = ds.length, doneN = ds.filter(d => dm[d.id]).length;
      const pct = total ? Math.round(doneN / total * 100) : 0;
      root.querySelector("#ck-ring").style.setProperty("--p", pct);
      root.querySelector("#ck-pct").textContent = pct + "%";
    }
    ckList.onclick = (e) => {
      const tg = e.target.closest("[data-toggle]");
      const ed = e.target.closest("[data-edit]");
      const dl = e.target.closest("[data-del]");
      const dk = today;
      if (tg) { const id = tg.dataset.toggle; const v = !doneMap(dk)[id]; setDone(dk, id, v); renderCk(); App.toast(v ? "已完成打卡 💪" : "已取消", v ? "✅" : "↩️"); }
      if (ed) editDef(ed.dataset.edit);
      if (dl) {
        App.confirm("确定删除该打卡项？", () => {
          S.listSet("checkin_defs", defs().filter(d => d.id !== dl.dataset.del));
          const dm = doneMap(dk); delete dm[dl.dataset.del]; S.setVal("checkins:" + dk, dm);
          renderCk(); App.toast("已删除打卡项", "🗑️");
        });
      }
    };
    root.querySelector("#ck-add").onclick = () => editDef(null);
    function editDef(id) {
      const ds = defs();
      const d = id ? ds.find(x => x.id === id) : { name: "" };
      App.modal.open(id ? "✏️ 编辑打卡项" : "＋ 新增打卡项", `
        <label class="field">名称</label>
        <input class="input" name="name" value="${escapeHtml(d.name)}" placeholder="如：喝水打卡">
        `, {
        okText: id ? "保存" : "添加",
        cancel: false,
        onOk(m) {
          const v = App.formVals(m);
          if (!v.name.trim()) { App.toast("名称不能为空", "⚠️"); return false; }
          if (id) S.listUpdate("checkin_defs", id, v); else S.listAdd("checkin_defs", v);
          renderCk(); App.toast(id ? "已更新" : "已添加打卡项", "✨");
        }
      });
    }
    renderCk();

    /* 计划与目标：短期 / 长期，每项 = 目标 + 备注 */
    const planKeys = { short: "plans_short", long: "plans_long" };
    function renderPlans() {
      ["short", "long"].forEach(type => {
        const arr = S.listGet(planKeys[type]);
        const box = root.querySelector("#plan-" + type);
        const title = type === "short" ? "🌱 短期目标" : "🌳 长期目标";
        box.innerHTML = `<div class="field" style="margin-bottom:6px">${title}</div>` + (arr.length ? arr.map(p => `
          <div class="checkin-item ${p.done?'done':''}" data-id="${p.id}" data-type="${type}">
            <div class="check-btn" data-done="${p.id}" data-type="${type}">✓</div>
            <div class="grow">
              <div class="ci-name ${p.done?'strike':''}">${escapeHtml(p.text)}</div>
              ${p.note ? `<div class="ci-note">${escapeHtml(p.note)}</div>` : ""}
            </div>
            <div class="ci-ops">
              <button class="btn sm icon" data-edit="${p.id}" data-type="${type}" title="编辑">✏️</button>
              <button class="btn sm icon danger" data-del="${p.id}" data-type="${type}" title="删除">🗑️</button>
            </div>
          </div>`).join("") : `<div class="empty" style="padding:12px 0">还没有${type==='short'?'短期':'长期'}目标，点上方添加吧～</div>`);
      });
    }
    root.querySelector("#plan-add-short").onclick = () => editPlan(null, "short");
    root.querySelector("#plan-add-long").onclick = () => editPlan(null, "long");
    root.querySelector("#plans-card").onclick = (e) => {
      const type = e.target.closest("[data-type]")?.dataset.type; if (!type) return;
      const doneBtn = e.target.closest("[data-done]");
      const ed = e.target.closest("[data-edit]");
      const dl = e.target.closest("[data-del]");
      const key = planKeys[type];
      if (doneBtn) {
        const arr = S.listGet(key); const i = arr.findIndex(p=>p.id===doneBtn.dataset.done);
        if (i>=0){ arr[i].done = !arr[i].done; S.listSet(key, arr); renderPlans(); App.toast(arr[i].done?"已标记完成 🎯":"已取消完成","✅"); }
      }
      if (ed) editPlan(ed.dataset.edit, type);
      if (dl) App.confirm("确定删除该目标？", () => { S.listRemove(key, dl.dataset.del); renderPlans(); App.toast("已删除","🗑️"); });
    };
    function editPlan(id, type) {
      const key = planKeys[type];
      const arr = S.listGet(key);
      const p = id ? arr.find(x=>x.id===id) : { text: "", note: "", done: false };
      App.modal.open(id ? "✏️ 编辑目标" : (type === "short" ? "＋ 添加短期目标" : "＋ 添加长期目标"), `
        <label class="field">目标</label>
        <input class="input" name="text" value="${escapeHtml(p.text||"")}" placeholder="写下你的目标…">
        <label class="field">备注（可随时更新更细致的完成状态）</label>
        <textarea class="textarea" name="note" style="min-height:70px" placeholder="阶段进展、心得、下一步动作…">${escapeHtml(p.note||"")}</textarea>
        `, {
        okText: id ? "保存" : "添加",
        cancel: false,
        onOk(m) {
          const v = App.formVals(m);
          if (!v.text.trim()) { App.toast("请填写目标", "⚠️"); return false; }
          const rec = { text: v.text.trim(), note: v.note.trim(), done: p.done || false };
          if (id) S.listUpdate(key, id, rec); else S.listAdd(key, rec);
          renderPlans(); App.toast(id?"已更新":"已添加目标","🎯");
        }
      });
    }
    renderPlans();
  };

  function escapeHtml(s){return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}
})();
