# nelo-storefront

Headless storefront for Nelo Woman, built against the Vendure + Atelier backend in
`nelo-commerce`. The Vendure **Shop API schema is the contract** between the two repos.

## Setup

You need **Node.js 20.9 or newer**. This repo pins **22.18.0** in `.nvmrc`.

### 1. Install dependencies

From this directory:

```bash
npm install
```

CI uses `npm ci`, which installs exactly what `package-lock.json` records. Use that when you want a clean install from the lockfile.

### 2. Create the env file

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

`.env.local` is gitignored. The storefront will not load a catalogue until `VENDURE_SHOP_API_URL` and both channel tokens are set. Every variable is server-only. Do not prefix any of them with `NEXT_PUBLIC_`.

| Variable | What to put |
| --- | --- |
| `VENDURE_SHOP_API_URL` | Shop API URL. Local harness: `http://localhost:3000/shop-api`. |
| `VENDURE_CHANNEL_TOKEN_NG` | Token for the `nelo-ng` channel. |
| `VENDURE_CHANNEL_TOKEN_INTERNATIONAL` | Token for the `nelo-international` channel. |
| `VENDURE_SCHEMA` | Leave as `./schema/shop-api.graphql` unless you are regenerating types from a live endpoint. |
| `NELO_SITE_URL` | Leave blank locally. It falls back to `http://localhost:4310`. |
| `NELO_INTERNATIONAL_CHECKOUT` | Leave blank. International checkout stays closed until Paystack can settle USD. |

### 3. Point it at a Shop API

**Shared backend.** Ask the backend team for the Shop API URL and the two channel tokens, paste them into `.env.local`, and skip to step 4.

**Local harness.** The storefront develops against a Vendure 3.7.3 app at `../vendure-dev` (SQLite, sample catalogue). It is not in this repo and it is not production. It does not include the Atelier plugin, Paystack, or Nelo's real channel data.

```bash
cd ../vendure-dev
npm install
npm run dev:server    # Shop API on :3000
npm run dev:worker    # required — search indexing runs on the worker
```

On Windows, `npm run dev:server` exits with `EPERM` because the file watcher tries to watch `vendure.sqlite-journal`. From `vendure-dev`, start the server and worker without that watcher:

```bash
node node_modules/ts-node/dist/bin.js ./src/index.ts
node node_modules/ts-node/dist/bin.js ./src/index-worker.ts
```

With both processes running, from `vendure-dev` in another terminal, create the two channels and print the tokens:

```bash
node setup-nelo-channels.mjs
```

Copy the printed `VENDURE_CHANNEL_TOKEN_NG` and `VENDURE_CHANNEL_TOKEN_INTERNATIONAL` lines into this repo's `.env.local`. The script also assigns the sample catalogue, shipping methods, and payment methods to both channels. After that, run `reindex` from the Vendure Dashboard at [http://localhost:3000/dashboard](http://localhost:3000/dashboard). Local login is `superadmin` / `superadmin`. The worker has to be running or the job stays pending and search returns nothing.

### 4. Start the storefront

```bash
npm run dev
```

Open [http://localhost:4310](http://localhost:4310). An unknown market is a 404. A URL with no market segment redirects to `/ng`.

To check the project the way CI does:

```bash
npm run verify    # typecheck, lint, unit tests, production build
```

## Stack — resolved and pinned

| | |
| --- | --- |
| Next.js | 16.3.5 (App Router, stable — no canary) |
| React | 19.3.0 |
| TypeScript | 5.7.2, `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` |
| Node | >= 20.9 |
| Codegen | @graphql-codegen/cli 7.4.1, typed-document-node |

Lockfile committed. Architecture: **server-first gateway** — Server Actions for mutations,
Server Components calling the same server-only functions directly. Two narrow Route Handlers
support the hosted payment return and its bounded client-side status poll; see
[Why there are two Route Handlers](#why-there-are-two-route-handlers).

## Commands

```bash
npm run dev            # local development on :4310
npm run verify         # typecheck + lint + unit tests + production build
npm run e2e            # Playwright journeys (desktop + Pixel 7)
npm run codegen        # regenerate types from the Shop API schema
npm run codegen:check  # drift gate — fails if generated output is stale
```

## Local development backend

The install and boot sequence is in [Setup](#setup). This section is what that harness can and cannot do.

Core commerce — products, collections, search, `activeOrder`, the cart, accounts, addresses,
orders and checkout up to payment — is standard Vendure, so types generated here match what
production will expose. What the harness does **not** have is the Atelier plugin, Paystack, or
Nelo's real Channel data.

`vendure-dev/setup-nelo-channels.mjs` creates the two Channels (`nelo-ng` NGN,
`nelo-international` USD), assigns the catalogue to both, and **assigns the shipping and payment
methods to both** (without which checkout stalls with nothing to choose). After assigning products you must `reindex` — and the **worker must
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

`.env.local` is created in [Setup](#setup). Checkout uses the backend's concrete Paystack Shop API
contract; only international payment remains behind a storefront gate:

| Variable | Purpose |
| --- | --- |
| `NELO_SITE_URL` | Absolute base for canonical tags, hreflang alternates and the sitemap. Server-only. Falls back to `http://localhost:4310` deliberately — a canonical pointing at the wrong production host is worse than one pointing at an obvious local one. |
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
- **The browser never supplies a total.** `initializePaystackPayment` has no input and the
  checkout forms have no price field. Vendure charges its own `totalWithTax`.
- **Measurements are decimal millimetres to two places.** Captured as a string plus an
  explicit unit; the backend normalises. A quarter inch is 6.35 mm, never 6.
- **Vendure owns authentication.** No NextAuth, no user table, no parallel password flow.
  Session tokens never reach localStorage, a URL, analytics, logs or `NEXT_PUBLIC_*`.
- **A commission is not a cart.** No price, quantity or add-to-bag on any Atelier surface.
- **No frontend FX conversion.** Channel pricing is backend-owned.

### Why there are two Route Handlers

Server Components read Vendure directly and never call the app's own endpoints. Two narrow
exceptions support hosted payment: `/checkout/payment-return` turns the backend's fixed
Paystack callback into the market/order confirmation URL using a short-lived HttpOnly hint,
and `/api/order-status/[code]` polls the backend's ownership-checked payment-attempt query.
Neither route can settle an order, and neither exposes totals, lines or customer data.

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
| Paystack live release evidence | The NGN hosted-redirect contract and webhook settlement are implemented. A real Paystack test-mode run with API, worker, Redis and public HTTPS ingress is still required before release. |
| Atelier screens | No customer-facing resolvers exist. Our proposed contract: `contracts/atelier-shop-api.proposal.graphql`. Every Atelier screen stays on marked fixtures until it lands. |
| International checkout | Confirmation that the Paystack account can settle USD. |
| Real catalogue | Nelo's own products. The harness carries Vendure's sample electronics. `docs/CATALOGUE-IMPORT.md` says what shape the storefront needs. |

### Checkout, precisely

The NGN flow is integrated end to end: `setCustomerForOrder`,
`setOrderShippingAddress`, `eligibleShippingMethods`, `setOrderShippingMethod`,
`transitionOrderToState`, `eligiblePaymentMethods`, `initializePaystackPayment`,
`paystackPaymentStatus`, and `applyCouponCode`.
Guest checkout is supported; signed-in customers skip the details step.

The backend derives amount, currency, customer and callback. The storefront validates the
returned checkout URL against `https://checkout.paystack.com`, retains the order/reference
in a short-lived HttpOnly callback hint, and never treats the provider return as payment
proof. The confirmation screen says **"confirming payment"** until the backend attempt is
`settled`, polls with bounded backoff, stops on terminal failure, then offers a manual refresh
and support path.

### International checkout is gated

A USD catalogue proves the Channel prices in USD. It does **not** prove the Paystack account
can accept USD. Until someone confirms that with the provider, `/international/checkout`
returns 200 and explains that payment is not open, rather than quietly charging the naira
figure against a dollar price. The catalogue, the bag and the atelier are all unaffected.

One flag: `NELO_INTERNATIONAL_CHECKOUT=enabled`. It is enforced in the Server Actions as well
as the UI, because a checkout that is only disabled in the markup is not disabled.

## Account email flows

Backend email configuration is tracked in `nelo-commerce` PR #35. This storefront provides:

- `/{market}/account/verify`: confirm registration (or request a new verification email).
- `/{market}/account/password`: request a reset while signed out.
- `/{market}/account/password/reset`: set a new password using the emailed token.
- `/{market}/account/email`: signed-in request to change email, requiring the current password.
- `/{market}/account/verify-email-address-change`: explicitly confirm the emailed token with a POST.

For the NG market configure backend `EMAIL_VERIFY_PATH=/ng/account/verify`,
`EMAIL_PASSWORD_RESET_PATH=/ng/account/password/reset`, and
`EMAIL_CHANGE_ADDRESS_PATH=/ng/account/verify-email-address-change`. Use the actual deployed
storefront origin for `STOREFRONT_ORIGIN`. The routes also support `international`; the backend's
current configuration chooses explicit paths and does not dynamically route email links by Channel.
Domain verification, sending credentials, and final deployment settings remain backend rollout work.

### Local verification evidence

74 unit tests passed, including seven email-action tests for input validation, password preservation,
Vendure error unions and token confirmation. Typecheck, lint and production build passed.
GraphQL operations were generated from the checked-in Shop API schema. The drift command compares
against Git's baseline, so it reports the intended generated changes until those changes are committed;
regenerating produced identical output.

A Chrome browser journey against an isolated real Vendure API, PostgreSQL database and Redis worker
passed registration, emailed-token verification/sign-in, email-change request, confirmation and account
identity refresh, followed by password reset to the new address and automatic sign-in. The international
confirmation page also handled a missing token. Emails were captured by the test sender rather than sent
externally. Captured URL paths/tokens were opened on the local frontend origin; this does not verify the
final public hostname, DNS or inbox delivery. The separate backend gate already exercised Resend SMTP.
