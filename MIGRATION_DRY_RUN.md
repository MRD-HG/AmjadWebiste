# Migration and reconciliation dry run

Run date: 2026-10-29. Source: current frontend HTML plus `js/translations.js`. The run used isolated temporary private/public storage and did not alter production content.

| Collection | Frontend-only candidates | Existing matches | Conflicts | Missing referenced static files |
|---|---:|---:|---:|---:|
| Sections/editorial bindings | 166 | 0 | 0 | 0 |
| Programs | 11 | 0 | 0 | 0 |
| News | 7 | 0 | 0 | 0 |
| Products | 2 | 0 | 0 | 0 |

All 186 candidates require human verification of facts, dates, translations, links, and image rights. A normal isolated `--apply` created all records as drafts and the public projections contained zero items. A second apply matched all 186 IDs, added nothing, and reported no conflicts, confirming idempotence. An isolated `--apply --publish-verified` generated 11 program, 7 news, 2 product, and 166 section projection records; this was a test of the explicit publishing gate, not an approval of the content.

The machine-readable report is generated on demand under ignored `artifacts/`:

```powershell
php admin/bin/reconcile-frontend.php --report=artifacts/reconciliation-dry-run.json
```

Legacy JSON import remains a separate first step. Its originals and checksums are preserved under private import storage; the reconciler never overwrites an existing stable ID and reports disagreements for manual resolution.
