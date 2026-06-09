# Spec: generator-auto-register

**Capability:** Generator auto-registers agent configs via Worker admin API
**Type:** New

---

## Requirements

1. Settings pane contains "Admin API Key" input (type=password, optional — for managing existing configs only) and "Proxy Base URL" input
2. Admin API Key is stored in `localStorage` only — never in URL hash, never in embed code
3. Proxy Base URL defaults to `https://rpr-lead-proxy.reggie-c50.workers.dev` and is persisted in `localStorage`
4. "Register with Proxy" button appears in the Lead Delivery pane when:
   - A valid HTTPS webhook URL has been entered, AND
   - No proxy token exists yet for this config
   - (No admin API key required — registration is public)
5. Clicking "Register with Proxy" calls `POST /api/config` with `{ webhook_url, agent_name }` — no Authorization header needed
6. On success, the returned token is stored in the `proxyToken` hidden input and persisted in the URL hash
7. A green "Registered" badge with the token is displayed next to the webhook URL
8. If a proxy token already exists and the webhook URL changes, a subsequent register call uses `PUT /api/config/:token` to update (this requires admin API key)
9. The test button label changes to "Send test via Proxy" when a proxy token exists
10. When a proxy token exists, the test sends to the proxy URL (standard CORS POST, real 202/4xx/5xx feedback) instead of direct `no-cors` POST

## Testable Scenarios

- Webhook URL entered (no admin key) -> "Register with Proxy" button visible
- Click register with valid URL -> proxy token stored, badge shown, embed code updates to data-proxy
- No webhook URL entered -> "Register with Proxy" button hidden
- http:// URL entered -> registration returns 400 error
- Proxy token exists + change webhook URL + admin key set -> PUT update when re-registered
- Proxy token exists + change webhook URL + no admin key -> PUT returns 401 (admin key needed for updates)
- Proxy token exists -> test button says "Send test via Proxy" and routes through proxy
- No proxy token -> test button says "Send test" and routes direct (no-cors)
- Reload page -> admin key restored from localStorage, proxy token from URL hash
