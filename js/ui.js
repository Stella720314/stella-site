/* ui.js — Toast 提示 / 弹窗 Modal / 通用确认 */
(function () {
  window.App = window.App || {};
  const App = window.App;

  /* ---------- Toast ---------- */
  function toast(msg, emoji = "✅") {
    let wrap = document.getElementById("toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.id = "toast-wrap"; document.body.appendChild(wrap); }
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<span>${emoji}</span><span>${msg}</span>`;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateY(-8px)"; t.style.transition = "all .3s"; }, 1800);
    setTimeout(() => t.remove(), 2200);
  }
  App.toast = toast;

  /* ---------- Modal ---------- */
  let mask = null;
  function ensureMask() {
    if (!mask) {
      mask = document.createElement("div");
      mask.className = "modal-mask";
      mask.innerHTML = `<div class="modal" role="dialog"></div>`;
      document.body.appendChild(mask);
      mask.addEventListener("click", (e) => { if (e.target === mask) close(); });
    }
    return mask;
  }
  function open(title, bodyHTML, opts = {}) {
    const m = ensureMask();
    const modal = m.querySelector(".modal");
    modal.innerHTML = `
      <h3>${title}</h3>
      <div class="modal-body">${bodyHTML}</div>
      <div class="actions">
        ${opts.cancel !== false ? `<button class="btn ghost" data-act="cancel">${opts.cancelText || "取消"}</button>` : ""}
        <button class="btn primary" data-act="ok">${opts.okText || "保存"}</button>
      </div>`;
    m.classList.add("show");
    modal.querySelector('[data-act="cancel"]')?.addEventListener("click", () => { if (opts.onCancel) opts.onCancel(); close(); });
    modal.querySelector('[data-act="ok"]').addEventListener("click", () => {
      if (opts.onOk) { const r = opts.onOk(modal); if (r === false) return; }
      close();
    });
    if (opts.onOpen) opts.onOpen(modal);
    // 焦点首个输入
    setTimeout(() => modal.querySelector("input,textarea,select")?.focus(), 50);
    return modal;
  }
  function close() { if (mask) mask.classList.remove("show"); }
  App.modal = { open, close };

  /* ---------- 确认框 ---------- */
  function confirm(msg, onYes, opts = {}) {
    open("请确认", `<p style="margin:0 0 6px;line-height:1.7">${msg}</p>`, {
      okText: opts.okText || "确定", cancelText: "取消",
      onOk: () => { onYes && onYes(); }
    });
  }
  App.confirm = confirm;

  /* ---------- 通用：日期选择器 ---------- */
  App.dateInput = function (name, val, label) {
    return `<label class="field">${label || name}</label>
      <input class="input" type="date" name="${name}" value="${val || App.date.today()}">`;
  };

  /* ---------- 通用：弹窗内表单取值 ---------- */
  App.formVals = function (modal) {
    const o = {};
    modal.querySelectorAll("input,textarea,select").forEach(el => {
      if (el.name) o[el.name] = el.value;
    });
    return o;
  };
})();
