// router.js —— hash 路由：URL 记录窗口栈中的文章序列（#3,7,5，左端栈底、右端栈顶）。
// 只协调 URL 与 window-manager，不接触 DOM：
// 开/关文章压一条历史（后退即撤销操作），切换焦点只改写当前条目。
// 初始序列由 startRouter 在平台 reveal 后应用，文章与界面同时入场。

import * as data from './data.js';
import * as wm from './window-manager.js';

let applying = false; // 应用外部 URL 期间抑制写回，避免历史条目堆积
let lastIds = [];
let pending = [];     // 初始 URL 序列，等 startRouter 应用

function articleIds(stack) {
    return stack.filter((w) => w.type === 'article').map((w) => w.id);
}

function parseHash() {
    return location.hash.slice(1).split(',').filter(Boolean).map(decodeURIComponent);
}

function hashOf(ids) {
    return ids.length ? `#${ids.map(encodeURIComponent).join(',')}` : '';
}

function same(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

// 以目标序列重建文章窗口：先全部关闭，再自底向顶逐篇打开
function apply(ids) {
    applying = true;
    for (const w of wm.getStack()) {
        if (w.type === 'article') wm.close(w.id);
    }
    for (const id of ids) {
        if (data.getMeta(id)) wm.open(id); // 忽略不存在或已删除的文章
    }
    applying = false;
    lastIds = articleIds(wm.getStack());
    history.replaceState(null, '', hashOf(lastIds) || location.pathname + location.search);
}

// 栈变化 → 写 URL：集合有增删压历史，仅顺序变化（focus）改写当前条目
function syncUrl(stack) {
    if (applying) return;
    const ids = articleIds(stack);
    if (same(ids, lastIds)) return;
    const changed = ids.length !== lastIds.length || ids.some((id) => !lastIds.includes(id));
    lastIds = ids;
    const url = hashOf(ids) || location.pathname + location.search;
    history[changed ? 'pushState' : 'replaceState'](null, '', url);
}

export function initRouter() {
    pending = parseHash();
    wm.subscribe(syncUrl);
    // 后退/前进/手动改 hash：以 URL 为准，栈不同则重建
    for (const ev of ['hashchange', 'popstate']) {
        addEventListener(ev, () => {
            const ids = parseHash();
            if (!same(ids, articleIds(wm.getStack()))) apply(ids);
        });
    }
}

// 平台 reveal 之后调用：初始文章与界面同时入场，而非先弹文章再出组件
export function startRouter() {
    if (pending.length) apply(pending);
    pending = [];
}
