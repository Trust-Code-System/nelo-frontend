# StyleSeed — Design Lock
<!-- Selections persist here. This file cannot waive StyleSeed core invariants. -->
- App domain: ecommerce
- Surface: website
- Surface adapter: product-ui
- Page type: detail
- Output grammar: commerce-conversion
- Grammar path: built-in:engine/RULESETS.md
- Grammar fallback: commerce-conversion
- Reference confidence: n/a
- Brand recipe: editorial-authority
- Palette recipe: editorial-ink
- Key color: #6E1A22
- Palette character: deep
- Palette mode: light
- Palette harmony: adjacent
- Surface temperature: warm
- Aesthetic profile: technical
- Skin: custom
- Primary action: #6E1A22
- Font: Instrument Sans
- Radius: sharp
- Elevation: light=hairline rules only, no shadow · dark=hairline rules only, no shadow
- Density: comfortable
- Motion: Snap restrained
- Imagery/data role: garment photography leads; measurement data is chrome, never decoration
- Signature move: every garment carries its measured spec — a mono measurement strip beneath the image, and the 6–30 range shown as a scale, not a dropdown
- Locked: 2026-09-15

## Direction — "The Measured"

Atelier-forward technical grammar wrapped around editorial fashion photography. The
chrome is a spec sheet; the photography is uncropped and full-bleed inside it. The
garment is the only saturated thing on screen.

## Non-negotiables for this project

- **One accent: garnet `#6E1A22`.** Everything else is warm greyscale. Product colour
  comes from photography, never from UI.
- **Zero border-radius, zero shadow.** Verified against Khaite, Totême, Jacquemus and
  SSENSE — luxury fashion does not use cards. Separation is hairline rules and space.
- **Two families only.** Instrument Sans for everything human-readable, IBM Plex Mono
  for anything measured: sizes, measurements, prices, order codes, production stages.
  Inter is banned — it is what the outgoing site used on 207 of 208 elements.
- **Measurements render as decimals with an explicit unit.** Never ranges, never
  rounded to whole millimetres. A quarter inch is 6.35 mm.
- **Bespoke is never a cart.** No add-to-cart, no price, no quantity on commission
  surfaces. Enquiry and appointment only.

## Palette

| Role | Light | Dark |
| --- | --- | --- |
| Paper | `#FBFAF8` | `#141210` |
| Ground | `#EEE2D4` (bone) | `#1C1917` |
| Ink | `#17120D` | `#EDE7DE` |
| Smoke | `#6B6560` | `#9A938A` |
| Hairline | `#DBD4CA` | `#332C26` |
| Accent (garnet) | `#6E1A22` | `#C97B7B` |

Bone and warm-black are extracted from the live nelowoman.com computed styles, not invented.

## Documented deviations from the compiled bundle

`.styleseed/effective-rules.md` was compiled on 2026-09-15. Three of its outputs are
overridden here. The lock is the authority; these are recorded so they are not
re-litigated on every screen.

1. **No violet accent.** The generated palette derives `accent=#704C85` and the
   `warm-clay-commerce` recipe reserves violet for "saved or personalized context".
   Nelo has no such role, and a second hue breaks the one-accent invariant. Garnet
   `#6E1A22` is the only accent. The violet ramp is unused.
2. **No spring motion, no hover lift.** The ecommerce domain rules call for Spring
   motion and hover lift on product cards. The `technical` profile coordinate is
   "sharp · dense · cool · **still**", and the lock is `Snap restrained` with zero
   elevation. Interaction is opacity and hairline colour only. Lift would require
   shadow, which this direction does not have.
3. **Warm surfaces, not cool.** The `technical` profile specifies a cool temperature.
   Nelo's real brand is warm — bone `#EEE2D4` and warm-black `#17120D` are extracted
   from the live site's computed styles. Warm wins; the technical coordinate is
   carried by geometry, mono type and density instead of by temperature.

Retained from the bundle without change: media → identity/price → variants → one
primary action composition; imagery as evidence not decoration; neutral chrome so
photography carries colour; price gets weight rather than colour; no competing CTAs;
at most two type families; tabular numerals.
