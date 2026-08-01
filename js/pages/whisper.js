/* pages/whisper.js — 碎碎念：灵感随手记 + 今日3件幸福小事 + 朋友圈文案 */
(function () {
  window.App = window.App || {};
  window.Pages = window.Pages || {};
  const App = window.App, D = App.date, S = App.store;

  const MOM_EMOJIS = ["✨","🌟","💖","🌸","🌈","🍀","☀️","🌙","🎉","🥰","😊","🤗","💪","🔥","📸","💭","🎀","🌷","☕️","🍰","🌊","🍓"];

  Pages.whisper = function (root) {
    root.innerHTML = `
      <div class="stack page-pad">
        <!-- 灵感随手记 -->
        <div class="card" style="position:relative">
          <h3 class="section-title">💡 灵感随手记</h3>
          <textarea class="textarea" id="idea-text" placeholder="灵感、想法、待办思路…随时记"></textarea>
          <div class="row" style="margin-top:10px">
            <button class="btn primary" id="idea-save">保存灵感</button>
          </div>
          <div id="idea-list" style="margin-top:14px"></div>
        </div>

        <!-- 3件幸福小事 -->
        <div class="card" style="position:relative">
          <h3 class="section-title">🌟 今日 3 件幸福小事
            <span class="tag" id="happy-stat">未打卡</span>
          </h3>
          <div class="stack" style="gap:12px;margin-bottom:14px">
            ${[1,2,3].map(i=>`<div class="row">
              <span class="chip active" style="pointer-events:none">第 ${i} 件</span>
              <input class="input grow" data-happy="${i}" placeholder="今天让我开心的小事…">
            </div>`).join("")}
          </div>
          <button class="btn primary" id="happy-ck">🌟 今日幸福打卡</button>
          <div id="happy-history" style="margin-top:16px"></div>
        </div>

        <!-- 朋友圈文案 -->
        <div class="card" style="position:relative">
          <h3 class="section-title">📱 朋友圈文案
            <span class="spacer"></span>
            <button class="btn sm primary" id="mom-add">＋ 添加文案</button>
          </h3>
          <div id="mom-list" class="tl-scroll"></div>
        </div>
      </div>`;

    const WK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

    /* 灵感 */
    function renderIdea() {
      const all = S.getAll("idea");
      const dates = Object.keys(all).filter(k => all[k] && all[k].length).sort().reverse();
      const box = root.querySelector("#idea-list");
      if (!dates.length) { box.innerHTML = `<div class="empty">还没有灵感记录</div>`; return; }
      box.innerHTML = `<div class="tl-scroll">
          ${dates.map(dk => `
            <div class="news-node">
              <div class="news-date"><span class="news-dot"></span><b>${dk}</b> <span class="muted" style="font-size:12px">${WK[D.parse(dk).getDay()]}</span></div>
              <div style="margin-top:8px">
                ${all[dk].slice().reverse().map(r => {
                  const t = new Date(r.at);
                  const time = String(t.getHours()).padStart(2,"0") + ":" + String(t.getMinutes()).padStart(2,"0");
                  return `<div class="item" style="padding:9px 11px;margin-bottom:7px">
                    <div class="grow"><div class="meta" style="display:flex;align-items:center;gap:6px"><span>${time}</span></div>
                    <div style="margin-top:3px;line-height:1.6">${escapeHtml(r.text)}</div></div>
                    <button class="btn sm icon danger" data-del="${r.id}" data-date="${dk}">🗑️</button>
                  </div>`;
                }).join("")}
              </div>
            </div>`).join("")}
        </div>`;
    }
    root.querySelector("#idea-save").onclick = () => {
      const t = root.querySelector("#idea-text").value.trim();
      if (!t) { App.toast("写点什么再保存吧", "⚠️"); return; }
      S.add("idea", D.today(), { text: t, at: Date.now() });
      root.querySelector("#idea-text").value = "";
      renderIdea(); App.toast("灵感已保存 💡", "✨");
    };
    root.querySelector("#idea-list").onclick = (e) => {
      const d = e.target.closest("[data-del]");
      if (d) { S.remove("idea", d.dataset.date, d.dataset.del); renderIdea(); App.toast("已删除", "🗑️"); }
    };
    renderIdea();

    /* 幸福小事 */
    function renderHappy() {
      const dk = D.today();
      const rec = S.val("happy:" + dk, null);
      [1,2,3].forEach(i => { const el = root.querySelector(`[data-happy="${i}"]`); el.value = rec ? (rec["h"+i]||"") : ""; });
      const ck = S.val("happy_ck", {})[dk];
      root.querySelector("#happy-stat").textContent = ck ? "已打卡 ✓" : "未打卡";
      root.querySelector("#happy-stat").className = "tag " + (ck ? "badge ok" : "");
      renderHappyHistory();
    }
    function renderHappyHistory() {
      const hist = (S.val("happy_hist", []) || []).slice().sort((a,b)=>b.date.localeCompare(a.date));
      const box = root.querySelector("#happy-history");
      if (!hist.length) { box.innerHTML = `<div class="empty">还没有幸福小事记录</div>`; return; }
      box.innerHTML = `<div class="tl-scroll">
          ${hist.map(r => {
            const items = [r.h1, r.h2, r.h3].map((h,i)=> h ? `<div class="item" style="padding:8px 11px;margin-bottom:6px"><span class="chip active" style="pointer-events:none">第${i+1}件</span><div class="grow" style="font-size:13px">${escapeHtml(h)}</div></div>` : "").join("");
            const d = D.parse(r.date); const cked = S.val("happy_ck", {})[r.date];
            return `<div class="news-node">
              <div class="news-date"><span class="news-dot"></span><b>${r.date}</b> <span class="muted" style="font-size:12px">${WK[d.getDay()]}</span> ${cked?'<span class="badge ok">已打卡</span>':''}</div>
              <div style="margin-top:8px">${items}</div>
            </div>`;
          }).join("")}
        </div>`;
    }
    function saveHappy() {
      const dk = D.today();
      const o = {}; [1,2,3].forEach(i => o["h"+i] = root.querySelector(`[data-happy="${i}"]`).value.trim());
      if (!o.h1 && !o.h2 && !o.h3) { App.toast("写点什么再打卡吧", "⚠️"); return; }
      S.setVal("happy:" + dk, o);
      const m = S.val("happy_ck", {}); m[dk] = true; S.setVal("happy_ck", m);
      const hist = S.val("happy_hist", []); const ex = hist.findIndex(r=>r.date===dk);
      const rec = { date: dk, h1:o.h1, h2:o.h2, h3:o.h3 };
      if (ex>=0) hist[ex]=rec; else hist.push(rec); S.setVal("happy_hist", hist);
      renderHappy(); App.toast("今日幸福已打卡 🌟", "✅");
    }
    root.querySelector("#happy-ck").onclick = saveHappy;
    renderHappy();

    /* 朋友圈文案 */
    function renderMoments() {
      const arr = (S.listGet("moments") || []).slice().sort((a, b) => (b.at || 0) - (a.at || 0));
      const box = root.querySelector("#mom-list");
      if (!arr.length) { box.innerHTML = `<div class="empty">还没有收藏的文案，点右上「＋ 添加文案」存下想发朋友圈的句子吧～</div>`; return; }
      box.innerHTML = arr.map(r => {
        return `<div class="item" style="padding:11px 13px;margin-bottom:8px;align-items:flex-start">
          <span style="font-size:20px;margin-right:8px;flex-shrink:0">${r.emoji || "📱"}</span>
          <div class="grow" style="line-height:1.6;white-space:pre-wrap;padding-top:2px">${escapeHtml(r.text)}</div>
          <button class="btn sm icon" data-med="${r.id}" title="编辑">✏️</button>
          <button class="btn sm icon danger" data-mdel="${r.id}" title="删除">🗑️</button>
        </div>`;
      }).join("");
    }
    function openMomModal(id) {
      const arr = S.listGet("moments");
      const r = id ? arr.find(x => x.id === id) : null;
      const text = r ? r.text : ""; const emoji = r ? (r.emoji || "") : "";
      App.modal.open(id ? "✏️ 编辑文案" : "＋ 添加朋友圈文案", `
        <label class="field">文案内容</label>
        <textarea class="textarea" name="text" style="min-height:110px" placeholder="写下想发朋友圈的文案…">${escapeHtml(text)}</textarea>
        <label class="field">选个表情（可选）</label>
        <div class="emoji-grid" id="mom-emojis">
          <span class="chip ${!emoji ? 'active' : ''}" data-e="">无</span>
          ${MOM_EMOJIS.map(e => `<span class="chip ${emoji === e ? 'active' : ''}" data-e="${e}">${e}</span>`).join("")}
        </div>
      `, {
        okText: id ? "保存" : "添加", cancel: false,
        onOpen(m) {
          let sel = emoji; m.dataset.selEmoji = sel;
          const grid = m.querySelector("#mom-emojis");
          grid.onclick = (e) => {
            const s = e.target.closest("[data-e]"); if (!s) return;
            sel = s.dataset.e; m.dataset.selEmoji = sel;
            grid.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.e === sel));
          };
        },
        onOk(m) {
          const v = App.formVals(m);
          const txt = (v.text || "").trim();
          if (!txt) { App.toast("写点文案再保存吧", "⚠️"); return false; }
          const em = m.dataset.selEmoji || "";
          if (id) { S.listUpdate("moments", id, { text: txt, emoji: em, at: r.at || Date.now() }); App.toast("文案已更新", "✏️"); }
          else { S.listAdd("moments", { text: txt, emoji: em, at: Date.now() }); App.toast("文案已收藏 📱", "✨"); }
          renderMoments();
        }
      });
    }
    root.querySelector("#mom-add").onclick = () => openMomModal(null);
    root.querySelector("#mom-list").onclick = (e) => {
      const ed = e.target.closest("[data-med]"); const dl = e.target.closest("[data-mdel]");
      if (ed) openMomModal(ed.dataset.med);
      if (dl) App.confirm("确定删除该文案？", () => { S.listRemove("moments", dl.dataset.mdel); renderMoments(); App.toast("已删除", "🗑️"); });
    };
    renderMoments();
  };
  function escapeHtml(s){return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}
})();
