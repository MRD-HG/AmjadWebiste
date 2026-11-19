# Amjad institutional evaluation

The public route is `evaluation.html`. It preserves the canonical 40 optional questions from the 2021–2026 questionnaire and presents the ten institutional axes as ten neutral missions. The focused journey, mission dashboard, progress and milestones never score or react to whether an answer is favourable.

## Response flow

- Draft answers use a versioned `sessionStorage` record for the current tab session. Browser session restore may preserve it, so the UI provides an explicit clear action and never promises that closing a tab always deletes it.
- Each new response receives a random UUIDv4 `response_id`. Retries reuse it: an identical retry returns the original receipt, while the same identifier with changed answers is rejected. This prevents duplicate records after an ambiguous timeout.
- The public page obtains a session CSRF token from `GET /api/evaluation.php`.
- Explicit consent is required before `POST /api/evaluation.php`.
- Records are written atomically to `AMJAD_STORAGE_DIR/evaluations/responses` and are never published under `data/cms`.
- Stored response fields are limited to schema/survey versions, the random response identifier, submission ID/time, answered count, an integrity hash, Q1–Q40 answers, and selected “other” details. The record does not include an IP address, user agent, browser session ID, name, phone, or email field.
- Obvious email addresses and phone-like digit sequences in free text are rejected. Participants are still instructed not to name people because names cannot be detected reliably.
- Hosting access logs are separate from response records and may contain technical metadata.
- No automatic deletion period is configured. The association must approve and operate a retention/deletion policy for the private response directory.
- The evaluation page loads no third-party scripts, fonts, stylesheets, or analytics. Its CSP limits scripts and API calls to the same origin.

## Administration

Authenticated administrators can review receipt statistics and export private JSON or CSV from `admin/evaluations.php`. Exports contain open-text answers and must be handled only by the authorised evaluation team.

## Verification

```powershell
php tests/evaluation-backend.php
node tests/evaluation-browser-qa.cjs
```

The browser suite can start its own isolated PHP server when `AMJAD_BASE_URL` is omitted. It checks the focused journey, mobile mission drawer, all 40 questions, clear-answer control, actionable review and restoration, rejection/submission flow, checkbox limits, draft recovery, third-party request absence, reduced motion, 390/768/1024/1440 layouts, and site-wide navbar integration.
