# Phase 3: Transparent Proxy

**Change:** phase3-transparent-proxy
**Classification:** Complex
**Phase:** Phase 3 of RPR Widget Improvement Plan
**Traces to:** PRD §11 Phase 3, ADR-010 (Worker proxy architecture)

---

## Why

Phase 2 shipped the Cloudflare Worker proxy as an **opt-in feature**: agents explicitly select "RPR Proxy" in the generator, receive a token, and paste it into their config. This was intentional — it let us validate the infrastructure (D1, Queues, rate limiting, dedup, HMAC signing, retry + DLQ) in isolation.

Now that the Worker is deployed and verified, three problems remain:

1. **Proxy adoption is zero without manual intervention.** No agent will voluntarily switch to the proxy when their existing webhook "works" (ignoring silent CORS failures and lack of retry). The proxy must be automatic.
2. **Webhook URLs are still exposed.** Any agent using direct `data-webhook` has their Slack/Discord/Pushover credentials visible in page source. The proxy hides these, but only if the agent opts in — which they won't.
3. **Generator workflow has unnecessary complexity.** The "RPR Proxy" dropdown option requires the agent to understand what a proxy is, obtain a token manually, and paste it. This is friction that shouldn't exist.

Every competitor (Typeform, Jotform, Splitforms) routes through their own backend transparently. The agent picks "Slack" and the platform handles the plumbing. RPR should do the same.

---

## What

Make the proxy invisible infrastructure. The agent picks their destination (Slack, Sheets, ntfy, etc.) as they always have. Behind the scenes:

- The **generator** calls the Worker's new admin API to register the agent's webhook URL in D1
- The generator outputs `data-proxy` in the embed code — the webhook URL never appears
- The **widget** already supports `data-proxy` (Phase 2) — no delivery logic changes needed
- Existing `data-webhook` embeds continue working unchanged (backward compatible)

Additionally: an **Import Existing Embed** feature lets agents with old `data-webhook` embeds paste their script tag and get an updated `data-proxy` version.

---

## Capabilities

### New Capabilities

- `admin-config-api`: Authenticated CRUD endpoints on the Worker (`POST/GET/PUT/DELETE /api/config`) for managing agent configurations programmatically. Secured with Wrangler Secret (`ADMIN_API_KEY`) via Bearer token.
- `generator-auto-register`: Generator calls the admin API to create/update agent configs when a webhook URL is entered. Token is stored in URL hash for persistence. Admin API key stored in localStorage (never in embed code).
- `import-existing-embed`: Parse a pasted `<script>` tag, extract all `data-*` attributes, auto-detect delivery method from URL pattern, register webhook via admin API, output updated embed with `data-proxy`.

### Modified Capabilities

- `generator-code-output` (FG-020): Always emits `data-proxy` when a proxy token exists. Falls back to `data-webhook` only when offline or admin key not configured.
- `generator-proxy-option` (Phase 2): Removed as a separate dropdown option. Proxy is now transparent — the "RPR Proxy" menu item is gone.
- `widget-proxy-support` (Phase 2): Version bump to 1.5.0. No behavioral changes — `CFG.proxy || CFG.webhook` already handles both paths.

### Unchanged Capabilities

- `worker-ingest`, `worker-delivery`, `rate-limiter`, `idempotency`, `payload-signing`: No changes to the ingest/delivery pipeline.
- `webhook-submission` (direct `data-webhook` path): Fully preserved as legacy fallback.
- All per-destination formatters (ntfy, Slack, Discord, SimplePush, Pushover): Unchanged.

---

## Impact

- **New files:** `worker/src/routes/admin.ts` (admin API handlers)
- **Modified files:** `worker/src/index.ts` (routing), `worker/src/types.ts` (Env), `worker/src/routes/ingest.ts` (CORS), `worker/wrangler.toml` (production IDs), `generator.js` (auto-register, import, remove proxy dropdown), `index.html` (Settings pane, UI changes), `rpr-reports-embed.js` (version bump)
- **New infrastructure:** Wrangler Secret `ADMIN_API_KEY` (set via CLI)
- **No breaking changes:** Existing `data-webhook` embeds continue working. Existing `data-proxy` embeds continue working.
- **Version:** Widget bumps from 1.4.0 -> 1.5.0 (new feature, backward compatible = MINOR)
- **Turnstile deferred:** Requires Cloudflare dashboard key creation; will be its own pass.
