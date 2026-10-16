// data.js —— 数据层：meta.json 枚举文章目录 → 拉取 md → 前端 marked 渲染 → 全文搜索。
// meta.json 由文章仓库的 GitHub Actions 在 push 时自动生成（模板见 articles-setup/），
// 走 raw 拉取，不占 REST API 配额（匿名 60 次/小时/IP，共享代理出口容易撞限）；API 仅作兜底。
// 数据源在 config.json 配置（复制 config.example.json 填写，不进 git）。

let REPO = null;
let BRANCH = null;
let API_URL = null;
let RAW_BASE = null;
let META_URL = null;

async function loadConfig() {
    if (REPO) return;
    const res = await fetch('config.json', { cache: 'no-store' });
    if (!res.ok) {
        const e = new Error(`HTTP ${res.status}`);
        e.userMessage = '未配置文章仓库：请复制 config.example.json 为 config.json 并填写你的仓库';
        throw e;
    }
    const cfg = await res.json();
    REPO = cfg.repo;
    BRANCH = cfg.branch || 'main';
    API_URL = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;
    RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
    META_URL = `${RAW_BASE}/meta.json`;
}

let markedLib = null;        // 由 main 动态 import 后注入
let hljsLib = null;          // 代码高亮库，同样由 main 注入
let articles = [];           // { id, path, dir, file, title, html, text }

export function setLibraries({ marked, hljs }) {
    markedLib = marked;
    hljsLib = hljs;
}

export function getArticles() {
    return articles;
}

export function getMeta(id) {
    return articles.find((a) => a.id === id);
}

// 第一个 # 标题行作为文章标题（不要求在第一行）
function extractTitle(md) {
    const m = md.match(/^#\s+(.+)$/m);
    return m ? m[1].trim() : '';
}

// 相对路径媒体重写为仓库 raw 绝对地址
function resolveMediaUrl(href, dir) {
    if (!href) return href;
    if (/^(https?:|data:|#|\/\/)/i.test(href)) return href;
    return dir ? `${RAW_BASE}/${dir}/${href}` : `${RAW_BASE}/${href}`;
}

// 自定义渲染器绕过了 marked 默认的转义，属性值需自行转义
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// 渲染单篇：marked 转 HTML，并把相对路径 src/href 指向文章所在目录
function render(md, dir) {
    const renderer = new markedLib.Renderer();
    renderer.image = (token) => {
        const src = escAttr(resolveMediaUrl(token.href, dir));
        const t = token.title ? ` title="${escAttr(token.title)}"` : '';
        const a = token.text ? ` alt="${escAttr(token.text)}"` : '';
        return `<img src="${src}"${a}${t}>`;
    };
    renderer.link = (token) => {
        const url = escAttr(resolveMediaUrl(token.href, dir));
        const t = token.title ? ` title="${escAttr(token.title)}"` : '';
        return `<a href="${url}"${t}>${token.text}</a>`;
    };
    return markedLib.parse(md, { renderer });
}

// 路径 → 文章条目：id = 顶层目录名，根目录文件退化为文件名
function entryFromPath(path) {
    const parts = path.split('/');
    const file = parts[parts.length - 1];
    const id = parts.length > 1 ? parts[0] : file.replace(/\.md$/i, '');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    return { id, path, dir, file };
}

// 纯数字 id 按数值排序，否则按字符串排序
function sortEntries(list) {
    return list.sort((a, b) => {
        const na = parseInt(a.id, 10);
        const nb = parseInt(b.id, 10);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return a.id.localeCompare(b.id);
    });
}

// 首选：meta.json（文章仓库 push 时由 Actions 自动生成）
async function listArticles() {
    const res = await fetch(META_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const meta = await res.json();
    return sortEntries((meta.articles || []).map(entryFromPath));
}

// 迁移期兜底：meta.json 缺失时回退 GitHub trees API（受 60 次/小时/IP 限流），稳定后可删
async function listArticlesViaApi() {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const paths = (data.tree || [])
        .filter((item) => item.type === 'blob' && item.path.toLowerCase().endsWith('.md'))
        .map((item) => item.path);
    return sortEntries(paths.map(entryFromPath));
}

async function loadOne(entry) {
    const res = await fetch(`${RAW_BASE}/${entry.path}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();
    const html = render(md, entry.dir);

    // 解析 DOM：代码高亮 + 提纯纯文本（一次解析两用）
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (hljsLib) {
        doc.querySelectorAll('pre code').forEach((el) => hljsLib.highlightElement(el));
    }

    return {
        ...entry,
        title: extractTitle(md),
        html: doc.body.innerHTML,
        text: (doc.body.textContent || '').replace(/\s+/g, ' ').trim(),
    };
}

// 枚举 + 并发拉取并渲染全部文章，单篇失败静默跳过
export async function fetchArticles() {
    await loadConfig();
    let list;
    try {
        list = await listArticles();
    } catch (e) {
        list = await listArticlesViaApi();
    }
    const results = await Promise.all(list.map((e) => loadOne(e).catch(() => null)));
    articles = results.filter(Boolean);
    // 枚举到文章但全部加载失败时，不能表现为成功（单篇失败仍静默跳过）
    if (list.length && !articles.length) {
        throw new Error('全部文章加载失败');
    }
    return articles;
}

// 全文搜索：id(10) / 标题(10) / 正文(2)
export function search(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    const hits = [];
    for (const a of articles) {
        let score = 0;
        let hit = null;

        if ((a.id || '').toLowerCase().includes(q)) {
            score += 10;
            hit = hit || 'id';
        }
        if ((a.title || '').toLowerCase().includes(q)) {
            score += 10;
            hit = hit || 'title';
        }
        if ((a.text || '').toLowerCase().includes(q)) {
            score += 2;
            hit = hit || 'body';
        }

        if (score > 0) hits.push({ article: a, score, hit });
    }

    return hits.sort((x, y) => y.score - x.score).slice(0, 5);
}
