# Spec: agent-config-store

**Capability:** D1 database for agent configuration
**Type:** New

---

## Requirements

1. D1 database `rpr_leads` with table `agent_configs`
2. Schema:
   - `token` TEXT PRIMARY KEY — format `agt_` + 16 alphanumeric chars
   - `webhook_url` TEXT NOT NULL — must be HTTPS
   - `agent_name` TEXT — display name for logging
   - `hmac_secret` TEXT — per-agent HMAC-SHA256 secret (nullable, auto-generated on create)
   - `turnstile_sitekey` TEXT — Cloudflare Turnstile site key (nullable)
   - `rate_limit_per_min` INTEGER DEFAULT 10 — requests per IP per minute
   - `active` INTEGER DEFAULT 1 — 0 = disabled, 1 = active
   - `created_at` TEXT DEFAULT (datetime('now'))
   - `updated_at` TEXT DEFAULT (datetime('now'))
3. Lookup function: `getAgentConfig(db, token)` returns config or null
4. Token validation: reject tokens not matching `/^agt_[a-zA-Z0-9]{16}$/`
5. Local dev: seed script inserts 2-3 test agent configs for development

## Testable Scenarios

- Lookup existing token -> returns full config object
- Lookup non-existent token -> returns null
- Lookup inactive agent -> returns config with `active = 0`
- Invalid token format -> rejected before DB query
- Seed script creates test agents in local D1
