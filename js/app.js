/* app.js — 路由 + 侧边栏 + 主题切换 + 时钟 */
(function () {
  const App = window.App;
  const Pages = window.Pages;

  // 菜单：命名与页面标题完全统一
  const MENU = [
    { key: "home",    emoji: "🏠", name: "首页" },
    { key: "fitness", emoji: "💪", name: "健身日记" },
    { key: "sleep",   emoji: "🌙", name: "早睡监督" },
    { key: "english", emoji: "📚", name: "英语学习" },
    { key: "whisper", emoji: "💭", name: "碎碎念" },
    { key: "finance", emoji: "💰", name: "账目记录" },
    { key: "period",  emoji: "🩸", name: "姨妈日记" },
    { key: "medical", emoji: "🏥", name: "医疗记录" },
    { key: "anniversary", emoji: "💖", name: "纪念日" }
  ];

  const content = document.querySelector("#content");
  const sidebar = document.querySelector("#sidebar");
  const navEl = sidebar.querySelector("#nav");
  const pageTitle = document.querySelector("#page-title");

  // 构建侧边栏
  navEl.innerHTML = MENU.map(m => `
    <div class="nav-item" data-key="${m.key}">
      <span class="emoji">${m.emoji}</span><span class="nav-label">${m.name}</span>
    </div>`).join("");
  navEl.onclick = (e) => {
    const it = e.target.closest(".nav-item"); if (!it) return;
    location.hash = "#/" + it.dataset.key;
    closeDrawer(); // 移动端点击后收起抽屉
  };

  // 移动端抽屉
  const menuBtn = document.querySelector("#menu-btn");
  const backdrop = document.querySelector("#sidebar-backdrop");
  function openDrawer() { sidebar.classList.add("open"); backdrop.classList.add("show"); }
  function closeDrawer() { sidebar.classList.remove("open"); backdrop.classList.remove("show"); }
  menuBtn.onclick = () => { sidebar.classList.contains("open") ? closeDrawer() : openDrawer(); };
  backdrop.onclick = closeDrawer;

  // 折叠
  const collapseBtn = sidebar.querySelector("#collapse");
  if (App.raw.get("sidebar_collapsed", false)) sidebar.classList.add("collapsed");
  collapseBtn.onclick = () => {
    sidebar.classList.toggle("collapsed");
    App.raw.set("sidebar_collapsed", sidebar.classList.contains("collapsed"));
  };

  // 主题
  const tBtn = document.querySelector("#theme-toggle");
  App.theme.set(App.theme.get()); // 应用已存储主题
  tBtn.onclick = () => { const t = App.theme.toggle(); App.toast(t === "dark" ? "已切换深色护眼 🌙" : "已切换浅色护眼 ☀️", t === "dark" ? "🌙" : "☀️"); };

  // 云同步按钮（位于主题切换左侧）
  const topRight = document.querySelector(".topbar .right");
  if (topRight) {
    const syncBtn = document.createElement("button");
    syncBtn.className = "btn sm";
    syncBtn.id = "sync-btn";
    syncBtn.textContent = "☁️";
    syncBtn.title = "云同步";
    syncBtn.style.marginRight = "2px";
    syncBtn.onclick = () => { if (App.Sync) App.Sync.openPanel(); };
    topRight.insertBefore(syncBtn, tBtn);
  }

  // 启动云同步（已启用则弹出解锁并拉取；未启用则仅本地运行行车记录仪清理）
  if (App.Sync && App.Sync.init) App.Sync.init();

  // 时钟
  const clock = document.querySelector("#clock");
  function tick() {
    const n = new Date();
    clock.textContent = n.toLocaleString("zh-CN", { hour12: false, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  tick(); setInterval(tick, 1000);

  // 路由
  function route() {
    let key = (location.hash || "#/home").replace("#/", "");
    if (!Pages[key]) key = "home";
    const m = MENU.find(x => x.key === key) || MENU[0];
    pageTitle.innerHTML = key === "home" ? `Stella🎀的美好生活记录` : `${m.emoji} ${m.name}`;
    navEl.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.key === key));
    content.scrollTop = 0;
    try { Pages[key](content); }
    catch (err) { content.innerHTML = `<div class="empty">页面加载出错：${err.message}</div>`; console.error(err); }
  }
  window.addEventListener("hashchange", route);
  App.rerender = route; // 供同步模块在 hydrate 后重渲染
  if (!location.hash) location.hash = "#/home"; else route();
})();
