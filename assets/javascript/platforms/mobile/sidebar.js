// mobile/sidebar.js —— 顶部抽屉（手机端文章栏）。
// 结构：抽屉页（列表 + 底部握把条，同一可见表面）+ 页下方 15vh 透明热点区。
// 收起时抽屉页上移出屏、只探出握把条，热点区垂在屏内顶部承接下拉手势。

import * as data from '../../core/data.js';
import * as wm from '../../core/window-manager.js';

let drawer = null;
let listEl = null;
let sheetEl = null;
let gripEl = null;
let hotEl = null;
let expanded = false;

function render() {
    const articles = data.getArticles();
    listEl.innerHTML = '<h3>文章列表</h3>';

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
        item.addEventListener('click', () => {
            wm.open(a.id);
            collapse();
        });
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

// ---- 位置（px）控制：收起位置为 -(抽屉页高 - 握把条高)，只探出握把条；展开为 0 ----

function collapsedOffset() {
    return -(sheetEl.offsetHeight - gripEl.offsetHeight);
}

function setOffset(px) {
    drawer.style.top = `${px}px`;
}

function currentOffset() {
    const px = parseFloat(drawer.style.top);
    return Number.isFinite(px) ? px : collapsedOffset();
}

function collapse() {
    expanded = false;
    drawer.style.transition = '';
    setOffset(collapsedOffset());
}

function expand() {
    expanded = true;
    drawer.style.transition = '';
    setOffset(0);
}

function initGesture() {
    let dragging = false;
    let startY = 0;
    let startOffset = 0;
    let maxDy = 0;

    function start(e) {
        dragging = true;
        startY = e.touches[0].clientY;
        startOffset = currentOffset();
        maxDy = 0;
        drawer.style.transition = 'none';
    }

    function move(e) {
        if (!dragging) return;
        e.preventDefault(); // 双保险：即使有浏览器不认 touch-action，也不让页面跟着滚
        const dy = e.touches[0].clientY - startY;
        maxDy = Math.max(maxDy, Math.abs(dy));
        setOffset(Math.max(collapsedOffset(), Math.min(0, startOffset + dy)));
    }

    function end() {
        if (!dragging) return;
        dragging = false;
        // 移动极小视为点击：切换展开/收起；否则按位移吸附
        if (maxDy < 10) {
            if (expanded) collapse();
            else expand();
        } else if (currentOffset() > collapsedOffset() / 2) {
            expand();
        } else {
            collapse();
        }
    }

    gripEl.addEventListener('touchstart', start, { passive: true });
    hotEl.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);

    // 展开后：点击抽屉覆盖范围外（含右下角小三角）自动收起
    document.addEventListener('click', (e) => {
        if (!expanded) return;
        if (!drawer.contains(e.target)) collapse();
    });
}

export function initSidebar() {
    drawer = document.createElement('div');
    drawer.id = 'mobileSidebar';
    drawer.className = 'mobile-sidebar';
    drawer.innerHTML = `
        <div class="sidebar-sheet">
            <div class="sidebar-list"></div>
            <div class="sidebar-grip"><div class="handle-bar">☰</div></div>
        </div>
        <div class="sidebar-handle"></div>
    `;
    document.body.appendChild(drawer);
    listEl = drawer.querySelector('.sidebar-list');
    sheetEl = drawer.querySelector('.sidebar-sheet');
    gripEl = drawer.querySelector('.sidebar-grip');
    hotEl = drawer.querySelector('.sidebar-handle');

    render();
    wm.subscribe(updateActive);
    initGesture();
    collapse();
}
