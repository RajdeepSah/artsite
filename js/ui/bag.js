// "Your bag" drawer.
import { esc } from '../utils.js';
import { describeOptions } from '../pricing.js';
import { openOverlay } from './overlay.js';

export function openBag(ctx) {
  const { store, catalog, money, site } = ctx;

  openOverlay({
    kind: 'drawer',
    name: 'bag',
    label: 'Your bag',
    render(panel, close) {
      function draw() {
        const items = store.state.bag;
        const count = store.bagCount();
        panel.innerHTML = `
          <div class="drawer">
            <header class="drawer__head">
              <div>
                <h2 class="display drawer__title">Your bag</h2>
                <p class="mono drawer__sub">${count} item${count === 1 ? '' : 's'}</p>
              </div>
              <button type="button" class="drawer__close" data-close aria-label="Close bag">×</button>
            </header>
            <div class="drawer__body">
              ${items.length ? `<ul class="bag-list">${items.map((it) => {
                const p = catalog.print(it.slug);
                if (!p) return '';
                return `
                  <li class="bag-item" data-id="${esc(it.id)}">
                    <a class="bag-item__img" href="#/print/${esc(p.slug)}" data-close><img src="${esc(p.image)}" alt=""></a>
                    <div class="bag-item__info">
                      <div class="bag-item__row">
                        <a class="bag-item__title" href="#/print/${esc(p.slug)}" data-close>${esc(p.title)}</a>
                        <span class="bag-item__price">${money(it.unitPrice * it.qty)}</span>
                      </div>
                      <p class="mono bag-item__opts">${esc(describeOptions(it.options))}</p>
                      <div class="bag-item__row">
                        <div class="qty qty--small" role="group" aria-label="Quantity for ${esc(p.title)}">
                          <button type="button" class="qty__btn" data-step="-1" aria-label="Decrease">−</button>
                          <span class="qty__val">${it.qty}</span>
                          <button type="button" class="qty__btn" data-step="1" aria-label="Increase">+</button>
                        </div>
                        <button type="button" class="link-mono bag-item__remove" data-remove>Remove</button>
                      </div>
                    </div>
                  </li>`;
              }).join('')}</ul>` : `
                <div class="drawer__empty">
                  <p class="serif">Your bag is empty.</p>
                  <a class="link-mono" href="#/" data-close>Walk the gallery <span aria-hidden="true">→</span></a>
                </div>`}
            </div>
            <footer class="drawer__foot">
              <div class="drawer__total"><span class="mono">Subtotal</span><span class="display" data-subtotal>${money(store.bagSubtotal())}</span></div>
              <a class="btn btn--block ${items.length ? '' : 'is-disabled'}" href="#/checkout" data-checkout ${items.length ? '' : 'aria-disabled="true" tabindex="-1"'}>Go to checkout</a>
              <button type="button" class="link-mono drawer__keep" data-close>Keep shopping</button>
              <p class="mono drawer__note">Questions? <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
            </footer>
          </div>`;
      }
      draw();

      panel.addEventListener('click', (e) => {
        const li = e.target.closest('.bag-item');
        if (e.target.closest('[data-checkout]')) {
          if (!store.state.bag.length) { e.preventDefault(); return; }
          close();
          return;
        }
        if (!li) return;
        const id = li.dataset.id;
        const item = store.state.bag.find((i) => i.id === id);
        const step = e.target.closest('[data-step]');
        if (step && item) store.setQty(id, item.qty + Number(step.dataset.step));
        if (e.target.closest('[data-remove]')) store.removeFromBag(id);
      });

      const offBag = store.on('bag', draw);
      const offCur = store.on('currency', draw);
      return () => { offBag(); offCur(); };
    },
  });
}
