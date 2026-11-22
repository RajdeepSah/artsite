# Progress Tracker

Keep this file up to date at the end of every work session.

**Status: ✅ Complete.** All 8 phases are done and all 18 browser tests pass.
Remaining work is optional (see "Ideas for later") plus swapping in the real artwork.

## Phase checklist

### Phase 0: Scaffold ✅
- [x] Analyse the reference video (see PLAN.md)
- [x] Static site structure, no build step
- [x] three.js stored in `vendor/`, fonts self-hosted in `assets/fonts/`
- [x] `data/catalog.json` with 5 collections and 30 prints
- [x] Placeholder artwork generator (`tools/generate-placeholders.py`) + 30 images
- [x] Static server for local dev/tests (`tests/serve.cjs`)

### Phase 1: UI shell ✅
- [x] Header: logo, serif nav, search pill with ⌘K, currency select, settings/saved/account/bag icons
- [x] Gallery | List toggle (top right, under the header)
- [x] Bottom HUD: "You are walking past" + collection name (animated) + "Enter the collection →"
- [x] Bottom-right arrow buttons + walking hints
- [x] Custom ring cursor with black "Open the print" pill
- [x] Loading screen with progress bar

### Phase 2: 3D gallery ✅
- [x] Ring-shaped corridor (lathe geometry, soft coves, vertex colour shading, fog)
- [x] Prints on the outer wall + every 4th print on the inner wall; sequence repeats round the ring
- [x] Grey collection title cards, wall labels, soft arches, drop shadows
- [x] Walk with mouse wheel, drag (mouse/touch) with inertia, arrow keys, PageUp/PageDown
- [x] Current collection detection → HUD; prev/next collection buttons
- [x] Auto camera turn so the inner wall cuts the view ~21% from the left (like the video)

### Phase 3: Transitions ✅
- [x] Hover: print lifts + cursor shows black "Open the print" pill
- [x] Click → camera flies to the print
- [x] Gallery fades to white, print image slides into the product page layout, details rise in
- [x] Back to gallery: page fades, camera zooms back out to the walking path
- [x] List cards also slide their image into the product page
- [x] Safe if the visitor navigates away mid-transition

### Phase 4: Product page ✅
- [x] Layout (image left, details right), back link
- [x] Options: paper, size, signature, frame (with thumbnails), live price
- [x] Quantity stepper, Add to bag (opens bag), accordions
- [x] Image views (1/3), View in room (art scales with size, shows frame), save (bookmark)
- [x] "Get the collection" section

### Phase 5: Commerce ✅
- [x] Bag drawer (blurred backdrop), qty/remove, subtotal, checkout button
- [x] Saved prints drawer
- [x] Checkout form with validation + order confirmation (front-end demo, no payments)
- [x] Currency conversion everywhere (USD, GBP, EUR, INR)

### Phase 6: Other pages ✅
- [x] List / Shop view with filters and sort
- [x] Collection pages (+ "See it in the gallery" walks there)
- [x] ⌘K / Ctrl+K / "/" search palette with keyboard navigation
- [x] Info, Auctions (live countdowns, bidding), Help (FAQ + contact form)
- [x] Account modal (local sign-in + order history), settings (reduce motion, quality)

### Phase 7: Quality ✅
- [x] Mobile layout + touch (swipe to walk, tap to open, stacked product page, menu with account/settings)
- [x] Keyboard: arrows walk, PageUp/PageDown change collection, Enter opens the centred print, Esc leaves a product page
- [x] Screen readers: live HUD region, labelled buttons, focus moves to page headings, focus trap in drawers
- [x] WebGL fallback (goes to the list view with a message)
- [x] Performance: renders only when something moves, shared textures/materials, capped pixel ratio
- [x] Any navigation closes open drawers/modals

### Phase 8: Testing + docs ✅
- [x] `tests/e2e.cjs` browser test suite (18 tests, all passing)
- [x] Visual comparison with the video (gallery, product page, bag drawer)
- [x] README, CUSTOMIZE, PLAN (with design notes), font licences, screenshots

## Ideas for later (optional)

- [ ] Replace placeholder art with real artwork (see CUSTOMIZE.md), then re-run `npm test`
- [ ] Real payments (Stripe Checkout / Shopify) in `js/ui/checkout.js`
- [ ] Send contact form + auction bids to a backend or form service
- [ ] Real accounts (currently stored in the browser only)
- [ ] Optimise images to WebP and add `srcset` for the list view
- [ ] A custom display font closer to the video's quirky condensed face
- [ ] Sound design (soft footsteps / ambience) with a mute toggle

## How to test

```bash
npm start                        # or: node tests/serve.cjs 8080 -> http://localhost:8080
npm install && npx playwright install chromium   # first time only
npm test                         # runs tests/e2e.cjs (18 browser tests)
node tests/e2e.cjs bag           # run only tests whose name contains "bag"
```

Run `npm test` before every commit.

## Notes for the next session

- Start with `README.md`, then this file. All content is in `data/catalog.json`.
- Gallery tuning values are in `CFG` at the top of `js/gallery/scene.js`.
- In the browser console, `window.__gallery.debug` exposes the camera, scene, renderer and state;
  `window.__gallery.visibleItems()` lists prints on screen (used by the tests).
- Views: `js/main.js` decides between the 3D gallery and the page layer (`#page-view`) and runs
  the transitions. Each page is a `render...()` function in `js/ui/` that returns an element.
- Page code that listens to store changes must use `ctx.onStore(...)`, so listeners are removed
  automatically when the page changes.
- Git author for all commits: Rajdeep Sah.
