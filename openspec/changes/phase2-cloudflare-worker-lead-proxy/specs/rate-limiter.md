# Spec: rate-limiter

**Capability:** Durable Object per-IP rate limiting
**Type:** New

---

## Requirements

1. Durable Object class `RateLimiter` with `fetch()` handler
2. Naming convention: DO ID derived from `agentToken:clientIP`
3. Sliding window algorithm: count requests in the last N seconds (default 60)
4. Configurable limit per agent (from D1 `rate_limit_per_min`, default 10)
5. In-memory pre-check: if counter is well below limit, approve without storage read
6. On limit exceeded: return `{ "allowed": false, "retryAfter": <seconds> }`
7. On within limit: return `{ "allowed": true, "remaining": <count> }`
8. Window entries auto-expire — no unbounded memory growth
9. Alarm-based cleanup: DO sets an alarm to purge expired entries and self-destruct after idle period

## Testable Scenarios

- First request from IP -> allowed, remaining = limit - 1
- Requests at steady rate below limit -> all allowed
- Burst exceeding limit -> rejected with retryAfter
- After window expires, same IP -> allowed again
- Different IPs -> independent counters
- Custom rate limit (e.g., 5/min) -> enforced per agent config
