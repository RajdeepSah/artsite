// Product page for a single print.
import { esc, html, toast } from '../utils.js';
import { OPTIONS, DEFAULT_OPTIONS, option, priceFor } from '../pricing.js';

const ICON_EYE = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICON_SAVE = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"/></svg>';
const ICON_PREV = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m14 7-5 5 5 5"/></svg>';
const ICON_NEXT = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m10 7 5 5-5 5"/></svg>';

const SOFA = `<svg class="room__sofa" viewBox="0 0 400 140" aria-hidden="true">
  <rect x="20" y="40" width="360" height="70" rx="18" fill="#6f6a62"/>
  <rect x="0" y="55" width="60" height="70" rx="16" fill="#625d56"/>
  <rect x="340" y="55" width="60" height="70" rx="16" fill="#625d56"/>
  <rect x="50" y="20" width="145" height="60" rx="14" fill="#7d776e"/>
  <rect x="205" y="20" width="145" height="60" rx="14" fill="#7d776e"/>
  <rect x="40" y="122" width="10" height="18" fill="#3b3833"/><rect x="350" y="122" width="10" height="18" fill="#3b3833"/>
</svg>`;

/** Room-view art width as a share of the wall, per print size. */
const ROOM_SCALE = { a3: 0.16, a2: 0.21, a1: 0.28, a0: 0.37 };

export function renderProduct(print, ctx) {
  const { catalog, money, store } = ctx;
  const collection = print.collection;
  const description = print.description || collection.description;
  const short = description.length > 230 ? description.slice(0, 230).replace(/\s+\S*$/, '') + '…' : description;
  const opts = { ...DEFAULT_OPTIONS };
  let qty = 1;
  let view = 0; // 0 = print, 1 = room, 2 = detail
  const VIEWS = 3;

  const optionGroup = (group) => {
    const g = OPTIONS[group];
    const isFrame = group === 'frame';
    return `
      <fieldset class="opt" data-group="${group}">
        <legend class="opt__legend"><span class="opt__name">${g.label}:</span> <span class="opt__value" data-value>${esc(option(group, opts[group]).label)}</span></legend>
        <div class="opt__list ${isFrame ? 'opt__list--frames' : ''}" role="radiogroup" aria-label="${g.label}">
          ${g.values.map((v) => `
            <button type="button" class="${isFrame ? 'frame-opt' : 'chip'}" role="radio" data-id="${v.id}" aria-checked="${v.id === opts[group]}">
              ${isFrame ? `<span class="frame-opt__thumb frame--${v.id}"><img src="${esc(print.image)}" alt="" loading="lazy"></span>` : ''}
              <span>${esc(v.label)}</span>
            </button>`).join('')}
        </div>
      </fieldset>`;
  };

  const others = collection.prints.filter((p) => p !== print);

  const el = html(`
    <div class="page page--product">
      <article class="product" data-slug="${esc(print.slug)}">
        <div class="product__media">
          <div class="product__stage" data-view="0">
            <div class="product__view product__view--print">
              <img class="product__img frame--unframed" data-flip-target src="${esc(print.image)}" alt="${esc(print.title)} by ${esc(print.artist)}">
            </div>
            <div class="product__view product__view--room room" aria-hidden="true">
              <div class="room__wall"></div>
              <div class="room__floor"></div>
              <img class="room__art frame--unframed" src="${esc(print.image)}" alt="">
              ${SOFA}
            </div>
            <div class="product__view product__view--detail" aria-hidden="true">
              <img src="${esc(print.image)}" alt="">
            </div>
          </div>
          <div class="product__media-bar">
            <div class="product__pager">
              <button type="button" class="pager-btn" data-pager="-1" aria-label="Previous image">${ICON_PREV}</button>
              <span class="mono product__counter" data-counter>1/${VIEWS}</span>
              <button type="button" class="pager-btn" data-pager="1" aria-label="Next image">${ICON_NEXT}</button>
            </div>
            <button type="button" class="product__room-btn" data-room>${ICON_EYE}<span>View In Room</span></button>
            <button type="button" class="product__save icon-btn" data-save aria-pressed="${store.isSaved(print.slug)}" aria-label="Save print">${ICON_SAVE}</button>
          </div>
        </div>

        <div class="product__info">
          <a class="product__back" href="${ctx.backHref}" data-back>‹ ${esc(ctx.backLabel)}</a>
          <h1 class="display product__title">${esc(collection.title)}</h1>
          <h2 class="display product__subtitle">${esc(print.title)}</h2>
          <p class="product__desc" data-desc>
            <span data-desc-text>${esc(short)}</span>
            ${short !== description ? '<button type="button" class="product__more" data-more>Read more »</button>' : ''}
          </p>
          <p class="display product__price" data-price>${money(priceFor(print, opts))}</p>
          <p class="product__edition"><span class="product__dot" aria-hidden="true"></span>Limited Edition of ${print.edition}</p>
          <p class="product__tax">Shop prices exclude tax. Applicable tax is calculated from your delivery address and added at checkout.</p>

          <div class="product__options">
            ${optionGroup('paper')}
            ${optionGroup('size')}
            ${optionGroup('signature')}
            ${optionGroup('frame')}
          </div>

          <div class="product__buy">
            <div class="qty" role="group" aria-label="Quantity">
              <button type="button" class="qty__btn" data-qty="-1" aria-label="Decrease quantity">−</button>
              <span class="qty__val" data-qty-val aria-live="polite">1</span>
              <button type="button" class="qty__btn" data-qty="1" aria-label="Increase quantity">+</button>
            </div>
            <button type="button" class="btn product__add" data-add>Add to bag</button>
          </div>

          <div class="accordion">
            <details class="acc">
              <summary>Paper &amp; Sizes <span class="acc__icon" aria-hidden="true"></span></summary>
              <div class="acc__body">
                <p><strong>Budget Art Paper</strong>: 200gsm matte paper, great value and bright colours.</p>
                <p><strong>Giclée Fine Art Paper</strong>: 230gsm cotton-rag paper printed with archival pigment inks.</p>
                <p><strong>Hahnemühle German Etching</strong>: 310gsm textured museum paper with a soft, velvety finish.</p>
                <table class="size-table">
                  <tr><th>Size</th><th>Inches</th><th>Centimetres</th></tr>
                  <tr><td>A3</td><td>11.7 × 16.5</td><td>29.7 × 42</td></tr>
                  <tr><td>A2</td><td>16.5 × 23.4</td><td>42 × 59.4</td></tr>
                  <tr><td>A1</td><td>23.4 × 33.1</td><td>59.4 × 84.1</td></tr>
                  <tr><td>A0</td><td>33.1 × 46.8</td><td>84.1 × 118.9</td></tr>
                </table>
              </div>
            </details>
            <details class="acc">
              <summary>Delivery Info <span class="acc__icon" aria-hidden="true"></span></summary>
              <div class="acc__body">
                <p>Every print is made to order and ships within 5-7 working days. Unframed prints are rolled in a sturdy tube; framed prints are packed flat with corner protectors.</p>
                <p>Standard delivery is free on orders over $150. Tracking details are emailed as soon as your order ships.</p>
              </div>
            </details>
            <details class="acc">
              <summary>Returns Policy <span class="acc__icon" aria-hidden="true"></span></summary>
              <div class="acc__body">
                <p>Not in love with it? Return unframed prints in their original packaging within 30 days for a full refund. Signed and framed pieces can be exchanged within 14 days.</p>
              </div>
            </details>
          </div>
        </div>
      </article>

      ${others.length ? `
      <section class="get-collection" aria-labelledby="get-collection-title">
        <div class="get-collection__head">
          <h3 class="display" id="get-collection-title">Get the collection</h3>
          <p class="get-collection__text">${esc(collection.title)}: ${collection.prints.length} prints. ${esc(collection.kicker || '')}</p>
          <a class="link-mono" href="#/collection/${esc(collection.slug)}">View all <span aria-hidden="true">→</span></a>
        </div>
        <div class="card-grid card-grid--small">
          ${others.map((p) => `
            <a class="card" href="#/print/${esc(p.slug)}" data-print="${esc(p.slug)}">
              <span class="card__media"><img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy"></span>
              <span class="card__title">${esc(p.title)}</span>
              <span class="card__meta mono" data-from-price="${p.basePrice}">From ${money(priceFor(p))}</span>
            </a>`).join('')}
        </div>
      </section>` : ''}
    </div>`);

  // ---- behaviour
  const $ = (s) => el.querySelector(s);
  const stage = $('.product__stage');
  const priceEl = $('[data-price]');
  const mainImg = $('.product__img');
  const roomArt = $('.room__art');

  function updatePrice() {
    priceEl.textContent = money(priceFor(print, opts));
  }

  function updateFrame() {
    const cls = `frame--${opts.frame}`;
    [mainImg, roomArt].forEach((img) => { img.className = img.className.replace(/frame--\w+/, cls); });
    roomArt.style.setProperty('--art-w', ROOM_SCALE[opts.size] || 0.2);
  }

  function setView(v) {
    view = (v + VIEWS) % VIEWS;
    stage.dataset.view = view;
    $('[data-counter]').textContent = `${view + 1}/${VIEWS}`;
    el.querySelectorAll('.product__view').forEach((n, i) => n.setAttribute('aria-hidden', String(i !== view)));
  }

  el.addEventListener('click', (e) => {
    const t = e.target;
    const optBtn = t.closest('.opt [role="radio"]');
    if (optBtn) {
      const fs = optBtn.closest('.opt');
      const group = fs.dataset.group;
      opts[group] = optBtn.dataset.id;
      fs.querySelectorAll('[role="radio"]').forEach((b) => b.setAttribute('aria-checked', String(b === optBtn)));
      fs.querySelector('[data-value]').textContent = option(group, opts[group]).label;
      updatePrice();
      updateFrame();
      if (group === 'size' && view !== 1) setView(view); // keep current view
      return;
    }
    const q = t.closest('[data-qty]');
    if (q) {
      qty = Math.max(1, Math.min(99, qty + Number(q.dataset.qty)));
      $('[data-qty-val]').textContent = qty;
      return;
    }
    if (t.closest('[data-add]')) {
      store.addToBag({ slug: print.slug, options: opts, qty, unitPrice: priceFor(print, opts) });
      const btn = $('[data-add]');
      btn.textContent = 'Added';
      setTimeout(() => { btn.textContent = 'Add to bag'; }, 1600);
      ctx.openBag();
      return;
    }
    if (t.closest('[data-more]')) {
      $('[data-desc-text]').textContent = description;
      t.closest('[data-more]').remove();
      return;
    }
    if (t.closest('[data-room]')) { setView(view === 1 ? 0 : 1); return; }
    const pager = t.closest('[data-pager]');
    if (pager) { setView(view + Number(pager.dataset.pager)); return; }
    if (t.closest('.product__stage')) { setView(view + 1); return; }
    const save = t.closest('[data-save]');
    if (save) {
      const saved = store.toggleSaved(print.slug);
      save.setAttribute('aria-pressed', String(saved));
      toast(saved ? 'Saved to your list' : 'Removed from saved');
    }
  });

  // radio groups: arrow-key navigation
  el.addEventListener('keydown', (e) => {
    const btn = e.target.closest('.opt [role="radio"]');
    if (!btn || !['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const list = [...btn.parentElement.children];
    const next = list[(list.indexOf(btn) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length];
    next.focus();
    next.click();
  });

  updateFrame();

  // keep prices in sync with the currency selector
  ctx.onStore('currency', () => {
    updatePrice();
    el.querySelectorAll('[data-from-price]').forEach((n) => {
      const p = catalog.print(n.closest('[data-print]').dataset.print);
      n.textContent = `From ${money(priceFor(p))}`;
    });
  });
  ctx.onStore('saved', () => $('[data-save]').setAttribute('aria-pressed', String(store.isSaved(print.slug))));

  return el;
}
