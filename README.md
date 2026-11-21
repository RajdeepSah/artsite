# Artsite: 3D gallery print shop

An online art print shop whose home page is a **walk-through 3D gallery**. Visitors walk round a
curved white corridor, click a painting to look closer, and buy prints from the product page.

Built by **Rajdeep Sah**.

> All artwork in `assets/artworks/` is **placeholder art**. Replace it with your own (see
> [docs/CUSTOMIZE.md](docs/CUSTOMIZE.md)).

## Run it locally

No build step, so any static file server works. ES modules need a server; opening the file
directly with `file://` will not work.

```bash
# option 1: Node (no install needed)
node tests/serve.cjs 8080
# option 2: Python
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Project structure

```
index.html            page shell (header, gallery canvas, HUD)
css/                  styles, split by area (base, header, gallery, product, overlays, pages)
js/main.js            entry point: boots the site and wires everything together
js/gallery/           the Three.js 3D gallery (scene.js) and canvas textures (textures.js)
js/ui/                UI pieces: HUD, cursor, product page, bag, search, pages...
js/store.js           bag / saved / currency / settings (saved in localStorage)
js/pricing.js         print options, price calculation, currency formatting
js/router.js          hash router (#/print/<slug>, #/list, ...)
data/catalog.json     ALL content: site info, collections, prints
assets/artworks/      print images (placeholders for now)
assets/fonts/         self-hosted fonts (Oswald, Newsreader, IBM Plex Mono)
vendor/               three.js (stored in the repo, no CDN needed)
tools/                generate-placeholders.py (makes placeholder art)
tests/                serve.cjs (static server) and e2e.cjs (browser tests)
docs/                 plan, progress tracker, design notes, customisation guide
```

## Documentation

- [docs/PLAN.md](docs/PLAN.md): what the reference video shows and the phased plan
- [docs/PROGRESS.md](docs/PROGRESS.md): **what is done, what is left, how to continue**
- [docs/CUSTOMIZE.md](docs/CUSTOMIZE.md): how to add your artwork, prices and text

## Continuing development

Read [docs/PROGRESS.md](docs/PROGRESS.md) first. It lists every finished and remaining task, and
the checks to run before each commit.
