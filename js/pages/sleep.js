/* pages/sleep.js — 早睡监督：近3个月日历 + 睡觉打卡 + 月度达标奖励 */
(function () {
  window.App = window.App || {};
  window.Pages = window.Pages || {};
  const App = window.App, D = App.date, S = App.store;

  const LOCKED = { label: "未达标", emoji: "💤", locked: true };
  const DEFAULT_REWARDS = [
    { min: 50, max: 70, label: "奶茶一杯", emoji: "☕" },
    { min: 70, max: 90, label: "火锅一顿", emoji: "🍲" },
    { min: 90, max: 100.01, label: "跳舞衣服一套", emoji: "👗" }
  ];
  const REWARD_EMOJIS = ["☕","🍲","👗","🍰","🍦","🍩","🍪","🍫","🍓","🍕","🍣","🍱","🥘","🥗","🍜","🥟","🍔","🌮","🍷","🍵","🎁","🎀","🌸","💐","🌹","🌻","⭐","✨","🌟","💎","🧸","🎈","🎉","🛍️","👑","💄","👠","👜","🕶️","🧣","👙","🩱","👘","🥻","🥿","👢","🎧","📚","🖊️","🎨","🎭","🎬","🎸","🎹","🎮","🏸","🏊","🧘","🎿","🪁"];

  function standard() { return S.val("sleep_standard", "23:30"); }
  function setStandard(v) { S.setVal("sleep_standard", v); }
  function rewards() { return S.val("sleep_rewards", DEFAULT_REWARDS.map(r => ({ ...r }))); }
  function setRewards(v) { S.setVal("sleep_rewards", v); }

  function toMin(hhmm) { const p = (hhmm || "0:0").split(":"); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }
  function sleepCutoff() {
    const td = D.parse(D.today()); const y = td.getFullYear(), m = td.getMonth() + 1;
    return D.key(new Date(y, m - 1 - 2, 1));
  }
  function purgeOld() {
    const cut = sleepCutoff();
    const pre = App.PREFIX + "sleep:";
    Object.keys(localStorage).forEach(k => {
      if (!k.startsWith(pre)) return;
      const dk = k.slice(pre.length);
      if (dk < cut) localStorage.removeItem(k);
    });
  }

  function rewardFor(ratio) {
    if (ratio < 50) return LOCKED;
    return rewards().find(r => ratio >= r.min && ratio < r.max) || LOCKED;
  }
  function cheerText(ratio) {
    if (ratio < 30) return "早睡之路刚开始，今晚就开始吧 🌙";
    if (ratio < 50) return "再坚持一下，很快就能兑换奖励啦 💪";
    if (ratio < 70) return "太棒了，奶茶正在向妳招手 ☕";
    if (ratio < 90) return "火锅奖励近在咫尺，继续保持 🍲";
    return "简直就是早睡冠军，跳舞衣服稳了 👗";
  }
  function ratioColor(ratio) {
    if (ratio < 50) return "#7a6aa8";   // 深紫
    if (ratio < 70) return "#c0528e";   // 深粉
    if (ratio < 90) return "#d64d7a";   // 玫红
    return "#d4a017";                   // 深金
  }
  function monthStats(y, m) {
    const daysInMonth = new Date(y, m, 0).getDate();
    let okDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = D.key(new Date(y, m - 1, d));
      const r = S.val("sleep:" + dk, null);
      if (r && !r.late) okDays++;
    }
    const ratio = daysInMonth ? Math.round((okDays / daysInMonth) * 1000) / 10 : 0;
    return { daysInMonth, okDays, ratio };
  }

  Pages.sleep = function (root) {
    root.innerHTML = `
      <div class="stack page-pad">
        <div class="card">
          <div class="row" style="align-items:center;gap:12px;flex-wrap:wrap">
            <span style="font-size:22px">🌙</span>
            <span class="section-title" style="margin:0">熬夜分界线</span>
            <input class="input" type="time" id="sleep-std" value="${standard()}" style="max-width:160px;margin-left:auto">
          </div>
        </div>

        <div class="card">
          <h3 class="section-title" style="display:flex;align-items:center">
            📅 睡眠日历
            <span class="spacer"></span>
            <button class="btn primary" id="sleep-ck">😴 睡觉打卡</button>
          </h3>
          <div class="row" style="margin-bottom:10px">
            <button class="btn sm" id="sleep-prev">‹</button>
            <span id="sleep-cal-m" style="flex:1;text-align:center;font-weight:600"></span>
            <button class="btn sm" id="sleep-next">›</button>
          </div>
          <div class="cal-grid" id="sleep-cal"></div>
          <div class="cal-legend">
            <span><i style="background:rgba(124,205,176,.42)"></i>未熬夜</span>
            <span><i style="background:rgba(224,98,122,.42)"></i>熬夜</span>
            <span><i style="background:var(--card-bg-2);border:1px solid var(--line)"></i>未打卡</span>
          </div>
        </div>

        <div class="card">
          <h3 class="section-title" style="display:flex;align-items:center">
            📊 本月早睡达标率
            <span class="spacer"></span>
            <button class="btn sm icon" id="sleep-reward-edit" title="修改奖品">⚙️</button>
          </h3>
          <div class="row" style="align-items:center;gap:14px;margin:14px 0">
            <div style="flex:1">
              <div style="font-size:40px;font-weight:700;line-height:1"><span id="sleep-rate">0</span><span style="font-size:18px;font-weight:500">%</span></div>
              <div class="muted" id="sleep-rate-text" style="margin-top:4px;font-size:13px">未熬夜 0 / 本月 0 天</div>
            </div>
          </div>
          <div class="progress-wrap" style="margin-bottom:16px">
            <div class="progress-bar" id="sleep-progress" style="width:0%"></div>
          </div>
          <div class="row" style="align-items:center;gap:12px">
            <div class="grow" id="sleep-cheer" style="font-size:13px;line-height:1.5;color:var(--text-soft)">早睡之路刚开始，今晚就开始吧 🌙</div>
            <button class="btn primary" id="sleep-redeem">🎁 兑换奖励</button>
          </div>
        </div>
      </div>`;

    let cursor = D.today().slice(0, 7);
    const maxMonth = D.today().slice(0, 7);
    const minMonth = sleepCutoff().slice(0, 7);

    function monthKeyAdd(mk, delta) {
      const [y, m] = mk.split("-").map(Number);
      return D.key(new Date(y, m - 1 + delta, 1)).slice(0, 7);
    }

    function renderCal() {
      const [y, m] = cursor.split("-").map(Number);
      root.querySelector("#sleep-cal-m").textContent = `${y} 年 ${m} 月`;
      const cells = D.monthMatrix(y, m);
      root.querySelector("#sleep-cal").innerHTML = cells.map(ck => {
        const cd = D.parse(ck); const out = cd.getMonth() + 1 !== m;
        const r = S.val("sleep:" + ck, null);
        const cls = r ? (r.late ? "sleep-late" : "sleep-ok") : "";
        const face = r ? (r.late ? "😣" : "😊") : "";
        return `<div class="cal-cell ${out ? 'out' : ''} ${cls}" data-date="${ck}">
          <span>${cd.getDate()}</span>
          ${face ? `<span class="face">${face}</span>` : ""}
        </div>`;
      }).join("");
      root.querySelector("#sleep-prev").disabled = cursor <= minMonth;
      root.querySelector("#sleep-next").disabled = cursor >= maxMonth;
      renderStats(y, m);
    }

    function renderStats(y, m) {
      const { daysInMonth, okDays, ratio } = monthStats(y, m);
      const r = rewardFor(ratio);
      const color = ratioColor(ratio);
      const rateEl = root.querySelector("#sleep-rate");
      rateEl.textContent = ratio;
      rateEl.style.color = color;
      root.querySelector("#sleep-rate-text").textContent = `未熬夜 ${okDays} / 本月 ${daysInMonth} 天`;
      root.querySelector("#sleep-cheer").textContent = cheerText(ratio);
      const bar = root.querySelector("#sleep-progress");
      bar.style.width = Math.min(100, ratio) + "%";
      bar.style.background = color;
      const redeem = root.querySelector("#sleep-redeem");
      redeem.disabled = ratio < 50;
      redeem.textContent = ratio < 50 ? "🔒 未达标" : `🎁 兑换 ${r.emoji} ${r.label}`;
    }

    function doCheck() {
      const now = new Date();
      const t = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
      const late = toMin(t) > toMin(standard());
      S.setVal("sleep:" + D.today(), { time: t, late });
      renderCal();
      App.toast(late ? "熬夜了，明天早点睡 😣" : "未熬夜，好棒 😊", late ? "😣" : "😊");
    }
    function askCheck() { App.confirm("确认现在放下手机睡觉？", doCheck); }

    function redeem() {
      const [y, m] = cursor.split("-").map(Number);
      const { ratio } = monthStats(y, m);
      const r = rewardFor(ratio);
      if (ratio < 50) { App.toast("达标率还不够，继续早睡加油 💪", "💤"); return; }
      App.modal.open(`🎉 兑换成功`, `
        <div style="text-align:center;padding:10px 0">
          <div style="font-size:56px">${r.emoji}</div>
          <div class="title" style="margin-top:10px">恭喜你！本月早睡达标率 ${ratio}%</div>
          <div class="meta" style="margin-top:6px">可兑换奖励：${r.label}</div>
        </div>
      `, { okText: "收下奖励", cancel: false });
    }

    function editRewards() {
      const list = rewards();
      const rows = list.map((r, i) => `
        <div style="margin-bottom:14px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--card-bg-2)">
          <div class="row" style="align-items:center;gap:10px;margin-bottom:10px">
            <button class="btn sm icon" id="reward-pick-${i}" style="font-size:26px;width:46px;height:46px;border-radius:50%;flex-shrink:0" title="点击更换表情">${r.emoji}</button>
            <input type="hidden" name="emoji${i}" value="${escapeHtml(r.emoji)}">
            <div class="grow"><div class="title">${r.min}% ~ ${r.max >= 100 ? '100%' : r.max + '%'}</div></div>
          </div>
          <div class="emoji-grid" id="reward-grid-${i}" style="display:none;margin:8px 0 12px">
            ${REWARD_EMOJIS.map(e => `<span class="chip ${e === r.emoji ? 'active' : ''}" data-e="${e}">${e}</span>`).join("")}
          </div>
          <label class="field">奖品名</label>
          <input class="input" name="label${i}" value="${escapeHtml(r.label)}" placeholder="如：奶茶一杯">
        </div>
      `).join("");
      App.modal.open("⚙️ 修改达标奖励", rows, {
        okText: "保存", cancel: false,
        onOpen(m) {
          list.forEach((r, i) => {
            const btn = m.querySelector(`#reward-pick-${i}`);
            const input = m.querySelector(`[name="emoji${i}"]`);
            const grid = m.querySelector(`#reward-grid-${i}`);
            btn.onclick = () => {
              const willShow = grid.style.display === "none";
              m.querySelectorAll('.emoji-grid').forEach(g => g.style.display = "none");
              grid.style.display = willShow ? "flex" : "none";
            };
            grid.onclick = (e) => {
              const s = e.target.closest("[data-e]");
              if (!s) return;
              const em = s.dataset.e;
              input.value = em;
              btn.textContent = em;
              grid.style.display = "none";
              grid.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.e === em));
            };
          });
        },
        onOk(m) {
          const next = list.map((r, i) => ({
            ...r,
            emoji: (m.querySelector(`[name="emoji${i}"]`).value || r.emoji).trim(),
            label: (m.querySelector(`[name="label${i}"]`).value || r.label).trim()
          }));
          setRewards(next);
          const [y, mm] = cursor.split("-").map(Number);
          renderStats(y, mm);
          App.toast("奖励设置已保存", "⚙️");
        }
      });
    }

    root.querySelector("#sleep-std").onchange = (e) => { setStandard(e.target.value); renderCal(); App.toast("分界线已更新", "🌙"); };
    root.querySelector("#sleep-ck").onclick = askCheck;
    root.querySelector("#sleep-prev").onclick = () => { if (cursor > minMonth) { cursor = monthKeyAdd(cursor, -1); renderCal(); } };
    root.querySelector("#sleep-next").onclick = () => { if (cursor < maxMonth) { cursor = monthKeyAdd(cursor, 1); renderCal(); } };
    root.querySelector("#sleep-redeem").onclick = redeem;
    root.querySelector("#sleep-reward-edit").onclick = editRewards;
    root.querySelector("#sleep-cal").onclick = (e) => {
      const c = e.target.closest("[data-date]"); if (!c) return;
      const ck = c.dataset.date; const r = S.val("sleep:" + ck, null);
      if (!r) return;
      App.modal.open(`${ck} 睡眠记录`, `
        <div class="row" style="align-items:center">
          <span style="font-size:32px">${r.late ? '😣' : '😊'}</span>
          <div class="grow"><div class="title">${r.late ? '熬夜' : '未熬夜'}</div><div class="meta">打卡时间 ${r.time} · 分界线 ${standard()}</div></div>
        </div>
        <div class="muted" style="font-size:12px;margin-top:10px">删除后该日将恢复为「未打卡」。</div>
      `, {
        okText: "🗑️ 删除该日记录", cancelText: "关闭",
        onOk() { S.setVal("sleep:" + ck, null); renderCal(); App.toast("已删除", "🗑️"); }
      });
    };

    purgeOld();
    renderCal();
  };

  function escapeHtml(s){return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}
})();
