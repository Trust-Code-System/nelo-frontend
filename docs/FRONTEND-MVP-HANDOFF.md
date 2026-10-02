# Frontend MVP handoff — 2 October 2026

Work is on `feat/frontend-mvp-completion`, based on `origin/main` b493253. Changes are local; deployment and backend data provisioning remain separate.

## Frontend implementation

| Report gap | Frontend behavior | Remaining dependency |
| --- | --- | --- |
| G1 real catalogue | Shop, search, product detail and sitemap read Vendure; runtime Shopify fallback removed | Backend imports the retained `src/data/nelo-catalogue.json` and `public/catalogue` assets, NGN prices, variants, channel assignments and reindexes |
| G2 categories | Collections landing reads the selected channel's published collections and links to `/collections/{slug}` | Client supplies categories; backend creates/assigns collections and their images |
| G3 purchase route | Published ordinary products use the real bag. A `purchase-mode` facet value `commission` shows “By consultation” throughout catalogue cards and opens consultation intake; optional `category` / `bridal` selects bridal | Backend/client classifies commission-only pieces and enforces their commerce policy |
| G4 Atelier | Signed-in booking, profile creation/edit/deletion, appointment history/cancellation, commission list/detail and confirmed snapshots use generated Shop operations | Deploy the published Atelier API and provision a verified demo customer with real commissions |
| G5 newsletter | Accessible POST Server Action validates email, waits for a provider acknowledgement and shows feedback; email never goes into the URL | Connect the provider adapter described below; no subscription is claimed while it is unconfigured |
| G6 tracking | Shared order view renders fulfillment state, tracking number and items/quantities per shipment | Staff creates real fulfillments and supplies courier tracking codes |
| G7 guest booking | Public atelier explains the service, then offers sign-in/registration and a return path; the server also checks identity | Guest booking remains a deliberate backend/product decision |

Atelier data remains private and uncached. Inputs use one explicit display unit per profile, as the actual API requires. Decimal strings are sent unchanged; saved 0.01 mm values use sufficient input precision to survive an unchanged edit. Staff-created profiles are read-only to the customer. Commission progress is read-only; no invented charge schedule, proposal approval, staff control or fixture customer data is rendered.

The raw Shopify JSON remains an **import source only**. It is not imported by runtime storefront code. Keep it until the backend importer has completed and the catalogue is verified. No categories or USD prices were guessed.

## API contract and environment

The committed core Shop snapshot has been composed with the exact published SDL blocks from `nelo-commerce/apps/commerce/src/plugins/atelier/api/atelier-shop.schema.ts`. It is sufficient for offline generation/validation, but is **not a fresh live schema export**. The configured endpoint returned HTML during inspection, so live contract compatibility remains unverified.

When the backend is reachable, set the real Shop endpoint and both channel tokens in the ignored `.env.local`, then run:

```powershell
npm run schema:export
npm run codegen
npm run verify
```

Alternatively the backend team can supply a complete exported **Shop** SDL. Do not use Dashboard/Admin types or `vendure-dev` to validate Atelier/Paystack readiness.

Align `CORS_ORIGINS`, `STOREFRONT_ORIGIN`, `PAYSTACK_CALLBACK_URL`, `ASSET_URL_PREFIX`, storefront `VENDURE_ASSET_HOST`, and both channel assignments. Local storefront origin is `http://localhost:4310`; email links pointing to port 3001 must be corrected by the backend team. Keep international checkout gated until USD settlement is verified.

## Newsletter provider adapter

Server-only settings: `NELO_NEWSLETTER_WEBHOOK_URL` (HTTPS) and optional `NELO_NEWSLETTER_WEBHOOK_TOKEN` (Bearer authentication). The trusted endpoint receives JSON:

```json
{"email":"customer@example.test","market":"ng","consent":true,"source":"storefront-footer"}
```

The endpoint must store/upsert the subscriber with the client's provider before acknowledging with 2xx, enforce provider consent/double opt-in, and handle duplicate requests and rate limits. The frontend never stores a subscriber or treats address validation as a subscription. Provider failures/unconfigured status remain visible. No address or upstream response is logged by this action.

## Verification and demo release gate

`npm run e2e:mvp:ui` runs the desktop/Pixel 7 UI contract suite against an isolated, local schema-validating test double. It exercises booking, measurements, cancellation, commissions, tracking, newsletter privacy, guests and viewport overflow at 320/393/768/1024/1440px. Its test data is confined to `e2e/fixtures`; it is not a deployed catalogue or proof of a working backend.

Local verification: `npm run verify` passed (type checking, ESLint, 106 unit tests and production build). GraphQL regeneration produced identical output. The full UI contract suite passed all 18 cases; the six booking/measurement/responsive cases were rerun after final control styling and passed. Successful review images are under ignored `test-results/ui-final` and use test-only customer data.

The public regression run covered written pages, market routing, account privacy and mobile navigation: 55 passed and 16 skipped (absent live catalogue or desktop-only/mobile-only applicability). One development-server navigation exceeded the old five-second assertion budget; its budget was aligned with the existing 15-second catalogue navigation checks and both market-navigation cases passed the separate rerun. These skips provide no evidence of working live commerce.

For the real backend journeys, set `PLAYWRIGHT_BASE_URL` to the staging storefront, `VENDURE_SHOP_API_URL` and channel tokens to that same environment, and `E2E_CUSTOMER_EMAIL` / `E2E_CUSTOMER_PASSWORD` to a dedicated pre-verified test customer in the ignored env file. Supply `E2E_COMMISSION_REFERENCE`, `E2E_FULFILLED_ORDER_CODE` and `E2E_TRACKING_CODE` from this customer's seeded records. Set `E2E_REQUIRE_BACKEND=1` to fail required probes instead of accepting absent-backend skips, then run `npm run e2e:mvp:live`. It saves/edits/deletes a test measurement profile, requests/cancels a test consultation, checks the seeded commission/order and runs catalogue and measurement validation cases. Use this dedicated test customer because these tests create real staging records.

Follow it with the full NGN Paystack test-mode gate with a running worker and public webhook ingress. A green local mock suite does not replace that release gate. Live journeys remain unverified here because the configured API returned HTML and no demo account was provided.

The existing `account`, `checkout`, `cart` and keyboard-checkout sample journeys still use electronics/development payments. They require adaptation to the staging garment data and hosted Paystack journey before being used as a release gate. The updated Nelo catalogue and measurement cases use published garments and the pre-verified account; passing sample-harness tests alone is insufficient.

Before the demo: import actual garments, categorize and price them, remove synthetic shipping labels, seed a customer's fulfilled order and tracking code, seed a commission with associated appointments, verify production email, and rehearse the full phone journey. Guest order lookup expiry remains backend-owned; show historic orders while signed in.

## Scope boundary

No backend code, seeds, database, shipping-rate policy, Paystack handler or email service was changed. Backend deployment, catalogue importer, category/USD input, demo provisioning, newsletter provider, worker/webhook verification and live staging evidence remain with the responsible teams.
