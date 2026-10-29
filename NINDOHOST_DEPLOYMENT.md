# NindoHost deployment runbook

Do not deploy until the real document root, PHP version/extensions, HTTPS behavior, and backup location are confirmed in the hosting panel. The release archive is prepared for manual upload; it does not contain credentials or private content storage.

1. Create a full host backup of the current document root, database (if any), existing uploads, and historical CMS JSON. Verify the backup before changing files.
2. Rotate any password found in a historical archive. Remove public `admin.zip`/backup archives and invalidate old CMS sessions.
3. Confirm PHP 7.4+ with `json`, `session`, `fileinfo`, and image metadata support. `gd` is recommended. Confirm Apache deny rules/headers or reproduce them in Nginx/LiteSpeed.
4. Extract the release into staging. Point `AMJAD_STORAGE_DIR` to a backed-up directory outside the document root. Configure the other paths from `deployment/env.example`.
5. Create the first administrator with `php admin/bin/setup.php`, or configure environment username/password hash. Never upload a local credential file.
6. Ensure the web-server user can write only private storage, `data/cms`, and `images/uploads`; application source should not be writable.
7. Run legacy import and frontend reconciliation in dry-run mode. Review conflicts, facts, dates, translations, links, and image rights before applying drafts.
8. Smoke-test staging with `POST_DEPLOYMENT_CHECKLIST.md`. Publish one reviewed test record, verify it publicly, then restore/archive it.
9. Switch traffic only after owner approval. Keep the prior document root and private-storage backup intact for rollback.

The PHP development server is never a production deployment option.

