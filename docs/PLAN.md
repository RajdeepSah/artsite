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
| 0 | Scaffold, docs, vendored libs, fonts, placeholder art, catalog data | ✅ |
| 1 | UI shell: header, search pill, currency, icons, gallery/list toggle, bottom HUD, hints, arrow buttons, custom cursor, loader | ✅ |
| 2 | 3D ring-corridor gallery: corridor geometry, prints on both walls, labels, title cards, arches, walking with scroll/drag/keys and inertia, current collection detection, prev/next | ✅ |
| 3 | Hover pill, click-to-zoom camera flight, gallery → product transition (white fade + image slide), reverse transition | ✅ |
| 4 | Product page: options, live price, quantity, add to bag, accordions, image views (1/3), view in room, save, "Get the collection" | ✅ |
| 5 | Bag drawer, saved drawer, checkout + confirmation, currency conversion, persistence | ✅ |
| 6 | List/Shop view, ⌘K search, Info / Auctions / Help pages, account modal, settings | ✅ |
| 7 | Responsive/mobile + touch, keyboard + ARIA, reduced motion, WebGL fallback, performance | ✅ |
| 8 | Automated browser tests, visual check against the video, bug fixes, final docs | ✅ |

## Design notes

How the video's look was rebuilt:

- **Corridor shape.** In the video the inner (left) wall hides the far end of the corridor about 21%
  from the left edge. The gallery recreates this with a ring-shaped corridor (outer radius ≈ 32,
  width 6.2) and the camera 2.4 units from the inner wall. The camera's turn is computed from the
  screen shape, so the inner wall always cuts in at the same place (`CFG.silhouette`).
- **Density.** To keep the prints as tightly hung as in the video, the collection sequence repeats
  round the ring (`repeats`), so the walk never ends.
- **Shading.** There is no real lighting. The walls, floor and ceiling use vertex colours sampled from
  the video (floor darker, inner wall slightly shaded, outer wall brightest) plus white fog. This keeps
  it fast and soft.
- **Arches.** Soft white arch textures behind each print. They are lifted off the curved wall by the
  curve's depth, so the wall doesn't cut through their edges.
- **Type.** Oswald stands in for the video's condensed display face, Newsreader for its serif, and
  IBM Plex Mono for the small spaced uppercase labels.
- **Colours.** Background `#f2f2f2`, ink `#111`, muted `#727272`, lines `#cfcfcf`.
- **Transition.** Camera flight 1.3 s (ease in-out), white veil 0.48 s, image slide 0.85 s, then the
  details rise in one after another.
