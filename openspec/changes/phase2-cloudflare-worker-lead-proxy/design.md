# Design: Phase 2 — Cloudflare Worker Lead Proxy

**Change:** phase2-cloudflare-worker-lead-proxy
**Status:** Proposed

---

## Approach 1: Monolith Worker (Recommended)

**Description:** A single Cloudflare Worker with both a `fetch()` handler (ingest) and a `queue()` handler (delivery). Lives in `worker/` directory with TypeScript, Wrangler config, and Vitest tests.

**Architecture:**

```
worker/
  wrangler.toml              # All bindings: Queue, D1, KV, DO
  package.json               # wrangler + vitest
  src/
    index.ts                 # Entry: export { fetch, queue, RateLimiter }
    routes/
      ingest.ts              # POST /:agentToken
      health.ts              # GET /health
    services/
      agent-config.ts        # D1 queries
      rate-limiter.ts        # DO class
      dedup.ts               # KV idempotency
      turnstile.ts           # Siteverify call
      signing.ts             # HMAC-SHA256
    delivery/
      handler.ts             # Queue consumer
      retry.ts               # Retry classification
    types.ts                 # Env, interfaces
    schema.sql               # D1 migration
  test/
    ingest.test.ts
    delivery.test.ts
    rate-limiter.test.ts
  tsconfig.json
```

**Pros:**
- Simplest local development — `npx wrangler dev` runs everything, Queues work natively
- Single deployment unit — one `wrangler deploy` command
- Shared types and utilities between ingest and delivery
- No inter-worker communication overhead
- Cloudflare recommends this pattern for under 50M requests/month

**Cons:**
- Ingest and delivery share a cold start (negligible — Workers have <1ms cold start)
- Can't scale delivery independently of ingest (irrelevant at RPR's scale)

**Complexity:** Low-Medium
**Files to create:** ~15 new files in `worker/`
**Files to modify:** `rpr-reports-embed.js`, `generator.js`, `index.html`

---

## Approach 2: Split Workers (Microservice)

**Description:** Separate ingest Worker and delivery Worker in separate directories, connected via Cloudflare Queue. Each has its own `wrangler.toml` and deploys independently.

**Pros:**
- Independent scaling and deployment
- Clear separation of concerns
- Can version ingest and delivery separately

**Cons:**
- Complex local development — requires experimental multi-config wrangler dev (`-c -c` flag)
- Known issues with multi-worker local Queue routing (GitHub issue #12212, fixed but experimental)
- Double the deployment surface — two Workers to monitor, two configs to maintain
- Shared types need a monorepo setup or published package
- Overkill for RPR's scale (under 15M messages/month)

**Complexity:** Medium-High
**Files to create:** ~20 new files across two directories
**Files to modify:** Same as Approach 1

---

## Recommendation

**Approach 1 (Monolith Worker)** because:

1. Local development is straightforward — single `npx wrangler dev` runs everything
2. RPR's scale (50K-500K submissions/month) is well within a single Worker's capacity
3. Cloudflare's own examples and docs use this pattern for queue producer+consumer
4. Can always split later if scale demands it — the code is already modular by directory
5. Avoids the experimental multi-config local dev issues

---

## Key Design Decisions

### D1: Agent token format
- Format: `agt_` prefix + 16-character alphanumeric random string (e.g., `agt_a1b2c3d4e5f6g7h8`)
- Prefix prevents accidental collision with other URL segments
- 16 chars = 62^16 possibilities — effectively collision-free

### D2: Payload forwarding
- Proxy forwards the **exact same JSON payload** the widget sends today (FRD §2.7)
- Adds `_proxy` metadata object: `{ forwarded_at, client_ip, signature, idempotency_key }`
- Metadata is appended, not merged — preserves backward compatibility for existing webhook consumers
- This means **no MAJOR version bump** — the core payload schema is unchanged

### D3: CORS strategy
- Ingest Worker responds with permissive CORS headers for `POST` and `OPTIONS`
- `Access-Control-Allow-Origin: *` (widget runs on arbitrary agent domains)
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`
- No credentials needed — payload is in the POST body, agent token is in the URL path

### D4: Rate limiting algorithm
- Sliding window counter via Durable Object
- Default: 10 requests per minute per IP per agent (configurable in D1)
- In-memory counter as pre-check (avoids DO call on most requests)
- Returns `429 Too Many Requests` with `Retry-After` header

### D5: Queue retry strategy
- Cloudflare Queue built-in retry: 3 attempts, exponential backoff
- Retry on: 5xx, timeout, network error
- Permanent fail on: 4xx (bad request, unauthorized, not found)
- Dead Letter Queue for permanently failed messages
- Each message includes attempt count and original timestamp

### D6: Idempotency
- Key: SHA-256 hash of `agentToken + email + phone + timestamp` (subset of payload)
- Stored in KV with 5-minute TTL
- Duplicate within TTL returns `200 OK` with `{ "status": "duplicate", "original_id": "..." }`
- After TTL expiry, same payload is treated as new submission (legitimate re-submission)

### D7: HMAC signing
- Algorithm: HMAC-SHA256
- Secret: per-agent, stored in D1 `agent_configs.hmac_secret`
- Signed content: JSON-serialized payload body
- Header: `X-RPR-Signature: sha256=<hex-digest>`
- Agents can verify authenticity; signature is optional to check (not all agents will)

### D8: Widget integration
- New attribute: `data-proxy="https://{worker-domain}/{agent-token}"`
- Priority: `data-proxy` > `data-webhook` (if both present, proxy wins)
- Proxy success (202): show success UI immediately (delivery is guaranteed by queue)
- Proxy 4xx: show error from response JSON body
- Proxy 5xx / network error: enqueue to localStorage retry (Phase 1 queue) as fallback
- No change to existing `data-webhook` behavior

### D9: Generator integration
- New radio group: "Direct Webhook" vs "RPR Proxy (Recommended)"
- Proxy mode: input field for agent token (not webhook URL)
- Code output: `data-proxy="https://{worker-domain}/{token}"` instead of `data-webhook`
- Test button: standard CORS POST to proxy — gets real 202 / 4xx / 5xx feedback
- Direct webhook mode: existing behavior unchanged

### D10: Turnstile (deferred to M5)
- Invisible mode — zero UX friction
- Widget loads Turnstile script only when `data-turnstile-sitekey` is present
- Widget sends `cf-turnstile-response` token in POST body
- Worker verifies via Cloudflare Siteverify API before enqueuing
- Optional — agents without sitekey skip verification entirely
