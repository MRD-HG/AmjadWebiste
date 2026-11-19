# NindoHost deployment runbook

## Quick path: save evaluation answers on NindoHost (cPanel, no SSH needed)

Every submitted questionnaire is saved by `api/evaluation.php` as one JSON file in private storage (no database needed). The admin page `admin/evaluations.php` shows the count and downloads everything as **CSV (opens in Excel, Arabic OK)** or JSON.

1. **PHP version** — cPanel → *Select PHP Version* (or *MultiPHP Manager*) → choose **PHP 8.2+** and make sure `json` and `fileinfo` are enabled.
2. **Upload the site** into `public_html` (File Manager or FTP).
3. **Private config** — copy `deployment/amjad-config.example.php` to your home folder **next to** `public_html` (not inside it): `/home/YOUR_CPANEL_USER/amjad-config.php`. Edit it: set your cPanel user in `AMJAD_STORAGE_DIR` and put a long random value in `AMJAD_SETUP_TOKEN`.
4. **Create the admin account** — open `https://YOUR-DOMAIN/admin/setup.php`. All checks must show ✓. Enter the setup token, a username and a password (12+ characters).
5. **Lock it** — remove the `AMJAD_SETUP_TOKEN` line from `amjad-config.php` (the setup page also refuses to run once an admin exists).
6. **Test** — submit one test answer on `/evaluation.html`, then log in at `/admin/` → *تقييم أمجاد*: the counter shows 1 and *تنزيل CSV* downloads it. Answers live in `/home/YOUR_CPANEL_USER/amjad-storage/evaluations/responses/`, outside the website.
7. **Back up** `amjad-storage/` (cPanel → Backup, or download the folder) before deleting the test answer.

> If the CMS is already running with the default `admin/storage/` folder, move that folder's contents into the new `amjad-storage/` folder before switching, otherwise the admin account and CMS content will not be found.

## Full runbook

Do not deploy until the real document root, PHP version/extensions, HTTPS behavior, and backup location are confirmed in the hosting panel. The release archive is prepared for manual upload; it does not contain credentials or private content storage.

1. Create a full host backup of the current document root, database (if any), existing uploads, and historical CMS JSON. Verify the backup before changing files.
2. Rotate any password found in a historical archive. Remove public `admin.zip`/backup archives and invalidate old CMS sessions.
3. Confirm PHP 8.2+ with `json`, `session`, `fileinfo`, and image metadata support. Run `php admin/bin/check-environment.php` from the protected source checkout before packaging. `gd` is optional. Confirm Apache deny rules/headers or reproduce them in Nginx/LiteSpeed.
4. Extract the release into staging. Point `AMJAD_STORAGE_DIR` to a backed-up directory outside the document root. Questionnaire responses are written under `AMJAD_STORAGE_DIR/evaluations/responses`; include that directory in protected backups and approve a retention/deletion policy because automatic deletion is not enabled. Configure the other paths from `deployment/env.example`.
5. Create the first administrator from the protected source checkout with `php admin/bin/setup.php`, or configure environment username/password hash. Public release packages exclude all setup/import utilities. Never upload a local credential file.
6. Ensure the web-server user can write only private storage, `data/cms`, and `images/uploads`; application source should not be writable.
7. Run legacy import and frontend reconciliation in dry-run mode. Review conflicts, facts, dates, translations, links, and image rights before applying drafts.
8. Smoke-test staging with `POST_DEPLOYMENT_CHECKLIST.md`. Publish one reviewed test record, verify it publicly, then restore/archive it.
9. Switch traffic only after owner approval. Keep the prior document root and private-storage backup intact for rollback.

The PHP development server is never a production deployment option.
