# CMS security and recovery audit

## Recovered source

The current Git checkout was preserved as the frontend authority. A historical `admin.zip` was inspected and extracted only to a temporary audit directory. Its connector was not executed. No matching `amjadweb(8).zip` was found, so the importer remains the controlled path for historical JSON.

## Legacy findings addressed

- Removed embedded fallback credentials; setup is explicit and secrets are excluded from Git.
- Added strict, cookie-only sessions, regeneration, idle/absolute expiry, user-agent binding, and POST-only logout.
- Added CSRF enforcement to every state-changing web action.
- Added per-user/IP login throttling and generic authentication errors.
- Added output escaping, plain-text content fields, URL validation, security headers, and a restrictive CSP.
- Added MIME plus image-decoder validation, randomized upload names, size/pixel limits, and executable-file denial.
- Replaced destructive deletes with archival and reference checks.
- Replaced direct HTML rewriting with versioned JSON storage, locks, atomic writes, conflict detection, snapshots, and restore.
- Separated private records from allowlisted published projections.

## Deployment gates

Before production: serve only through HTTPS; place private storage outside the web root; reproduce all deny rules in the real web server; restrict filesystem ownership; configure backups and restore drills; set upload/body limits at the server layer; and review CSP/error logging with the hosting provider. The built-in PHP server is not a production server.

Known Milestone 1 boundary: the public frontend is not yet connected to CMS projections, and legacy image paths require manual review/upload.
