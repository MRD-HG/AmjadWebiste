# Amjad CMS — local setup

## Requirements

- PHP 8.2 or newer with `json`, `session`, `fileinfo`, and image metadata support.
- `gd` is optional; when present the media library creates thumbnails.
- Apache with `mod_rewrite`/`mod_headers`, or an equivalent server configuration that denies `admin/storage`, `admin/includes`, and `admin/bin`.
- HTTPS in production. Session cookies automatically use `Secure` on HTTPS.

## First administrator

No username, password, or fallback hash is committed. From the project root run:

```powershell
php admin/bin/check-environment.php
php admin/bin/setup.php
```

The environment check is read-only and never prints credentials.

For protected automation, provide `AMJAD_SETUP_USERNAME` and `AMJAD_SETUP_PASSWORD` as process environment variables. Do not put a password on the command line or in version control. `--force` intentionally rotates an existing file-based account.

Production can instead supply `AMJAD_ADMIN_USERNAME` and `AMJAD_ADMIN_PASSWORD_HASH`. Environment credentials take precedence and cannot be changed in the web UI.

Treat every credential from the historical archive as exposed: do not reuse its username/password pair, rotate any matching host or administrator password through the hosting provider, invalidate active sessions, and configure a new unique CMS password. Never copy the historical fallback hash into this project.

## Local server

For a quick local check:

```powershell
php -S 127.0.0.1:8080 tests/php-router.php
```

Open `http://127.0.0.1:8080/admin/`. The router denies private CMS paths. It is for development only.

## Storage

Private state defaults to `admin/storage`; published projections go to `data/cms`; validated images go to `images/uploads`. Production should set `AMJAD_STORAGE_DIR` to a non-public, backed-up path. The application uses locks, atomic replacement, collection revisions, and immutable snapshots.

## Legacy migration

The importer is dry-run-only unless `--apply` is supplied:

```powershell
php admin/bin/import-legacy.php C:\path\to\legacy\data
php admin/bin/import-legacy.php C:\path\to\legacy\data --apply
```

It validates JSON, preserves originals plus SHA-256 checksums under private import storage, does not overwrite stable IDs, and imports singleton pages as drafts for review. Images are not copied automatically; upload them through the media library and attach them after review.

## Frontend reconciliation and publishing

The public connector overlays published JSON onto stable DOM keys and IDs. Static HTML remains the complete fallback. Generate and review a report first:

```powershell
php admin/bin/reconcile-frontend.php --report=artifacts/reconciliation-dry-run.json
php admin/bin/reconcile-frontend.php --apply
```

Normal apply creates drafts only and never overwrites an existing ID. `--publish-verified` is reserved for an operator who has verified facts, dates, translations, links, and image rights. See `CMS_FRONTEND_MAPPING.md`.

## Backup and recovery

Back up private storage and `images/uploads` together. Every successful collection write creates a snapshot. Restore from **النسخ السابقة**; restoration itself creates a new revision, so history remains recoverable.
