# Tasks: Phase 3 — Transparent Proxy

**Change:** phase3-transparent-proxy
**Status:** All tasks complete

---

## Task List

### 3.1 — Worker Admin Config API
- **Spec:** `specs/admin-config-api.md`
- **Status:** Done
- **Files:**
  - `worker/src/routes/admin.ts` — new file (handlers for CRUD + auth + token generation)
  - `worker/src/index.ts` — updated routing (added `/api/config*` path dispatch)
  - `worker/src/types.ts` — added `ADMIN_API_KEY` to `Env` interface
  - `worker/wrangler.toml` — restored production IDs, fixed `new_sqlite_classes`
- **Notes:** ADMIN_API_KEY set via `wrangler secret put`. Token format: `agt_` + 16 alphanumeric chars.

### 3.2a — Generator Proxy Configuration
- **Spec:** `specs/generator-auto-register.md`
- **Status:** Done
- **Files:**
  - `generator.js` — hardcoded `PROXY_BASE_URL` constant (no admin UI fields needed)
- **Notes:** Admin API Key and Server URL fields were removed from the UI. Worker URL is a JS constant. Admin operations (PUT/DELETE) are done via curl.

### 3.2b — Generator Auto-Register
- **Spec:** `specs/generator-auto-register.md` (requirements 4-10)
- **Status:** Done
- **Files:**
  - `generator.js` — added `registerConfig()`, "Register with Proxy" button logic, status badge, proxy-aware test routing

### 3.2c — Generator Transparent Proxy Output
- **Spec:** `specs/generator-transparent-proxy.md`
- **Status:** Done
- **Files:**
  - `index.html` — removed "RPR Proxy" from delivery dropdown, replaced `#proxyTokenGroup` with `#proxyStatus`
  - `generator.js` — updated `vals()`, `renderCode()`, `handleDeliveryChange()`, `updateWebhookWarning()`, removed `proxyBaseUrl` from `FIELD_KEYS`

### 3.3 — Widget Version Bump
- **Spec:** `specs/widget-version-bump.md`
- **Status:** Done
- **Files:**
  - `rpr-reports-embed.js` — header v1.5.0, changelog entry, `_meta.widget_version = '1.5.0'`

### 3.4 — Worker Deployment
- **Spec:** (infrastructure task — no capability spec)
- **Status:** Done
- **Steps:**
  - Restored production D1/KV/account IDs in `wrangler.toml`
  - Fixed `new_classes` -> `new_sqlite_classes` for Durable Object migration
  - Deployed via `wrangler deploy`
  - Set `ADMIN_API_KEY` secret via `wrangler secret put`

### 3.5 — Import Existing Embed
- **Spec:** `specs/import-existing-embed.md`
- **Status:** Done
- **Files:**
  - `index.html` — added "Import Embed" button in header
  - `generator.js` — added `importEmbed()` function with DOM parsing, auto-detection, and auto-registration

### 3.6 — Worker Server-Side Formatters
- **Spec:** `specs/worker-formatters.md`
- **Status:** Done
- **Files:**
  - `worker/src/delivery/formatters.ts` — new file (Slack, Discord, ntfy, SimplePush, Pushover formatters + URL detection + default passthrough)
  - `worker/src/delivery/handler.ts` — replaced raw JSON body with `formatForDestination()` call
- **Notes:** Formatter logic ported from widget client-side formatters (rpr-reports-embed.js lines 901-1049). Pure functions, no I/O. Unknown URLs still get raw JSON passthrough with `_proxy` metadata.
