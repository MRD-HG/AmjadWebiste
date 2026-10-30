# AMJAD Website v9 stabilization report

Date: 2026-10-30  
Scope: local repair and verification only. NindoHost production was not accessed or changed, and no deployment ZIP was generated.

## Release verdict

**Ready with known limitations** for a protected staging deployment. Production promotion remains gated on host PHP/security verification and owner review of the dry-run content reconciliation.

## Root causes and repairs

1. `/` returned 404 because the development router handled PHP directory indexes but never mapped the root request to `index.html`. The router now resolves `/` safely and enforces path-boundary containment.
2. Unpublish/archive removed records from published JSON but the frontend could not distinguish an unavailable endpoint from a CMS-owned static card that had been withdrawn. Public projections now publish an allowlisted ownership contract (`ownership_version` and stable `managed_ids`) without draft text/status. The connector hides only claimed, unpublished records; missing endpoints and empty unclaimed collections preserve static fallback.
3. CMS news/product cards were added after the one-time animation observer scan, leaving normal-motion cards at their pre-animation opacity. A reusable observer registration API now registers dynamic nodes and immediately reveals them for reduced-motion/no-observer environments.
4. Shop selection depended on hardcoded `T-shirt`/`Cap` branches. It now uses the CMS product code, price, currency, sizes, colors, availability and translated title through one runtime catalog. Price and total appear in the summary and order email; unavailable/unpublished products cannot be selected.
5. New program details defaulted to the education family. The CMS family is now registered with each card/detail and invalid families fail closed instead of silently routing to education.
6. Skhirat Memory rendered only summaries. Published body content now has an accessible native full-reader with stable `#memory-<id>` addressing and safe text rendering.
7. Forms and shop email used a hardcoded address independently of CMS contact settings. A validated central contact accessor now drives form links, shop orders, visible marked contact values and the offline assistant, with the original address retained as the endpoint-failure fallback.
8. Documentation claimed PHP 7.4 although source utilities require PHP 8 features. The supported minimum is now PHP 8.2 and a read-only CLI checker verifies version, extensions, functions and writable targets without printing secrets.
9. The historical archive contained tests, artifacts and a nested release. The release builder now excludes private storage, setup/import utilities, tests, artifacts, prior releases and ZIPs; it requires Apache protection files and supports audit-only staging without creating an archive.

## Evidence

- PHP functional suite: 25 checks passed (credentials, validation, projections, ownership metadata, revisions/restore, upload safety, references and session expiry).
- Frontend CMS E2E: passed for root routing, publish ownership, endpoint fallback, AR/FR/EN, XSS-safe rendering, social program routing, CMS shop data/order email, memory reader, hashes, filters and normal/reduced motion.
- Authenticated CMS browser QA: passed for protected routes, login failure/success, CSRF, draft/publish/unpublish/archive, public projection, responsive admin and logout.
- Responsive regression: passed at 390×844, 768×1024, 1024×768 and 1440×900 in Arabic RTL, English LTR and French LTR.
- Environment: PHP 8.2.12; required `json`, `session`, `fileinfo` extensions and security/media functions passed. `gd` is absent but optional.
- Release audit: 117 public files staged; required `.htaccess` protections present; no private/setup/test/archive content; no ZIP created.
- Syntax/static checks: PHP lint, Node syntax checks and `git diff --check` passed.
- Migration/import dry runs: no writes, no conflicts, no missing assets and no invalid details.

## Content migration status

The current local CMS is intentionally not auto-migrated. Reconciliation found 166 section, 11 program, 7 news and 2 product records present only in static frontend content, plus one local CMS-only news test record. All 186 frontend records require editorial verification before any apply/publish operation. A pre-test development-content backup exists in ignored local artifacts; revision restore was also exercised in the isolated functional suite.

## Compatibility and safeguards

- Existing HTML/CSS/JavaScript/PHP architecture and schema version 1 are preserved.
- Static fallback remains complete when CMS projections are unavailable.
- Public projection metadata exposes stable IDs only; drafts, archived text and private fields remain excluded.
- The pre-existing `amjadweb.zip` remains untouched and is not a deployment candidate. Its SHA-256 is `a1473e9817dc34b7047a572579f925aea3952be2d245e7842210fc5b5159ca6d`.
- No production credentials, local credentials, private storage, backups or test artifacts are tracked for release.

## Staging recommendation

Deploy the reviewed commit to a protected staging document root, confirm PHP 8.2+ with `admin/bin/check-environment.php` from the private source checkout, configure storage outside the document root, and run reconciliation in dry-run mode again against the staging data. Review/import records as drafts in small batches, verify unpublish fallback and all forms, then run `POST_DEPLOYMENT_CHECKLIST.md`. Promote only after owner approval and a verified host backup/rollback point.
