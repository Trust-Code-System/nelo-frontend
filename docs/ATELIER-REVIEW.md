# Atelier consolidation — 3 October 2026

Use the integrated frontend on main (737847e) as the implementation. The older
feat/atelier-consultation branch (37d1070) is retained as history, not a second
application. Its narrower booking page must not replace the integrated account,
measurement, cancellation, and commission journeys.

The review carries over two booking safeguards: uncertain mutation responses block
resubmission until the customer checks their appointments, and a failed page/cache
refresh cannot turn a confirmed saved appointment into a reported booking failure.
An appointments link stays available after success. Authentication failures remain
retryable because no mutation was attempted.

Verification: 108 frontend unit tests, lint, TypeScript, and webpack production
build passed. The desktop/mobile mock API suite had 17 passing cases on the first
run; two new cases needed a selector scoped to the booking alert, and a mobile
catalogue case failed on that run. All four selected desktop/mobile booking and
catalogue cases passed the rerun. This is mock API evidence, not real appointments
or email delivery. Backend typecheck passed with the existing dashboard dependency
filter; 558 tests passed and 26 database cases skipped.

Local API and worker startup and the frontend sign-in gate were verified after
PostgreSQL started. The old local database had no default-channel tax zone and an
empty search index; the missing zone was set through the Admin API and reindex jobs
completed for all three channels. Authenticated real-backend Atelier journeys remain
unverified; the browser evidence above uses a test API.
No real appointments or notification emails were created during this review.

Work in the existing nelo-frontend checkout on a feature branch, reviewed into
main. Backend integration belongs in nelo-commerce on chore/18-railway-staging.
Do not create extra working folders without discussing the need first.
