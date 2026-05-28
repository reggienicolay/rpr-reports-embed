## 1. Critical Bug Fixes (Widget)

- [x] 1.1 Fix silent lead loss: treat `!res.ok` as `webhookError`, distinguish 4xx (non-retriable) vs 5xx (retriable) with separate user messages — `rpr-reports-embed.js` lines 836-860
- [x] 1.2 Fix duplicate webhook race: move `_rprSubmitted = true` and `btn.disabled = true` before `fetch`, only re-enable on failure paths — `rpr-reports-embed.js` lines 810-865
- [x] 1.3 Fix Back button dead-end: replace inline Back handler with `wrap._rprReset()` call — `rpr-reports-embed.js` lines 870-875

## 2. Form Lifecycle Fixes (Widget)

- [x] 2.1 Fix Escape key: guard with `overlay.classList.contains('open')` in both floating and modal — `rpr-reports-embed.js`
- [x] 2.2 Fix brand color default: change `#1a1a2e` to `#0086E6` in 3 locations (header, CFG default, fallback) — `rpr-reports-embed.js`

## 3. Security Hardening (Widget)

- [x] 3.1 Validate card colors: add `isValidHex()` checks for `CFG.cardBg` (fallback `#ffffff`) and `CFG.cardText` (fallback `#333333`) — `rpr-reports-embed.js`
- [x] 3.2 Add maxlength to form fields: first_name/last_name (100), email (254), phone (20) — `rpr-reports-embed.js`
- [x] 3.3 Add phone validation: permissive pattern `/^\+?[\d\s\-().]{7,20}$/` in `validateStep1()` — `rpr-reports-embed.js`

## 4. localStorage Retry Queue (Widget)

- [x] 4.1 Implement `enqueueRetry(payload, url)` function: stores entry in `rpr_retry_queue` localStorage key, caps at 10 items — new section `§6b` in `rpr-reports-embed.js`
- [x] 4.2 Implement `processRetryQueue()` function: runs on init, retries pending entries with exponential backoff (1s/5s/30s), discards after 3 attempts or 24h — `rpr-reports-embed.js`
- [x] 4.3 Wire retry into submit handler: call `enqueueRetry()` on 5xx/network error in the webhook error path — `rpr-reports-embed.js`
- [x] 4.4 Wire queue processing into init: call `processRetryQueue()` at widget startup — `rpr-reports-embed.js` `init()` function

## 5. Generator Fixes

- [x] 5.1 Unify HTML escaping: add `'` → `&#x27;` to `escHtml()` and `av()` — `generator.js`
- [x] 5.2 Block copy on empty reports: disable `#copyBtn` and show warning when `getReports()` returns empty; re-enable dynamically on input change — `generator.js` + `index.html`

## 6. Documentation & Version

- [x] 6.1 Bump version to 1.2.0 in all 6 locations: widget header, generator header, README, docs/prd/prd.md, .cursor/rules/rpr-reports-embed-project.mdc, .claude/rules/rpr-reports-embed-project.md
- [ ] 6.2 Update FRD entries for modified requirements (FR-2.3 webhook handling, FR-2.5 error recovery, FR-2.1 form validation, FR-1.1 appearance)
- [x] 6.3 Add changelog entries to widget file header and README for all fixes
- [x] 6.4 Document brand color default change as minor visual change in changelog

## 7. Verification

- [x] 7.1 Run ReadLints on all edited files — PASSED (zero errors)
- [ ] 7.2 Verify all 3 display modes render correctly (inline, floating, modal)
- [ ] 7.3 Verify submit flow: 2xx success, 4xx error, 5xx error, network error
- [ ] 7.4 Verify Back button allows resubmission
- [ ] 7.5 Verify Escape only fires when overlay is open
- [ ] 7.6 Verify localStorage retry queue: enqueue on failure, process on next load, discard after 3 attempts
- [ ] 7.7 Verify generator Copy button disabled with no reports, enabled with valid reports
