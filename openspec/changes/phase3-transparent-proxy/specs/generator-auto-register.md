# Spec: generator-auto-register

**Capability:** Generator auto-registers agent configs via Worker admin API
**Type:** New

---

## Requirements

1. Settings pane contains "Admin API Key" input (type=password, optional — for editing/deactivating existing configs only) and "Server URL" input under "Advanced" heading
2. Admin API Key is stored in `localStorage` only — never in URL hash, never in embed code
3. Server URL defaults to `https://rpr-lead-proxy.reggie-c50.workers.dev` and is persisted in `localStorage`
4. Registration happens **automatically** when the agent leaves (blur) the webhook URL input with a valid HTTPS URL and no token exists — no button click required
5. The auto-register call fires `POST /api/config` with `{ webhook_url, agent_name }` — no Authorization header needed (public endpoint)
6. On success, the returned token is stored in the `proxyToken` hidden input and persisted in the URL hash
7. A green **"Secured"** badge with the token is displayed next to the webhook URL — no mention of "proxy" or "registration"
8. While registering, a "Securing webhook..." message is shown; on success, "Webhook secured"
9. If auto-registration fails, a **"Retry"** button appears as a manual fallback
10. If a proxy token already exists and the webhook URL changes, a subsequent register call uses `PUT /api/config/:token` to update (this requires admin API key)
11. When a proxy token exists, the test sends to the proxy URL (standard CORS POST, real 202/4xx/5xx feedback) instead of direct `no-cors` POST
12. No agent-facing UI element uses the words "proxy", "register", or "token"

## Testable Scenarios

- Enter valid HTTPS webhook URL, tab/click away -> auto-registers, "Webhook secured" shown, badge appears
- Enter invalid http:// URL, tab away -> no registration attempt
- Auto-register fails (network error) -> "Retry" button appears
- Click "Retry" -> attempts registration again
- Proxy token exists + change webhook URL + admin key set -> PUT update on blur
- Proxy token exists + change webhook URL + no admin key -> PUT returns 401
- Proxy token exists -> test button routes through proxy
- No proxy token -> test button routes direct (no-cors)
- Reload page -> admin key restored from localStorage, proxy token from URL hash
- Agent never sees the words "proxy", "register", or "token" in normal flow
