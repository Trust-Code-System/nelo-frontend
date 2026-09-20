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
- Key color: #050505
- Palette character: monochrome
- Palette mode: light
- Palette harmony: adjacent
- Surface temperature: neutral
- Aesthetic profile: technical
- Skin: custom
- Primary action: #050505
- Font: Instrument Sans
- Radius: sharp
- Elevation: light=hairline rules only, no shadow · dark=hairline rules only, no shadow
- Density: comfortable
- Motion: spring + scroll-driven reveal (deviation 2 withdrawn 2026-09-19, see deviation 4)
- Imagery/data role: garment photography leads; measurement data is chrome, never decoration
- Signature move: every garment carries its measured spec — a mono measurement strip beneath the image, and the 6–30 range shown as a scale, not a dropdown
- Locked: 2026-09-15

## Direction — "The Measured"

Atelier-forward technical grammar wrapped around editorial fashion photography. The
chrome is a spec sheet; the photography is uncropped and full-bleed inside it. The
garment is the only saturated thing on screen.

## Non-negotiables for this project

- **The interface is white and black.** Neutral greys may structure secondary
  surfaces; product colour comes from photography, never from UI.
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

| Role | Value |
| --- | --- |
| Paper | `#FFFFFF` |
| Ground | `#F4F4F2` |
| Ink | `#050505` |
| Smoke | `#5F5F5B` |
| Hairline | `#D8D8D4` |
| Action | `#050505` |

The storefront is intentionally locked to the light monochrome shell; the live Nelo
photography carries the saturated colour.

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

4. **Deviation 2 is withdrawn (2026-09-19, owner's explicit decision).** That clause
   banned spring motion and hover lift. The owner lifted the ban directly, so it no
   longer binds. What now applies:

   - **Spring motion is in.** Three easings, solved from a mass-spring-damper and
     sampled into CSS `linear()`: `--spring-calm` (no overshoot, for large or
     text-bearing things), `--spring` (peak 1.044, the house curve) and
     `--spring-snap` (peak 1.077, micro-interaction). They are real springs — a
     cubic-bezier cannot exceed its endpoints, so a "spring" bezier never actually
     overshoots. A spring's duration is part of its curve; shortening it truncates
     the overshoot and it stops reading as physical.
   - **Elevation exists now.** Two neutral-black steps, `--lift-1` and `--lift-2`.
     Nothing outside the product card gets a shadow.
   - **Hover lift is in** on the product card: -6px on `--spring`, `--lift-2`, and a
     4% image scale, mirrored on `:focus-visible` so it is not a mouse-only
     affordance.
   - **Reveals**, from the first pass: rules draw themselves, editorial type unmasks
     upward, garment photography resolves out of greyscale. Each is a *measuring*
     action, which is why they belong to "The Measured".
   - **New moments**: a pinned, scroll-scrubbed horizontal lookbook; a kinetic
     ticker; magnetic pointer response on primary actions.

   Still refused, as brand damage rather than restraint: coloured glows, blur/glass
   panels, and any second UI accent hue.

   Implementation is dependency-free. Reveals and the lookbook scrub are native CSS
   scroll-driven animation (`animation-timeline`), which runs off the main thread —
   a JS scroll handler doing the scrub is the classic way to make a mid-range phone
   stutter, and most of this storefront's traffic is mobile. The grid-to-PDP morph is
   React `<ViewTransition>`. The magnet is one ~1KB delegated island that writes two
   custom properties and lets CSS own the transform, rather than turning every call
   to action into a client component.

   Every reveal's base state is its *finished* state, so the global
   `prefers-reduced-motion` rule cannot strand content invisible; under reduced
   motion the lookbook's 340vh spacer collapses to a plain horizontal scroller
   (3060px to 806px, verified). Verified: axe clean at 1440 and 390, no animated
   element below opacity 0.95 with reduced motion, `npm run verify` green.

5. **Monochrome override (2026-09-19, owner's explicit decision).** The warm bone,
   brown-black and garnet palette is withdrawn. The interface is white, black and
   neutral grey at every system colour preference; the live Nelo product and bridal
   photography is the only source of colour. Automatic dark mode is intentionally
   disabled so a dark OS preference cannot turn the requested white storefront brown.

Retained from the bundle without change: media → identity/price → variants → one
primary action composition; imagery as evidence not decoration; neutral chrome so
photography carries colour; price gets weight rather than colour; no competing CTAs;
at most two type families; tabular numerals.
