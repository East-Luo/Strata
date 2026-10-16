// search.js —— 搜索框（手机端）：居中、默认展开。

import * as data from '../../core/data.js';
import * as wm from '../../core/window-manager.js';
import { renderResults } from '../../core/search-ui.js';

export function initSearch() {
    const searchWindow = document.createElement('div');
    searchWindow.id = 'searchWindow';
    searchWindow.className = 'search-window';
    searchWindow.innerHTML = `
        <input type="text" id="searchInput" class="search-input" placeholder="搜索...">
        <div id="searchResults" class="search-results"></div>
    `;
    document.body.appendChild(searchWindow);

    const searchInput = searchWindow.querySelector('#searchInput');
    const searchResults = searchWindow.querySelector('#searchResults');

    const pick = (article) => {
        wm.open(article.id);
        searchInput.value = '';
        searchResults.style.display = 'none';
    };

    searchInput.addEventListener('click', (e) => e.stopPropagation());

    // 点击其他地方隐藏结果
    document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });

    searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim();
        if (q) renderResults(searchResults, data.search(q), pick);
        else searchResults.style.display = 'none';
    });
}
