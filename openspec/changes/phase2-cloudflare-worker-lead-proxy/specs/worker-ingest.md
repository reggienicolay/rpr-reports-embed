# Spec: worker-ingest

**Capability:** Cloudflare Worker ingest handler
**Type:** New

---

## Requirements

1. Worker exposes `POST /:agentToken` endpoint that accepts JSON lead payloads
2. Worker exposes `GET /health` endpoint returning `200 OK` with `{ "status": "ok" }`
3. Worker handles `OPTIONS` preflight requests with permissive CORS headers
4. All responses include CORS headers: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`
5. Ingest validates `Content-Type: application/json` — returns 415 if missing
6. Ingest validates payload has required fields (`email` or `phone` at minimum) — returns 400 with error detail
7. Ingest looks up `agentToken` in D1 `agent_configs` — returns 404 if not found, 403 if `active = 0`
8. Ingest checks KV idempotency — returns 200 with `{ "status": "duplicate" }` if already seen
9. Ingest checks rate limit via Durable Object — returns 429 with `Retry-After` header if exceeded
10. If Turnstile sitekey is configured for agent and `cf-turnstile-response` is in payload, verify via Siteverify — return 403 if invalid
11. On all checks passed: enqueue payload + agent config to Queue, return `202 Accepted` with `{ "status": "queued", "id": "<uuid>" }`
12. Response time target: <100ms p99 (most time is D1 lookup + KV check)
13. All async operations must be `await`ed — unwaited promises are killed when Worker context ends

## Testable Scenarios

- POST with valid payload and known agent token -> 202 + queued
- POST with unknown agent token -> 404
- POST with inactive agent token -> 403
- POST without Content-Type JSON -> 415
- POST with missing required fields -> 400
- POST duplicate payload within 5 min -> 200 + duplicate
- POST exceeding rate limit -> 429 + Retry-After header
- OPTIONS preflight -> 204 with CORS headers
- GET /health -> 200 + status ok
- GET any other path -> 404
