// Checkout + order confirmation (front-end demo: no payment is taken).
// To take real payments, send the order to a payment provider (Stripe Checkout,
// Shopify, ...) in the form's submit handler below, where the order object is built.
import { esc, html } from '../utils.js';
import { describeOptions } from '../pricing.js';

const SHIPPING = {
  standard: { label: 'Standard (5-10 days)', price: 9, freeOver: 150 },
  express: { label: 'Express (2-4 days)', price: 24 },
};

function shippingCost(method, subtotal) {
  const m = SHIPPING[method];
  return m.freeOver && subtotal >= m.freeOver ? 0 : m.price;
}

export function renderCheckout(ctx) {
  const { store, catalog, money, navigate } = ctx;
  const acc = store.state.account;
  let method = 'standard';

  const el = html(`
    <div class="page page--checkout">
      <header class="list-head">
        <p class="mono list-head__kicker">Checkout</p>
        <h1 class="display list-head__title">Your order</h1>
      </header>
      <div class="checkout" data-wrap></div>
    </div>`);
  const wrap = el.querySelector('[data-wrap]');

  function summary() {
    const sub = store.bagSubtotal();
    const ship = shippingCost(method, sub);
    return `
      <ul class="summary-list">
        ${store.state.bag.map((it) => {
          const p = catalog.print(it.slug);
          return p ? `<li class="summary-item">
            <img src="${esc(p.image)}" alt="">
            <div><p class="summary-item__title">${esc(p.title)} <span class="muted">× ${it.qty}</span></p><p class="mono muted">${esc(describeOptions(it.options))}</p></div>
            <span>${money(it.unitPrice * it.qty)}</span></li>` : '';
        }).join('')}
      </ul>
      <dl class="totals">
        <div><dt>Subtotal</dt><dd>${money(sub)}</dd></div>
        <div><dt>Shipping</dt><dd>${ship ? money(ship) : 'Free'}</dd></div>
        <div><dt class="mono">Tax</dt><dd class="muted">Calculated at delivery</dd></div>
        <div class="totals__grand"><dt class="display">Total</dt><dd class="display">${money(sub + ship)}</dd></div>
      </dl>`;
  }

  function draw() {
    if (!store.state.bag.length) {
      wrap.innerHTML = `<div class="empty-state"><p class="serif">Your bag is empty.</p><a class="btn" href="#/list">Browse prints</a></div>`;
      return;
    }
    wrap.innerHTML = `
      <form class="form checkout__form" novalidate>
        <fieldset class="checkout__section">
          <legend class="mono">1. Contact</legend>
          <div class="field"><label class="field__label" for="co-email">Email</label><input class="input" id="co-email" name="email" type="email" autocomplete="email" value="${esc(acc?.email || '')}" required><p class="field__error" data-err="email"></p></div>
        </fieldset>
        <fieldset class="checkout__section">
          <legend class="mono">2. Delivery</legend>
          <div class="field"><label class="field__label" for="co-name">Full name</label><input class="input" id="co-name" name="name" autocomplete="name" value="${esc(acc?.name || '')}" required><p class="field__error" data-err="name"></p></div>
          <div class="field"><label class="field__label" for="co-address">Address</label><input class="input" id="co-address" name="address" autocomplete="street-address" required><p class="field__error" data-err="address"></p></div>
          <div class="field-row">
            <div class="field"><label class="field__label" for="co-city">City</label><input class="input" id="co-city" name="city" autocomplete="address-level2" required><p class="field__error" data-err="city"></p></div>
            <div class="field"><label class="field__label" for="co-zip">Postcode</label><input class="input" id="co-zip" name="zip" autocomplete="postal-code" required><p class="field__error" data-err="zip"></p></div>
          </div>
          <div class="field"><label class="field__label" for="co-country">Country</label>
            <select class="input" id="co-country" name="country" autocomplete="country-name">
              ${['United States', 'United Kingdom', 'Nepal', 'India', 'Germany', 'France', 'Canada', 'Australia', 'Other'].map((c) => `<option>${c}</option>`).join('')}
            </select></div>
          <div class="radio-list" role="radiogroup" aria-label="Delivery method">
            ${Object.entries(SHIPPING).map(([k, m]) => `
              <label class="radio"><input type="radio" name="method" value="${k}" ${k === method ? 'checked' : ''}>
                <span>${m.label}</span><span class="muted">${m.freeOver ? `${money(m.price)} · free over ${money(m.freeOver)}` : money(m.price)}</span></label>`).join('')}
          </div>
        </fieldset>
        <fieldset class="checkout__section">
          <legend class="mono">3. Payment</legend>
          <p class="checkout__demo">Demo checkout: no card details are needed and no payment is taken.</p>
        </fieldset>
        <button class="btn btn--block" type="submit">Place order</button>
      </form>
      <aside class="checkout__summary" aria-label="Order summary">
        <h2 class="mono">Summary</h2>
        <div data-summary>${summary()}</div>
      </aside>`;

    const form = wrap.querySelector('form');
    form.addEventListener('change', (e) => {
      if (e.target.name === 'method') {
        method = e.target.value;
        wrap.querySelector('[data-summary]').innerHTML = summary();
      }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = (n) => form[n].value.trim();
      const errors = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email')) ? '' : 'Please enter a valid email address.',
        name: v('name') ? '' : 'Required.',
        address: v('address') ? '' : 'Required.',
        city: v('city') ? '' : 'Required.',
        zip: v('zip') ? '' : 'Required.',
      };
      Object.entries(errors).forEach(([k, msg]) => { form.querySelector(`[data-err="${k}"]`).textContent = msg; });
      const first = Object.keys(errors).find((k) => errors[k]);
      if (first) { form[first].focus(); return; }
      const sub = store.bagSubtotal();
      const order = {
        id: String(Math.floor(100000 + Math.random() * 900000)),
        date: Date.now(),
        items: store.state.bag.map((i) => ({ ...i })),
        subtotal: sub,
        shipping: shippingCost(method, sub),
        total: sub + shippingCost(method, sub),
        method,
        customer: { email: v('email'), name: v('name'), address: v('address'), city: v('city'), zip: v('zip'), country: form.country.value },
      };
      store.addOrder(order);
      store.clearBag();
      navigate(`/order/${order.id}`);
    });
  }

  draw();
  ctx.onStore('currency', draw);
  ctx.onStore('bag', draw);
  return el;
}

export function renderOrder(id, ctx) {
  const { store, catalog, money } = ctx;
  const order = store.state.orders.find((o) => o.id === id);
  if (!order) {
    return html(`<div class="page page--checkout"><div class="empty-state"><p class="serif">Order not found.</p><a class="btn" href="#/">Back to the gallery</a></div></div>`);
  }
  return html(`
    <div class="page page--checkout">
      <header class="list-head">
        <p class="mono list-head__kicker">Order #${esc(order.id)}</p>
        <h1 class="display list-head__title">Thank you, ${esc(order.customer.name.split(' ')[0])}!</h1>
        <p class="list-head__desc">Your order is confirmed. A receipt will be sent to ${esc(order.customer.email)}. Prints are made to order and ship within 5-7 working days.</p>
      </header>
      <div class="checkout checkout--done">
        <div>
          <ul class="summary-list">
            ${order.items.map((it) => {
              const p = catalog.print(it.slug);
              return p ? `<li class="summary-item"><img src="${esc(p.image)}" alt=""><div><p class="summary-item__title">${esc(p.title)} <span class="muted">× ${it.qty}</span></p><p class="mono muted">${esc(describeOptions(it.options))}</p></div><span>${money(it.unitPrice * it.qty)}</span></li>` : '';
            }).join('')}
          </ul>
          <dl class="totals">
            <div><dt>Subtotal</dt><dd>${money(order.subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd>${order.shipping ? money(order.shipping) : 'Free'}</dd></div>
            <div class="totals__grand"><dt class="display">Total</dt><dd class="display">${money(order.total)}</dd></div>
          </dl>
        </div>
        <div class="checkout__address">
          <h2 class="mono">Delivering to</h2>
          <p>${esc(order.customer.name)}<br>${esc(order.customer.address)}<br>${esc(order.customer.city)} ${esc(order.customer.zip)}<br>${esc(order.customer.country)}</p>
          <a class="btn" href="#/">Back to the gallery</a>
        </div>
      </div>
    </div>`);
}
