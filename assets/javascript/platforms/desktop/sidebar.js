// sidebar.js —— 侧边栏（桌面）：渲染文章列表，点击打开文章，高亮当前置顶文章。

import * as data from '../../core/data.js';
import * as wm from '../../core/window-manager.js';

let listEl = null;

function render() {
    const articles = data.getArticles();
    listEl.innerHTML = '';

    if (!articles.length) {
        const empty = document.createElement('div');
        empty.className = 'sidebar-item empty';
        empty.textContent = '暂无文章';
        listEl.appendChild(empty);
        return;
    }

    for (const a of articles) {
        const item = document.createElement('div');
        item.className = 'sidebar-item';
        item.dataset.id = a.id;
        item.textContent = `${a.id} ${a.title}`;
        item.addEventListener('click', () => wm.open(a.id));
        listEl.appendChild(item);
    }

    updateActive(wm.getStack());
}

function updateActive(stack) {
    const top = stack.length ? stack[stack.length - 1] : null;
    const activeId = top && top.type === 'article' ? top.id : null;
    for (const el of listEl.querySelectorAll('.sidebar-item')) {
        el.classList.toggle('active', el.dataset.id === activeId);
    }
}

export function initSidebar() {
    const root = document.createElement('div');
    root.id = 'sidebar';
    root.className = 'sidebar';
    root.innerHTML = `
        <div class="sidebar-collapsed-hint"><span>☰</span></div>
        <div class="sidebar-content">
            <h3>文章列表</h3>
            <div class="article-list"></div>
        </div>
    `;
    document.body.appendChild(root);
    listEl = root.querySelector('.article-list');
    render();
    wm.subscribe(updateActive);
}
