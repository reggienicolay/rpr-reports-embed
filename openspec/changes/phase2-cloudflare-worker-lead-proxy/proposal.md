# Phase 2: Cloudflare Worker Lead Proxy

**Change:** phase2-cloudflare-worker-lead-proxy
**Classification:** Complex
**Phase:** Phase 2 of RPR Widget Improvement Plan
**Traces to:** PRD §11 Phase 2 (R1, R2, R3), ADR-002 (deferred proxy)

---

## Why

The widget currently sends lead data **directly from the visitor's browser** to the agent's webhook URL. This architectural decision (ADR-002) was appropriate for an MVP but creates five production-grade problems that worsen as agent count scales:

1. **Webhook URL exposure (PRD R1):** The full webhook URL is visible in page source. Anyone can extract it and spam fake leads or abuse the endpoint.
2. **CORS failures:** Many webhook services (Zapier, Make, custom endpoints) don't set proper CORS headers. The generator test button uses `mode: 'no-cors'` as a workaround, meaning test results can't be verified (FG-024 mismatch).
3. **No server-side retry (PRD R3):** Phase 1 added localStorage retry, but this only works if the same visitor returns on the same device. Server-side retry with dead-letter queue is needed for >99% delivery (PRD §4.2).
4. **No rate limiting (PRD R2):** No defense against bots or abuse beyond a client-side honeypot field.
5. **No observability:** RPR has zero visibility into lead volume, delivery success rates, or broken agent webhooks.

Every production competitor (Typeform, Jotform, HubSpot Forms, Splitforms) uses a server-side proxy for form submissions. This is the industry standard pattern.

**This is the first server-side component in the RPR architecture** — a deliberate, planned evolution from the zero-infrastructure MVP (supersedes ADR-002's deferral).

---

## What

Build a Cloudflare Worker that sits between the visitor's browser and the agent's webhook endpoint. The Worker:

- **Hides webhook URLs** — embed code contains a proxy token (`agt_xxx`), not the real URL
- **Normalizes CORS** — browser POSTs to Worker origin; Worker forwards server-side (no preflight)
- **Queues for reliable delivery** — Cloudflare Queue with at-least-once delivery, configurable retry, DLQ
- **Rate limits** — per-IP sliding window via Durable Object
- **Deduplicates** — KV-based idempotency prevents double-submits from retry
- **Optionally validates bots** — Turnstile invisible verification (opt-in per agent)
- **Signs payloads** — HMAC-SHA256 so agents can verify authenticity
- **Is backward compatible** — widget checks `data-proxy` first, falls back to `data-webhook`

---

## Capabilities

### New Capabilities

- `worker-ingest`: Cloudflare Worker fetch handler — receives JSON POST at `/{agentToken}`, validates payload, looks up agent config in D1, checks rate limit + dedup, enqueues to Queue, returns 202
- `worker-delivery`: Cloudflare Queue consumer — dequeues lead, forwards to agent webhook with HMAC signature, classifies retry vs permanent fail, DLQ for exhausted retries
- `agent-config-store`: D1 database storing agent token -> webhook URL mappings with rate limit config, HMAC secrets, Turnstile sitekeys
- `rate-limiter`: Durable Object implementing per-IP sliding window rate limiting with in-memory pre-check
- `idempotency`: KV-based dedup — SHA-256 of payload as key, 5-minute TTL
- `turnstile-verify`: Optional Turnstile siteverify call (only when agent has sitekey configured)
- `payload-signing`: HMAC-SHA256 signature in `X-RPR-Signature` header for webhook authenticity
- `widget-proxy-support`: New `data-proxy` attribute in widget — POST to proxy URL, handle 202/4xx/5xx responses, fallback to `data-webhook` + localStorage retry
- `generator-proxy-option`: New "RPR Proxy" delivery method in generator — agent token input, `data-proxy` code output, real CORS test feedback

### Modified Capabilities

- `webhook-submission` (FR): Widget submit handler now checks `data-proxy` before `data-webhook`; proxy responses include structured JSON (not just HTTP status)
- `generator-code-output` (FG-020): Code output emits `data-proxy` when proxy delivery is selected
- `generator-test-button` (FG-024): Test button uses standard CORS POST to proxy (not `no-cors`), gets real success/fail feedback

---

## Impact

- **New files:** `worker/` directory with ~12 TypeScript source files, `wrangler.toml`, `package.json`
- **Modified files:** `rpr-reports-embed.js` (submit handler + proxy attribute), `generator.js` + `index.html` (proxy delivery option)
- **New infrastructure:** Cloudflare Workers Paid ($5/mo), Queue, D1, KV, Durable Object
- **No breaking changes:** Existing `data-webhook` deploys continue working unchanged
- **Version:** Widget bumps from 1.2.0 -> 1.3.0 (new feature, backward compatible = MINOR)
- **New ADR required:** ADR-010 (or next available) for Worker proxy architecture decision
- **New FRD entries required:** FR-IDs for proxy delivery, rate limiting, dedup, agent config
