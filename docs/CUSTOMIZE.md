# Customising the site

All content lives in **one file**: `data/catalog.json`. You don't need to touch any code to change
artwork, prices or text.

## Replace the placeholder artwork

1. Put your image in `assets/artworks/`, e.g. `assets/artworks/my-print.jpg`.
   - JPG or WebP, about 1200-1600 px on the long side, under ~400 KB each.
   - Any aspect ratio works. The gallery reads the real image size.
2. In `data/catalog.json`, point the print's `"image"` at the new file.
3. Reload the page.

To swap an image without editing JSON, overwrite the file with the same name
(e.g. replace `assets/artworks/first-touch.jpg`).

## Add a print

Add an object to the `"prints"` list:

```json
{
  "slug": "my-print",                 // unique, used in the URL: #/print/my-print
  "title": "My Print",
  "collection": "sunday-league",      // slug of a collection below
  "year": 2026,
  "basePrice": 50,                    // USD, smallest size (A3) on budget paper
  "edition": 25,                      // "Limited edition of 25"
  "image": "assets/artworks/my-print.jpg",
  "description": "Optional. If left out, the collection description is used."
}
```

`"theme"` and `"ratio"` are only used by the placeholder generator, so you can delete them.

## Add a collection

Add an object to `"collections"` (the order here is the order in the gallery):

```json
{ "slug": "new-series", "title": "New Series", "kicker": "2027", "description": "..." }
```

## Site name, artist and email

Edit the `"site"` block at the top of `catalog.json`.

## Prices and options

Paper, size, signature and frame options and their price rules are in `js/pricing.js` (`OPTIONS`).
Exchange rates are in `CURRENCIES` in the same file.

## Regenerate placeholders

```bash
pip install pillow numpy
python3 tools/generate-placeholders.py          # only creates missing images
python3 tools/generate-placeholders.py --force  # recreates all of them
```
