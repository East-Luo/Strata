# Strata

纯静态博客：页面与文章分属两个仓库，浏览器直接渲染 Markdown
零构建、零框架、零依赖安装

## 设计理念：层

从代码逻辑到视觉表现，每一层只做自己的事，下一层基于上一层生长

- **数据层**：页面仓库与文章仓库互不知晓，只由一个 `config.json` 连接；发布文章只需 clone 仓库，正常编写 .md 和添加媒体，push 后自动更新
- **状态层**：`core/window-manager.js` 是纯逻辑窗口栈（发布订阅，不接触 DOM）；侧栏、搜索、标签栏、文章窗口乃至页面标题都是它的投影
- **平台层**：`core/` 与 `platforms/` 分离；同一状态源对应桌面、手机两套视图，接口仅 `initComponents()` / `reveal()` 两个函数
- **样式层**：`tokens.css` 通用，`desktop.css` / `mobile.css` 平台专属，严格分流
- **视觉层**：canvas 背景 → 搜索 → 文章窗口 → 侧栏 / Dock，各居其 z 轴高度

## 技术实现

- 裸 HTML + 原生 ES Module + 原生 CSS，无转译、无打包；marked 与 highlight.js 在运行时从 CDN 动态 `import()`，以纯函数库身份参与，不参与构建
- 没有运行时框架：状态与视图的同步由一个几十行的发布订阅栈承担
- 文章枚举走 `meta.json`（文章仓库 push 时由 GitHub Actions 生成并自动编号），正文走 raw 拉取，均不消耗 GitHub API 配额
- URL 以 `#3,7,5` 记录窗口栈（左端栈底、右端栈顶）：刷新还原现场，后退撤销开/关
- Markdown 中的相对路径媒体自动重写为文章仓库的 raw 绝对地址

## 快速上手

```bash
git clone https://github.com/East-Luo/Strata.git
cd Strata && cp config.example.json config.json   # 编辑 config.json，填入你的文章仓库
python -m http.server 8000                      # 本地预览；或把整个目录交给任意静态服务器托管
```

可选：把 `articles-setup/meta.yml` 复制到文章仓库的 `.github/workflows/`，push 时自动生成带编号的文章清单，解除 API 限流

## 文章仓库约定

```
任意路径/文章.md    # 目录与文件名自由，标题取自文中第一个 # 行
任意路径/媒体文件   # 媒体与文章同目录，博客按文章所在目录解析
meta.json           # 由 workflow 自动生成（编号、排序、清单），勿手动编辑
```

- 写作与发布彻底分离：任意位置写 md，push即自动更新
- 作品及其编号由 workflow 深度探测和增量分配，只需将所有心思完全放在文章编写

## 目录结构

```
index.html                  入口（只有 canvas + 加载状态，其余 DOM 由组件自建）
config.example.json         数据源配置模板
articles-setup/             文章仓库侧的 meta 生成 workflow 模板
assets/
  css/
    tokens.css              设计令牌 + 跨平台通用样式
    desktop.css / mobile.css
  javascript/
    main.js                 编排：引导、CDN 拉库、超时、平台加载
    platform.js             平台检测
    core/                   跨平台公共层
      data.js               配置加载、meta 枚举、文章拉取、渲染、全文搜索
      router.js             hash 路由：URL ↔ 窗口栈双向同步
      window-manager.js     窗口栈
      background.js         加载动画 + 四面体背景
      branding.js           随机数学曲线 favicon + 标题
      search-ui.js          搜索结果渲染
    platforms/
      desktop/              侧栏、搜索、标签栏、文章窗口
      mobile/               顶部抽屉、搜索、底部 Dock
```

## License

MIT
