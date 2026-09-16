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
| Codegen | @graphql-codegen/cli 7.4.1, client preset |

Lockfile committed. Architecture: **server-first gateway** — Server Actions for mutations,
Server Components calling the same server-only functions directly, never our own Route
Handlers.

## Commands

```bash
npm run dev            # local development
npm run verify         # typecheck + lint + unit tests + production build
npm run e2e            # Playwright journeys (desktop + Pixel 7)
npm run codegen        # regenerate types from the Shop API schema
npm run codegen:check   # drift gate — fails if generated output is stale
```

## Local development backend

The storefront develops against a **local Vendure 3.7.3 harness** at `../vendure-dev`
(SQLite, seeded sample data). It is not the production backend and is not in this repo.

```bash
cd ../vendure-dev
npm run dev:server    # Shop API on :3000
npm run dev:worker    # required — search indexing runs on the worker, not the server
```

Core commerce — products, collections, search, `activeOrder`, cart mutations — is standard
Vendure, so types generated here match what production will expose. What the harness does
**not** have is the Atelier plugin or Nelo's real Channel data; those screens stay on marked
fixtures.

`vendure-dev/setup-nelo-channels.mjs` creates the two Channels (`nelo-ng` NGN,
`nelo-international` USD), assigns the catalogue to both, and prints the tokens for
`.env.local`. After assigning products you must `reindex` — and the **worker must be
running** or the job sits PENDING and search returns nothing.

Two Windows-specific notes: Vendure's local asset strategy emits preview URLs containing
backslashes, which `src/lib/vendure/assets.ts` normalises; and Next 16's image optimizer
refuses to fetch across localhost ports, so development serves previews unoptimized.
Production optimizes normally against the real asset host.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request, in two jobs:

| Job | Steps |
| --- | --- |
| **verify** | typecheck · lint · unit tests · production build · codegen drift |
| **e2e** | Playwright journeys against the **production build**, not the dev server |

Checks are never disabled to get a build through. If one fails, the fix is the code.

### The codegen drift gate

`npm run codegen:check` regenerates from the Shop API schema and fails if the result differs
from what is committed. That is what makes the schema a real contract rather than a
description — a backend change that breaks the storefront fails here instead of in production.

Generated output in `src/lib/vendure/generated/` is therefore **committed, not ignored**, so
CI has something to diff against. Never hand-edit it.

**Right now this gate reports `PENDING`**, because no schema exists yet. It prints a warning
annotation on every CI run so it cannot rot unnoticed. Drop the SDL into
`schema/shop-api.graphql` (or set `VENDURE_SCHEMA` to a reachable endpoint) and it becomes
enforcing with no change to the workflow.

Copy `.env.example` to `.env.local` first. Nothing runs against a real Vendure instance yet.

## Layout

```
src/
  app/[market]/            # allowlisted market segment: ng | international
  lib/vendure/
    channels.ts            # market -> Channel, money formatting, no FX conversion
    transport.ts           # the one narrow Shop API transport
    session.ts             # HttpOnly cookie carrying Vendure's opaque bearer token
    errors.ts              # transport / GraphQL / typed-result failure classes
  lib/atelier/
    measurements.ts        # decimal-millimetre handling
  middleware.ts            # adds a market segment; never changes one
contracts/
  atelier-shop-api.proposal.graphql   # our proposed contract, for backend review
design/                    # phase 0 mockups, design lock lives in ../STYLESEED.md
```

## Rules this code encodes

These come from the backend team's architecture context and are not stylistic preferences:

- **Market resolves from the URL**, never silently from geo. An unknown market is a 404,
  not a fallback to Vendure's default Channel.
- **Private by default.** Every Vendure request is `cache: 'no-store'`. Catalogue caching
  happens only on a separate anonymous path that carries no session.
- **HTTP 200 is not success.** Transport errors, GraphQL `errors` and Vendure typed result
  unions are decoded separately.
- **Measurements are decimal millimetres to two places.** Captured as a string plus an
  explicit unit; the backend normalises. A quarter inch is 6.35 mm, never 6.
- **Vendure owns authentication.** No NextAuth, no user table, no parallel password flow.
  Session tokens never reach localStorage, a URL, analytics, logs or `NEXT_PUBLIC_*`.
- **No frontend FX conversion.** Channel pricing is backend-owned.

## Not built yet, and why

| | Blocked on |
| --- | --- |
| Catalogue, cart, checkout | A reachable Shop API with migrations and seeded fixtures |
| Generated types | The Shop API SDL — the codegen drift gate is PENDING until it lands |
| Paystack | The initialise-payment operation; name, input and result are still TBD |
| Atelier screens | Customer-safe resolvers — see `contracts/` for our proposal |
| International checkout | Confirmation that the Paystack account can accept USD |
