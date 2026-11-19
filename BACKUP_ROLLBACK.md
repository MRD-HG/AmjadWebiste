# Backup and rollback

Back up deployed source, external `AMJAD_STORAGE_DIR`, `images/uploads`, and `data/cms` as one consistency set. Record the release ZIP SHA-256 and timestamp, keep an off-host copy, and test extraction. CMS revision snapshots help recover content mistakes but do not replace filesystem backups.

For a content rollback, use **النسخ السابقة**, verify the preview, then restore. Restoration creates a new revision and regenerates the public projection. Confirm all three languages.

For a release rollback:

1. Enable host maintenance/staging mode if available.
2. Restore the previous document-root snapshot without replacing external private storage.
3. If content changed, restore the matching private-storage and upload snapshots as a pair.
4. Verify private paths return 403/404, admin login works, and public fallback/content pages load.
5. Record the reason, restored release hash, operator, and verification result.

