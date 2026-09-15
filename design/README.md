# Phase 0 — Direction D mockups

Static mockups establishing the visual system before any Next.js code. They exist to be
judged, not shipped. The binding decisions live in `../STYLESEED.md`; the compiled rule
bundle is `../.styleseed/effective-rules.md`.

| File | Grammar role |
| --- | --- |
| `mockups/tokens.css` | The whole token layer. No page defines a raw value. |
| `mockups/home.html` | Landing — collection, the measurement thesis, commission split |
| `mockups/collection.html` | List — filter rail, facets, loading state |
| `mockups/product.html` | Detail — variants, size scale, measurement profile, one CTA |
| `mockups/bespoke.html` | Form — commission + appointment + measurement intake |

Screenshots in `shots/` at 1440 and 390.

## Real data, not lorem

Catalogue, prices and photography are pulled from the live nelowoman.com storefront
(24 products enumerated). Measurements are real conversions: 34.00 in = 863.60 mm,
23.25 in = 590.55 mm.

## Known gaps — deliberate, for phase 2

- **Mobile filter rail** stacks above the grid. It needs a collapsible sheet; the static
  mockup does not have one.
- **Error state** is not demonstrated. `.empty` styling exists but no screen uses it.
- **The Menu button does nothing** — these are static files with no JavaScript.
- **Colour swatch hex values are literals** in `product.html`. In the build they come from
  Vendure variant data, not CSS.
- **Images are hot-linked** from the live Shopify CDN. They must be re-pointed at the
  Vendure asset server before anything real is built on this.
- Only the `ng` market is shown. The `international` / USD view is not mocked, and per the
  backend context international checkout may need to ship gated.

## Nothing here is connected

No Shop API call is made or implied. `bespoke.html` carries a visible fixture banner
because no Atelier Shop API exists yet.
