# Amjad institutional evaluation

The public route is `evaluation.html`. It preserves the canonical 40 optional questions from the 2021–2026 questionnaire and presents the ten institutional axes as ten neutral missions. The focused journey, mission dashboard, progress and milestones never score or react to whether an answer is favourable.

## Game layer

- **Lobby:** the welcome card uses the homepage hero style (pattern background, glass card) beside a game board: ten station nodes on a winding road, with the «أصيل» mascot as the player token on the next station.
- **Focused mode:** a HUD replaces the navbar (current station, road progress with Asil runner, stamp counter, review, pause). The passport sidebar (drawer below 1024px) holds the ten station stamps, progress and the auto-advance switch.
- **Answering:** one question card at a time, big option tiles with number keys, scale questions as five stepping stones. Keyboard: `1`–`9` select, `Enter` continues. Single-choice and scale answers auto-advance after 0.9 s (switchable, saved with the draft).
- **Rewards stay neutral:** finishing a station — answered or skipped — stamps the passport with a non-blocking burst and light confetti. Full celebration screens appear only at the gate, halfway (station 5) and the end. Nothing reacts to *which* answer is chosen.
- **Assets:** Cairo and Font Awesome are self-hosted under `vendor/` (licences included) so the page keeps its same-origin CSP; Asil crops are `images/asil-avatar.webp` and `images/asil-guide.webp`. Confetti and idle animations are disabled under `prefers-reduced-motion`.

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

Set `CHROME_PATH` / `PLAYWRIGHT_CORE_PATH` if needed. `AMJAD_SKIP_SITEWIDE=1` runs only the evaluation checks (the sitewide navbar checks need the Tailwind CDN). The browser suite can start its own isolated PHP server when `AMJAD_BASE_URL` is omitted. It checks the focused journey, game mechanics (board token, auto-advance and its switch, keyboard shortcuts, non-blocking stamps), mobile mission drawer, all 40 questions, clear-answer control, actionable review and restoration, rejection/submission flow, checkbox limits, draft recovery, third-party request absence, reduced motion, 390/768/1024/1440 layouts, and site-wide navbar integration.
