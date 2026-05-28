## Why

The widget has 7 high-severity and 10 medium-severity issues discovered during codebase review (see `docs/RPR_Widget_Improvement_Plan.md`). The most critical: **silent lead loss on HTTP errors** — the widget shows "success" to visitors when the webhook actually fails, losing leads permanently with no indication to the agent. Before scaling to thousands of agent deployments, these bugs and security gaps must be resolved. All 10 items are zero-infrastructure fixes in existing files — no new services, no cost, high impact on correctness.

This is **Phase 1** of the approved 4-phase improvement plan. Phases 2–4 depend on this foundation.

## What Changes

- **Fix silent lead loss** (1.1): Treat non-OK HTTP responses as submission failure — block step 2 transition, show retry message (FR-2.3, FR-2.5)
- **Fix duplicate webhook race condition** (1.2): Move `_rprSubmitted` lock before the `fetch` call to close the double-click window (FR-2.3)
- **Fix Back button dead-end** (1.3): Reset `_rprSubmitted` when returning to step 1 so the form is resubmittable (FR-2.1)
- **Fix Escape key resetting closed overlay** (1.4): Guard Escape handler with overlay-open check (FR-2.2)
- **Validate card colors** (1.5): Apply `isValidHex()` to `data-card-bg` and `data-card-text` before CSS injection (FR-1.1)
- **Fix brand color mismatch** (1.6): Change widget default from `#1a1a2e` to `#0086E6` to match generator — **minor visual change** for existing embeds without explicit `data-color-brand` (FR-1.1)
- **Unify HTML escaping** (1.7): Standardize generator's `escHtml()` and `av()` to escape all 5 entities like the widget (FR-3.1)
- **Add phone validation + maxlength** (1.8): Permissive phone pattern, maxlength on all inputs to cap webhook payload size (FR-2.1)
- **Add localStorage retry queue** (1.9): Queue failed submissions for background retry on next widget load — interim until Phase 2 proxy (FR-2.5)
- **Generator: block copy on empty reports** (1.10): Disable Copy button and show warning when no complete report rows exist (FR-3.1)

## Capabilities

### New Capabilities
- `localstorage-retry`: Client-side retry queue for failed webhook submissions — stores payload in localStorage, retries with exponential backoff on next widget load, caps at 10 items / 3 attempts
- `input-validation`: Phone number validation (permissive international pattern) and maxlength constraints on all form fields

### Modified Capabilities
- `webhook-submission`: Currently treats only network errors as failures; will now also treat HTTP 4xx/5xx as failure, distinguish retriable (5xx) from non-retriable (4xx), and lock submission before fetch to prevent race conditions
- `form-lifecycle`: Back button will reset submission state; Escape key will only fire when overlay is open
- `embed-appearance`: Card color validation added; brand color default aligned with generator
- `generator-code-output`: escHtml/av unified to 5-entity escaping; Copy button blocked when reports array is empty

## Impact

**Files modified:**
- `rpr-reports-embed.js` — items 1.1–1.6, 1.8, 1.9 (submit handler, validation, config parsing, new retry section)
- `generator.js` — items 1.7, 1.10 (escape functions, renderCode, copyCode)

**Backwards compatibility:**
- Item 1.6 changes the visual default for agents who haven't set `data-color-brand` (dark navy -> RPR blue). This is intentional alignment with the generator but should be documented in the changelog.
- All other changes preserve existing behavior for agents who don't update their embed code.

**No changes to:** `index.html` (generator HTML), `Code.gs` (Apps Script), deployment infrastructure, webhook payload schema.

**Version:** Bump to 1.2.0 (MINOR — new localStorage retry capability + input validation).
