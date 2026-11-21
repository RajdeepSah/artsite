// Header behaviour: currency, bag/saved counts, active nav, mobile menu,
// gallery/list toggle and keyboard shortcuts.
import { $, $$ } from '../utils.js';
import { CURRENCIES } from '../pricing.js';
import { openSearch } from './search.js';
import { openSaved } from './saved.js';
import { openAccount } from './account.js';
import { openSettings } from './settings.js';
import { openOverlayName } from './overlay.js';

export function initHeader(ctx) {
  const { store, navigate } = ctx;

  // currency
  const select = $('#currency-select');
  select.innerHTML = Object.keys(CURRENCIES).map((c) => `<option value="${c}">${c}</option>`).join('');
  select.value = store.state.currency;
  select.addEventListener('change', () => store.setCurrency(select.value));

  // counts
  const bagCount = $('#bag-count');
  const savedCount = $('#saved-count');
  function updateCounts(bump = false) {
    const n = store.bagCount();
    bagCount.textContent = n;
    $('#bag-open').setAttribute('aria-label', `Bag, ${n} item${n === 1 ? '' : 's'}`);
    if (bump) {
      bagCount.classList.remove('bump');
      void bagCount.offsetWidth;
      bagCount.classList.add('bump');
    }
    const s = store.state.saved.length;
    savedCount.textContent = s;
    savedCount.hidden = s === 0;
  }
  updateCounts();
  store.on('bag', () => updateCounts(true));
  store.on('saved', () => updateCounts());

  // buttons
  $('#search-open').addEventListener('click', () => openSearch(ctx));
  $('#saved-open').addEventListener('click', () => openSaved(ctx));
  $('#account-open').addEventListener('click', () => openAccount(ctx));
  $('#settings-open').addEventListener('click', () => openSettings(ctx));
  $('#bag-open').addEventListener('click', () => ctx.openBag());

  // mobile menu
  const menuBtn = $('#menu-open');
  const nav = $('#main-nav');
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  window.addEventListener('hashchange', () => setMenu(false));

  // gallery / list toggle
  $$('#view-toggle button').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.mode === 'list' ? '/list' : '/')));

  // shortcuts: Cmd/Ctrl+K or "/" opens search
  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (openOverlayName() !== 'search') openSearch(ctx);
    } else if (e.key === '/' && !typing && !openOverlayName()) {
      e.preventDefault();
      openSearch(ctx);
    }
  });

  // Show the right shortcut hint on Windows/Linux.
  if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
    const kbd = $('.search-pill kbd');
    if (kbd) kbd.textContent = 'Ctrl K';
  }

  return {
    setActive(key) {
      $$('#main-nav a').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === key));
    },
    setToggle(mode) {
      $$('#view-toggle button').forEach((b) => {
        const on = b.dataset.mode === mode;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    },
  };
}
