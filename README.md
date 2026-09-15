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
npm run dev         # local development
npm run verify      # typecheck + lint + production build
npm run codegen     # regenerate types from the Shop API schema
npm run codegen:check   # CI drift gate
```

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
| Generated types | The Shop API SDL — `src/lib/vendure/generated/` is gitignored until then |
| Paystack | The initialise-payment operation; name, input and result are still TBD |
| Atelier screens | Customer-safe resolvers — see `contracts/` for our proposal |
| International checkout | Confirmation that the Paystack account can accept USD |
