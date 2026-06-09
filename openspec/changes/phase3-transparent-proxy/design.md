# Design: Phase 3 — Transparent Proxy

**Change:** phase3-transparent-proxy
**Status:** Implemented

---

## Approach 1: Generator-Side Registration (Recommended — Implemented)

**Description:** The generator becomes a "smart" client that talks to a new admin API on the Worker. When the agent enters a webhook URL, the generator registers it with the Worker and receives a proxy token. The generator always emits `data-proxy` in the embed code. The admin API key is stored in the admin's browser localStorage — never in source code or embed output.

**Flow:**

```
Agent opens generator
  → Picks delivery method (Slack, ntfy, Sheets, etc.)
  → Enters webhook URL
  → Clicks "Register with Proxy"
  → Generator POSTs to Worker /api/config
  → Worker generates agt_XXXXX token, stores webhook in D1
  → Generator shows embed code with data-proxy="…/agt_XXXXX"
  → Agent copies embed — webhook URL never exposed
```

**Pros:**
- Zero UX friction for agents — they pick a destination exactly as before
- Webhook URLs never appear in embed code
- Every new embed automatically gets retry, dedup, rate limiting, HMAC signing
- Admin key in localStorage means it's per-browser, not in git or URL hashes
- Import feature lets existing agents upgrade with one paste

**Cons:**
- Requires admin API key to be entered once in browser (one-time setup)
- Generator can't register offline (falls back to `data-webhook`)
- Admin key in localStorage could be lost if browser data is cleared

**Complexity:** Low-Medium
**New files:** 1 (`worker/src/routes/admin.ts`)
**Modified files:** 7

---

## Approach 2: Auto-Registration on First Widget Load

**Description:** Instead of the generator registering configs, the widget itself would call a registration endpoint on first load, passing the webhook URL. The Worker would create a config and return a token, which the widget would cache in localStorage.

**Pros:**
- No generator changes needed
- Works even for manually-crafted embed code

**Cons:**
- Webhook URL must be in the embed code for the first load (defeats the purpose)
- Widget becomes stateful (needs to persist token across page loads)
- Race condition: multiple visitors could trigger registration simultaneously
- No admin authentication — anyone could register arbitrary webhook URLs
- Fundamentally contradicts the goal of hiding webhook URLs

**Complexity:** Medium
**Not recommended** — doesn't solve the core problem of webhook exposure.

---

## Recommendation

**Approach 1 (Generator-Side Registration)** because:

1. Webhook URLs are hidden from day one — never in the embed code
2. Registration happens once at config time, not at runtime
3. Admin authentication prevents unauthorized config creation
4. Clean separation: generator manages configs, widget delivers leads
5. Backward compatible — `data-webhook` still works for old embeds

---

## Key Design Decisions

### D1: Admin API Authentication

- **Mechanism:** Wrangler Secret (`ADMIN_API_KEY`) set via `wrangler secret put`
- **Transport:** `Authorization: Bearer <key>` header on all `/api/config*` requests
- **Storage in generator:** `localStorage` only — never in URL hash, never in embed code
- **Why not D1-stored tokens:** Wrangler Secrets are encrypted at rest by Cloudflare, not accessible via D1 dumps, and easily rotated via CLI

### D2: Admin API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/config` | Create new agent config, returns generated token |
| `GET` | `/api/config/:token` | Read existing config (for generator status checks) |
| `PUT` | `/api/config/:token` | Update config fields (webhook URL, agent name, etc.) |
| `DELETE` | `/api/config/:token` | Soft-deactivate (sets `active = 0`, doesn't delete) |

All endpoints require Bearer token authentication. All return JSON with CORS headers.

### D3: Token Generation

- Format: `agt_` + 16 random characters from `[A-Za-z0-9]` (62^16 ≈ 4.7 × 10^28 possibilities)
- Generated server-side using `crypto.getRandomValues()`
- Pattern matches existing `isValidToken()` regex: `/^agt_[a-zA-Z0-9]{12,24}$/`

### D4: Generator Proxy Transparency

- "RPR Proxy" removed from delivery method dropdown — agents never see the word "proxy"
- Admin API Key and Proxy Base URL moved to Settings pane (admin-only concern)
- "Register with Proxy" button appears next to webhook URL when admin key is configured
- Green "Registered" badge with token shown after successful registration
- Test button auto-routes through proxy when token exists, direct when it doesn't

### D5: Embed Code Output Strategy

- **Token exists:** Always emit `data-proxy` (proxy token hides the webhook URL)
- **No token, has webhook:** Fall back to `data-webhook` (offline/legacy mode)
- **Neither:** No delivery attribute (generator shows warning)

### D6: Import Existing Embed

- Uses DOM parsing (`document.createElement('div').innerHTML = pasted`) to extract `<script>` attributes
- Auto-detects delivery method from webhook URL pattern (Slack, Discord, ntfy, etc.)
- If admin API key is configured, auto-registers the extracted webhook URL
- Populates all generator fields from extracted `data-*` attributes

### D7: CORS for Admin Endpoints

- Admin endpoints need `Authorization` in `Access-Control-Allow-Headers`
- OPTIONS preflight distinguishes `/api/*` paths (adds Authorization) from ingest paths (Content-Type only)
- `Access-Control-Allow-Methods` expanded to `GET, POST, PUT, DELETE, OPTIONS`
