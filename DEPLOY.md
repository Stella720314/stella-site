# Stella🎀 个人工作站 · 云同步部署指南

目标：**永久免费托管 + 换手机/电脑/iPad 数据不丢且同步**。
方案：Cloudflare Pages（托管）+ Cloudflare KV（存储）+ Pages Functions（同步接口）+ 前端 AES-GCM 加密。
数据在浏览器内加密后才上传，服务端只见密文，不产生任何付费功能费用。

---

## 一、注册 Cloudflare（免费）
1. 打开 https://dash.cloudflare.com/sign-up 注册（免费版足够）。
2. 注册后进入控制台。账号本身是免费的，下面的 KV / Pages 免费额度足够个人使用。

## 二、创建 KV 命名空间（数据存储）
1. 控制台左侧 → **Storage & Databases → KV**（或 Workers & Pages → KV）。
2. 点 **Create a namespace**，名字随意（如 `stella-data`），创建。
3. 记下这个 namespace 的 **ID**（后面绑定用，无需发给任何人）。

## 三、部署站点（两种方式任选）

### 方式 A：连 GitHub（推荐，改代码自动部署，支持 Functions）

#### 第一步：在 GitHub 上创建仓库
1. 打开 https://github.com/new
2. 填写：
   - **Repository name**: 建议 `stella-site`（或你喜欢的英文名，不要中文）
   - **Description**: 可选，比如 `Stella's personal dashboard`
   - **Public / Private**: 选 **Private** 即可（Cloudflare Pages 免费支持连接私有仓库，代码不外露）
   - **Add a README**: **不要勾选**（我们要用自己的文件）
   - **Add .gitignore**: **不要勾选**
   - **Choose a license**: **不要勾选**
3. 点 **Create repository**。
4. 创建成功后，页面会显示仓库地址，复制 HTTPS 地址，通常是：
   ```
   https://github.com/Stella720314/stella-site.git
   ```

#### 第二步：把本地 `stella_site` 文件推送到仓库
打开本机终端（Git Bash / PowerShell / VS Code 终端），进入 `stella_site` 文件夹所在位置：

```bash
cd C:\Users\11569\WorkBuddy\2026-07-31-10-42-39\stella_site

git init
git add .
git commit -m "init: stella dashboard with sync"

git branch -M main
git remote add origin https://github.com/Stella720314/stella-site.git
git push -u origin main
```

> 第一次 `git push` 会提示你登录 GitHub，按提示用浏览器授权即可。

#### 第三步：在 Cloudflare Pages 连接该仓库
1. 控制台 → **Workers & Pages → Create Project → Connect to Git → 选 GitHub 仓库**。
2. 选择你刚创建的 `stella-site` 仓库。
3. 构建设置：
   - **Framework preset**: `None`
   - **Build command**: 留空
   - **Build output directory**: 填 `.`（点）
4. 点 **Save and Deploy**，完成后得到 `xxx.pages.dev` 域名。

> ⚠️ **不要选「Upload assets / 拖拽上传」**，因为该模式不支持 Pages Functions，你会看到 "Pages functions are not supported" 警告，同步接口不会生效。

### 方式 B：Wrangler CLI（不想用 Git 时）
1. 安装 Node.js / npm（或 npx）。
2. 在项目根目录运行：
   ```bash
   npx wrangler@latest pages deploy stella_site --project-name stella-site
   ```
3. 按提示登录 Cloudflare 账号即可部署。

## 四、绑定 KV + 设置令牌（关键两步）
在刚创建的 Pages 项目里：
1. **Settings → Functions → KV namespace bindings**：
   - Variable name 填 **`STELLA_KV`**，绑定到第二步创建的 namespace。
2. **Settings → Environment variables（Production）**：
   - 新增 `SYNC_TOKEN`，值填**一段你自己生成的随机长串**（如用 https://randomkeygen.com 生成）。
   - ⚠️ 同时把**同一个值**填进本包 `js/sync.js` 顶部的 `const SYNC_TOKEN = "";`（留空则两端都不校验，数据仍加密，仅少一层访问控制）。
   - 如果两边都留空：也能用，靠"加密 +  obscure 域名"兜底。

> KV 绑定名必须叫 `STELLA_KV`，令牌变量必须叫 `SYNC_TOKEN`，因为同步代码就是按这两个名字读的。

## 五、开启同步（在站点里操作）
1. 打开你的 `xxx.pages.dev` 站点。
2. 点右上角 **☁️** 按钮 → 设置加密口令（至少 6 位，要好记又独特，**没有找回功能，请牢记**）。
3. 设置成功即自动把当前本地数据加密上传到 KV。
4. 之后在任何设备（手机/电脑/iPad）打开同一站点，点 ☁️ 输入**同一口令**即可拉取并同步。

---

## 六、迁移旧站数据（从 codebuddy 旧站 → 新站）
旧站（codebuddy 那个网址）和新建站是不同域名，本地存储不互通，需要导出一次：

1. 打开**旧站**，按 F12 打开开发者工具 → Console（控制台）。
2. 粘贴下面这段并回车，会下载一个 `stella-backup.json`：
```js
(function(){const P="stella:";const o={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(P)){try{o[k.slice(P.length)]=JSON.parse(localStorage.getItem(k));}catch(e){}}}const b=new Blob([JSON.stringify({app:"stella",v:1,collections:o},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="stella-backup.json";a.click();})();
```
3. 打开**新站** → 点 ☁️ → 先设置口令启用同步 → 再点「导入备份」选刚才的 `stella-backup.json`。
4. 导入后自动加密上传到 KV，之后所有设备同步。明文备份文件请只保存在你自己的设备上。

> 更省事的办法：如果你直接把本包覆盖部署到**原来的 codebuddy 项目**（同源），旧数据会自动留存，启用同步即一键上传，无需导出导入。但 codebuddy 沙箱有被回收风险，不建议长期依赖。

---

## 七、设计与安全要点（给你安心）
- **本地「行车记录仪」自动清理保留**：手机/iPad 本地只留近 30天/1年/3月，保持轻量；云端 KV 存**完整档案**永不过期，是真正的数据源。
- **不会误删云端旧数据**：上传时做"并集合并 + 删除标记"，本地清理掉的旧记录不会把云端也删了；你在某设备删掉的记录也会同步到其他设备。
- **冲突处理**：同一条记录被两头改，按"最后写入获胜"（粒度到「条」，比整包覆盖更安全）。
- **加密**：PBKDF2 + AES-GCM 256，浏览器原生 Web Crypto，免费、Cloudflare 只见密文。
- **口令即密钥**：口令只在你脑子里，服务商无法解密。请务必牢记（无找回）。
- **额外备份**：随时点 ☁️ → 导出备份，下载明文 JSON 自行保管，作为终极保险。

## 八、常见问题
- **换了设备数据没出来？** 确认新设备输入的是**同一个口令**；首次需点 ☁️ 解锁并同步。
- **忘了口令？** 数据仍在 KV（密文），但无人能解密。只能用「导入备份」的明文 JSON 重新导入并设新口令。所以**务必保管好明文备份**。
- **要不要删掉 index.html 里的腾讯 Beacon 统计？** 那行是旧站埋点，会向腾讯上报访问。纯个人隐私站点可删；不影响功能。
- **后续加页面/改功能会丢数据吗？** 不会。数据是按 `stella:` 前缀的 key 存储，与界面解耦；新站用 `migrate()` 永远兼容旧数据。
