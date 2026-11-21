# Progress Tracker

Keep this file up to date at the end of every work session.

**Status:** In progress. Current phase: 3 (transitions) and 4 (product page).

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

### Phase 2: 3D gallery ✅ (basic version done, polish later)
- [x] Ring-shaped corridor (lathe geometry, soft coves, vertex colour shading, fog)
- [x] Prints on outer wall + every 4th print on the inner wall
- [x] Grey collection title cards, wall labels, soft arches, drop shadows
- [x] Walk with mouse wheel, drag (mouse/touch) with inertia
- [x] Current collection detection → HUD
- [x] Prev/next collection buttons
- [x] Auto camera yaw so the inner wall cuts the view at ~21% from the left (like the video)
- [ ] Keyboard walking (arrow keys)

### Phase 3: Transitions
- [ ] Hover: lift print + cursor pill (scene side done, needs wiring check)
- [ ] Click → camera flies to the print
- [ ] Gallery fades to white, print image slides into the product page layout
- [ ] Back to gallery: reverse fade + camera returns to the walking path

### Phase 4: Product page
- [ ] Layout (image left, details right), breadcrumb "‹ Prints"
- [ ] Options: paper, size, signature, frame (with thumbnails), live price
- [ ] Quantity stepper, Add to bag, accordions
- [ ] Image views (1/3), View in room, save (bookmark)
- [ ] "Get the collection" section

### Phase 5: Commerce
- [ ] Bag drawer (blurred backdrop), qty/remove, subtotal, checkout button
- [ ] Saved prints drawer
- [ ] Checkout form + order confirmation (front-end demo, no payments)
- [ ] Currency conversion everywhere

### Phase 6: Other pages
- [ ] List / Shop view with filters and sort
- [ ] Collection pages
- [ ] ⌘K search palette
- [ ] Info, Auctions (countdowns), Help (FAQ + contact form)
- [ ] Account modal, settings popover (reduce motion, quality)

### Phase 7: Quality
- [ ] Mobile layout + touch
- [ ] Keyboard + screen reader support
- [ ] WebGL fallback (go to list view)
- [ ] Performance checks

### Phase 8: Testing + docs
- [ ] `tests/e2e.cjs` browser test suite
- [ ] Visual comparison with the video
- [ ] Final docs

## How to test

```bash
node tests/serve.cjs 8080        # then open http://localhost:8080
```

## Notes for the next session

- Gallery tuning values are in `CFG` at the top of `js/gallery/scene.js`.
- In the browser console, `window.__gallery.debug` exposes the camera, scene and state.
