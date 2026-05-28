-- RPR Lead Proxy — D1 Schema
-- Run: npm run seed (or wrangler d1 execute rpr_leads --local --file=src/schema.sql)

CREATE TABLE IF NOT EXISTS agent_configs (
  token             TEXT PRIMARY KEY,
  webhook_url       TEXT NOT NULL,
  agent_name        TEXT,
  hmac_secret       TEXT,
  turnstile_sitekey TEXT,
  rate_limit_per_min INTEGER DEFAULT 10,
  active            INTEGER DEFAULT 1,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

-- Seed data for local development
INSERT OR IGNORE INTO agent_configs (token, webhook_url, agent_name, hmac_secret, rate_limit_per_min)
VALUES
  ('agt_testtoken000001', 'https://webhook.site/test-placeholder', 'Test Agent 1', 'dev-secret-1', 10),
  ('agt_testtoken000002', 'https://httpbin.org/post',              'Test Agent 2', 'dev-secret-2', 5),
  ('agt_inactiveagent01', 'https://example.com/webhook',           'Inactive Agent', NULL, 10);

-- Mark the third agent as inactive for testing
UPDATE agent_configs SET active = 0 WHERE token = 'agt_inactiveagent01';
