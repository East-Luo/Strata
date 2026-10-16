// search.js —— 搜索框（桌面）：三角展开/收起、输入即搜、/ 快捷键唤起。

import * as data from '../../core/data.js';
import * as wm from '../../core/window-manager.js';
import { renderResults } from '../../core/search-ui.js';

function isTyping(el) {
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

export function initSearch() {
    const searchWindow = document.createElement('div');
    searchWindow.id = 'searchWindow';
    searchWindow.className = 'search-window';
    searchWindow.innerHTML = `
        <div class="search-container">
            <div id="searchButton" class="search-button">
                <div class="triangle"></div>
                <input type="text" id="searchInput" class="search-input" placeholder="搜索...">
            </div>
            <div id="searchResults" class="search-results"></div>
        </div>
    `;
    document.body.appendChild(searchWindow);

    const searchButton = searchWindow.querySelector('#searchButton');
    const searchInput = searchWindow.querySelector('#searchInput');
    const searchResults = searchWindow.querySelector('#searchResults');

    const pick = (article) => {
        wm.open(article.id);
        searchInput.value = '';
        searchResults.style.display = 'none';
        searchButton.classList.remove('active');
    };

    // 点击展开/收起
    searchButton.addEventListener('click', (e) => {
        e.stopPropagation();
        searchButton.classList.toggle('active');
        if (searchButton.classList.contains('active')) searchInput.focus();
    });
    searchInput.addEventListener('click', (e) => e.stopPropagation());

    // 点击其他地方收起搜索框、隐藏结果
    document.addEventListener('click', (e) => {
        if (!searchButton.contains(e.target)) searchButton.classList.remove('active');
        if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim();
        if (q) renderResults(searchResults, data.search(q), pick);
        else searchResults.style.display = 'none';
    });

    // / 唤起搜索（不影响正在输入的场景）
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && !isTyping(e.target)) {
            e.preventDefault();
            wm.focus('search');
            searchButton.classList.add('active');
            searchInput.focus();
        }
    });
}
