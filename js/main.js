// Entry point: loads the catalog, starts the 3D gallery, sets up routes and
// runs the transitions between the gallery and the pages.
import { loadCatalog } from './data.js';
import { store } from './store.js';
import { formatPrice } from './pricing.js';
import { route, startRouter, navigate, currentPath } from './router.js';
import { $, wait, toast, reducedMotion } from './utils.js';
import { createHud } from './ui/hud.js';
import { createCursor } from './ui/cursor.js';
import { initHeader } from './ui/header.js';
import { openBag } from './ui/bag.js';
import { applySettings } from './ui/settings.js';
import { openOverlayName, closeOverlay } from './ui/overlay.js';
import { veil, createFloatingImage, flipTo, imageReady } from './ui/transition.js';
import { renderProduct } from './ui/product.js';
import { renderList } from './ui/list.js';
import { renderInfo, renderAuctions, renderHelp } from './ui/pages.js';
import { renderCheckout, renderOrder } from './ui/checkout.js';

const body = document.body;
const pageView = $('#page-view');

let catalog;
let gallery = null;
let galleryReady;
let webglFailed = false;
let mode = null;            // 'gallery' | 'page'
let currentPage = null;     // { type, slug? }
let pendingFlip = null;     // image to animate into the next product page
let pendingWalk = null;     // collection to walk to once the gallery is shown
let navToken = 0;           // increases on every route change (cancels stale transitions)
let selecting = false;
let pageListeners = [];

const ctx = {
  store,
  navigate,
  money: (usd) => formatPrice(usd, store.state.currency),
  openBag: () => openBag(ctx),
  onStore(event, fn) { pageListeners.push(store.on(event, fn)); },
  walkToCollection(slug) { pendingWalk = slug; navigate('/'); },
  onQualityChange: () => gallery?.resize(),
};

function setLoading(on) {
  body.classList.toggle('is-loading', on);
}

function setTitle(text) {
  document.title = text ? `${text} · ${catalog.site.name}` : `${catalog.site.name} · ${catalog.site.tagline}`;
}

// ------------------------------------------------------------------ gallery view
async function showGallery() {
  const token = ++navToken;
  header.setActive('index');
  header.setToggle('gallery');
  setTitle('');
  if (webglFailed) { navigate('/list'); return; }

  if (!gallery) {
    setLoading(true);
    await galleryReady;
    if (token !== navToken || !gallery) return;
  }

  if (mode === 'gallery') return;
  const prev = currentPage;
  const wasPage = mode === 'page';
  mode = 'gallery';
  currentPage = null;
  body.classList.remove('hide-toggle');
  body.dataset.view = 'gallery';
  gallery.resume();

  if (wasPage) {
    // Coming back from a product page: start from that print and zoom out.
    if (prev?.type === 'product' && !gallery.focusItem) {
      const item = gallery.findPrint(prev.slug);
      if (item) gallery.setFocus(item);
    }
    hud.hide();
    await hidePage();
    if (token !== navToken) return;
    hud.show();
    if (gallery.focusItem) await gallery.returnFromFocus(reducedMotion() ? 1 : 1200);
  } else {
    hud.show();
  }
  if (token !== navToken) return;
  if (pendingWalk) {
    const c = catalog.collection(pendingWalk);
    pendingWalk = null;
    if (c) gallery.goToCollection(c);
  }
  $('#gallery-canvas').focus({ preventScroll: true });
}

function clearPageListeners() {
  pageListeners.forEach((off) => off());
  pageListeners = [];
}

async function hidePage() {
  pageView.classList.add('is-leaving');
  await wait(reducedMotion() ? 0 : 420);
  pageView.hidden = true;
  pageView.classList.remove('is-leaving');
  pageView.replaceChildren();
  clearPageListeners();
}

// ------------------------------------------------------------------ pages
/**
 * Show a page in the page layer.
 * @param {object} info   { type, slug?, toggle?: 'list', nav?: string, title?: string }
 * @param {Function} render  returns the page element
 */
async function showPage(info, render) {
  const token = ++navToken;
  header.setActive(info.nav || '');
  header.setToggle(info.toggle || '');
  body.classList.toggle('hide-toggle', !info.toggle);
  setTitle(info.title || '');

  const fromGallery = mode === 'gallery';
  clearPageListeners();
  const el = render();
  mode = 'page';
  currentPage = info;
  hud.hide();
  cursor.hide();
  setLoading(false);

  const flip = pendingFlip && info.type === 'product' && pendingFlip.slug === info.slug ? pendingFlip : null;
  pendingFlip = null;

  if (flip && (flip.from === 'card' || (flip.from === 'gallery' && fromGallery))) {
    // Gallery -> product: white veil over the 3D view, then the print slides into place.
    // List card -> product: the card image slides into place.
    const viaGallery = flip.from === 'gallery';
    const stale = () => token !== navToken; // the visitor navigated somewhere else meanwhile
    const floating = createFloatingImage(flip.src, flip.rect);
    try {
      if (viaGallery) {
        body.classList.add('is-transitioning');
        await veil(true, 480);
        if (stale()) return;
      }
      mountPage(el, true);
      body.dataset.view = 'page';
      const target = el.querySelector('[data-flip-target]');
      target.style.visibility = 'hidden';
      await imageReady(target);
      if (stale()) return;
      await flipTo(floating, flip.rect, target.getBoundingClientRect(), viaGallery ? 850 : 700);
      target.style.visibility = '';
      revealPage(el);
    } finally {
      floating.remove();
      if (viaGallery) {
        await veil(false, 1);
        body.classList.remove('is-transitioning');
        selecting = false;
      }
    }
    if (stale()) return;
    if (viaGallery) gallery?.pause();
  } else {
    mountPage(el, false);
    body.dataset.view = 'page';
    if (fromGallery) gallery?.pause();
  }
  if (token !== navToken) return;
  // move focus to the page heading for screen readers / keyboard users
  const h1 = el.querySelector('h1');
  if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); }
}

function mountPage(el, entering) {
  pageView.classList.remove('is-leaving');
  pageView.replaceChildren(el);
  pageView.hidden = false;
  pageView.scrollTop = 0;
  el.classList.add(entering ? 'is-entering' : 'fade-in');
}

function revealPage(el) {
  el.classList.remove('is-entering');
  el.classList.add('is-revealing');
}

function notFound(what) {
  return () => {
    const d = document.createElement('div');
    d.className = 'page page--checkout';
    d.innerHTML = `<div class="empty-state"><h1 class="display">${what} not found</h1><a class="btn" href="#/">Back to the gallery</a></div>`;
    return d;
  };
}

// ------------------------------------------------------------------ routes
function setupRoutes() {
  route('/', showGallery);
  route('/list', () => showPage({ type: 'list', toggle: 'list', nav: 'shop', title: 'All prints' }, () => renderList({}, ctx)));
  route('/shop', () => showPage({ type: 'list', toggle: 'list', nav: 'shop', title: 'Shop' }, () => renderList({ title: 'Shop all prints', kicker: 'Shop' }, ctx)));
  route('/collection/:slug', ({ slug }) => {
    const c = catalog.collection(slug);
    if (!c) return showPage({ type: '404' }, notFound('Collection'));
    showPage({ type: 'list', toggle: 'list', nav: 'shop', title: c.title }, () => renderList({ collectionSlug: slug }, ctx));
  });
  route('/print/:slug', ({ slug }, { previous }) => {
    const print = catalog.print(slug);
    if (!print) return showPage({ type: '404' }, notFound('Print'));
    const fromList = previous && /^\/(list|shop|collection)/.test(previous);
    const fromPrint = previous && previous.startsWith('/print/');
    ctx.backHref = fromList ? `#${previous}` : fromPrint ? '#/shop' : '#/';
    ctx.backLabel = fromList || fromPrint ? 'Prints' : 'Gallery';
    showPage({ type: 'product', slug, nav: 'shop', title: print.title }, () => renderProduct(print, ctx));
  });
  route('/info', () => showPage({ type: 'info', nav: 'info', title: 'Info' }, () => renderInfo(ctx)));
  route('/auctions', () => showPage({ type: 'auctions', nav: 'auctions', title: 'Auctions' }, () => renderAuctions(ctx)));
  route('/help', () => showPage({ type: 'help', nav: 'help', title: 'Help' }, () => renderHelp(ctx)));
  route('/checkout', () => showPage({ type: 'checkout', title: 'Checkout' }, () => renderCheckout(ctx)));
  route('/order/:id', ({ id }) => showPage({ type: 'order', title: 'Order confirmed' }, () => renderOrder(id, ctx)));
}

// ------------------------------------------------------------------ gallery selection
async function onSelect(item) {
  if (selecting || mode !== 'gallery') return;
  if (item.type === 'card') {
    navigate(`/collection/${item.collection.slug}`);
    return;
  }
  selecting = true;
  hud.hide();
  cursor.hide();
  body.classList.add('hide-toggle');
  await gallery.flyTo(item, reducedMotion() ? 1 : 1300);
  if (mode !== 'gallery' || currentPath() !== '/') { selecting = false; return; } // visitor went elsewhere
  pendingFlip = { from: 'gallery', slug: item.print.slug, src: item.print.image, rect: gallery.getScreenRect(item) };
  navigate(`/print/${item.print.slug}`);
  setTimeout(() => { selecting = false; }, 4000); // safety net
}

// Cards in pages (list / "get the collection") animate their image into the product page.
pageView.addEventListener('click', (e) => {
  const card = e.target.closest('a.card[data-print]');
  if (!card || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  const img = card.querySelector('img');
  if (!img) return;
  e.preventDefault();
  pendingFlip = { from: 'card', slug: card.dataset.print, src: img.currentSrc || img.src, rect: img.getBoundingClientRect() };
  navigate(`/print/${card.dataset.print}`);
});

// Any navigation (links, back/forward buttons) closes an open drawer or modal.
window.addEventListener('hashchange', () => closeOverlay());

// Keyboard: arrows walk in the gallery, Escape leaves a product page.
document.addEventListener('keydown', (e) => {
  if (openOverlayName() || /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
  if (mode === 'gallery' && gallery) {
    const d = { ArrowRight: 2.4, ArrowUp: 2.4, ArrowLeft: -2.4, ArrowDown: -2.4 }[e.key];
    if (d) { e.preventDefault(); gallery.walk(d); }
    if (e.key === 'PageDown') { e.preventDefault(); gallery.next(); }
    if (e.key === 'PageUp') { e.preventDefault(); gallery.prev(); }
    if (e.key === 'Enter' && document.activeElement?.id === 'gallery-canvas') {
      // open the print closest to the centre of the screen
      const cx = innerWidth / 2;
      const best = gallery.visibleItems()
        .filter((v) => v.item.type === 'print' && v.distance < 14)
        .sort((a, b) => Math.abs(a.rect.left + a.rect.width / 2 - cx) - Math.abs(b.rect.left + b.rect.width / 2 - cx))[0];
      if (best) { e.preventDefault(); onSelect(best.item); }
    }
  } else if (mode === 'page' && e.key === 'Escape' && currentPage?.type === 'product') {
    location.hash = ctx.backHref || '#/';
  }
});

// ------------------------------------------------------------------ boot
let header;
let hud;
let cursor;

async function boot() {
  applySettings(store.state.settings);
  try {
    catalog = await loadCatalog();
  } catch (err) {
    $('#loader-pct').textContent = '';
    document.querySelector('.loader__text').textContent = 'Could not load the catalog. Please refresh.';
    console.error(err);
    return;
  }
  ctx.catalog = catalog;
  ctx.site = catalog.site;

  header = initHeader(ctx);
  const canvas = $('#gallery-canvas');
  cursor = createCursor(canvas);
  hud = createHud({ onPrev: () => gallery?.prev(), onNext: () => gallery?.next() });
  hud.hide();

  // Build the 3D gallery (loads every image, so it can take a moment).
  galleryReady = import('./gallery/scene.js')
    .then(({ createGallery }) => createGallery({
      canvas,
      catalog,
      onProgress: (p) => {
        $('#loader-pct').textContent = `${Math.round(p * 100)}%`;
        $('#loader-bar').style.width = `${p * 100}%`;
      },
      onHover: (item) => cursor.setHover(item),
      onSelect,
      onCollectionChange: (c) => hud.setCollection(c),
    }))
    .then((g) => {
      gallery = g;
      window.__gallery = g; // handy for debugging in the console
      if (mode !== 'gallery') g.pause();
    })
    .catch((err) => {
      console.warn('3D gallery unavailable:', err);
      webglFailed = true;
      body.classList.add('no-webgl');
      if (currentPath() === '/') {
        toast('3D gallery not supported here, showing the list instead');
        navigate('/list');
      }
    })
    .finally(() => setLoading(false));

  setupRoutes();
  startRouter();
}

boot();
