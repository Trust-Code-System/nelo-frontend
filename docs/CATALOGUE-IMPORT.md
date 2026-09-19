# Catalogue import — what the storefront expects

Nelo's real catalogue does not exist in any environment yet. The local development harness
(`../vendure-dev`) is seeded with Vendure's sample **electronics** data, which is enough to
prove the storefront reads a real Shop API and nothing else.

Entering the real catalogue is the client's job. This document says exactly what shape the
storefront needs it in, so whoever types it in does not have to read the frontend to find
out. Everything below is checkable against the Vendure Admin UI.

Nothing here is a frontend preference dressed up as a requirement — each section says which
screen breaks if it is missing.

---

## 1. Channels

Two sales channels, already agreed with the backend team:

| Channel code | Currency | Storefront market | URL prefix |
| --- | --- | --- | --- |
| `nelo-ng` | NGN | Nigeria | `/ng/…` |
| `nelo-international` | USD | International | `/international/…` |

**Every product must be assigned to both channels**, and must be **priced in each channel's
own currency**. The storefront never converts a price: it formats whatever the Channel
returns. A product assigned to `nelo-international` with no USD price will either not appear
or appear at a wrong figure, and the frontend has no way to detect which.

> Assigning a product to a channel with `priceFactor: 1` copies the naira number into the
> dollar field. That is almost never the right dollar price. Set international prices
> deliberately.

---

## 2. Products

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | Used as the `<h1>`, the card title, the OpenGraph title and the JSON-LD `name`. Sentence case, no size or colour in it — those are variants. |
| `slug` | yes | Lowercase, hyphenated, no spaces. **This is the URL.** See §7 before changing one. |
| `description` | yes | Rendered as HTML on the product page and stripped to plain text for the meta description and JSON-LD. Two or three sentences about fabric, cut and occasion. Avoid size advice — that belongs in the size guide. |
| `featuredAsset` | yes | The image the grid and every share card uses. |
| `assets` | 3–6 | The product gallery. The first is the hero; the thumbnails are interactive. |
| `enabled` | yes | A disabled product is absent from the storefront entirely, including the sitemap. |

**Empty description**: the page still renders, but the "Details" panel disappears, the meta
description falls back to a generic line, and the JSON-LD has no description. All three hurt
search. Treat it as required.

---

## 3. Option groups and variants

### The size option group — required on every product

This is the brand's central claim and the storefront is built around it.

- **One option group per product**, code `size`, name `Size`.
- **Thirteen options**, in this order: `6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30`.
  - Option `code`: `uk-6` … `uk-30`.
  - Option `name`: the bare number — `6`, `8`, … `30`. The product page renders these as a
    horizontal scale, so a name like "UK Size 12" will not fit and will wrap the control.
- **A variant for every size**, on every product, even for sizes never held in stock.

Why every size needs a variant: the storefront distinguishes three states, and it needs all
thirteen variants to exist in order to do it.

| What the customer sees | What it means in Vendure |
| --- | --- |
| Size selectable | A variant exists and `stockLevel` is not `OUT_OF_STOCK` |
| Size struck through, not selectable | A variant exists and `stockLevel` is `OUT_OF_STOCK` — "we make it, not today" |
| Size absent from the scale | **No variant exists** — reads as "we do not make this in your size" |

The third row is the one to avoid. A missing variant is not a smaller catalogue, it is a
claim the brand does not want to make. If a size is genuinely never made in a style, that is
a deliberate decision and should be taken as one.

### If colour is offered

A second option group, code `colour`, name `Colour`, with option names as the colour word
("Teal", "Bone"). Variants then exist per size × colour. The storefront renders each group as
its own scale and disables combinations no variant exists for, so a partial colour × size
matrix is handled correctly.

Colour must **not** be expressed as a UI colour swatch. Product colour comes from photography
only — that is a design lock, not a preference (see `STYLESEED.md`).

### Variant fields

| Field | Required | Notes |
| --- | --- | --- |
| `name` | auto | Vendure generates `"<product> <options>"`. Leave it. |
| `sku` | yes | Appears in the bag, on the order, and as the JSON-LD `sku` for shopping feeds. Must be unique and stable. |
| `price` per channel | yes | Integer minor units: **kobo** for NGN, **cents** for USD. ₦185,620.00 is `18562000`. |
| `stockOnHand` / `stockLevel` | yes | Drives the struck-through state and the "Ready to ship" / "Cut to measure" line on the card. |
| `assets` | optional | Only useful if a colour variant has its own photography. |

---

## 4. Facets — what the filter rail is made of

The facet rail is generated from Vendure's own facet aggregation. It shows whatever facets
the products carry, with counts. **No facet, no filters** — the rail renders with only the
"Ready to ship" toggle, which is what the electronics harness currently looks like.

Recommended facets, each `visible` (a private facet is invisible to the Shop API and
therefore to the rail):

| Facet code | Facet name | Example values |
| --- | --- | --- |
| `category` | Category | Dresses, Sets, Gowns, Separates, Outerwear |
| `occasion` | Occasion | Everyday, Occasion, Bridal, Ceremony |
| `fabric` | Fabric | Silk, Crepe, Lace, Ankara, Brocade |
| `length` | Length | Mini, Midi, Maxi, Floor |

Notes that matter:

- **Values within one facet are OR-ed; separate facets are AND-ed.** So Silk + Crepe means
  "either", while Silk + Bridal means "both". That is the behaviour customers expect, and it
  falls out of how the facets are structured — not from anything configurable per facet.
- **Assign facet values to the PRODUCT, not the variant**, unless the value genuinely differs
  per variant. A fabric that differs by colour is a variant facet; a category is not.
- **Facet names are displayed verbatim** as the rail's group headings. "Fabric" reads better
  than "FABRIC_TYPE".
- Do **not** create a facet for size. Size is an option group; duplicating it as a facet
  would give the rail a second, competing size control.

---

## 5. Collections

Collections are the storefront's navigation: `/[market]/collections` lists the top-level ones,
and `/[market]/collections/[slug]` is a filterable grid.

- `slug` is the URL. See §7.
- `name` and `description` are both rendered; the description is also the meta description.
- `featuredAsset` is used on the collections index. Without it the card is a grey block.
- **Top-level collections only appear on the index.** Child collections are reachable by URL
  and through their parent, which is deliberate — a flat list of thirty collections is not
  navigation.
- Collection filters (the rules that decide membership) run in the **worker**. A collection
  whose contents look empty usually means the worker is not running or `reindex` has not run.

---

## 6. Assets

| Requirement | Value | Why |
| --- | --- | --- |
| Aspect ratio | **3:4 portrait** | The grid, the cart line and the gallery all crop to 3:4. A landscape image is centre-cropped and loses the garment. |
| Minimum size | **1200 × 1600** | The product hero is requested at 1200 × 1500. Smaller originals upscale visibly. |
| Format | JPEG or WebP | |
| File size | under ~500 KB each | Most of this audience is on mobile data. Images are the main Core Web Vitals lever on a fashion site — there is nothing else on these pages heavy enough to matter. |
| Filename | no spaces, no `#`, no `?` | Vendure builds asset URLs from the filename. |
| `name` / alt text | describe the garment | Used as the image alt text on the gallery. "Adele Set in teal" — not "IMG_0660". |

The storefront requests derived sizes from Vendure's asset server (`?w=…&h=…&mode=crop`), so
there is no need to upload multiple sizes.

---

## 7. Slugs and the migration

**Reuse the Shopify handle as the Vendure slug wherever a product or collection already
exists.** This is the cheapest single thing that can be done for the migration.

`/products/adele-set` on the old store redirects to `/ng/products/adele-set` on the new one.
That redirect is already built and tested (`src/lib/seo/legacy-redirects.ts`), and it carries
the handle through unchanged — so a product whose Shopify handle was `adele-set` keeps every
inbound link and every bit of search ranking it had.

If a slug has to change, the old one must be added to the redirect map by hand. A slug
changed silently is a 404 with no way to find out about it except lost traffic.

Slug rules: lowercase, digits and hyphens only, one segment, no trailing slash. The redirect
map rejects anything else rather than forwarding it, so an unusual slug is a broken legacy
link.

---

## 8. Shipping and payment methods

Not catalogue data, but checkout does not work without them and it is the same job:

- At least one **ShippingMethod** assigned to each channel, with an eligibility checker that
  actually matches the addresses Nelo ships to. `eligibleShippingMethods` returning empty is
  what the storefront reports as "no delivery method covers this address" — accurately, but
  it is usually a configuration gap rather than a real one.
- At least one **PaymentMethod** assigned to each channel. Paystack in production; the local
  harness uses Vendure's `dummy-payment-handler`, which takes no money.

`../vendure-dev/setup-nelo-channels.mjs` does all of this for the harness and is worth
reading as a worked example of the assignment calls.

---

## 9. After importing

Both of these, in this order:

1. **Run `reindex`.** Search, the collection grids and the facet counts all read Vendure's
   search index, not the products table. Without a reindex, a freshly imported catalogue
   returns nothing for everything.
2. **Have the worker running.** Reindexing and collection-filter application are worker jobs.
   The server accepts the request and the work never happens if the worker is down — which
   looks exactly like an empty catalogue.

Then check, in this order, because each one depends on the last:

- `/ng` shows products with prices in naira.
- `/international` shows the same products with prices in dollars, and the dollar figures are
  deliberate rather than the naira numbers copied.
- `/ng/collections` lists the top-level collections with images.
- A collection page shows the facet rail with real facets and non-zero counts.
- A product page shows all thirteen sizes on the scale, with out-of-stock ones struck through
  rather than missing.
- `/ng/search?q=<a word from a product name>` returns that product.
- `/sitemap.xml` contains every product and collection, twice — once per market.
