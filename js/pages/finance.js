/* pages/finance.js — 账目记录：随礼收支 + 打牌输赢台账 */
(function () {
  window.App = window.App || {};
  window.Pages = window.Pages || {};
  const App = window.App, D = App.date, S = App.store;

  Pages.finance = function (root) {
    root.innerHTML = `
      <div class="stack page-pad">
        <!-- 随礼 -->
        <div class="card">
          <h3 class="section-title">🎁 随礼收支记录 <button class="btn sm" id="gift-add" style="margin-left:auto">＋ 添加记录</button></h3>
          <div class="row" style="margin-bottom:12px;align-items:flex-end">
            <label style="font-size:12px;color:var(--text-2)">排序
              <select class="input" id="gift-sort" style="width:130px;display:inline-block;margin-left:6px">
                <option value="time">按时间</option><option value="amount">按金额</option>
              </select></label>
          </div>
          <div id="gift-list"></div>
        </div>

        <!-- 打牌 -->
        <div class="card">
          <h3 class="section-title">🃏 打牌输赢台账</h3>
          <div class="row" style="margin-bottom:10px;align-items:flex-end;flex-wrap:wrap">
            <input class="input" type="month" id="game-from" value="${D.today().slice(0,7)}" style="width:140px">
            <span class="muted" style="align-self:center">至</span>
            <input class="input" type="month" id="game-to" value="${D.today().slice(0,7)}" style="width:140px">
          </div>
          <div id="game-sum" class="muted" style="font-size:13px;margin-bottom:14px;text-align:left"></div>
          <div class="game-cal-wrap">
            <div class="row" style="margin-bottom:10px">
              <button class="btn sm" id="gcal-prev">‹</button>
              <span id="gcal-label" style="flex:1;text-align:center;font-weight:600"></span>
              <button class="btn sm" id="gcal-next">›</button>
            </div>
            <div class="cal-grid game-cal" id="gcal-grid"></div>
          </div>
          <div id="game-timeline" style="margin-top:6px"></div>
        </div>
      </div>`;

    /* 随礼 */
    function renderGift() {
      let arr = S.listGet("gift");
      const sort = root.querySelector("#gift-sort").value;
      arr = arr.slice().sort((a,b)=> sort==="amount" ? Math.abs(b.amount)-Math.abs(a.amount) : (b.at ?? 0) - (a.at ?? 0));
      root.querySelector("#gift-list").innerHTML = arr.length ? `
        <div class="gift-grid gift-scroll">
          ${arr.map(r=>`
            <div class="gift-tile" data-edit="${r.id}" title="点击查看详情 / 编辑">
              <div class="gift-tile-person">${escapeHtml(r.person)}</div>
              <div class="gift-tile-amount" style="color:${r.type==='in'?'var(--done)':'var(--danger)'}">${r.type==='in'?'+':'-'}${r.amount}</div>
            </div>
          `).join("")}
        </div>` : `<div class="empty">还没有随礼记录</div>`;
    }
    root.querySelector("#gift-sort").onchange = renderGift;
    root.querySelector("#gift-add").onclick = () => editGift(null);
    function editGift(id) {
      const arr = S.listGet("gift"); const r = id ? arr.find(x=>x.id===id) : { date:D.today(), person:"", reason:"", type:"out", amount:"", note:"" };
      const delBtn = id ? `<button class="btn danger" id="gift-del" style="margin-top:12px;width:100%">🗑️ 删除该记录</button>` : "";
      App.modal.open(id?"🎁 随礼详情 / 编辑":"＋ 添加随礼记录", `
        <div class="row">
          <div class="grow">${App.dateInput("date", r.date, "日期")}</div>
          <div class="grow"><label class="field">类型</label>
            <select class="input" name="type"><option value="in" ${r.type==='in'?'selected':''}>收入（收礼）</option><option value="out" ${r.type==='out'?'selected':''}>支出（送礼）</option></select></div>
        </div>
        <label class="field">对象</label><input class="input" name="person" value="${escapeHtml(r.person)}" placeholder="如：张三">
        <label class="field">事由</label><input class="input" name="reason" value="${escapeHtml(r.reason)}" placeholder="如：婚礼 / 满月酒">
        <div class="row">
          <div class="grow"><label class="field">金额</label><input class="input" type="number" name="amount" value="${r.amount??''}" placeholder="正数"></div>
          <div class="grow"><label class="field">备注</label><input class="input" name="note" value="${escapeHtml(r.note||'')}"></div>
        </div>
        ${delBtn}
        `, {
        okText: id ? "保存" : "添加",
        cancelText: "关闭",
        cancel: true,
        onOpen(m){
          const dbtn = m.querySelector("#gift-del");
          if(dbtn) dbtn.onclick = () => {
            App.confirm("确定删除该记录？", () => {
              S.listRemove("gift", id); renderGift(); App.toast("已删除","🗑️"); App.modal.close();
            });
          };
        },
        onOk(m){ const v=App.formVals(m); if(!v.person.trim()){App.toast("请填写对象","⚠️");return false;}
          const rec={date:v.date,person:v.person,reason:v.reason,type:v.type,amount:Math.abs(parseFloat(v.amount)||0),note:v.note,at:Date.now()};
          if(id)S.listUpdate("gift",id,rec);else S.listAdd("gift",rec); renderGift(); App.toast(id?"已更新":"已添加","🎁"); }
      });
    }
    root.querySelector("#gift-list").onclick = (e)=>{
      const ed=e.target.closest("[data-edit]");
      if(ed) editGift(ed.dataset.edit);
    };
    renderGift();

    /* 打牌 */
    const gameFrom = root.querySelector("#game-from");
    const gameTo = root.querySelector("#game-to");
    let gCursor = D.today();
    const dows = ["一","二","三","四","五","六","日"];
    const WK = ["周日","周一","周二","周三","周四","周五","周六"];

    function gameList() { return S.listGet("game") || []; }
    function recordsForDate(dk) { return gameList().filter(r => r.date === dk); }
    function monthsInRange(from, to) {
      const [fy, fm] = from.split("-").map(Number);
      const [ty, tm] = to.split("-").map(Number);
      let cur = new Date(fy, fm - 1, 1), end = new Date(ty, tm - 1, 1);
      if (cur > end) { const t = cur; cur = end; end = t; }
      const out = [];
      while (cur <= end) { out.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}`); cur.setMonth(cur.getMonth()+1); }
      return out;
    }
    function dayNet(dk) { return recordsForDate(dk).reduce((s, r) => s + r.amount, 0); }
    function renderGameSummary() {
      const months = monthsInRange(gameFrom.value, gameTo.value);
      const arr = gameList().filter(r => months.some(m => r.date.startsWith(m)));
      const income = arr.filter(r=>r.amount>0).reduce((a,r)=>a+r.amount,0);
      const expense = arr.filter(r=>r.amount<0).reduce((a,r)=>a+Math.abs(r.amount),0);
      const net = income - expense;
      const emoji = net >= 0 ? "😎" : "😭";
      const netColor = net >= 0 ? "var(--danger)" : "var(--done)"; // 赢红输绿
      root.querySelector("#game-sum").innerHTML =
        `${months.length} 个月 · ${arr.length} 场 ·
         总盈亏：<span style="font-size:15px;font-weight:800;color:${netColor}">${emoji} ${net>=0?'+':''}${net.toFixed(0)}</span>`;
    }
    function renderGameCal() {
      const [y, m] = gCursor.split("-").map(Number);
      root.querySelector("#gcal-label").textContent = `${y} 年 ${m} 月`;
      const cells = D.monthMatrix(y, m);
      let html = dows.map(d => `<div class="cal-dow">${d}</div>`).join("");
      cells.forEach(ck => {
        const cd = D.parse(ck);
        const out = cd.getMonth() + 1 !== m;
        const net = dayNet(ck);
        const has = recordsForDate(ck).length > 0;
        let cls = "", txt = "";
        if (!out && net > 0) { cls = "win"; txt = `+${Math.round(net)}`; }
        else if (!out && net < 0) { cls = "loss"; txt = `${Math.round(net)}`; }
        html += `<div class="cal-cell ${out?'out':''} ${cls}" data-date="${ck}">
          <span>${cd.getDate()}</span>
          ${txt ? `<span class="game-num">${txt}</span>` : ""}
        </div>`;
      });
      root.querySelector("#gcal-grid").innerHTML = html;
      root.querySelectorAll("#gcal-grid .cal-cell[data-date]").forEach(c => c.onclick = () => {
        const dk = c.dataset.date;
        if (recordsForDate(dk).length) openGameDetail(dk);
        else openGameAdd(dk);
      });
      renderGameTimeline();
    }
    function renderGameTimeline() {
      const month = gCursor.slice(0, 7);
      const all = gameList().filter(r => r.date.startsWith(month))
        .sort((a, b) => a.date.localeCompare(b.date) || ((a.at || 0) - (b.at || 0)));
      const box = root.querySelector("#game-timeline");
      if (!all.length) { box.innerHTML = ""; return; }
      const groups = {};
      all.forEach(r => { groups[r.date] = groups[r.date] || []; groups[r.date].push(r); });
      const dates = Object.keys(groups).sort();
      box.innerHTML = `
        <div class="field" style="margin-top:6px">📅 ${month.replace("-","年")}月 详细记录</div>
        <div class="tl-scroll">
          ${dates.map(dk => {
            const net = groups[dk].reduce((s, r) => s + r.amount, 0);
            const netColor = net >= 0 ? "var(--danger)" : "var(--done)";
            const netSign = net >= 0 ? "+" : "";
            return `<div class="news-node">
              <div class="news-date"><span class="news-dot"></span><b>${dk}</b>
                <span class="muted" style="font-size:12px">${WK[D.parse(dk).getDay()]}</span>
                <span style="font-weight:700;color:${netColor}">${netSign}${net.toFixed(0)}</span>
              </div>
              <div style="margin-top:8px">
                ${groups[dk].map(r => `
                  <div class="item" style="padding:9px 11px;margin-bottom:7px">
                    <div class="grow">
                      <div style="font-size:13px">
                        <span class="badge ${r.amount>=0?'danger':'ok'}">${r.amount>=0?'赢':'输'} ${Math.abs(r.amount)}</span>
                        ${r.session ? `<span class="muted" style="margin-left:6px">${escapeHtml(r.session)}</span>` : ""}
                      </div>
                      ${r.note ? `<div class="meta">备注：${escapeHtml(r.note)}</div>` : ""}
                    </div>
                    <button class="btn sm icon" data-edit="${r.id}" data-date="${dk}">✏️</button>
                    <button class="btn sm icon danger" data-del="${r.id}" data-date="${dk}">🗑️</button>
                  </div>`).join("")}
              </div>
            </div>`;
          }).join("")}
        </div>`;
      box.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => { editGame(b.dataset.edit, b.dataset.date); });
      box.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
        App.confirm("删除该条打牌记录？", () => {
          S.listRemove("game", b.dataset.del);
          renderGameSummary(); renderGameCal();
          App.toast("已删除", "🗑️");
        });
      });
    }
    function shiftGameCal(n) {
      const [y, m] = gCursor.split("-").map(Number);
      gCursor = D.key(new Date(y, m - 1 + n, 1));
      renderGameCal();
    }
    root.querySelector("#gcal-prev").onclick = () => shiftGameCal(-1);
    root.querySelector("#gcal-next").onclick = () => shiftGameCal(1);
    gameFrom.onchange = () => { renderGameSummary(); gCursor = gameFrom.value + "-01"; renderGameCal(); };
    gameTo.onchange = () => { renderGameSummary(); };

    function openGameAdd(dk) {
      App.modal.open("＋ 添加打牌记录", `
        <div class="row"><div class="grow">${App.dateInput("date", dk, "日期")}</div>
          <div class="grow"><label class="field">场次</label><input class="input" name="session" placeholder="如：周末局"></div></div>
        <label class="field">输赢金额（赢为正、输为负）</label>
        <input class="input" type="number" name="amount" placeholder="如：-50 或 120">
        <label class="field">备注</label><input class="input" name="note" placeholder="可选">
        `, {
        okText: "添加", cancel: false,
        onOk(m){ const v=App.formVals(m); const amt=parseFloat(v.amount); if(isNaN(amt)){App.toast("请填写金额","⚠️");return false;}
          S.listAdd("game",{date:v.date,session:v.session||"",amount:amt,note:v.note||""}); renderGameSummary(); renderGameCal(); App.toast("已记录","🃏"); }
      });
    }

    function openGameDetail(dk) {
      const recs = recordsForDate(dk);
      const net = recs.reduce((s, r) => s + r.amount, 0);
      const netColor = net >= 0 ? "var(--danger)" : "var(--done)";
      const netSign = net >= 0 ? "+" : "";
      App.modal.open(`🃏 ${D.pretty(dk)} 共 ${recs.length} 场`, `
        <div class="muted" style="margin-bottom:12px">当日总盈亏：
          <span style="font-weight:800;color:${netColor}">${netSign}${net.toFixed(0)}</span>
        </div>
        <div class="game-detail-list">
          ${recs.map(r => `
            <div class="item" style="align-items:flex-start;flex-direction:column;gap:6px">
              <div style="display:flex;align-items:center;gap:10px;width:100%">
                <span class="badge ${r.amount>=0?'danger':'ok'}">${r.amount>=0?'赢':'输'} ${Math.abs(r.amount)}</span>
                <span class="spacer"></span>
                <button class="btn sm icon" data-edit="${r.id}">✏️</button>
                <button class="btn sm icon danger" data-del="${r.id}">🗑️</button>
              </div>
              ${r.session ? `<div class="meta">场次：${escapeHtml(r.session)}</div>` : ""}
              ${r.note ? `<div class="meta">备注：${escapeHtml(r.note)}</div>` : ""}
            </div>
          `).join("")}
        </div>
      `, {
        cancel: false, okText: "关闭",
        onOpen(m) {
          m.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => {
            App.modal.close(); setTimeout(() => editGame(b.dataset.edit, dk), 220);
          });
          m.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
            App.confirm("删除该条打牌记录？", () => {
              S.listRemove("game", b.dataset.del);
              renderGameSummary(); renderGameCal();
              App.toast("已删除", "🗑️");
              App.modal.close();
            });
          });
        }
      });
    }

    function editGame(id, returnDate) {
      const arr = gameList(); const r = arr.find(x => x.id === id);
      if (!r) return;
      App.modal.open("✏️ 编辑打牌记录", `
        <div class="row"><div class="grow">${App.dateInput("date", r.date, "日期")}</div>
          <div class="grow"><label class="field">场次</label><input class="input" name="session" value="${escapeHtml(r.session||'')}" placeholder="如：周末局"></div></div>
        <label class="field">输赢金额（赢为正、输为负）</label>
        <input class="input" type="number" name="amount" value="${r.amount}" placeholder="如：-50 或 120">
        <label class="field">备注</label><input class="input" name="note" value="${escapeHtml(r.note||'')}" placeholder="可选">
      `, {
        okText: "保存", cancel: false,
        onOk(m) {
          const v = App.formVals(m); const amt = parseFloat(v.amount);
          if (isNaN(amt)) { App.toast("请填写金额", "⚠️"); return false; }
          S.listUpdate("game", id, { date: v.date, session: v.session || "", amount: amt, note: v.note || "" });
          renderGameSummary(); renderGameCal();
          App.toast("已更新", "🃏");
          if (returnDate) setTimeout(() => openGameDetail(returnDate), 220);
        }
      });
    }

    renderGameSummary(); renderGameCal();
  };
  function escapeHtml(s){return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}
})();
