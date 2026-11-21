// List / Shop view: every print in a grid, grouped by collection, with filters and sorting.
import { esc, html } from '../utils.js';
import { priceFor } from '../pricing.js';

const SORTS = {
  featured: { label: 'Featured', fn: null },
  'price-asc': { label: 'Price: low to high', fn: (a, b) => a.basePrice - b.basePrice },
  'price-desc': { label: 'Price: high to low', fn: (a, b) => b.basePrice - a.basePrice },
  title: { label: 'Title A-Z', fn: (a, b) => a.title.localeCompare(b.title) },
  newest: { label: 'Newest', fn: (a, b) => b.year - a.year },
};

export function renderList({ collectionSlug = null, title = 'All prints', kicker = 'Index of prints' }, ctx) {
  const { catalog, money } = ctx;
  let filter = collectionSlug;
  let sort = 'featured';

  const el = html(`
    <div class="page page--list">
      <header class="list-head">
        <p class="mono list-head__kicker" data-kicker></p>
        <h1 class="display list-head__title" data-title></h1>
        <p class="list-head__desc" data-desc></p>
        <div class="list-head__controls">
          <div class="filters" role="group" aria-label="Filter by collection">
            <button type="button" class="chip" data-filter="" aria-pressed="false">All</button>
            ${catalog.collections.map((c) => `<button type="button" class="chip" data-filter="${esc(c.slug)}" aria-pressed="false">${esc(c.title)}</button>`).join('')}
          </div>
          <label class="sort">
            <span class="mono">Sort</span>
            <select data-sort class="sort__select">
              ${Object.entries(SORTS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
            </select>
          </label>
        </div>
      </header>
      <div class="list-body" data-body></div>
    </div>`);

  const body = el.querySelector('[data-body]');

  const card = (p) => `
    <a class="card" href="#/print/${esc(p.slug)}" data-print="${esc(p.slug)}">
      <span class="card__media"><img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy"></span>
      <span class="card__title">${esc(p.title)}</span>
      <span class="card__meta mono">${esc(p.collection.title)}</span>
      <span class="card__price" data-from-price>From ${money(priceFor(p))}</span>
    </a>`;

  function draw() {
    const col = filter ? catalog.collection(filter) : null;
    el.querySelector('[data-kicker]').textContent = col ? (col.kicker || 'Collection') : kicker;
    el.querySelector('[data-title]').textContent = col ? col.title : title;
    el.querySelector('[data-desc]').textContent = col ? col.description
      : `${catalog.prints.length} limited edition prints across ${catalog.collections.length} collections. Every print is made to order.`;
    el.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.filter || null) === filter)));
    el.querySelector('[data-sort]').value = sort;

    const sorter = SORTS[sort].fn;
    if (!col && !sorter) {
      // grouped by collection, like walking through the gallery
      body.innerHTML = catalog.collections.map((c) => `
        <section class="list-section" id="col-${esc(c.slug)}">
          <div class="list-section__head">
            <h2 class="display list-section__title">${esc(c.title)}</h2>
            <span class="mono muted">${c.prints.length} prints</span>
            <a class="link-mono list-section__walk" href="#/" data-walk="${esc(c.slug)}">See it in the gallery <span aria-hidden="true">→</span></a>
          </div>
          <div class="card-grid">${c.prints.map(card).join('')}</div>
        </section>`).join('');
    } else {
      let prints = col ? [...col.prints] : [...catalog.prints];
      if (sorter) prints.sort(sorter);
      body.innerHTML = `
        <p class="mono muted list-count">${prints.length} print${prints.length === 1 ? '' : 's'}</p>
        <div class="card-grid">${prints.map(card).join('')}</div>
        ${col ? `<a class="link-mono list-section__walk" href="#/" data-walk="${esc(col.slug)}">See this collection in the gallery <span aria-hidden="true">→</span></a>` : ''}`;
    }
  }

  el.addEventListener('click', (e) => {
    const f = e.target.closest('[data-filter]');
    if (f) {
      filter = f.dataset.filter || null;
      history.replaceState(null, '', filter ? `#/collection/${filter}` : '#/list');
      draw();
      return;
    }
    const walk = e.target.closest('[data-walk]');
    if (walk) {
      e.preventDefault();
      ctx.walkToCollection(walk.dataset.walk);
    }
  });
  el.querySelector('[data-sort]').addEventListener('change', (e) => { sort = e.target.value; draw(); });

  ctx.onStore('currency', draw);
  draw();
  return el;
}
