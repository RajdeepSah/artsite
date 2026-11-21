// End-to-end browser tests (Playwright, no test runner needed).
//
//   npm i -D playwright && npx playwright install chromium   (first time only)
//   node tests/e2e.cjs            # run all tests
//   node tests/e2e.cjs bag        # run tests whose name contains "bag"
//
// Exits with code 1 if any test fails.
const { chromium, devices } = require('playwright');
const { createServer } = require('./serve.cjs');

const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const filter = process.argv[2] || '';
const tests = [];
const test = (name, fn, opts = {}) => tests.push({ name, fn, opts });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ---------------------------------------------------------------- helpers
async function openSite(browser, base, hash = '', opts = {}) {
  const context = await browser.newContext(opts.device ? { ...devices[opts.device], deviceScaleFactor: 1 } : { viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}/${hash}`);
  await page.waitForFunction(() => !document.body.classList.contains('is-loading'), null, { timeout: 90000 });
  return { page, context, errors };
}

const galleryReady = (page) => page.waitForFunction(() => window.__gallery && window.__gallery.mode === 'walk', null, { timeout: 60000 });

/** Wait until the camera stops walking. */
const settle = (page) => page.waitForFunction(() => {
  const s = window.__gallery.debug.state;
  return Math.abs(s.s - s.target) < 0.05;
}, null, { timeout: 30000 });

/** Screen position of the largest print fully in view. */
async function findPrint(page) {
  return page.evaluate(() => {
    const v = window.__gallery.visibleItems()
      .filter((x) => x.item.type === 'print' && x.rect.left > 40 && x.rect.left + x.rect.width < innerWidth - 40 && x.rect.top > 70)
      .sort((a, b) => b.rect.width - a.rect.width)[0];
    if (!v) return null;
    return { x: v.rect.left + v.rect.width / 2, y: v.rect.top + v.rect.height / 2, slug: v.item.print.slug };
  });
}

async function openFirstPrint(page) {
  await galleryReady(page);
  await settle(page);
  const t = await findPrint(page);
  assert(t, 'no print visible in the gallery');
  await page.mouse.move(t.x, t.y, { steps: 4 });
  await page.waitForTimeout(300);
  await page.mouse.click(t.x, t.y);
  await page.waitForFunction(() => location.hash.startsWith('#/print/') && document.body.dataset.view === 'page' && !document.body.classList.contains('is-transitioning'), null, { timeout: 30000 });
  return t;
}

// ---------------------------------------------------------------- tests
test('gallery loads without errors and shows the HUD', async ({ browser, base }) => {
  const { page, context, errors } = await openSite(browser, base);
  await galleryReady(page);
  await page.waitForTimeout(800);
  const name = (await page.textContent('#hud-name')).trim();
  assert(name.length > 2, `HUD collection name is empty ("${name}")`);
  assert(await page.isVisible('#gallery-canvas'), 'canvas not visible');
  assert(await page.isVisible('.view-toggle'), 'gallery/list toggle not visible');
  assert(errors.length === 0, `console errors: ${errors.join(' | ')}`);
  await context.close();
});

test('mouse wheel walks forward and the next button changes collection', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base);
  await galleryReady(page);
  const s0 = await page.evaluate(() => window.__gallery.debug.state.target);
  await page.mouse.move(700, 450);
  for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 200);
  const s1 = await page.evaluate(() => window.__gallery.debug.state.target);
  assert(s1 > s0 + 3, `wheel did not walk forward (${s0} -> ${s1})`);
  await settle(page);
  const before = (await page.textContent('#hud-name')).trim();
  await page.click('#walk-next');
  await settle(page);
  await page.waitForTimeout(700);
  const after = (await page.textContent('#hud-name')).trim();
  assert(before !== after, `next button did not change the collection (still "${after}")`);
  await context.close();
});

test('hovering a print shows the "Open the print" pill', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base);
  await galleryReady(page);
  await settle(page);
  const t = await findPrint(page);
  await page.mouse.move(t.x, t.y, { steps: 5 });
  await page.waitForFunction(() => document.getElementById('cursor').classList.contains('is-hovering'), null, { timeout: 5000 });
  assert((await page.textContent('#cursor-label')).trim() === 'Open the print', 'wrong hover label');
  await context.close();
});

test('clicking a print flies in and opens its product page', async ({ browser, base }) => {
  const { page, context, errors } = await openSite(browser, base);
  const t = await openFirstPrint(page);
  assert(await page.evaluate(() => location.hash) === `#/print/${t.slug}`, 'opened a different print than clicked');
  assert(await page.isVisible('.product__title'), 'product title missing');
  assert(await page.isVisible('[data-add]'), 'add to bag missing');
  assert(!(await page.$('.flip-image')), 'floating transition image was not removed');
  assert(errors.length === 0, `console errors: ${errors.join(' | ')}`);
  await context.close();
});

test('product options update the price', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base, '#/print/first-touch');
  await page.waitForSelector('[data-price]');
  assert((await page.textContent('[data-price]')).trim() === '$50.00', 'base price should be $50.00');
  await page.click('[data-group="size"] [data-id="a2"]');
  assert((await page.textContent('[data-price]')).trim() === '$70.00', 'A2 should be $70.00 (like the video)');
  await page.click('[data-group="signature"] [data-id="signed"]');
  assert((await page.textContent('[data-price]')).trim() === '$110.00', 'signed A2 should be $110.00');
  await page.click('[data-group="frame"] [data-id="classic"]');
  assert((await page.textContent('[data-price]')).trim() === '$194.00', 'signed A2 classic frame should be $194.00');
  await page.click('[data-room]');
  assert(await page.getAttribute('.product__stage', 'data-view') === '1', 'view in room did not switch view');
  await context.close();
});

test('bag: add, change quantity, remove', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base, '#/print/first-touch');
  await page.waitForSelector('[data-add]');
  await page.click('[data-add]');
  await page.waitForSelector('.overlay--drawer.is-open');
  assert((await page.textContent('#bag-count')).trim() === '1', 'bag count should be 1');
  await page.click('.bag-item [data-step="1"]');
  assert((await page.textContent('[data-subtotal]')).trim() === '$100.00', 'subtotal should be $100.00 after +1');
  await page.click('.bag-item [data-remove]');
  await page.waitForSelector('.drawer__empty');
  assert((await page.textContent('#bag-count')).trim() === '0', 'bag should be empty');
  await page.keyboard.press('Escape');
  await page.waitForSelector('.overlay', { state: 'detached' });
  await context.close();
});

test('back to the gallery zooms out and resumes walking', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base);
  await openFirstPrint(page);
  await page.click('[data-back]');
  await page.waitForFunction(() => location.hash === '#/' && window.__gallery.mode === 'walk', null, { timeout: 30000 });
  assert(await page.isHidden('#page-view'), 'page layer should be hidden');
  assert(await page.evaluate(() => document.body.dataset.view) === 'gallery', 'body should be in gallery view');
  await context.close();
});

test('pressing back during the fly-in leaves the gallery working', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base);
  await galleryReady(page);
  await settle(page);
  const t = await findPrint(page);
  await page.mouse.move(t.x, t.y, { steps: 3 });
  await page.waitForTimeout(200);
  await page.mouse.click(t.x, t.y);
  await page.waitForFunction(() => location.hash.startsWith('#/print/'), null, { timeout: 15000 });
  await page.waitForTimeout(250); // in the middle of the veil / slide
  await page.goBack();
  await page.waitForFunction(() => location.hash === '' || location.hash === '#/', null, { timeout: 10000 });
  await page.waitForFunction(() => window.__gallery.mode === 'walk' && window.__gallery.debug.state.running, null, { timeout: 20000 });
  await page.waitForTimeout(1200);
  assert(!(await page.$('.veil')), 'white veil left on screen');
  assert(!(await page.$('.flip-image')), 'floating image left on screen');
  assert(await page.evaluate(() => document.body.dataset.view) === 'gallery', 'should be back in the gallery');
  const s0 = await page.evaluate(() => window.__gallery.debug.state.target);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 300);
  assert(await page.evaluate(() => window.__gallery.debug.state.target) > s0, 'walking should still work');
  await context.close();
});

test('list view: 30 prints, filter and sort', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base, '#/list');
  await page.waitForSelector('.card');
  assert((await page.$$('.list-body .card')).length === 30, 'list should show 30 prints');
  await page.click('[data-filter="market-day"]');
  assert((await page.$$('.list-body .card')).length === 5, 'Market Day should show 5 prints');
  assert(await page.evaluate(() => location.hash) === '#/collection/market-day', 'filter should update the URL');
  await page.click('[data-filter=""]');
  await page.selectOption('[data-sort]', 'price-asc');
  const prices = await page.$$eval('.list-body .card__price', (els) => els.map((e) => parseFloat(e.textContent.replace(/[^0-9.]/g, ''))));
  assert(prices.every((p, i) => i === 0 || p >= prices[i - 1]), 'prices are not sorted ascending');
  await page.click('[data-mode="gallery"]');
  await page.waitForFunction(() => location.hash === '#/');
  await context.close();
});

test('list card opens the product page', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base, '#/collection/kits-of-the-world');
  await page.click('.card[data-print="seoul"]');
  await page.waitForFunction(() => location.hash === '#/print/seoul');
  await page.waitForSelector('.page.is-revealing .product__subtitle');
  assert((await page.textContent('.product__subtitle')).trim() === 'Seoul', 'wrong product');
  assert(!(await page.$('.flip-image')), 'floating image left behind');
  await context.close();
});

test('search palette (Ctrl+K) finds and opens a print', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base, '#/list');
  await page.keyboard.press('Control+k');
  await page.waitForSelector('.palette__input');
  await page.keyboard.type('umbrel');
  await page.waitForTimeout(150);
  assert((await page.textContent('.palette__item.is-active .palette__title')).trim() === 'Umbrellas', 'first result should be Umbrellas');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => location.hash === '#/print/umbrellas');
  await context.close();
});

test('currency switch updates prices', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base, '#/print/first-touch');
  await page.waitForSelector('[data-price]');
  await page.selectOption('#currency-select', 'GBP');
  assert((await page.textContent('[data-price]')).includes('£'), 'price should be in GBP');
  await page.selectOption('#currency-select', 'USD');
  await context.close();
});

test('saved prints: bookmark and drawer', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base, '#/print/lisbon');
  await page.click('[data-save]');
  assert((await page.textContent('#saved-count')).trim() === '1', 'saved count should be 1');
  await page.click('#saved-open');
  await page.waitForSelector('.overlay--drawer .bag-item');
  assert((await page.textContent('.overlay--drawer .bag-item__title')).trim() === 'Lisbon', 'saved drawer should list Lisbon');
  await context.close();
});

test('checkout: validation and order confirmation', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base, '#/print/accra');
  await page.click('[data-add]');
  await page.click('[data-checkout]');
  await page.waitForFunction(() => location.hash === '#/checkout');
  await page.click('.checkout__form button[type=submit]');
  assert((await page.textContent('[data-err="email"]')).length > 0, 'email error should show');
  await page.fill('#co-email', 'buyer@example.com');
  await page.fill('#co-name', 'Test Buyer');
  await page.fill('#co-address', '1 Gallery Road');
  await page.fill('#co-city', 'Kathmandu');
  await page.fill('#co-zip', '44600');
  await page.click('.checkout__form button[type=submit]');
  await page.waitForFunction(() => location.hash.startsWith('#/order/'));
  await page.waitForFunction(() => /Thank you/.test(document.querySelector('#page-view h1')?.textContent || ''), null, { timeout: 5000 })
    .catch(() => { throw new Error('confirmation heading missing'); });
  assert((await page.textContent('#bag-count')).trim() === '0', 'bag should be empty after ordering');
  await context.close();
});

test('info, auctions and help pages render and work', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base, '#/info');
  await page.waitForSelector('.info-hero__title');
  await page.click('[data-nav="auctions"]');
  await page.waitForSelector('[data-countdown]');
  const c1 = await page.textContent('[data-countdown]');
  await page.waitForTimeout(1200);
  assert(c1 !== (await page.textContent('[data-countdown]')), 'auction countdown should tick');
  await page.click('[data-bid]');
  await page.fill('#bid-amount', '1');
  await page.click('.modal button[type=submit]');
  assert((await page.textContent('.modal [data-err]')).includes('at least'), 'low bid should be rejected');
  await page.keyboard.press('Escape');
  await page.click('[data-nav="help"]');
  await page.waitForSelector('.contact-form');
  await page.click('.contact-form button[type=submit]');
  assert((await page.textContent('[data-err="name"]')).length > 0, 'contact form should validate');
  await context.close();
});

test('unknown print shows a not-found page', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base, '#/print/does-not-exist');
  await page.waitForSelector('.empty-state h1');
  assert((await page.textContent('.empty-state h1')).includes('not found'), 'should say not found');
  await context.close();
});

test('mobile: touch walking, menu and stacked product page', async ({ browser, base }) => {
  const { page, context } = await openSite(browser, base, '', { device: 'iPhone 13' });
  await galleryReady(page);
  const cdp = await context.newCDPSession(page);
  const s0 = await page.evaluate(() => window.__gallery.debug.state.target);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 600 }] });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: 600 - i * 50 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const s1 = await page.evaluate(() => window.__gallery.debug.state.target);
  assert(s1 > s0 + 2, 'swipe up should walk forward');
  assert((await page.textContent('.hud__hint')).includes('Swipe'), 'touch hint should say Swipe');
  await page.click('#menu-open');
  await page.waitForSelector('.main-nav.is-open');
  await page.click('.main-nav a[data-nav="shop"]');
  await page.waitForFunction(() => location.hash === '#/shop');
  await page.goto(`${base}/#/print/dakar`);
  await page.waitForSelector('.product__info');
  const cols = await page.$eval('.product', (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  assert(cols === 1, 'product page should be one column on mobile');
  await context.close();
});

test('no WebGL: falls back to the list view', async ({ base }) => {
  const browser = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  try {
    const { page } = await openSite(browser, base);
    await page.waitForFunction(() => location.hash === '#/list', null, { timeout: 30000 });
    assert(await page.isVisible('.list-body .card'), 'list should be visible');
  } finally {
    await browser.close();
  }
});

// ---------------------------------------------------------------- runner
(async () => {
  const server = createServer().listen(0);
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch({ args: ARGS });
  let failed = 0;
  const selected = tests.filter((t) => t.name.toLowerCase().includes(filter.toLowerCase()));
  for (const t of selected) {
    const start = Date.now();
    try {
      await t.fn({ browser, base });
      console.log(`  ✓ ${t.name} (${((Date.now() - start) / 1000).toFixed(1)}s)`);
    } catch (err) {
      failed++;
      console.log(`  ✗ ${t.name}\n      ${err.message.split('\n')[0]}`);
    }
  }
  await browser.close();
  server.close();
  console.log(`\n${selected.length - failed}/${selected.length} passed`);
  process.exit(failed ? 1 : 0);
})();
