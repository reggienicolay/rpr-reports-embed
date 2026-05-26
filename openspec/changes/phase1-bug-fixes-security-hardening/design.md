## Context

The RPR Reports Embed Widget (v1.1.0) is a zero-dependency client-side lead capture widget deployed on thousands of real estate agent websites. The codebase review uncovered critical bugs — most urgently, silent lead loss when webhooks fail with HTTP errors. Phase 1 fixes these issues without any infrastructure changes, modifying only `rpr-reports-embed.js` and `generator.js`.

Current state:
- Widget IIFE: ~1119 lines, §0–§9 sections
- Submit handler (lines 810–876): `btn.disabled` → fetch → `finally` re-enable → check error → set `_rprSubmitted` → show step 2
- Escape handler: unconditional `closeOverlay()` on every keydown, even when overlay is closed
- Card colors: passed to CSS `setProperty()` without validation
- Brand color default: `#1a1a2e` (widget) vs `#0086E6` (generator)
- Generator escaping: 3 different helpers with inconsistent entity coverage

## Goals / Non-Goals

**Goals:**
- Eliminate silent lead loss (items 1.1, 1.9)
- Close the double-submit race window (item 1.2)
- Fix all form lifecycle dead-ends (items 1.3, 1.4)
- Harden input validation and CSS injection surface (items 1.5, 1.6, 1.7, 1.8)
- Prevent agents from deploying broken embed codes (item 1.10)
- Maintain full backwards compatibility for existing deployments
- Keep zero-dependency, single-file architecture

**Non-Goals:**
- Server-side retry (Phase 2 — Worker proxy)
- Bot protection (Phase 2 — Turnstile)
- Accessibility improvements (Phase 4)
- CI/CD pipeline (Phase 3)
- Any changes to `index.html` structure or `Code.gs`

## Decisions

### D1: Submit handler rewrite strategy

**Choice:** Restructure the submit flow to lock-first, fetch, then branch on outcome.

**Rationale:** The current flow has the race window between `finally { btn.disabled = false }` and `_rprSubmitted = true`. Moving the lock before fetch eliminates it entirely.

**New flow:**
```
click → guard (_rprSubmitted) → validate → lock (btn.disabled + _rprSubmitted) → fetch
  ├─ network error (catch) → unlock, enqueue retry, show error
  ├─ HTTP 4xx → unlock, show "webhook configuration error"
  ├─ HTTP 5xx → unlock, enqueue retry, show "try again"
  └─ 2xx success → keep locked, show step 2
```

**Alternative considered:** Keep `finally` pattern, just move `_rprSubmitted` earlier. Rejected because it still re-enables the button on success before step 2 renders, creating a visual flash.

### D2: Error classification (4xx vs 5xx)

**Choice:** Distinguish retriable (5xx, network error) from non-retriable (4xx) failures.

**Rationale:** 4xx means the webhook URL or payload is misconfigured — retrying won't help. 5xx means the server is temporarily unhealthy — retry has a good chance. Different user messages prevent confusion.

- 4xx: "Lead could not be delivered — please contact the site owner." (don't show retry, it won't work)
- 5xx / network: "Something went wrong — please try again." (retriable)

### D3: localStorage retry queue architecture

**Choice:** Single localStorage key (`rpr_retry_queue`) storing a JSON array of retry entries. Processed silently on each widget init.

**Design:**
- Entry: `{ url, payload, timestamp, attempts, lastAttempt }`
- Max queue: 10 items (discard oldest on overflow)
- Max attempts: 3 per entry
- Backoff: 1s, 5s, 30s (exponential)
- Cleanup: discard entries older than 24 hours regardless of attempt count
- Cross-widget: all widget instances on the same origin share the queue (localStorage is per-origin)
- Error isolation: all localStorage operations wrapped in try/catch (private browsing, quota exceeded)

**Alternative considered:** Per-widget queues keyed by form ID. Rejected — adds complexity, and cross-widget retry is actually desirable (if one widget instance fails, another can retry).

### D4: Back button behavior

**Choice:** Back button calls `wrap._rprReset()` (full reset including `_rprSubmitted`, field clearing, error clearing).

**Alternative considered:** Only reset `_rprSubmitted` without clearing fields. Rejected — partially filled form after submission is confusing. Full reset is consistent with overlay-close behavior.

### D5: Brand color default change

**Choice:** Change widget default from `#1a1a2e` to `#0086E6`.

**Impact:** Existing embeds that omit `data-color-brand` will change from dark navy to RPR blue. This affects button color, focus ring, and hover states. The generator already uses `#0086E6`, so new embeds are unaffected.

**Mitigation:** Document in the changelog as a minor visual change. Agents who want the old color can add `data-color-brand="#1a1a2e"` explicitly.

### D6: Generator Copy button guard

**Choice:** Disable `#copyBtn` and show inline warning when `getReports()` returns empty array. Re-enable dynamically on input change.

**Rationale:** Currently the generator emits `data-reports='[]'` which causes the widget to abort silently at runtime. Better to catch this at generation time.

## Risks / Trade-offs

- **[localStorage not available]** → All localStorage operations are try/catch wrapped. If unavailable (private browsing, quota), the retry queue silently degrades to current behavior (no retry).
- **[Brand color visual change]** → Some existing embeds will change color. Low risk because most agents set a brand color explicitly via the generator. Documented in changelog.
- **[Back button full reset]** → Users who click Back lose their form data. This matches overlay-close behavior and is the expected UX pattern for form wizards. If agents request "preserve fields on back", it can be added as a future option.
- **[Cross-origin localStorage]** → The retry queue only works same-origin. If an agent embeds the widget on multiple subdomains, retries won't cross domains. Acceptable — Phase 2 proxy solves this with server-side retry.

## Migration Plan

1. All changes are backwards compatible — no embed code updates required by agents
2. Version bump: 1.1.0 → 1.2.0 (MINOR)
3. Update all 6 version locations (widget header, generator header, README, PRD, Cursor rule, Claude rule)
4. Update FRD entries for modified requirements
5. Deploy: upload to R2 CDN, test on staging first
6. Rollback: revert to 1.1.0 on R2 if issues found

## Open Questions

None — all design decisions are straightforward bug fixes with clear correct behavior.
