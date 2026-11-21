// ⌘K / Ctrl+K search palette: prints, collections and pages.
import { esc } from '../utils.js';
import { openOverlay, closeOverlay } from './overlay.js';

const PAGES = [
  { title: 'Gallery', sub: 'Walk the 3D gallery', href: '#/' },
  { title: 'Shop all prints', sub: 'List view', href: '#/shop' },
  { title: 'Info', sub: 'About the artist', href: '#/info' },
  { title: 'Auctions', sub: 'Original works', href: '#/auctions' },
  { title: 'Help', sub: 'Delivery, returns, contact', href: '#/help' },
  { title: 'Checkout', sub: 'Your bag', href: '#/checkout' },
];

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function openSearch(ctx) {
  const { catalog, navigate } = ctx;

  openOverlay({
    kind: 'palette',
    name: 'search',
    label: 'Search',
    render(panel, close) {
      panel.innerHTML = `
        <div class="palette">
          <label class="palette__field">
            <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
            <input class="palette__input" type="search" placeholder="Search prints, collections, pages…" autocomplete="off" autofocus
              role="combobox" aria-expanded="true" aria-controls="palette-results" aria-label="Search">
            <kbd class="mono">Esc</kbd>
          </label>
          <ul class="palette__results" id="palette-results" role="listbox"></ul>
        </div>`;
      const input = panel.querySelector('input');
      const list = panel.querySelector('ul');
      let results = [];
      let active = 0;

      function compute(q) {
        const n = norm(q.trim());
        const prints = catalog.prints
          .filter((p) => !n || norm(`${p.title} ${p.collection.title} ${p.artist} ${p.year}`).includes(n))
          .map((p) => ({ group: 'Prints', title: p.title, sub: p.collection.title, href: `#/print/${p.slug}`, img: p.image }));
        const cols = catalog.collections
          .filter((c) => !n || norm(`${c.title} ${c.kicker || ''}`).includes(n))
          .map((c) => ({ group: 'Collections', title: c.title, sub: `${c.prints.length} prints`, href: `#/collection/${c.slug}` }));
        const pages = PAGES.filter((p) => !n || norm(`${p.title} ${p.sub}`).includes(n)).map((p) => ({ group: 'Pages', ...p }));
        return [...(n ? prints : prints.slice(0, 6)), ...cols, ...pages];
      }

      function draw() {
        results = compute(input.value);
        active = Math.min(active, Math.max(0, results.length - 1));
        let lastGroup = '';
        list.innerHTML = results.length ? results.map((r, i) => {
          const head = r.group !== lastGroup ? `<li class="palette__group mono" role="presentation">${r.group}</li>` : '';
          lastGroup = r.group;
          return `${head}<li role="option" id="pr-${i}" class="palette__item ${i === active ? 'is-active' : ''}" aria-selected="${i === active}" data-i="${i}">
            ${r.img ? `<img src="${esc(r.img)}" alt="">` : '<span class="palette__glyph" aria-hidden="true">→</span>'}
            <span class="palette__text"><span class="palette__title">${esc(r.title)}</span><span class="mono palette__sub">${esc(r.sub)}</span></span>
          </li>`;
        }).join('') : '<li class="palette__empty serif">No results. Try another word.</li>';
        input.setAttribute('aria-activedescendant', results.length ? `pr-${active}` : '');
        list.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
      }

      function go(i) {
        const r = results[i];
        if (!r) return;
        close();
        navigate(r.href.replace(/^#/, ''));
      }

      input.addEventListener('input', () => { active = 0; draw(); });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(results.length - 1, active + 1); draw(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); draw(); }
        else if (e.key === 'Enter') { e.preventDefault(); go(active); }
      });
      list.addEventListener('click', (e) => {
        const li = e.target.closest('[data-i]');
        if (li) go(Number(li.dataset.i));
      });
      list.addEventListener('mousemove', (e) => {
        const li = e.target.closest('[data-i]');
        if (li && Number(li.dataset.i) !== active) { active = Number(li.dataset.i); draw(); }
      });
      draw();
    },
  });
}

export { closeOverlay as closeSearch };
