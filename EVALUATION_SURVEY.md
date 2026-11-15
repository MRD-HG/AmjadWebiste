# Amjad institutional evaluation

The public route is `evaluation.html`. It preserves the canonical 40 optional questions from the 2021–2026 questionnaire and presents the ten institutional axes as ten neutral missions. Progress and the visual map react only to completing a section, never to whether an answer is favourable.

## Response flow

- Draft answers use `sessionStorage` and stay in the current browser tab until submission, clearing, or tab closure.
- The public page obtains a session CSRF token from `GET /api/evaluation.php`.
- Explicit consent is required before `POST /api/evaluation.php`.
- Records are written atomically to `AMJAD_STORAGE_DIR/evaluations/responses` and are never published under `data/cms`.
- Stored response fields are limited to the submission ID/time, survey version, answered count, Q1–Q40 answers, and selected “other” details. The record does not include an IP address, user agent, session ID, name, phone, or email field.
- Obvious email addresses and phone-like digit sequences in free text are rejected. Participants are still instructed not to name people because names cannot be detected reliably.
- Hosting access logs are separate from response records and may contain technical metadata.
- No automatic deletion period is configured. The association must approve and operate a retention/deletion policy for the private response directory.

## Administration

Authenticated administrators can review receipt statistics and export private JSON or CSV from `admin/evaluations.php`. Exports contain open-text answers and must be handled only by the authorised evaluation team.

## Verification

```powershell
php tests/evaluation-backend.php
node tests/evaluation-browser-qa.cjs
```

The browser suite expects a local PHP server at `AMJAD_BASE_URL` (default `http://127.0.0.1:4173`) and checks the full answer/review/rejection/submission flow, the checkbox limits, draft recovery, reduced motion, 390/768/1024/1440 layouts, and site-wide navbar integration.
