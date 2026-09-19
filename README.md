# nelo-storefront

Headless storefront for Nelo Woman, built against the Vendure + Atelier backend in
`nelo-commerce`. The Vendure **Shop API schema is the contract** between the two repos.

## Stack — resolved and pinned

| | |
| --- | --- |
| Next.js | 16.3.5 (App Router, stable — no canary) |
| React | 19.3.0 |
| TypeScript | 5.7.2, `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` |
| Node | >= 20.9 |
| Codegen | @graphql-codegen/cli 7.4.1, typed-document-node |

Lockfile committed. Architecture: **server-first gateway** — Server Actions for mutations,
Server Components calling the same server-only functions directly. There is exactly one Route
Handler in the whole app (`/api/order-status/[code]`) and only a client island calls it; see
[Why there is one Route Handler](#why-there-is-one-route-handler).

## Commands

```bash
npm run dev            # local development on :4310
npm run verify         # typecheck + lint + unit tests + production build
npm run e2e            # Playwright journeys (desktop + Pixel 7)
npm run codegen        # regenerate types from the Shop API schema
npm run codegen:check  # drift gate — fails if generated output is stale
```

## Local development backend

The storefront develops against a **local Vendure 3.7.3 harness** at `../vendure-dev`
(SQLite, seeded sample data). It is not the production backend and is not in this repo.

```bash
cd ../vendure-dev
npm run dev:server    # Shop API on :3000
npm run dev:worker    # required — search indexing runs on the worker, not the server
```

Core commerce — products, collections, search, `activeOrder`, the cart, accounts, addresses,
orders and checkout up to payment — is standard Vendure, so types generated here match what
production will expose. What the harness does **not** have is the Atelier plugin, Paystack, or
Nelo's real Channel data.

`vendure-dev/setup-nelo-channels.mjs` creates the two Channels (`nelo-ng` NGN,
`nelo-international` USD), assigns the catalogue to both, **assigns the shipping and payment
methods to both** (without which checkout stalls with nothing to choose), and prints the
tokens for `.env.local`. After assigning products you must `reindex` — and the **worker must
be running** or the job sits PENDING and search returns nothing.

### Traps worth knowing before you hit them

- **Stale Next fetch cache.** `rm -rf .next/cache` is not enough. If backend data changes and
  a page disagrees, delete the whole `.next` directory and restart.
- **Windows asset URLs.** Vendure's local asset strategy emits previews containing
  backslashes. `src/lib/vendure/assets.ts` normalises them — always use `assetPreview()`,
  never `asset.preview` raw.
- **Image optimizer across localhost ports.** Next 16 refuses it, so development sets
  `images.unoptimized`. Do not "fix" it; production optimizes against `VENDURE_ASSET_HOST`.
- **`vendure dev server` dies on Windows.** Its file watcher tries to watch
  `vendure.sqlite-journal`, which SQLite creates and deletes on every write transaction, and
  the process exits with `EPERM`. Run the server and worker without the CLI watcher instead:
  ```bash
  node node_modules/ts-node/dist/bin.js ./src/index.ts        # server
  node node_modules/ts-node/dist/bin.js ./src/index-worker.ts # worker
  ```
- **`database is locked`.** SQLite has one writer and the harness runs two processes against
  one file. `setup-nelo-channels.mjs` retries on it; anything else you write against the
  Admin API should too.
- **Lockfiles.** A `package-lock.json` generated on Windows can be Linux-incompatible and
  break `npm ci` in CI. If you change dependencies, delete `node_modules` **and**
  `package-lock.json` before regenerating.
- **`next lint` no longer exists** in Next 16. ESLint runs from `eslint.config.mjs`.
- **`middleware` is now `proxy`** (`src/proxy.ts`).

## Environment

Copy `.env.example` to `.env.local`. Two flags exist because the backend contract is not
finished, and both are documented in `src/features/checkout/config.ts`:

| Variable | Purpose |
| --- | --- |
| `NELO_SITE_URL` | Absolute base for canonical tags, hreflang alternates and the sitemap. Server-only. Falls back to `http://localhost:4310` deliberately — a canonical pointing at the wrong production host is worse than one pointing at an obvious local one. |
| `NELO_DEV_PAYMENT` | `enabled` routes checkout's final step at Vendure's `dummy-payment-handler` so the whole journey is testable today. **Development only.** No money moves. Must never be set in a customer-facing deployment. |
| `NELO_INTERNATIONAL_CHECKOUT` | Blank means international checkout is **closed**. See [International checkout](#international-checkout-is-gated). |

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request, in two jobs:

| Job | Steps |
| --- | --- |
| **verify** | typecheck · lint · unit tests · production build · codegen drift |
| **e2e** | Playwright journeys against the **production build**, not the dev server |

Checks are never disabled to get a build through. If one fails, the fix is the code.

CI has no Vendure, so catalogue- and account-dependent journeys **skip with a stated
reason** (`e2e/backend.ts`, `e2e/mailbox.ts`) rather than asserting fixture behaviour and
calling themselves commerce tests. A skipped test that says why is honest; a test that passes
against a fixture and claims to prove checkout is not.

### The codegen drift gate

`npm run codegen:check` regenerates from the Shop API schema and fails if the result differs
from what is committed. That is what makes the schema a real contract rather than a
description — a backend change that breaks the storefront fails here instead of in production.

Generated output in `src/lib/vendure/generated/` is therefore **committed, not ignored**, so
CI has something to diff against. Never hand-edit it. Add operations as `.graphql` files under
`src/lib/vendure/operations/` and run `npm run codegen`.

## Layout

```
src/
  app/[market]/            # allowlisted market segment: ng | international
    account/               # register · verify · login · logout · password · addresses · orders
    checkout/              # stepped checkout + confirmation read by order code
    search/ about/ contact/ shipping/ returns/ size-guide/ order-tracking/
  app/api/order-status/    # the one Route Handler — payment-status polling only
  app/sitemap.ts           # market-aware, with hreflang alternates
  app/robots.ts
  features/
    account/               # auth + address Server Actions, the shared ActionForm island
    catalogue/             # product grid, facet rail, mobile filter sheet, PDP gallery
    cart/  checkout/  orders/  content/  atelier/
  lib/vendure/
    channels.ts            # market -> Channel, money formatting, no FX conversion
    transport.ts           # the one narrow Shop API transport
    session.ts             # HttpOnly cookie carrying Vendure's opaque bearer token
    errors.ts              # transport / GraphQL / typed-result failure classes
    customer.ts            # activeCustomer, with "unreachable" kept distinct from "signed out"
  lib/seo/
    legacy-redirects.ts    # the Shopify redirect map
    structured-data.ts     # product / collection / breadcrumb JSON-LD
  lib/atelier/
    measurements.ts        # decimal-millimetre handling
  proxy.ts                 # legacy 301s, then adds a market segment (307); never changes one
contracts/
  atelier-shop-api.proposal.graphql    # awaiting backend review
  paystack-shop-api.proposal.graphql   # awaiting backend review
docs/
  CATALOGUE-IMPORT.md      # the shape the storefront expects Nelo's catalogue in
design/                    # phase 0 mockups; the design lock is STYLESEED.md
```

## Rules this code encodes

These come from the backend team's architecture context and are not stylistic preferences:

- **Market resolves from the URL**, never silently from geo. An unknown market is a 404,
  not a fallback to Vendure's default Channel.
- **Private by default.** Every Vendure request is `cache: 'no-store'`. Catalogue caching
  happens only on a separate anonymous path that carries no session.
- **HTTP 200 is not success.** Transport errors, GraphQL `errors` and Vendure typed result
  unions are decoded separately, and every union selects `__typename`.
- **The browser never supplies a total.** `addPaymentToOrder` has no amount argument and the
  checkout forms have no price field. Vendure charges its own `totalWithTax`.
- **Measurements are decimal millimetres to two places.** Captured as a string plus an
  explicit unit; the backend normalises. A quarter inch is 6.35 mm, never 6.
- **Vendure owns authentication.** No NextAuth, no user table, no parallel password flow.
  Session tokens never reach localStorage, a URL, analytics, logs or `NEXT_PUBLIC_*`.
- **A commission is not a cart.** No price, quantity or add-to-bag on any Atelier surface.
- **No frontend FX conversion.** Channel pricing is backend-owned.

### Why there is one Route Handler

Server Components read Vendure directly and never call the app's own endpoints. The single
exception is `/api/order-status/[code]`, which exists for a case Server Components cannot
cover: after a hosted payment redirect the browser has to ask "has the backend confirmed this
yet?" repeatedly without re-rendering the page. It returns a state string and two booleans —
no totals, no lines, no customer — because a polling endpoint is the easiest thing in a
storefront to point at somebody else's order code.

## Storefront routes the backend needs to know about

Vendure's development email templates still point at `http://localhost:8080/verify` and
`http://localhost:8080/password-reset`. Those are scaffold placeholders. **These are the real
routes**, and they are built and tested:

| Email | Storefront route |
| --- | --- |
| Verify email address | `{origin}/{market}/account/verify?token={token}` |
| Password reset | `{origin}/{market}/account/password/reset?token={token}` |

Three things the backend has to decide, because the storefront cannot:

1. **The market segment.** Every storefront URL carries one. The templates need to build
   `/ng/...` or `/international/...`, which means the email handler needs the Channel the
   customer registered on. If that is not available at send time, default to `/ng` — a
   customer who verifies on the wrong market is signed in correctly and can switch; a URL
   with no market segment 307s to `/ng` anyway, so it also works, just with an extra hop.
2. **The origin.** Per environment, from configuration — not hardcoded in a template.
3. **`changeEmailAddressUrl`.** The storefront has **no** email-change route, because it has
   no email-change UI. `requestUpdateCustomerEmailAddress` therefore cannot be completed
   today. Either that placeholder stays unused, or tell us the flow is wanted and we will
   build `{market}/account/email?token={token}` to match.

## Not built yet, and why

| | Blocked on |
| --- | --- |
| Paystack payment | The initialise-payment operation does not exist. Settlement is not implemented. Our proposed contract: `contracts/paystack-shop-api.proposal.graphql`. |
| Atelier screens | No customer-facing resolvers exist. Our proposed contract: `contracts/atelier-shop-api.proposal.graphql`. Every Atelier screen stays on marked fixtures until it lands. |
| International checkout | Confirmation that the Paystack account can settle USD. |
| Real catalogue | Nelo's own products. The harness carries Vendure's sample electronics. `docs/CATALOGUE-IMPORT.md` says what shape the storefront needs. |

### Checkout, precisely

Everything up to payment is **built and works against live Vendure**: `setCustomerForOrder`,
`setOrderShippingAddress`, `eligibleShippingMethods`, `setOrderShippingMethod`,
`transitionOrderToState`, `eligiblePaymentMethods`, `addPaymentToOrder`, `applyCouponCode`.
Guest checkout is supported; signed-in customers skip the details step.

What is missing is the Paystack **initialisation** step. Against the harness, with
`NELO_DEV_PAYMENT=enabled`, the flow completes through Vendure's development payment handler
and a guest can place an order end to end. In any other deployment the review step says
plainly that payment is not connected and offers a way to order by message. It never shows a
receipt for money that has not moved.

The return flow is already built to the agreed shape: the `reference` on a return URL is an
untrusted hint, the confirmation screen says **"confirming payment"** until Vendure itself
reports a paid state, and it polls with bounded backoff, stops on a terminal state, and then
offers a manual refresh and a support path.

### International checkout is gated

A USD catalogue proves the Channel prices in USD. It does **not** prove the Paystack account
can accept USD. Until someone confirms that with the provider, `/international/checkout`
returns 200 and explains that payment is not open, rather than quietly charging the naira
figure against a dollar price. The catalogue, the bag and the atelier are all unaffected.

One flag: `NELO_INTERNATIONAL_CHECKOUT=enabled`. It is enforced in the Server Actions as well
as the UI, because a checkout that is only disabled in the markup is not disabled.
