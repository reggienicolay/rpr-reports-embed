# Spec: generator-auto-register

**Capability:** Generator auto-registers agent configs via Worker admin API
**Type:** New

---

## Requirements

1. Settings pane contains "Admin API Key" input (type=password) and "Proxy Base URL" input
2. Admin API Key is stored in `localStorage` only — never in URL hash, never in embed code
3. Proxy Base URL defaults to `https://rpr-lead-proxy.reggie-c50.workers.dev` and is persisted in `localStorage`
4. "Register with Proxy" button appears in the Lead Delivery pane when:
   - A valid HTTPS webhook URL has been entered, AND
   - An admin API key is present, AND
   - No proxy token exists yet for this config
5. Clicking "Register with Proxy" calls `POST /api/config` with `{ webhook_url, agent_name }` using the admin API key as Bearer token
6. On success, the returned token is stored in the `proxyToken` hidden input and persisted in the URL hash
7. A green "Registered" badge with the token is displayed next to the webhook URL
8. If a proxy token already exists and the webhook URL changes, a subsequent register call uses `PUT /api/config/:token` to update
9. The test button label changes to "Send test via Proxy" when a proxy token exists
10. When a proxy token exists, the test sends to the proxy URL (standard CORS POST, real 202/4xx/5xx feedback) instead of direct `no-cors` POST

## Testable Scenarios

- Admin API key empty -> "Register with Proxy" button is hidden
- Admin API key set, webhook URL entered -> "Register with Proxy" button visible
- Click register with valid key + URL -> proxy token stored, badge shown, embed code updates to data-proxy
- Click register with invalid/wrong key -> error message shown
- Proxy token exists + change webhook URL -> PUT update when re-registered
- Proxy token exists -> test button says "Send test via Proxy" and routes through proxy
- No proxy token -> test button says "Send test" and routes direct (no-cors)
- Reload page -> admin key restored from localStorage, proxy token from URL hash
