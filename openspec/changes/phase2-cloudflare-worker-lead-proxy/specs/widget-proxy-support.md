# Spec: widget-proxy-support

**Capability:** Widget `data-proxy` attribute and proxy POST logic
**Type:** Modified (webhook-submission)

---

## Requirements

1. Widget reads `data-proxy` attribute from script tag (new)
2. Priority order: `data-proxy` > `data-webhook` — if both present, proxy wins
3. `data-proxy` must be an HTTPS URL (same validation as `data-webhook`), except allow `http://localhost` for local dev
4. When using proxy: POST same JSON payload as today (FRD §2.7 schema preserved)
5. Add `_meta` object to payload: `{ widget_version, source_url, timestamp }`
6. On proxy 202 response: treat as success (lead is queued, delivery guaranteed)
7. On proxy 200 with `"status": "duplicate"`: treat as success (already submitted)
8. On proxy 4xx: show error message from response JSON `error` field
9. On proxy 5xx or network error: enqueue to localStorage retry queue (Phase 1), show "try again" message
10. Existing `data-webhook` behavior is completely unchanged
11. If neither `data-proxy` nor `data-webhook` is set: widget works in display-only mode (no form submission)

## Testable Scenarios

- Widget with `data-proxy` only -> POSTs to proxy URL
- Widget with `data-webhook` only -> POSTs to webhook URL (existing behavior)
- Widget with both `data-proxy` and `data-webhook` -> POSTs to proxy URL
- Proxy returns 202 -> success UI shown
- Proxy returns 200 duplicate -> success UI shown
- Proxy returns 400 -> error message from response body
- Proxy returns 500 -> localStorage retry + "try again" message
- Proxy network error -> localStorage retry + "try again" message
- `data-proxy="http://example.com"` -> blocked (not HTTPS)
- `data-proxy="http://localhost:8787/agt_test"` -> allowed (local dev)
