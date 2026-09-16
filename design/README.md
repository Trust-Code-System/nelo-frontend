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

## These are phase-0 artefacts, now superseded in places

The mockups are a record of the agreed direction, not the living implementation. Where the
app has moved past them, the app wins.

| Mockup limitation | Status in the app |
| --- | --- |
| The `Menu` button does nothing | **Fixed.** `MobileMenu` is a real disclosure — aria-expanded, Escape closes and returns focus, market switching by links. |
| No error state | **Fixed.** `src/app/error.tsx` renders a recovery path and never shows a raw trace. |
| No loading state | **Fixed.** `src/app/[market]/account/loading.tsx` is a matching skeleton, since account pages always render on demand. |
| Only the `ng` market is shown | Still true of the mockups. The app serves `ng` and `international`, though international checkout may need to ship gated. |
| Mobile filter rail stacks above the grid | Still open. The real collection page does not exist yet — it needs a collapsible filter sheet when built. |
| Colour swatch hex values are literals | Still open by necessity. They come from Vendure variant data once the schema lands. |
| Images hot-linked from the Shopify CDN | Still open. Must be re-pointed at the Vendure asset server before phase 2 ships. |

## Nothing here is connected

No Shop API call is made or implied. `bespoke.html` carries a visible fixture banner
because no Atelier Shop API exists yet.
