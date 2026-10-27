// main.js —— 应用引导：CDN 依赖 → 平台资源 → GitHub 文章 → 初始化组件。
// 只依赖 core 与平台统一接口，不关心具体平台实现。

import * as data from './core/data.js';
import { createIntro } from './core/background.js';
import { initBranding } from './core/branding.js';
import { initRouter, startRouter } from './core/router.js';
import { detectPlatform } from './platform.js';

const MARKED_URL = 'https://cdn.jsdelivr.net/npm/marked@15.0.12/lib/marked.esm.js';
const HLJS_URL = 'https://cdn.jsdelivr.net/npm/highlight.js@11/+esm';
const TIMEOUT = 10000;

// 平台模块在 boot 中动态加载后赋值，revealUI 通过它触发淡入
let platform = null;

function revealUI() {
    platform?.reveal();
    startRouter();
}

// 时间戳参数破缓存：nginx 静态文件的协商缓存可能让手机浏览器在新鲜期内
// 不发请求，改动部署后看不到更新；每次注入新 URL 强制取最新
function injectStyle(href) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${href}?t=${Date.now()}`;
    document.head.appendChild(link);
}

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);
}

async function boot() {
    // 尽早设置图标与标题，避免加载期间短暂显示默认「Strata」
    initBranding();

    const intro = createIntro({ onReady: revealUI, onRetry: boot });
    intro.begin();

    // 发散期硬检查点：浏览器从 CDN 拉取渲染依赖（marked + highlight.js）
    let marked, hljs;
    try {
        [marked, hljs] = await withTimeout(Promise.all([
            import(MARKED_URL),
            import(HLJS_URL).then((m) => m.default),
        ]), TIMEOUT);
    } catch (e) {
        intro.fail('加载渲染依赖失败');
        return;
    }
    data.setLibraries({ marked, hljs });
    intro.markedReady();

    // 平台资源：动态拉取对应平台的 js + 注入对应平台的 css
    const platformName = detectPlatform();
    try {
        // 时间戳参数破缓存：平台模块链与 CSS 同策略，避免改动部署后浏览器沿用旧模块
        platform = await withTimeout(import(`./platforms/${platformName}/index.js?t=${Date.now()}`), TIMEOUT);
        injectStyle(`assets/css/${platformName}.css`);
    } catch (e) {
        intro.fail('加载平台资源失败');
        return;
    }

    // 封边期硬检查点：拉取 meta + 枚举渲染全部文章
    try {
        await withTimeout(data.fetchArticles(), TIMEOUT);
    } catch (e) {
        intro.fail(e.userMessage || '从 GitHub 获取文章失败');
        return;
    }
    intro.dataReady();

    platform.initComponents();
    initRouter();
}

boot();
