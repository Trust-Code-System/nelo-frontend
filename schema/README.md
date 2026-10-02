# Shop API schema

The committed snapshot combines the core Vendure Shop SDL with the exact Atelier Shop SDL
published in nelo-commerce. The Atelier portion was synchronized offline because the
configured API endpoint was not returning GraphQL. Live schema compatibility remains a
release check; this is not an export from a running nelo-commerce deployment.

To refresh from the real target backend, configure the ignored .env.local endpoint/channel
values, then run npm run schema:export followed by npm run codegen and npm run verify.
Alternatively obtain a complete exported Shop SDL from the backend team. Never use Dashboard
or Admin API types for storefront operations.

The offline sync utility scripts/sync-atelier-schema.mjs records how the published extension
was incorporated; it refuses to append a second copy. Refresh an existing contract using a
complete live export. DecimalMillimetres is output-only and mapped to string. Profile inputs
are decimal strings with one explicit preferredDisplayUnit, never integer millimetres.

Generated output is committed under src/lib/vendure/generated. Never hand-edit it. The CI
codegen gate compares regenerated output with the committed revision. For uncommitted work,
compare the file hash before and after regeneration to check repeatability.
