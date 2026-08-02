/* pages/medical.js — 医疗记录：未来就医计划（添加/修改/删除/标记已完成 · 时间轴） */
(function () {
  window.App = window.App || {};
  window.Pages = window.Pages || {};
  const App = window.App, D = App.date, S = App.store;

  Pages.medical = function (root) {
    root.innerHTML = `
      <div class="stack page-pad">
        <div id="med-reminder"></div>
        <div class="card">
          <h3 class="section-title">📋 未来就医计划 <button class="btn sm" id="plan-add" style="margin-left:auto">＋ 添加计划</button></h3>
          <div id="plan-list"></div>
        </div>
      </div>`;

    const WK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

    function planText(p) {
      return `就医：${p.dept}${p.hospital ? " · " + p.hospital : ""}${p.note ? "\n" + p.note : ""}`;
    }
    function syncOneCalendar(p) {
      // 未来未就诊计划同步到首页迷你日历（就医源，蓝色背景）
      if (p && !p.done && p.planDate >= D.today() && App.Calendar && App.Calendar.eventSet) {
        App.Calendar.eventSet(p.planDate, {
          _src: "medical",
          items: [{ text: planText(p), emoji: "🏥", _src: "medical" }]
        });
      }
    }
    function unsyncCalendar(date) {
      if (App.Calendar && App.Calendar.eventRemoveSrc) App.Calendar.eventRemoveSrc(date, "medical");
    }
    function syncCalendar() {
      // 全量重同步：先清理所有 medical 源事件，再把当前未完成的未来计划重新写入
      // 这样删除/修改后回到首页，迷你日历一定与医疗记录数据一致
      if (!App.Calendar) return;
      const evs = App.Calendar.eventsAll ? App.Calendar.eventsAll() : {};
      Object.keys(evs).forEach(dk => {
        const ev = evs[dk];
        const hasMedical = (ev && Array.isArray(ev.items) && ev.items.some(i => i._src === "medical"));
        if (hasMedical) App.Calendar.eventRemoveSrc(dk, "medical");
      });
      const today = D.today();
      S.listGet("medical_plan").forEach(p => { if (!p.done && p.planDate >= today) syncOneCalendar(p); });
    }

    function renderPlans() {
      const arr = S.listGet("medical_plan");
      const today = D.today();
      // 临近提醒
      const near = arr.filter(p=>{const d=D.diffDays(p.planDate,today);return d>=0&&d<=3&&!p.done;});
      root.querySelector("#med-reminder").innerHTML = near.length ? `
        <div class="card" style="background:rgba(239,143,180,.16);border-color:rgba(217,106,156,.4);margin-bottom:20px">
          🔔 临近就诊提醒：${near.map(p=>`<b>${p.planDate}</b> ${escapeHtml(p.dept)}`).join("；")}
        </div>` : "";

      // 时间轴：按日期排序，最新在上
      const sorted = arr.slice().sort((a,b)=>b.planDate.localeCompare(a.planDate));
      const box = root.querySelector("#plan-list");
      if (!sorted.length) { box.innerHTML = `<div class="empty">暂无就医计划，点右上「＋ 添加计划」记一笔吧～</div>`; return; }
      box.innerHTML = `<div class="tl-scroll">
          ${sorted.map(p=>{
            const diff = D.diffDays(p.planDate, today);
            const done = !!p.done;
            let badge = done ? `<span class="badge ok">已完成</span>`
              : diff<0 ? `<span class="badge danger">已逾期</span>`
              : diff===0 ? `<span class="badge warn">今天</span>`
              : diff<=3 ? `<span class="badge warn">${diff}天后</span>`
              : `<span class="badge ok">${diff}天后</span>`;
            return `<div class="news-node">
              <div class="news-date"><span class="news-dot" style="${done?'background:var(--done)':''}"></span>
                <b>${p.planDate}</b> <span class="muted" style="font-size:12px">${WK[D.parse(p.planDate).getDay()]}</span>
                <span class="spacer"></span>${badge}</div>
              <div class="item" style="${done?'opacity:.7':''}">
                <div class="grow">
                  <div class="title ${done?'strike':''}">${escapeHtml(p.dept)}</div>
                  <div class="meta">${p.hospital||""}${p.note?" ｜ "+escapeHtml(p.note):""}</div>
                </div>
                <button class="btn sm ${done?'ghost':'primary'}" data-done="${p.id}">${done?'↩️ 取消完成':'✓ 标记完成'}</button>
                <button class="btn sm icon" data-edit="${p.id}">✏️</button>
                <button class="btn sm icon danger" data-del="${p.id}">🗑️</button>
              </div>
            </div>`;
          }).join("")}
        </div>`;
    }

    root.querySelector("#plan-add").onclick = () => editPlan(null);
    function editPlan(id){
      const arr=S.listGet("medical_plan"); const p=id?arr.find(x=>x.id===id):{planDate:D.today(),dept:"",hospital:"",note:""};
      App.modal.open(id?"✏️ 编辑计划":"＋ 添加就医计划", `
        <div class="row"><div class="grow">${App.dateInput("planDate",p.planDate,"就医日期")}</div></div>
        <label class="field">就诊科室</label><input class="input" name="dept" value="${escapeHtml(p.dept)}" placeholder="如：口腔科">
        <label class="field">预约医院</label><input class="input" name="hospital" value="${escapeHtml(p.hospital)}" placeholder="如：市第一人民医院">
        <label class="field">待办备注</label><input class="input" name="note" value="${escapeHtml(p.note||'')}" placeholder="需带资料、注意事项…">
        `,{
        okText: id ? "保存" : "添加",
        cancel: false,
        onOk(m){const v=App.formVals(m); if(!v.dept.trim()){App.toast("请填写科室","⚠️");return false;}
          const oldDate = id ? arr.find(x=>x.id===id).planDate : null;
          if(id){
            const cur=arr.find(x=>x.id===id);
            if (oldDate && oldDate !== v.planDate) unsyncCalendar(oldDate);
            cur.dept=v.dept;cur.hospital=v.hospital;cur.note=v.note;cur.planDate=v.planDate;S.listUpdate("medical_plan",id,cur);
            if (!cur.done) syncOneCalendar(cur);
          } else {
            const rec={planDate:v.planDate,dept:v.dept,hospital:v.hospital,note:v.note,done:false};
            // 防止因网络/手误重复添加完全相同的数据
            const dup = arr.find(x =>
              x.planDate === rec.planDate &&
              x.dept === rec.dept &&
              x.hospital === rec.hospital &&
              (x.note || "") === rec.note &&
              !x.done
            );
            if (dup) { App.toast("已存在相同的就医计划，无需重复添加", "ℹ️"); return false; }
            S.listAdd("medical_plan",rec); syncOneCalendar(rec);
          }
          renderPlans(); App.toast(id?"已更新":"已添加计划","📋");}
      });
    }
    root.querySelector("#plan-list").onclick=(e)=>{
      const doneBtn=e.target.closest("[data-done]");
      const ed=e.target.closest("[data-edit]"),dl=e.target.closest("[data-del]");
      if(doneBtn){const arr=S.listGet("medical_plan");const i=arr.findIndex(p=>p.id===doneBtn.dataset.done);
        if(i>=0){const p=arr[i]; p.done=!p.done;S.listSet("medical_plan",arr);renderPlans(); syncCalendar();
          App.toast(p.done?"已标记为已完成 ✓":"已取消完成","✅");}}
      if(ed)editPlan(ed.dataset.edit);
      if(dl)App.confirm("删除该计划？",()=>{
        S.listRemove("medical_plan",dl.dataset.del); renderPlans(); syncCalendar(); App.toast("已删除","🗑️");
      });};
    renderPlans();
    // 初始化时全量同步一次到首页日历（兼容旧数据/修复 stale 标记）
    syncCalendar();
    // 暴露给首页做兜底重同步
    App.Medical = { syncCalendar };
  };
  function escapeHtml(s){return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}
})();
