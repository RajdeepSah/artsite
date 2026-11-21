// "Saved prints" drawer (the bookmark icon in the header).
import { esc, toast } from '../utils.js';
import { DEFAULT_OPTIONS, priceFor } from '../pricing.js';
import { openOverlay } from './overlay.js';

export function openSaved(ctx) {
  const { store, catalog, money } = ctx;

  openOverlay({
    kind: 'drawer',
    name: 'saved',
    label: 'Saved prints',
    render(panel) {
      function draw() {
        const prints = store.state.saved.map((s) => catalog.print(s)).filter(Boolean);
        panel.innerHTML = `
          <div class="drawer">
            <header class="drawer__head">
              <div>
                <h2 class="display drawer__title">Saved prints</h2>
                <p class="mono drawer__sub">${prints.length} saved</p>
              </div>
              <button type="button" class="drawer__close" data-close aria-label="Close saved prints">×</button>
            </header>
            <div class="drawer__body">
              ${prints.length ? `<ul class="bag-list">${prints.map((p) => `
                <li class="bag-item" data-slug="${esc(p.slug)}">
                  <a class="bag-item__img" href="#/print/${esc(p.slug)}" data-close><img src="${esc(p.image)}" alt=""></a>
                  <div class="bag-item__info">
                    <div class="bag-item__row">
                      <a class="bag-item__title" href="#/print/${esc(p.slug)}" data-close>${esc(p.title)}</a>
                      <span class="bag-item__price">${money(priceFor(p))}</span>
                    </div>
                    <p class="mono bag-item__opts">${esc(p.collection.title)}</p>
                    <div class="bag-item__row">
                      <button type="button" class="link-mono" data-quick-add>Add A3 to bag</button>
                      <button type="button" class="link-mono bag-item__remove" data-unsave>Remove</button>
                    </div>
                  </div>
                </li>`).join('')}</ul>` : `
                <div class="drawer__empty">
                  <p class="serif">Nothing saved yet. Tap the bookmark on any print to keep it here.</p>
                  <a class="link-mono" href="#/list" data-close>Browse prints <span aria-hidden="true">→</span></a>
                </div>`}
            </div>
          </div>`;
      }
      draw();

      panel.addEventListener('click', (e) => {
        const li = e.target.closest('.bag-item');
        if (!li) return;
        const slug = li.dataset.slug;
        if (e.target.closest('[data-unsave]')) store.toggleSaved(slug);
        if (e.target.closest('[data-quick-add]')) {
          const p = catalog.print(slug);
          store.addToBag({ slug, options: DEFAULT_OPTIONS, qty: 1, unitPrice: priceFor(p) });
          toast(`${p.title} added to bag`);
        }
      });

      const off1 = store.on('saved', draw);
      const off2 = store.on('currency', draw);
      return () => { off1(); off2(); };
    },
  });
}
