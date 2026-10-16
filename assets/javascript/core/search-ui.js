// search-ui.js —— 搜索结果列表渲染（桌面/手机共用）：命中位置徽标 + 点击回调。

const HIT_LABELS = {
    id: 'ID',
    title: '标题',
    body: '正文',
};

export function renderResults(container, results, onPick) {
    container.innerHTML = '';

    if (!results.length) {
        container.style.display = 'none';
        return;
    }

    for (const { article, hit } of results) {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        const idEl = document.createElement('div');
        idEl.className = 'result-id';
        idEl.textContent = article.id;

        const titleEl = document.createElement('div');
        titleEl.className = 'result-title';
        titleEl.textContent = article.title;

        item.appendChild(idEl);
        item.appendChild(titleEl);
        if (hit) {
            const hitEl = document.createElement('span');
            hitEl.className = 'result-hit';
            hitEl.textContent = HIT_LABELS[hit] || hit;
            item.appendChild(hitEl);
        }

        item.addEventListener('click', () => onPick(article));
        container.appendChild(item);
    }

    container.style.display = 'block';
}
