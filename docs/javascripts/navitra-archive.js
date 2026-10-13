/* Search and paginate a pre-rendered historical Navitra table.
 * All source rows are HTML at build time, so no-JS browsers and crawlers
 * can read the original short messages. No network calls or dependencies.
 */
(() => {
  'use strict';
  function init() {
    const root = document.getElementById('navitra-search');
    if (!root || root.dataset.initialized === 'yes') return;
    root.dataset.initialized = 'yes';
    const $ = id => root.querySelector('#' + id);
    const query = $('navitra-query');
    const year = $('navitra-year');
    const category = $('navitra-category');
    const pageSize = $('navitra-page-size');
    const status = $('navitra-status');
    const pageStatus = $('navitra-page-status');
    const prev = $('navitra-prev');
    const next = $('navitra-next');
    const rows = Array.from(root.querySelectorAll('tbody tr')).map(tr => ({
      tr,
      year: tr.dataset.years.split(' '),
      category: tr.dataset.category,
      search: tr.textContent.normalize('NFKC').toLocaleLowerCase('ja-JP')
    }));
    let current = 0;
    let matching = rows;
    function show() {
      const perPage = Number(pageSize.value) || 1000;
      const pages = Math.max(1, Math.ceil(matching.length / perPage));
      current = Math.min(Math.max(current, 0), pages - 1);
      const visible = new Set(matching.slice(current * perPage, (current + 1) * perPage));
      for (const row of rows) row.tr.hidden = !visible.has(row);
      status.textContent = `${matching.length}種類に一致（元の観測記録は1,152件・全728種類）。`;
      pageStatus.textContent = `${current + 1} / ${pages} ページ`;
      prev.disabled = current === 0;
      next.disabled = current >= pages - 1;
    }
    function filter() {
      const terms = query.value.normalize('NFKC').toLocaleLowerCase('ja-JP').trim().split(/\s+/).filter(Boolean);
      const y = year.value;
      const c = category.value;
      matching = rows.filter(row => (!y || row.year.includes(y)) &&
        (!c || row.category === c) && terms.every(term => row.search.includes(term)));
      current = 0;
      show();
    }
    for (const input of [query, year, category]) input.addEventListener('input', filter);
    pageSize.addEventListener('change', () => { current = 0; show(); });
    prev.addEventListener('click', () => { current--; show(); root.scrollIntoView({ block: 'start', behavior: 'instant' }); });
    next.addEventListener('click', () => { current++; show(); root.scrollIntoView({ block: 'start', behavior: 'instant' }); });
    show();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  if (typeof window.document$ !== 'undefined') window.document$.subscribe(init);
})();
