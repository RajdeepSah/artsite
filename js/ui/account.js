// Account modal: simple sign-in (stored locally) and order history.
// NOTE: this is front-end only. Connect a real auth/commerce backend before launch.
import { esc, toast } from '../utils.js';
import { openOverlay } from './overlay.js';

export function openAccount(ctx) {
  const { store, money } = ctx;

  openOverlay({
    kind: 'modal',
    name: 'account',
    label: 'Account',
    render(panel, close) {
      function draw() {
        const acc = store.state.account;
        if (!acc) {
          panel.innerHTML = `
            <div class="modal">
              <button type="button" class="drawer__close modal__close" data-close aria-label="Close">×</button>
              <h2 class="display modal__title">Sign in</h2>
              <p class="modal__text">Sign in to see your orders and keep your saved prints on this device.</p>
              <form class="form" novalidate>
                <div class="field"><label class="field__label" for="acc-name">Name</label><input class="input" id="acc-name" name="name" autocomplete="name" autofocus></div>
                <div class="field"><label class="field__label" for="acc-email">Email</label><input class="input" id="acc-email" name="email" type="email" autocomplete="email" required><p class="field__error" data-err></p></div>
                <button class="btn btn--block" type="submit">Continue</button>
              </form>
            </div>`;
          panel.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.target;
            const email = f.email.value.trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              f.querySelector('[data-err]').textContent = 'Please enter a valid email address.';
              f.email.focus();
              return;
            }
            store.setAccount({ email, name: f.name.value.trim() });
            toast('Signed in');
            draw();
          });
        } else {
          const orders = store.state.orders;
          panel.innerHTML = `
            <div class="modal">
              <button type="button" class="drawer__close modal__close" data-close aria-label="Close">×</button>
              <h2 class="display modal__title">Hello${acc.name ? ', ' + esc(acc.name) : ''}</h2>
              <p class="mono modal__sub">${esc(acc.email)}</p>
              <h3 class="mono modal__section">Your orders</h3>
              ${orders.length ? `<ul class="order-list">${orders.map((o) => `
                <li><a href="#/order/${esc(o.id)}" data-close><span>#${esc(o.id)}</span><span class="muted">${new Date(o.date).toLocaleDateString()}</span><span>${money(o.total)}</span></a></li>`).join('')}</ul>`
                : '<p class="modal__text">No orders yet.</p>'}
              <button type="button" class="btn btn--ghost btn--block" data-signout>Sign out</button>
            </div>`;
          panel.querySelector('[data-signout]').addEventListener('click', () => {
            store.setAccount(null);
            toast('Signed out');
            close();
          });
        }
      }
      draw();
    },
  });
}
