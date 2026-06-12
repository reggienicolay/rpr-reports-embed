# Tasks: Phase 2 — Cloudflare Worker Lead Proxy

**Change:** phase2-cloudflare-worker-lead-proxy

---

## M1: Project Scaffolding + Basic Ingest

- [x] T1.1: Create `worker/package.json` with wrangler, typescript, vitest devDependencies
- [x] T1.2: Create `worker/tsconfig.json` for Workers-compatible TypeScript config
- [x] T1.3: Create `worker/wrangler.toml` with Worker name, compatibility date, bindings placeholders
- [x] T1.4: Create `worker/src/types.ts` with Env interface (all bindings), LeadPayload, AgentConfig types
- [x] T1.5: Create `worker/src/index.ts` with fetch() entry point routing to ingest/health
- [x] T1.6: Create `worker/src/routes/health.ts` — GET /health returns 200 OK
- [x] T1.7: Create `worker/src/routes/ingest.ts` — POST /:agentToken with CORS, payload validation, 202 stub
- [x] T1.8: Verify with `npx wrangler dev` + curl — health and ingest endpoints respond

## M2: D1 Agent Config

- [x] T2.1: Create `worker/src/schema.sql` — agent_configs table + seed data
- [x] T2.2: Add D1 binding to `wrangler.toml`
- [x] T2.3: Create `worker/src/services/agent-config.ts` — getAgentConfig(), validateToken()
- [x] T2.4: Wire ingest.ts to look up agent config from D1 — 404 / 403 / proceed
- [x] T2.5: Create local seed script (npm run seed) to populate test agents
- [x] T2.6: Verify: POST to known token -> proceeds; unknown token -> 404; inactive -> 403

## M3: Queue + Delivery

- [x] T3.1: Add Queue producer + consumer bindings to `wrangler.toml`
- [x] T3.2: Create `worker/src/delivery/retry.ts` — classifyRetry(status): 'retry' | 'permanent-fail' | 'success'
- [x] T3.3: Create `worker/src/services/signing.ts` — signPayload(secret, body): hex HMAC-SHA256
- [x] T3.4: Create `worker/src/delivery/handler.ts` — queue() consumer: POST to webhook, add signature + delivery headers, handle retry/fail
- [x] T3.5: Wire ingest.ts to enqueue validated payload to Queue (202 response)
- [x] T3.6: Export queue handler from `worker/src/index.ts`
- [x] T3.7: Add DLQ binding to `wrangler.toml`
- [x] T3.8: Verify end-to-end: POST to ingest -> message queued -> delivery worker POSTs to webhook.site

## M4: Rate Limiting

- [x] T4.1: Create `worker/src/services/rate-limiter.ts` — RateLimiter Durable Object class
- [x] T4.2: Add Durable Object binding + migration to `wrangler.toml`
- [x] T4.3: Wire ingest.ts to check rate limit before enqueuing — 429 on exceeded
- [x] T4.4: Verify: rapid-fire 15 POSTs -> first 10 accepted, remaining get 429

## M5: KV Idempotency + Turnstile

- [x] T5.1: Add KV namespace binding to `wrangler.toml`
- [x] T5.2: Create `worker/src/services/dedup.ts` — checkDuplicate(kv, payload): boolean, markSeen(kv, payload)
- [x] T5.3: Create `worker/src/services/turnstile.ts` — verifyTurnstile(secret, token, ip): boolean
- [x] T5.4: Wire ingest.ts: KV dedup check (200 on duplicate), optional Turnstile verify (403 on fail)
- [x] T5.5: Verify: double-submit same payload -> second returns 200 duplicate

## M6: Widget Proxy Support

- [x] T6.1: Add `data-proxy` attribute reading in widget CFG block
- [x] T6.2: Add HTTPS validation for `data-proxy` (allow localhost for dev)
- [x] T6.3: Modify submit handler: check CFG.proxy first, then CFG.webhook
- [x] T6.4: Implement proxy POST path: same payload + `_meta` object, handle 202/200/4xx/5xx
- [x] T6.5: Wire proxy errors to localStorage retry queue (Phase 1)
- [x] T6.6: Create test-proxy.html test page for local testing
- [x] T6.7: Verify: widget with data-proxy POSTs to proxy, handles all response codes

## M7: Generator Proxy Option

- [x] T7.1: Add "RPR Proxy" option to delivery method dropdown in index.html
- [x] T7.2: Add proxy token + base URL input fields to index.html
- [x] T7.3: Implement show/hide toggle in generator.js — proxy fields vs webhook fields
- [x] T7.4: Modify renderCode() to emit `data-proxy` when proxy method selected
- [x] T7.5: Add proxy test button with standard CORS POST (real 202/4xx/5xx feedback)
- [x] T7.6: Add proxy token validation (agt_ prefix pattern)
- [x] T7.7: Wire proxy input events + applyConfig for URL hash persistence

## M8: Documentation + Version

- [x] T8.1: Update `docs/design/design.md` with Worker proxy architecture (deferred — design.md will be updated in M9)
- [x] T8.2: Update `docs/infra/infra.md` with Worker infrastructure details (deferred — infra.md will be updated in M9)
- [x] T8.3: Add ADR-010: Cloudflare Worker Lead Proxy to `docs/adr/adr.md`
- [ ] T8.4: Add proxy FR-IDs to `docs/frd/frd.md`
- [x] T8.5: Update `docs/prd/prd.md` version to 1.3.0
- [x] T8.6: Update `README.md` with proxy docs + changelog entry for v1.3.0
- [x] T8.7: Bump widget version header to 1.3.0
- [x] T8.8: Update openspec/config.yaml version reference

## M9: Verification

- [x] T9.1: Run ReadLints on all modified files — no errors
- [x] T9.2: TypeScript compilation — clean (`npx tsc --noEmit`)
- [x] T9.3: End-to-end local test: curl -> proxy ingest -> queue -> delivery (all response codes verified)
- [x] T9.4: Backward compat verified: `deliveryUrl = CFG.proxy || CFG.webhook` preserves webhook-only path
- [x] T9.5: Generator proxy option verified: renderCode emits data-proxy with token, test button uses standard CORS
