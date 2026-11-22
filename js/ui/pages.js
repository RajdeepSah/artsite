// Content pages: Info, Auctions, Help.
import { esc, html, toast } from '../utils.js';
import { openOverlay } from './overlay.js';

// ------------------------------------------------------------------ Info
export function renderInfo(ctx) {
  const { catalog, site } = ctx;
  const hero = catalog.prints.find((p) => p.collection.slug === 'kits-of-the-world') || catalog.prints[0];
  const second = catalog.prints[Math.min(8, catalog.prints.length - 1)];
  return html(`
    <div class="page page--info">
      <section class="info-hero">
        <p class="mono">Info</p>
        <h1 class="display info-hero__title">${esc(site.artist)}</h1>
        <p class="info-hero__lead">Bold, flat colour. Everyday joy. Prints made to be lived with.</p>
      </section>
      <section class="info-grid">
        <figure class="info-figure"><img src="${esc(hero.image)}" alt="${esc(hero.title)}" loading="lazy"><figcaption class="mono">${esc(hero.title)}, ${hero.year}</figcaption></figure>
        <div class="info-text">
          <p>${esc(site.artist)} is an illustrator and painter whose work celebrates the small, shared moments that make a place feel like home: Sunday football, market mornings, songs on the radio and streets lit up for the holidays.</p>
          <p>Each collection starts as a series of paintings and is released as a small run of limited edition prints. Every print is made to order on archival paper, checked by hand and shipped flat or rolled.</p>
          <p>This site is designed as a gallery first and a shop second. Walk round, take your time, and click any painting to look closer.</p>
          <dl class="stats">
            <div><dt class="mono">Collections</dt><dd class="display">${catalog.collections.length}</dd></div>
            <div><dt class="mono">Prints</dt><dd class="display">${catalog.prints.length}</dd></div>
            <div><dt class="mono">Edition size</dt><dd class="display">${Math.min(...catalog.prints.map((p) => p.edition))}-${Math.max(...catalog.prints.map((p) => p.edition))}</dd></div>
          </dl>
        </div>
      </section>
      <section class="info-grid info-grid--reverse">
        <div class="info-text">
          <h2 class="display info-sub">Studio &amp; commissions</h2>
          <p>Commissions, collaborations and licensing enquiries are welcome. Murals, editorial illustration, album artwork and club or brand projects.</p>
          <p><a class="link-mono" href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
          <h2 class="display info-sub">Press</h2>
          <p>Press kit and high-resolution images are available on request.</p>
        </div>
        <figure class="info-figure"><img src="${esc(second.image)}" alt="${esc(second.title)}" loading="lazy"><figcaption class="mono">${esc(second.title)}, ${second.year}</figcaption></figure>
      </section>
    </div>`);
}

// ------------------------------------------------------------------ Auctions
const LOT_KEY = 'artsite:bids';
function loadBids() {
  try { return JSON.parse(localStorage.getItem(LOT_KEY)) || {}; } catch { return {}; }
}
function saveBids(b) {
  try { localStorage.setItem(LOT_KEY, JSON.stringify(b)); } catch { /* ignore */ }
}

export function renderAuctions(ctx) {
  const { catalog, money } = ctx;
  // Three original paintings. End times are rolling so the demo always has live auctions.
  const now = Date.now();
  const day = 86400000;
  const picks = [catalog.prints[0], catalog.prints[9], catalog.prints[22]].filter(Boolean);
  const lots = picks.map((p, i) => ({
    id: `lot-${i + 1}`,
    print: p,
    start: 400 + i * 250,
    step: 25,
    ends: Math.ceil(now / day) * day + (i + 1) * day * 1.5,
  }));
  const bids = loadBids();
  const current = (lot) => bids[lot.id]?.amount || lot.start;

  const el = html(`
    <div class="page page--auctions">
      <header class="list-head">
        <p class="mono list-head__kicker">Auctions</p>
        <h1 class="display list-head__title">Original paintings</h1>
        <p class="list-head__desc">One-of-a-kind originals from each collection. Bids are in USD; the highest bid when the timer ends wins.</p>
      </header>
      <div class="lots">
        ${lots.map((lot, i) => `
          <article class="lot" data-lot="${lot.id}">
            <a class="lot__media" href="#/print/${esc(lot.print.slug)}"><img src="${esc(lot.print.image)}" alt="${esc(lot.print.title)}" loading="lazy"></a>
            <div class="lot__info">
              <p class="mono muted">Lot ${String(i + 1).padStart(2, '0')} · Original on canvas</p>
              <h2 class="display lot__title">${esc(lot.print.title)}</h2>
              <p class="serif muted">${esc(lot.print.collection.title)}, ${lot.print.year}</p>
              <dl class="lot__stats">
                <div><dt class="mono">Current bid</dt><dd class="display" data-current>${money(current(lot))}</dd></div>
                <div><dt class="mono">Ends in</dt><dd class="display" data-countdown="${lot.ends}">-</dd></div>
              </dl>
              <button type="button" class="btn" data-bid="${lot.id}">Place a bid</button>
              ${bids[lot.id] ? '<p class="mono lot__yours">You are the highest bidder</p>' : ''}
            </div>
          </article>`).join('')}
      </div>
    </div>`);

  function tick() {
    el.querySelectorAll('[data-countdown]').forEach((n) => {
      const ms = Math.max(0, Number(n.dataset.countdown) - Date.now());
      const d = Math.floor(ms / day);
      const h = Math.floor((ms % day) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      n.textContent = ms ? `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s` : 'Ended';
    });
  }
  tick();
  const timer = setInterval(() => {
    if (!el.isConnected) { clearInterval(timer); return; }
    tick();
  }, 1000);

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-bid]');
    if (!b) return;
    const lot = lots.find((l) => l.id === b.dataset.bid);
    const min = current(lot) + lot.step;
    openOverlay({
      kind: 'modal',
      name: 'bid',
      label: 'Place a bid',
      render(panel, close) {
        panel.innerHTML = `
          <div class="modal">
            <button type="button" class="drawer__close modal__close" data-close aria-label="Close">×</button>
            <h2 class="display modal__title">Bid on ${esc(lot.print.title)}</h2>
            <p class="modal__text">Current bid ${money(current(lot))}. Minimum next bid <strong>$${min}</strong> (USD).</p>
            <form class="form" novalidate>
              <div class="field"><label class="field__label" for="bid-amount">Your bid (USD)</label>
                <input class="input" id="bid-amount" name="amount" type="number" inputmode="numeric" min="${min}" step="${lot.step}" value="${min}" autofocus>
                <p class="field__error" data-err></p></div>
              <button class="btn btn--block" type="submit">Confirm bid</button>
              <p class="mono muted">Demo only: no payment is taken.</p>
            </form>
          </div>`;
        panel.querySelector('form').addEventListener('submit', (ev) => {
          ev.preventDefault();
          const amount = Number(ev.target.amount.value);
          if (!Number.isFinite(amount) || amount < min) {
            panel.querySelector('[data-err]').textContent = `Your bid must be at least $${min}.`;
            return;
          }
          bids[lot.id] = { amount, date: Date.now() };
          saveBids(bids);
          const art = el.querySelector(`[data-lot="${lot.id}"]`);
          art.querySelector('[data-current]').textContent = money(amount);
          if (!art.querySelector('.lot__yours')) art.querySelector('.lot__info').insertAdjacentHTML('beforeend', '<p class="mono lot__yours">You are the highest bidder</p>');
          toast('Bid placed');
          close();
        });
      },
    });
  });

  ctx.onStore('currency', () => {
    el.querySelectorAll('[data-lot]').forEach((art) => {
      const lot = lots.find((l) => l.id === art.dataset.lot);
      art.querySelector('[data-current]').textContent = money(current(lot));
    });
  });
  return el;
}

// ------------------------------------------------------------------ Help
const FAQ = [
  ['How long does delivery take?', 'Prints are made to order and usually ship within 5-7 working days. Delivery then takes 2-4 days in the UK and Europe, and 5-10 days worldwide.'],
  ['Which paper should I choose?', 'Budget Art Paper is bright and affordable. Giclée Fine Art Paper is a heavier cotton-rag stock for long-lasting colour. Hahnemühle German Etching is a textured museum paper for collectors.'],
  ['What does "Signed and Numbered" mean?', 'The artist signs the print by hand and writes its edition number (for example 7/25). Each edition is limited, and the number is never reprinted.'],
  ['Can I return a print?', 'Yes. Unframed prints can be returned within 30 days for a full refund. Signed and framed pieces can be exchanged within 14 days.'],
  ['Do you ship framed prints internationally?', 'Yes, framed prints ship worldwide in protective flat packaging. Large framed sizes (A1/A0) may take a few extra days.'],
  ['How should I care for my print?', 'Keep it out of direct sunlight and away from damp walls. Frame it behind UV-protective glass for the best results.'],
];

export function renderHelp(ctx) {
  const { site } = ctx;
  const el = html(`
    <div class="page page--help">
      <header class="list-head">
        <p class="mono list-head__kicker">Help</p>
        <h1 class="display list-head__title">Questions &amp; answers</h1>
        <p class="list-head__desc">Can't find what you need? Send a message and we'll reply within two working days.</p>
      </header>
      <div class="help-grid">
        <div class="accordion accordion--faq">
          ${FAQ.map(([q, a]) => `
            <details class="acc">
              <summary>${esc(q)} <span class="acc__icon" aria-hidden="true"></span></summary>
              <div class="acc__body"><p>${esc(a)}</p></div>
            </details>`).join('')}
        </div>
        <form class="form contact-form" novalidate>
          <h2 class="display info-sub">Contact</h2>
          <div class="field"><label class="field__label" for="c-name">Name</label><input class="input" id="c-name" name="name" autocomplete="name" required><p class="field__error" data-err="name"></p></div>
          <div class="field"><label class="field__label" for="c-email">Email</label><input class="input" id="c-email" name="email" type="email" autocomplete="email" required><p class="field__error" data-err="email"></p></div>
          <div class="field"><label class="field__label" for="c-topic">Topic</label>
            <select class="input" id="c-topic" name="topic"><option>An order</option><option>Commissions</option><option>Press</option><option>Something else</option></select></div>
          <div class="field"><label class="field__label" for="c-msg">Message</label><textarea class="input" id="c-msg" name="message" required></textarea><p class="field__error" data-err="message"></p></div>
          <button class="btn" type="submit">Send message</button>
          <p class="mono muted">Or email <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
        </form>
      </div>
    </div>`);

  el.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const errors = {
      name: f.name.value.trim() ? '' : 'Please tell us your name.',
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim()) ? '' : 'Please enter a valid email address.',
      message: f.message.value.trim().length >= 10 ? '' : 'Please write a few more words (10+ characters).',
    };
    Object.entries(errors).forEach(([k, v]) => { f.querySelector(`[data-err="${k}"]`).textContent = v; });
    const first = Object.keys(errors).find((k) => errors[k]);
    if (first) { f[first].focus(); return; }
    // No backend yet: open the visitor's email app with the message filled in.
    const body = encodeURIComponent(`${f.message.value.trim()}\n\n- ${f.name.value.trim()} (${f.email.value.trim()})`);
    const subject = encodeURIComponent(`[${f.topic.value}] Message from ${f.name.value.trim()}`);
    f.outerHTML = `<div class="contact-form contact-form--done">
      <h2 class="display info-sub">Thank you!</h2>
      <p>Your message is ready to send. If your email app didn't open, <a href="mailto:${esc(site.email)}?subject=${subject}&body=${body}">click here</a>.</p>
    </div>`;
    window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
  });
  return el;
}
