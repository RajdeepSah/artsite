# Customising the site

All content lives in **one file**: `data/catalog.json`. You don't need to touch any code to change
artwork, prices or text. After editing, reload the page.

> JSON is strict: use double quotes, add commas between items, and don't add comments.
> If the site stops loading after an edit, paste the file into <https://jsonlint.com> to find the typo.

## Replace the placeholder artwork

**Easiest:** overwrite a placeholder with your image using the **same file name**, e.g. replace
`assets/artworks/first-touch.jpg`.

**Or:** put your image in `assets/artworks/` and change that print's `"image"` value in
`data/catalog.json`.

Tips:
- JPG or WebP, about 1200-1600 px on the long side, ideally under 400 KB each.
- Any aspect ratio works. The gallery, product page and list all use the real image shape.

## Add a print

Add an object to the `"prints"` list:

```json
{
  "slug": "my-print",
  "title": "My Print",
  "collection": "sunday-league",
  "year": 2026,
  "basePrice": 50,
  "edition": 25,
  "image": "assets/artworks/my-print.jpg",
  "description": "Optional text for the product page."
}
```

| Field | Meaning |
| ----- | ------- |
| `slug` | Unique id used in the URL (`#/print/my-print`). Lowercase, use dashes. |
| `title` | Print name (shown as the product subtitle and on the wall label). |
| `collection` | The `slug` of the collection it belongs to. |
| `year` | Year shown on the wall label. |
| `basePrice` | Price in USD for the smallest size (A3) on budget paper. Other options add to it. |
| `edition` | Edition size ("Limited Edition of 25"). |
| `image` | Path to the image file. |
| `description` | Optional. If missing, the collection description is used. |
| `theme`, `ratio` | Only used by the placeholder generator. Safe to delete. |

## Add or reorder collections

The order of `"collections"` is the order you walk past them in the gallery:

```json
{ "slug": "new-series", "title": "New Series", "kicker": "2027", "description": "A short paragraph." }
```

`kicker` is the small line shown above the title on the collection page.

## Site name, artist and email

Edit the `"site"` block at the top of `catalog.json`:

```json
"site": { "name": "Rajdeep Sah", "tagline": "Prints & originals", "artist": "Rajdeep Sah", "email": "hello@example.com", "baseCurrency": "USD" }
```

## Prices, options and currencies

- Paper, size, signature and frame options and their price rules: `OPTIONS` in `js/pricing.js`.
  Price = (basePrice + paper extra) × size factor + signature extra + frame extra × size factor.
- Exchange rates: `CURRENCIES` in `js/pricing.js`.
- Delivery prices: `SHIPPING` in `js/ui/checkout.js`.

## Tune the 3D gallery

Settings are in `CFG` at the top of `js/gallery/scene.js`: corridor size, print height, gap between
prints, how often a print goes on the inner wall, fog, and so on.

## Logo

Replace `assets/logo.svg` (it's also used as the browser tab icon).

## Regenerate placeholders

```bash
pip install pillow numpy
python3 tools/generate-placeholders.py          # only creates missing images
python3 tools/generate-placeholders.py --force  # recreates all of them
```
