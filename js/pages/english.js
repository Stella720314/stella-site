/* pages/english.js — 雅思英语学习：词汇打卡(真经词库·发音·统计) / 四板块学习记录 */
(function () {
  window.App = window.App || {};
  window.Pages = window.Pages || {};
  const App = window.App, D = App.date, S = App.store;

  // 《雅思词汇真经》风格词库（真实雅思高频词，含音标/常用搭配/造句）
  const SEED = [
    {w:"abandon",ph:"/əˈbændən/",m:"v. 放弃；抛弃",coll:"abandon oneself to 沉溺于",ex:"He abandoned himself to despair."},
    {w:"abundant",ph:"/əˈbʌndənt/",m:"adj. 丰富的；充裕的",coll:"abundant in 富于",ex:"The region is abundant in natural resources."},
    {w:"accurate",ph:"/ˈækjərət/",m:"adj. 准确的；精确的",coll:"accurate information 准确信息",ex:"We need accurate data to decide."},
    {w:"adequate",ph:"/ˈædɪkwət/",m:"adj. 足够的；适当的",coll:"adequate supply 充足供应",ex:"The food supply is not adequate for all."},
    {w:"ambiguous",ph:"/æmˈbɪɡjuəs/",m:"adj. 模棱两可的",coll:"an ambiguous answer 含糊的回答",ex:"His ambiguous reply confused us."},
    {w:"analyze",ph:"/ˈænəlaɪz/",m:"v. 分析；解析",coll:"analyze the cause 分析原因",ex:"Scientists analyze samples carefully."},
    {w:"arbitrary",ph:"/ˈɑːrbɪtreri/",m:"adj. 任意的；武断的",coll:"an arbitrary decision 武断决定",ex:"The punishment seemed arbitrary."},
    {w:"assess",ph:"/əˈses/",m:"v. 评估；评定",coll:"assess the risk 评估风险",ex:"We must assess the environmental impact."},
    {w:"attribute",ph:"/əˈtrɪbjuːt/",m:"v. 把…归因于",coll:"attribute A to B 把A归因于B",ex:"She attributes her success to hard work."},
    {w:"authentic",ph:"/ɔːˈθentɪk/",m:"adj. 真正的；可靠的",coll:"authentic experience 真实体验",ex:"Tourists seek authentic local culture."},
    {w:"comprehensive",ph:"/ˌkɒmprɪˈhensɪv/",m:"adj. 综合的；全面的",coll:"a comprehensive plan 全面计划",ex:"The report gives a comprehensive view."},
    {w:"consequence",ph:"/ˈkɒnsɪkwəns/",m:"n. 结果；后果",coll:"as a consequence 因此",ex:"As a consequence, the project was delayed."},
    {w:"consistent",ph:"/kənˈsɪstənt/",m:"adj. 一致的；连贯的",coll:"consistent with 与…一致",ex:"His actions are consistent with his words."},
    {w:"contemporary",ph:"/kənˈtemprəri/",m:"adj. 当代的；同时代的",coll:"contemporary art 当代艺术",ex:"The museum features contemporary works."},
    {w:"contribute",ph:"/kənˈtrɪbjuːt/",m:"v. 贡献；促成",coll:"contribute to 促成",ex:"Exercise contributes to good health."},
    {w:"crucial",ph:"/ˈkruːʃl/",m:"adj. 关键的；至关重要的",coll:"crucial to 对…至关重要",ex:"Communication is crucial to a relationship."},
    {w:"deliberate",ph:"/dɪˈlɪbərət/",m:"adj. 故意的",coll:"a deliberate mistake 蓄意错误",ex:"The act was a deliberate insult."},
    {w:"demonstrate",ph:"/ˈdemənstreɪt/",m:"v. 证明；演示",coll:"demonstrate ability 展示能力",ex:"The study demonstrates a clear link."},
    {w:"distinct",ph:"/dɪˈstɪŋkt/",m:"adj. 明显的；独特的",coll:"distinct from 不同于",ex:"The two concepts are quite distinct."},
    {w:"dominant",ph:"/ˈdɒmɪnənt/",m:"adj. 占主导的；统治的",coll:"dominant role 主导地位",ex:"English plays a dominant role online."},
    {w:"elaborate",ph:"/ɪˈlæbərət/",m:"adj. 详尽的 v. 详述",coll:"elaborate on 详述",ex:"Please elaborate on your idea."},
    {w:"eliminate",ph:"/ɪˈlɪmɪneɪt/",m:"v. 消除；淘汰",coll:"eliminate poverty 消除贫困",ex:"The goal is to eliminate hunger."},
    {w:"emphasize",ph:"/ˈemfəsaɪz/",m:"v. 强调；着重",coll:"emphasize the importance 强调重要性",ex:"He emphasized the need for caution."},
    {w:"enhance",ph:"/ɪnˈhɑːns/",m:"v. 提高；增强",coll:"enhance efficiency 提升效率",ex:"Good lighting enhances productivity."},
    {w:"fundamental",ph:"/ˌfʌndəˈmentl/",m:"adj. 基本的；根本的",coll:"fundamental right 基本权利",ex:"Education is a fundamental human right."},
    {w:"hypothesis",ph:"/haɪˈpɒθəsɪs/",m:"n. 假说；前提",coll:"test a hypothesis 验证假设",ex:"The hypothesis was later proven."},
    {w:"inevitable",ph:"/ɪnˈevɪtəbl/",m:"adj. 不可避免的",coll:"inevitable result 必然结果",ex:"Change is inevitable in life."},
    {w:"innovative",ph:"/ˈɪnəveɪtɪv/",m:"adj. 创新的；革新的",coll:"innovative design 创新设计",ex:"The app has an innovative interface."},
    {w:"legitimate",ph:"/lɪˈdʒɪtɪmət/",m:"adj. 合法的；合理的",coll:"legitimate reason 正当理由",ex:"He has a legitimate complaint."},
    {w:"phenomenon",ph:"/fəˈnɒmɪnən/",m:"n. 现象",coll:"a natural phenomenon 自然现象",ex:"Global warming is a worrying phenomenon."},
    {w:"promote",ph:"/prəˈməʊt/",m:"v. 促进；提升",coll:"promote development 促进发展",ex:"Education promotes social mobility."},
    {w:"significant",ph:"/sɪɡˈnɪfɪkənt/",m:"adj. 重大的；显著的",coll:"significant impact 重大影响",ex:"There was a significant increase."},
    {w:"sustainable",ph:"/səˈsteɪnəbl/",m:"adj. 可持续的",coll:"sustainable development 可持续发展",ex:"We need sustainable energy."},
    {w:"transform",ph:"/trænsˈfɔːm/",m:"v. 使改变；转换",coll:"transform into 转变为",ex:"The city was transformed by technology."},
    {w:"underestimate",ph:"/ˌʌndərˈestɪmeɪt/",m:"v. 低估",coll:"underestimate the cost 低估成本",ex:"Do not underestimate the risk."},
    {w:"violate",ph:"/ˈvaɪəleɪt/",m:"v. 违反；侵犯",coll:"violate the law 违反法律",ex:"They violated the agreement."},
    {w:"vulnerable",ph:"/ˈvʌlnərəbl/",m:"adj. 脆弱的；易受伤害的",coll:"vulnerable group 弱势群体",ex:"Children are especially vulnerable."},
    {w:"worthwhile",ph:"/ˌwɜːθˈwaɪl/",m:"adj. 值得的",coll:"a worthwhile effort 值得的努力",ex:"The trip was worthwhile."},
    {w:"yield",ph:"/jiːld/",m:"v. 产生；屈服",coll:"yield to 屈服于",ex:"The investment yielded high returns."},
    {w:"zone",ph:"/zəʊn/",m:"n. 区域",coll:"comfort zone 舒适区",ex:"Step out of your comfort zone."}
  ];
  function words() {
    let w = S.val("ielts_words", null);
    if (!w) { w = SEED.map(x => ({ ...x, level: 0, next: D.today() })); S.setVal("ielts_words", w); }
    return w;
  }
  function saveWords(w) { S.setVal("ielts_words", w); }
  function target() { return S.val("ielts_target", 20); }
  function vocabCheckin(dk) { return S.val("ielts_vocab_ck", {})[dk]; }
  function speakWord(w) {
    try { const u = new SpeechSynthesisUtterance(w); u.lang = "en-US"; u.rate = 0.9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) {}
  }

  // 简单间隔重复：level 0→1天,1→2,2→4,3→7,4→15,5→30
  const INTERVALS = [1, 2, 4, 7, 15, 30];

  Pages.english = function (root) {
    root.innerHTML = `
      <div class="stack page-pad">
        <!-- 词汇打卡 -->
        <div class="card">
          <h3 class="section-title">📝 雅思词汇打卡 <span class="tag">《雅思词汇真经》</span>
            <span class="spacer"></span>
            <label style="font-size:12px;color:var(--text-2)">每日目标
              <input class="input" type="number" id="voc-target" value="${target()}" style="width:70px;display:inline-block;margin-left:6px"></label>
          </h3>
          <div class="grid-4" id="voc-stats" style="margin-bottom:6px"></div>
          <div id="voc-area"></div>
        </div>

        <!-- 四板块学习记录 -->
        <h3 class="section-title" style="margin:4px 2px">📚 学习记录</h3>
        <div id="sec-grid"></div>
      </div>`;

    buildVocab(root);
    buildSections(root);
  };

  /* ---------- 词汇打卡 ---------- */
  function buildVocab(root) {
    const area = root.querySelector("#voc-area");
    const statsEl = root.querySelector("#voc-stats");
    root.querySelector("#voc-target").onchange = (e) => { S.setVal("ielts_target", Math.max(1, parseInt(e.target.value)||20)); App.toast("每日目标已更新", "📝"); };
    let session = null;

    function renderStats() {
      const w = words();
      const learned = w.filter(x => x.level > 0).length;
      const ck = S.val("ielts_vocab_ck", {});
      const days = Object.keys(ck).length;
      const newToday = (S.val("ielts_new_today", {})[D.today()] || 0);
      const cards = [
        { n: learned, l: "已背单词", e: "📚" },
        { n: days, l: "打卡天数", e: "🔥" },
        { n: newToday, l: "今日新词", e: "✨" },
        { n: w.length, l: "词库总量", e: "📖" }
      ];
      statsEl.innerHTML = cards.map(c => `
        <div class="card voc-stat">
          <div class="stat-label">${c.e} ${c.l}</div>
          <div class="stat-num">${c.n}</div>
        </div>`).join("");
    }

    function buildQueue() {
      const w = words(); const dk = D.today(); const tgt = target();
      const newToday = (S.val("ielts_new_today", {})[dk] || 0);
      let due = w.filter(x => x.next <= dk);
      let news = due.filter(x => x.level === 0);
      const reviews = due.filter(x => x.level > 0);
      let allowedNew = Math.max(0, tgt - newToday);
      news = news.slice(0, allowedNew);
      const queue = reviews.concat(news);
      for (let i = queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [queue[i], queue[j]] = [queue[j], queue[i]]; }
      queue.forEach(q => q._new = (q.level === 0));
      session = { queue, idx: 0, studiedNew: 0 };
    }
    function render() {
      if (!session) buildQueue();
      const dk = D.today();
      if (vocabCheckin(dk)) {
        area.innerHTML = `<div class="item" style="border-color:rgba(124,205,176,.4)">
          <span class="badge ok">今日已完成</span>
          <div class="grow"><div class="title">词汇打卡已完成 ✅</div><div class="meta">继续复习可点「再来一组」</div></div>
          <button class="btn sm" id="voc-more">再来一组</button></div>`;
        area.querySelector("#voc-more").onclick = () => { session = null; buildQueue(); step(); };
        return;
      }
      if (session.idx >= session.queue.length) {
        area.innerHTML = `<div class="empty">🎉 今日这组词复习/学习完毕！<br><button class="btn primary" id="voc-ck" style="margin-top:10px">完成今日词汇打卡</button></div>`;
        area.querySelector("#voc-ck").onclick = () => {
          const m = S.val("ielts_vocab_ck", {}); m[dk] = true; S.setVal("ielts_vocab_ck", m);
          render(); renderStats(); App.toast("今日词汇打卡完成 💪", "✅");
        };
        return;
      }
      step();
    }
    function step() {
      const item = session.queue[session.idx];
      const total = session.queue.length;
      area.innerHTML = `
        <div class="row" style="margin-bottom:10px">
          <div class="progress-ring" style="--p:${Math.round(session.idx/total*100)}"><b>${session.idx+1}/${total}</b></div>
          <div class="muted" style="font-size:12px;align-self:center">认识→升级复习间隔；模糊→维持；不认识→回到初始</div>
        </div>
        <div class="card" style="background:var(--card-bg-2);text-align:center;padding:26px">
          <div style="font-size:30px;font-weight:700;letter-spacing:1px;display:inline-flex;align-items:center;gap:10px">
            ${item.w}
            <button class="btn sm icon" id="voc-speak" title="发音">🔊</button>
          </div>
          <div class="muted" style="margin-top:6px;font-size:14px">${item.ph || ""}</div>
          <div id="voc-mean" class="muted" style="margin-top:10px;font-size:15px;visibility:hidden">${item.m}</div>
        </div>
        <div class="row" style="margin-top:14px;justify-content:center">
          <button class="btn" id="voc-show">显示释义</button>
          <button class="btn primary" data-kn="know" disabled>认识</button>
          <button class="btn" data-kn="vague" disabled>模糊</button>
          <button class="btn danger" data-kn="unknow" disabled>不认识</button>
        </div>
        <div class="muted" style="text-align:center;font-size:12px;margin-top:8px">🎧 点 🔊 听发音，显示释义后判断是否掌握</div>`;
      area.querySelector("#voc-speak").onclick = () => speakWord(item.w);
      area.querySelector("#voc-show").onclick = () => {
        area.querySelector("#voc-mean").style.visibility = "visible";
        area.querySelector("#voc-extra").style.visibility = "visible";
        area.querySelectorAll("[data-kn]").forEach(b => b.disabled = false);
      };
      area.querySelectorAll("[data-kn]").forEach(b => b.onclick = () => {
        const w = words(); const cur = w.find(x => x.w === item.w);
        if (b.dataset.kn === "know") cur.level = Math.min(5, cur.level + 1);
        else if (b.dataset.kn === "vague") { /* 维持 */ }
        else { cur.level = 0; }
        cur.next = D.addDays(D.today(), INTERVALS[cur.level]);
        if (session.queue[session.idx]._new && b.dataset.kn !== "unknow") {
          session.studiedNew++; const nt = S.val("ielts_new_today", {}); nt[D.today()] = (nt[D.today()]||0)+1; S.setVal("ielts_new_today", nt);
        }
        saveWords(w); session.idx++; render(); renderStats();
      });
    }
    renderStats();
    render();
  }

  /* ---------- 四板块学习记录（标签页：听力/阅读/口语/写作，各自时间线） ---------- */
  function buildSections(root) {
    const mount = root.querySelector("#sec-grid");
    const SECTIONS = [
      { key: "listen", emoji: "🎧", name: "听力训练" },
      { key: "read", emoji: "📖", name: "阅读训练" },
      { key: "speak", emoji: "🗣️", name: "口语训练" },
      { key: "write", emoji: "✍️", name: "写作训练" }
    ];
    let active = SECTIONS[0].key;

    function render() {
      const s = SECTIONS.find(x => x.key === active);
      mount.innerHTML = `
        <div class="card" style="padding:18px">
          <div class="row" id="sec-tabs" style="margin-bottom:14px">
            ${SECTIONS.map(x => `<span class="chip ${x.key === active ? 'active' : ''}" data-k="${x.key}">${x.emoji} ${x.name}</span>`).join("")}
          </div>
          <div class="row" style="margin-bottom:10px;align-items:flex-end">
            <div class="grow"><label class="field">当日学习内容</label>
              <textarea class="textarea" id="s-content" placeholder="学了什么…" style="min-height:60px"></textarea></div>
          </div>
          <div class="row" style="align-items:flex-end">
            <input class="input" type="number" id="s-time" placeholder="用时(分钟)" style="max-width:120px">
            <input class="input grow" id="s-note" placeholder="学习心得 / 反思…" style="margin-left:10px">
            <button class="btn primary" id="s-save">保存记录</button>
          </div>
          <div id="s-list" style="margin-top:14px"></div>
        </div>`;

      function renderList() {
        const all = S.getAll("eng_" + active);
        const dates = Object.keys(all).filter(k => all[k] && all[k].length).sort().reverse();
        const box = mount.querySelector("#s-list");
        if (!dates.length) { box.innerHTML = `<div class="empty" style="padding:10px">还没有「${s.name}」记录</div>`; return; }
        const WK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
        box.innerHTML = `<div class="field" style="margin-top:6px">历史记录（按日期 · 向下滑动回看 · 最新在上）</div>
          <div class="tl-scroll">
            ${dates.map(dk => `
              <div class="news-node">
                <div class="news-date"><span class="news-dot"></span><b>${dk}</b> <span class="muted" style="font-size:12px">${WK[D.parse(dk).getDay()]}</span></div>
                <div style="margin-top:8px">
                  ${all[dk].map(r => `
                    <div class="item" style="padding:9px 11px;margin-bottom:7px">
                      <div class="grow">
                        <div class="title" style="font-size:13px">${escapeHtml(r.content) || "(空)"}${r.time ? ` · ${r.time}分钟` : ""}</div>
                        ${r.note ? `<div class="meta">${escapeHtml(r.note)}</div>` : ""}
                      </div>
                      <button class="btn sm icon" data-edit="${r.id}" data-date="${dk}" title="编辑">✏️</button>
                      <button class="btn sm icon danger" data-del="${r.id}" data-date="${dk}" title="删除">🗑️</button>
                    </div>`).join("")}
                </div>
              </div>`).join("")}
          </div>`;
      }
      mount.querySelector("#sec-tabs").onclick = (e) => {
        const c = e.target.closest("[data-k]"); if (!c) return;
        active = c.dataset.k; render();
      };
      mount.querySelector("#s-save").onclick = () => {
        const content = mount.querySelector("#s-content").value.trim();
        const time = mount.querySelector("#s-time").value;
        const note = mount.querySelector("#s-note").value.trim();
        if (!content && !time && !note) { App.toast("请填写内容后再保存", "⚠️"); return; }
        S.add("eng_" + active, D.today(), { content, time, note });
        mount.querySelector("#s-content").value = "";
        mount.querySelector("#s-time").value = "";
        mount.querySelector("#s-note").value = "";
        renderList(); App.toast(s.name + " 已记录", "📚");
      };
      mount.querySelector("#s-list").onclick = (e) => {
        const dl = e.target.closest("[data-del]");
        const ed = e.target.closest("[data-edit]");
        if (dl) { S.remove("eng_" + active, dl.dataset.date, dl.dataset.del); renderList(); App.toast("已删除", "🗑️"); }
        if (ed) {
          const all = S.getAll("eng_" + active)[ed.dataset.date] || [];
          const r = all.find(x => x.id === ed.dataset.edit); if (!r) return;
          App.modal.open("✏️ 编辑「" + s.name + "」", `
            <label class="field">当日学习内容</label>
            <textarea class="textarea" name="content" style="min-height:60px">${escapeHtml(r.content||"")}</textarea>
            <div class="row">
              <div class="grow"><label class="field">用时(分钟)</label><input class="input" name="time" value="${r.time||""}"></div>
              <div class="grow"><label class="field">心得/反思</label><input class="input" name="note" value="${escapeHtml(r.note||"")}"></div>
            </div>`, {
            okText: "保存", cancel: false,
            onOk(m) {
              const v = App.formVals(m);
              S.update("eng_" + active, ed.dataset.date, ed.dataset.edit, { content: v.content, time: v.time, note: v.note });
              renderList(); App.toast("已更新", "✏️");
            }
          });
        }
      };
      renderList();
    }
    render();
  }

  function escapeHtml(s){return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
})();
