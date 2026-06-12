# Spec: generator-auto-register

**Capability:** Generator auto-registers agent configs via Worker admin API
**Type:** New

---

## Requirements

1. Worker base URL is hardcoded as `PROXY_BASE_URL` constant in generator.js — no admin UI fields needed
2. Registration happens **automatically** when the agent leaves (blur) the webhook URL input with a valid HTTPS URL and no token exists — no button click required
3. The auto-register call fires `POST /api/config` with `{ webhook_url, agent_name }` — no Authorization header needed (public endpoint)
4. On success, the returned token is stored in the `proxyToken` hidden input and persisted in the URL hash
5. A green **"Secured"** badge with the token is displayed next to the webhook URL — no mention of "proxy" or "registration"
6. While registering, a "Securing webhook..." message is shown; on success, "Webhook secured"
7. If auto-registration fails, a **"Retry"** button appears as a manual fallback
8. Each registration always creates a new config via POST (no PUT/update flow in the generator)
9. When a proxy token exists, the test sends to the proxy URL (standard CORS POST, real 202/4xx/5xx feedback) instead of direct `no-cors` POST
10. No agent-facing UI element uses the words "proxy", "register", or "token"
11. No admin API key or server URL fields exist in the generator UI

## Testable Scenarios

- Enter valid HTTPS webhook URL, tab/click away -> auto-registers, "Webhook secured" shown, badge appears
- Enter invalid http:// URL, tab away -> no registration attempt
- Auto-register fails (network error) -> "Retry" button appears
- Click "Retry" -> attempts registration again
- Proxy token exists -> test button routes through proxy
- No proxy token -> test button routes direct (no-cors)
- Reload page -> proxy token restored from URL hash
- Agent never sees the words "proxy", "register", or "token" in normal flow
- No "Advanced" or admin settings section exists in the Settings pane
