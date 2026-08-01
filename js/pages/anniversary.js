/* pages/anniversary.js — 纪念日：生日 + 特别意义日 */
(function () {
  window.App = window.App || {};
  window.Pages = window.Pages || {};
  const App = window.App, D = App.date, S = App.store;

  const BIRTH_EMOJIS = ["👩","👨","👵","👴","👧","👦","👶","🤱","🐱","🐶","🐰","🐹","🐦","🐟","🎂","🧁"];
  const SPECIAL_EMOJIS = ["💕","💍","🥂","🌹","💼","🕯️","🌟","🌈","🎊","🤝"];

  // 标签渲染（与健身页面统一）
  function renderTagWrap(container, tags, activeTag, opts = {}) {
    if (!container) return;
    let html = tags.map(t => {
      const active = t === activeTag;
      return `<span class="chip ${active ? 'active' : ''}" data-tag="${escapeHtml(t)}" title="${opts.title || ''}">${escapeHtml(t)}${opts.editable ? `<button class="tag-x" data-deltag="${escapeHtml(t)}" title="删除">×</button>` : ""}</span>`;
    }).join("");
    if (opts.showAdd) html += `<span class="chip add-tag" data-addtag="1">＋ 新建</span>`;
    if (opts.all) html = `<span class="chip ${!activeTag ? 'active' : ''}" data-tag="">全部</span>` + html;
    container.innerHTML = html;
  }

  // 绑定标签点击：切换 / 新建 / 删除
  function bindTagWrap(container, state, renderFn, opts = {}) {
    container.onclick = (e) => {
      const add = e.target.closest("[data-addtag]");
      const del = e.target.closest("[data-deltag]");
      const tagEl = e.target.closest("[data-tag]");
      if (add) {
        App.modal.open(opts.addTitle || "＋ 新建标签", `
          <label class="field">标签名称</label>
          <input class="input" name="nt" placeholder="${opts.placeholder || '如：朋友'}">`, {
          okText: "添加", cancel: false,
          onOk(m) {
            const v = (m.querySelector('[name="nt"]').value || "").trim();
            if (!v) { App.toast("请填写名称", "⚠️"); return false; }
            if (state.tags.includes(v)) { App.toast("该标签已存在", "ℹ️"); return false; }
            state.tags.push(v);
            if (opts.onAdd) opts.onAdd(v);
            state.active = v;
            renderFn();
            App.toast("已添加标签：" + v, "🏷️");
          }
        });
        return;
      }
      if (del) {
        const t = del.dataset.deltag;
        const hasRecords = opts.hasRecords ? opts.hasRecords(t) : false;
        const doDel = () => {
          state.tags = state.tags.filter(x => x !== t);
          if (state.active === t) state.active = state.tags[0] || "";
          if (opts.onDel) opts.onDel(t);
          renderFn();
          App.toast("已删除标签：" + t, "🗑️");
        };
        if (hasRecords) {
          App.confirm("该标签下已有记录，删除会同时清空相关记录，是否继续？", doDel);
        } else {
          doDel();
        }
        return;
      }
      if (tagEl) {
        state.active = tagEl.dataset.tag || "";
        renderFn();
      }
    };
  }

  // 获取/保存数据
  function getBirthdays() { return S.listGet("anniversary_birthday"); }
  function setBirthdays(arr) { S.listSet("anniversary_birthday", arr); }
  function getSpecials() { return S.listGet("anniversary_special"); }
  function setSpecials(arr) { S.listSet("anniversary_special", arr); }

  // 拼音首字母（简单版：按 Unicode 范围判断，英文直接取首字母）
  function firstLetter(name) {
    if (!name) return "#";
    const c = name.charAt(0);
    if (/[a-zA-Z]/.test(c)) return c.toUpperCase();
    // 简单映射常见姓氏/汉字首字母（A-Z 粗略范围）
    const code = c.charCodeAt(0);
    if (code >= 0x4e00 && code <= 0x9fa5) {
      const str = "吖八嚓哒妸发旮哈讥咔垃痳拏噢妑七然仨他哇哇哇夕丫匝";
      const letters = "ABCDEFGHJKLMNOPQRSTWWXYZ";
      for (let i = str.length - 1; i >= 0; i--) {
        if (code >= str.charCodeAt(i)) return letters[i];
      }
      return "A";
    }
    return "#";
  }

  // 计算两个日期间相差的天数（含今天）
  function durationDays(start, end) {
    return D.diffDays(end, start) + 1;
  }

  // 格式化持续时长
  function formatDuration(start, end, mode) {
    const total = durationDays(start, end);
    if (mode === "total") return `共 ${total} 天`;
    const s = D.parse(start), e = D.parse(end);
    let years = e.getFullYear() - s.getFullYear();
    let months = e.getMonth() - s.getMonth();
    let days = e.getDate() - s.getDate();
    if (days < 0) { months--; days += D.daysInMonth(s.getFullYear(), s.getMonth() + 1); }
    if (months < 0) { years--; months += 12; }
    // 用 years + days 近似
    const approxDays = D.diffDays(end, D.key(new Date(s.getFullYear() + years, s.getMonth(), s.getDate())));
    return `${years} 年 ${approxDays} 天`;
  }

  // 将 MM-DD 转换为今年 YYYY-MM-DD
  function mmddToThisYear(mmdd) {
    const [m, d] = (mmdd || "").split("-").map(Number);
    if (!m || !d) return "";
    const y = new Date().getFullYear();
    return D.key(new Date(y, m - 1, d, 12, 0, 0));
  }

  // 将纪念日同步到首页迷你日历：生日/特别意义日都按今年日期每年循环显示
  function syncCalendar() {
    if (!App.Calendar || !App.Calendar.eventsAll) return;
    // 旧版无 _src 的纪念日数据正则（用于兼容清理）
    const oldAnnRe = /^(🎂|🧁|🍰|🎈|🎁|🎉|🌸|💐|💕|💍|🥂|🌹|💼|🕯️|🌟|🌈|🎊|🤝|❤️|💖)\s*(生日|开始|结束|纪念日)/;
    const add = {};
    // 生日：统一按国历 MM-DD，每年同月同日提醒
    getBirthdays().forEach(b => {
      const dk = mmddToThisYear(b.date);
      if (!dk) return;
      add[dk] = add[dk] || [];
      add[dk].push({
        text: `${b.emoji || "🎂"} 生日：${escapeHtml(b.name || "")}${b.tag ? " · " + escapeHtml(b.tag) : ""}`,
        emoji: b.emoji || "🎂", _src: "anniversary"
      });
    });

    // 特别意义日：按开始日期的 MM-DD，每年同月同日提醒（不显示结束日期）
    getSpecials().forEach(s => {
      const dk = mmddToThisYear(s.startDate ? s.startDate.slice(5) : "");
      if (!dk) return;
      add[dk] = add[dk] || [];
      add[dk].push({
        text: `${s.emoji || "💖"} ${escapeHtml(s.title || "")}${s.tag ? " · " + escapeHtml(s.tag) : ""}`,
        emoji: s.emoji || "💖", _src: "anniversary"
      });
    });

    Object.keys(add).forEach(dk => {
      App.Calendar.eventSet(dk, { _src: "anniversary", items: add[dk] });
    });
    // 清理已删除/不再存在的纪念日：对遗留日期写回真实存储（修复删除后首页标记残留）
    const live = App.Calendar.eventsAll();
    Object.keys(live).forEach(k => {
      const ev = live[k];
      if (!ev) return;
      const hasAnnSrc = (Array.isArray(ev.items) && ev.items.some(i => i._src === "anniversary")) || ev._src === "anniversary";
      const isLegacy = typeof ev.text === "string" && oldAnnRe.test(ev.text);
      if (!add[k]) {
        if (hasAnnSrc) App.Calendar.eventRemoveSrc(k, "anniversary");
        else if (isLegacy) App.Calendar.eventSet(k, null);
      }
    });
  }

  Pages.anniversary = function (root) {
    root.innerHTML = `
      <div class="stack page-pad">
        <!-- 生日 -->
        <div class="card">
          <h3 class="section-title"><span>🎂 生日</span><span class="spacer"></span><button class="btn sm primary" id="birth-add">＋ 添加生日</button></h3>
          <div class="tagwrap" id="birth-tags" style="margin-bottom:12px"></div>
          <div id="birth-list"></div>
        </div>

        <!-- 特别意义日 -->
        <div class="card">
          <h3 class="section-title"><span>💖 特别意义日</span><span class="spacer"></span><button class="btn sm primary" id="special-add">＋ 添加纪念日</button></h3>
          <div class="tagwrap" id="special-tags" style="margin-bottom:12px"></div>
          <div id="special-list"></div>
        </div>
      </div>`;

    // 状态
    const birthState = { tags: S.val("anniversary_birth_tags", ["朋友", "家人", "同事"]), active: "" };
    const specialState = { tags: S.val("anniversary_special_tags", ["恋爱", "结婚", "工作"]), active: "" };

    function saveBirthTags() { S.setVal("anniversary_birth_tags", birthState.tags); }
    function saveSpecialTags() { S.setVal("anniversary_special_tags", specialState.tags); }

    /* ---------- 生日 ---------- */
    function renderBirth() {
      renderTagWrap(root.querySelector("#birth-tags"), birthState.tags, birthState.active, { editable: false, all: true, title: "切换分类查看" });
      let arr = getBirthdays();
      if (birthState.active) arr = arr.filter(b => b.tag === birthState.active);
      // 按姓名排序
      arr = arr.slice().sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));

      const box = root.querySelector("#birth-list");
      if (!arr.length) { box.innerHTML = `<div class="empty">还没有生日记录，点右上「＋ 添加生日」吧～</div>`; return; }

      box.innerHTML = arr.map(b => {
        const dateLabel = b.date || "";
        return `
          <div class="item">
            <div class="ava">${b.emoji || "🎂"}</div>
            <div class="grow">
              <div class="title">${escapeHtml(b.name || "")} <span class="badge" style="font-weight:400">${escapeHtml(b.tag || "未分类")}</span></div>
              <div class="meta">${escapeHtml(dateLabel)}</div>
            </div>
            <button class="btn sm icon" data-edit-birth="${b.id}">✏️</button>
            <button class="btn sm icon danger" data-del-birth="${b.id}">🗑️</button>
          </div>`;
      }).join("");
    }

    function editBirth(id) {
      const arr = getBirthdays();
      const b = id ? arr.find(x => x.id === id) : { name: "", tag: birthState.active || birthState.tags[0], date: "", emoji: "👩" };
      // 兼容旧数据：若日期是 MM-DD，补全为今年日期供 date 输入框显示
      const dateVal = b.date && b.date.length === 5 ? `${new Date().getFullYear()}-${b.date}` : (b.date || "");
      App.modal.open(id ? "✏️ 编辑生日" : "＋ 添加生日", `
        <label class="field">分类标签</label>
        <div class="tagwrap" id="birth-modal-tags" style="margin-bottom:10px"></div>
        <label class="field">姓名</label>
        <input class="input" name="name" value="${escapeHtml(b.name || "")}" placeholder="如：妈妈">
        <label class="field">日期（国历生日，每年自动提醒）</label>
        <input class="input" type="date" name="date" value="${dateVal}">
        <label class="field">表情</label>
        <div class="tagwrap" id="birth-emojis" style="margin-bottom:6px">
          ${BIRTH_EMOJIS.map(e => `<span class="chip ${(b.emoji || '👩') === e ? 'active' : ''}" data-em="${e}">${e}</span>`).join("")}
        </div>
      `, {
        okText: id ? "保存" : "添加", cancel: false,
        onOpen(m) {
          let selTag = b.tag || birthState.tags[0], selEmoji = b.emoji || "👩";
          const tagBox = m.querySelector("#birth-modal-tags");
          function renderModalTags() {
            renderTagWrap(tagBox, birthState.tags, selTag, { editable: true, showAdd: true });
          }
          renderModalTags();
          tagBox.onclick = (e) => {
            const add = e.target.closest("[data-addtag]");
            const del = e.target.closest("[data-deltag]");
            const tEl = e.target.closest("[data-tag]");
            if (add) {
              App.modal.open("＋ 新建生日标签", `<label class="field">标签名称</label><input class="input" name="nt" placeholder="如：闺蜜">`, {
                okText: "添加", cancel: false,
                onOk(m2) {
                  const v = (m2.querySelector('[name="nt"]').value || "").trim();
                  if (!v) { App.toast("请填写名称", "⚠️"); return false; }
                  if (birthState.tags.includes(v)) { App.toast("该标签已存在", "ℹ️"); return false; }
                  birthState.tags.push(v); saveBirthTags(); renderBirth();
                  selTag = v;
                  App.modal.close();
                  setTimeout(() => editBirth(id), 220);
                }
              });
              return;
            }
            if (del) {
              const t = del.dataset.deltag;
              const has = getBirthdays().some(x => x.tag === t);
              const doDel = () => {
                birthState.tags = birthState.tags.filter(x => x !== t);
                if (selTag === t) selTag = birthState.tags[0] || "";
                saveBirthTags(); renderBirth(); renderModalTags();
              };
              if (has) App.confirm("该标签下已有记录，删除会同时清空相关记录，是否继续？", doDel);
              else doDel();
              return;
            }
            if (tEl) { selTag = tEl.dataset.tag || ""; renderModalTags(); m.dataset.selTag = selTag; }
          };
          m.querySelector("#birth-emojis").onclick = (e) => {
            const em = e.target.closest("[data-em]");
            if (em) {
              selEmoji = em.dataset.em;
              m.dataset.selEmoji = selEmoji;
              m.querySelectorAll("#birth-emojis .chip").forEach(x => x.classList.toggle("active", x.dataset.em === selEmoji));
            }
          };
          m.dataset.selTag = selTag; m.dataset.selEmoji = selEmoji;
        },
        onOk(m) {
          const selTag = m.querySelector('#birth-modal-tags .chip.active[data-tag]')?.dataset.tag || m.dataset.selTag || birthState.tags[0];
          const selEmoji = m.dataset.selEmoji || "👩";
          const v = App.formVals(m);
          if (!v.name.trim()) { App.toast("请填写姓名", "⚠️"); return false; }
          if (!v.date.trim()) { App.toast("请选择日期", "⚠️"); return false; }
          const dateKey = v.date.trim();
          // 统一存为 MM-DD，方便每年自动标记
          const mmdd = dateKey.length === 10 ? dateKey.slice(5) : dateKey;
          const rec = { name: v.name.trim(), tag: selTag, date: mmdd, emoji: selEmoji };
          if (id) S.listUpdate("anniversary_birthday", id, rec); else S.listAdd("anniversary_birthday", rec);
          renderBirth(); syncCalendar();
          App.toast(id ? "已更新" : "已添加生日", "🎂");
        }
      });
    }

    root.querySelector("#birth-add").onclick = () => editBirth(null);
    root.querySelector("#birth-list").onclick = (e) => {
      const ed = e.target.closest("[data-edit-birth]"), dl = e.target.closest("[data-del-birth]");
      if (ed) editBirth(ed.dataset.editBirth);
      if (dl) App.confirm("删除该生日记录？", () => {
        S.listRemove("anniversary_birthday", dl.dataset.delBirth);
        renderBirth(); syncCalendar(); App.toast("已删除", "🗑️");
      });
    };

    bindTagWrap(root.querySelector("#birth-tags"), birthState, renderBirth, {
      addTitle: "＋ 新建生日标签", placeholder: "如：闺蜜",
      onAdd: saveBirthTags, onDel: saveBirthTags,
      hasRecords: (t) => getBirthdays().some(b => b.tag === t)
    });

    /* ---------- 特别意义日 ---------- */
    function renderSpecial() {
      renderTagWrap(root.querySelector("#special-tags"), specialState.tags, specialState.active, { editable: false, all: true, title: "切换分类查看" });
      let arr = getSpecials();
      if (specialState.active) arr = arr.filter(s => s.tag === specialState.active);
      arr = arr.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
      const box = root.querySelector("#special-list");
      if (!arr.length) { box.innerHTML = `<div class="empty">还没有特别意义日，点右上「＋ 添加纪念日」吧～</div>`; return; }
      const durMode = S.val("anniversary_special_mode", "yearDay");
      box.innerHTML = `
        <div class="row" style="justify-content:flex-end;margin-bottom:8px">
          <button class="btn sm ghost" id="special-mode-switch">切换显示：${durMode === "yearDay" ? "X年X天" : "总共X天"}</button>
        </div>
        ${arr.map(s => {
          const end = s.isForever ? D.today() : s.endDate;
          const dur = formatDuration(s.startDate, end, durMode);
          const endText = s.isForever ? "至今" : s.endDate;
          return `<div class="item">
            <div class="ava">${s.emoji || "💖"}</div>
            <div class="grow">
              <div class="title">${escapeHtml(s.title)}${s.target ? ` · ${escapeHtml(s.target)}` : ""} <span class="badge" style="font-weight:400">${escapeHtml(s.tag || "未分类")}</span></div>
              <div class="meta">${s.startDate} → ${endText} · ${dur}</div>
            </div>
            <button class="btn sm icon" data-edit-special="${s.id}">✏️</button>
            <button class="btn sm icon danger" data-del-special="${s.id}">🗑️</button>
          </div>`;
        }).join("")}`;
    }

    root.querySelector("#special-list").onclick = (e) => {
      const sw = e.target.closest("#special-mode-switch");
      if (sw) {
        const cur = S.val("anniversary_special_mode", "yearDay");
        const next = cur === "yearDay" ? "total" : "yearDay";
        S.setVal("anniversary_special_mode", next);
        renderSpecial();
        return;
      }
      const ed = e.target.closest("[data-edit-special]"), dl = e.target.closest("[data-del-special]");
      if (ed) editSpecial(ed.dataset.editSpecial);
      if (dl) App.confirm("删除该纪念日？", () => {
        S.listRemove("anniversary_special", dl.dataset.delSpecial);
        renderSpecial(); syncCalendar(); App.toast("已删除", "🗑️");
      });
    };

    function editSpecial(id) {
      const arr = getSpecials();
      const s = id ? arr.find(x => x.id === id) : { title: "", tag: specialState.active || specialState.tags[0], target: "", startDate: D.today(), endDate: D.today(), isForever: true, emoji: "💖" };
      App.modal.open(id ? "✏️ 编辑特别意义日" : "＋ 添加特别意义日", `
        <label class="field">分类标签</label>
        <div class="tagwrap" id="special-modal-tags" style="margin-bottom:10px"></div>
        <label class="field">对象</label>
        <input class="input" name="title" value="${escapeHtml(s.title)}" placeholder="如：在一起">
        <div class="row">
          <div class="grow">${App.dateInput("startDate", s.startDate, "开始日期")}</div>
        </div>
        <label class="field">持续方式</label>
        <div class="tagwrap" style="margin-bottom:10px">
          <span class="chip ${s.isForever ? 'active' : ''}" data-end="forever">至今</span>
          <span class="chip ${!s.isForever ? 'active' : ''}" data-end="date">固定日期</span>
        </div>
        <div id="special-end-date-box" style="display:${s.isForever ? 'none' : 'block'}">
          ${App.dateInput("endDate", s.endDate, "结束日期")}
        </div>
        <label class="field">表情</label>
        <div class="tagwrap" id="special-emojis" style="margin-bottom:6px">
          ${SPECIAL_EMOJIS.map(e => `<span class="chip ${(s.emoji || '💖') === e ? 'active' : ''}" data-em="${e}">${e}</span>`).join("")}
        </div>
      `, {
        okText: id ? "保存" : "添加", cancel: false,
        onOpen(m) {
          let selTag = s.tag || specialState.tags[0], selEmoji = s.emoji || "💖", isForever = !!s.isForever;
          const tagBox = m.querySelector("#special-modal-tags");
          function renderModalTags() {
            renderTagWrap(tagBox, specialState.tags, selTag, { editable: true, showAdd: true });
          }
          renderModalTags();
          tagBox.onclick = (e) => {
            const add = e.target.closest("[data-addtag]");
            const del = e.target.closest("[data-deltag]");
            const tEl = e.target.closest("[data-tag]");
            if (add) {
              App.modal.open("＋ 新建纪念日标签", `<label class="field">标签名称</label><input class="input" name="nt" placeholder="如：忌日">`, {
                okText: "添加", cancel: false,
                onOk(m2) {
                  const v = (m2.querySelector('[name="nt"]').value || "").trim();
                  if (!v) { App.toast("请填写名称", "⚠️"); return false; }
                  if (specialState.tags.includes(v)) { App.toast("该标签已存在", "ℹ️"); return false; }
                  specialState.tags.push(v); saveSpecialTags(); renderSpecial();
                  selTag = v;
                  App.modal.close();
                  setTimeout(() => editSpecial(id), 220);
                }
              });
              return;
            }
            if (del) {
              const t = del.dataset.deltag;
              const has = getSpecials().some(x => x.tag === t);
              const doDel = () => {
                specialState.tags = specialState.tags.filter(x => x !== t);
                if (selTag === t) selTag = specialState.tags[0] || "";
                saveSpecialTags(); renderSpecial(); renderModalTags();
              };
              if (has) App.confirm("该标签下已有记录，删除会同时清空相关记录，是否继续？", doDel);
              else doDel();
              return;
            }
            if (tEl) { selTag = tEl.dataset.tag || ""; renderModalTags(); m.dataset.selTag = selTag; }
          };
          m.querySelectorAll("[data-end]").forEach(c => c.onclick = () => {
            isForever = c.dataset.end === "forever";
            m.querySelectorAll("[data-end]").forEach(x => x.classList.toggle("active", (x.dataset.end === "forever") === isForever));
            m.querySelector("#special-end-date-box").style.display = isForever ? "none" : "block";
            m.dataset.isForever = isForever ? "1" : "";
          });
          m.querySelector("#special-emojis").onclick = (e) => {
            const em = e.target.closest("[data-em]");
            if (em) {
              selEmoji = em.dataset.em;
              m.dataset.selEmoji = selEmoji;
              m.querySelectorAll("#special-emojis .chip").forEach(x => x.classList.toggle("active", x.dataset.em === selEmoji));
            }
          };
          m.dataset.selTag = selTag; m.dataset.selEmoji = selEmoji; m.dataset.isForever = isForever ? "1" : "";
        },
        onOk(m) {
          const selTag = m.querySelector('#special-modal-tags .chip.active[data-tag]')?.dataset.tag || m.dataset.selTag || specialState.tags[0];
          const selEmoji = m.dataset.selEmoji || "💖";
          const isForever = !!m.dataset.isForever;
          const v = App.formVals(m);
          if (!v.title.trim()) { App.toast("请填写对象", "⚠️"); return false; }
          if (!isForever && !v.endDate) { App.toast("请选择结束日期", "⚠️"); return false; }
          const rec = {
            title: v.title.trim(), tag: selTag, target: "",
            startDate: v.startDate, endDate: isForever ? "" : v.endDate,
            isForever, emoji: selEmoji
          };
          if (id) S.listUpdate("anniversary_special", id, rec); else S.listAdd("anniversary_special", rec);
          renderSpecial(); syncCalendar();
          App.toast(id ? "已更新" : "已添加纪念日", "💖");
        }
      });
    }

    root.querySelector("#special-add").onclick = () => editSpecial(null);

    bindTagWrap(root.querySelector("#special-tags"), specialState, renderSpecial, {
      addTitle: "＋ 新建纪念日标签", placeholder: "如：忌日",
      onAdd: saveSpecialTags, onDel: saveSpecialTags,
      hasRecords: (t) => getSpecials().some(s => s.tag === t)
    });

    renderBirth(); renderSpecial(); syncCalendar();
  };

  function escapeHtml(s) { return (s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  // 计算未来 days 天内即将到来的纪念日（用于首页喇叭）
  function upcoming(days = 7) {
    const today = D.today();
    const list = [];
    getBirthdays().forEach(b => {
      const dk = mmddToThisYear(b.date);
      if (!dk) return;
      const diff = D.diffDays(dk, today);
      if (diff >= 0 && diff < days) {
        list.push({ type: "生日", date: dk, text: `${b.emoji || "🎂"} ${escapeHtml(b.name || "")} 生日`, days: diff });
      }
    });
    getSpecials().forEach(s => {
      const dk = mmddToThisYear(s.startDate ? s.startDate.slice(5) : "");
      if (!dk) return;
      const diff = D.diffDays(dk, today);
      if (diff >= 0 && diff < days) {
        list.push({ type: "纪念日", date: dk, text: `${s.emoji || "💖"} ${escapeHtml(s.title || "")} 纪念日`, days: diff });
      }
    });
    list.sort((a, b) => a.days - b.days);
    return list;
  }

  App.Anniversary = { upcoming, syncCalendar };
})();
