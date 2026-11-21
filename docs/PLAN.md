# Development Plan

The goal is to rebuild the website shown in the reference video as closely as possible.
The video shows an art print shop whose home page is a walk-through 3D gallery.

## What the reference video shows

| Time | What happens |
| ---- | ------------ |
| 0-5 s | A white, ring-shaped 3D corridor. Prints hang on both curved walls. Scrolling or dragging "walks" forward, so prints grow and slide past the edges of the screen. |
| 0-5 s | Bottom centre: `YOU ARE WALKING PAST` + the current collection name in a big condensed font + `ENTER THE COLLECTION →`. It changes as you pass each collection's title card. |
| 0-5 s | Bottom right: two round arrow buttons and the hint `SCROLL OR DRAG TO WALK ROUND / CLICK A PAINTING TO LOOK CLOSER`. |
| 5-7 s | Hovering a print shows a black pill `OPEN THE PRINT` next to the cursor. |
| 7-9 s | Clicking flies the camera up to the print, then the gallery fades to white and the print slides to the left. |
| 9-13 s | The product page fades in: title, subtitle, description, price, edition, paper/size/signature/frame options, quantity, `ADD TO BAG`, accordions. Choosing a bigger size updates the price. |
| 13-15 s | `ADD TO BAG` opens a `YOUR BAG` drawer from the right while the page behind dims and blurs. |

Header (always visible): logo, serif nav (`Index Shop Info Auctions Help`), search field with `⌘K`, currency
select, settings, saved, account and bag icons, plus a `GALLERY | LIST` toggle.

## Tech choices

- **Plain HTML/CSS/JavaScript (ES modules), no build step.** Easy to read, edit and host anywhere (GitHub Pages, Netlify, any static host).
- **Three.js** (stored in `vendor/`) for the 3D gallery.
- **Self-hosted fonts** (`assets/fonts/`): Oswald (display), Newsreader (serif), IBM Plex Mono (mono).
- **All content in one file:** `data/catalog.json` (collections + prints). Placeholder images are made by `tools/generate-placeholders.py`.
- **Hash routing** (`#/print/<slug>`, `#/list`, ...), so deep links work on any static host.
- **localStorage** for the bag, saved prints, currency and settings.

## Phases

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 0 | Scaffold, docs, vendored libs, fonts, placeholder art, catalog data | see PROGRESS.md |
| 1 | UI shell: header, search pill, currency, icons, gallery/list toggle, bottom HUD, hints, arrow buttons, custom cursor, loader | |
| 2 | 3D ring-corridor gallery: corridor geometry, prints on both walls, labels, title cards, arches, walking with scroll/drag/keys and inertia, current collection detection, prev/next | |
| 3 | Hover pill, click-to-zoom camera flight, gallery → product transition (white fade + image slide), reverse transition | |
| 4 | Product page: options, live price, quantity, add to bag, accordions, image views (1/3), view in room, save, "Get the collection" | |
| 5 | Bag drawer, saved drawer, checkout + confirmation, currency conversion, persistence | |
| 6 | List/Shop view, ⌘K search, Info / Auctions / Help pages, account modal, settings | |
| 7 | Responsive/mobile + touch, keyboard + ARIA, reduced motion, WebGL fallback, performance | |
| 8 | Automated browser tests, visual check against the video, bug fixes, final docs | |
