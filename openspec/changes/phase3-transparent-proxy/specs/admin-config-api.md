# Spec: admin-config-api

**Capability:** Worker admin CRUD API for agent configurations
**Type:** New

---

## Requirements

1. Worker exposes `POST /api/config` to create a new agent configuration
2. Worker exposes `GET /api/config/:token` to read an existing configuration
3. Worker exposes `PUT /api/config/:token` to update an existing configuration
4. Worker exposes `DELETE /api/config/:token` to soft-deactivate a configuration (sets `active = 0`)
5. All admin endpoints require `Authorization: Bearer <ADMIN_API_KEY>` header — return 401 if missing or invalid
6. `ADMIN_API_KEY` is a Wrangler Secret (set via `wrangler secret put`, not in `wrangler.toml`)
7. `POST /api/config` requires `webhook_url` (HTTPS) in the JSON body — return 400 if missing or non-HTTPS
8. `POST /api/config` accepts optional `agent_name`, `hmac_secret`, `rate_limit_per_min`
9. `POST /api/config` generates a token matching `agt_[A-Za-z0-9]{16}` using `crypto.getRandomValues()`
10. `POST /api/config` inserts into D1 `agent_configs` table and returns the full config with 201 status
11. `PUT /api/config/:token` accepts any subset of `{ webhook_url, agent_name, hmac_secret, rate_limit_per_min, active }`
12. `PUT /api/config/:token` updates only provided fields and sets `updated_at` to current datetime
13. `DELETE /api/config/:token` sets `active = 0` and returns `{ status: 'deactivated', token }` — does not delete the row
14. All admin responses include CORS headers: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`, `Access-Control-Allow-Headers: Content-Type, Authorization`
15. `OPTIONS` requests to `/api/config*` return 204 with CORS headers (no auth required for preflight)

## Testable Scenarios

- POST /api/config with valid Bearer token + webhook_url -> 201 + config with generated token
- POST /api/config without Bearer token -> 401
- POST /api/config with wrong Bearer token -> 401
- POST /api/config without webhook_url -> 400
- POST /api/config with http:// webhook_url -> 400
- GET /api/config/:token with valid token -> 200 + full config
- GET /api/config/:token with unknown token -> 404
- PUT /api/config/:token with { agent_name } -> 200 + updated config with new updated_at
- PUT /api/config/:token with empty body -> 400
- DELETE /api/config/:token -> 200 + { status: 'deactivated' }
- DELETE /api/config/:token for already-inactive agent -> 200 (idempotent)
- OPTIONS /api/config -> 204 with CORS headers (no auth)
