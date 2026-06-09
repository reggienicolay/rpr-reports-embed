# Spec: generator-transparent-proxy

**Capability:** Generator always emits data-proxy, proxy is invisible to agents
**Type:** Modified (generator-proxy-option from Phase 2)

---

## Requirements

1. The "RPR Proxy" option is removed from the delivery method dropdown — agents never see "proxy" as a choice
2. The old proxy token input group (`#proxyTokenGroup`) and proxy base URL field in the Lead Delivery pane are removed
3. Worker base URL is hardcoded as `PROXY_BASE_URL` constant — no UI field needed
4. `proxyBaseUrl` is removed from the `FIELD_KEYS` array (no longer in URL hash; stored in localStorage instead)
5. `proxyToken` remains in `FIELD_KEYS` so shared generator links include the token
6. `vals()` returns `proxyToken` and `proxyBaseUrl` when a token exists, regardless of which delivery method is selected
7. `renderCode()` emits `data-proxy="<baseUrl>/<token>"` when a proxy token exists
8. `renderCode()` falls back to `data-webhook="<url>"` only when no proxy token exists and no admin API key is configured (offline/legacy mode)
9. `handleDeliveryChange()` no longer has proxy-specific panel toggle logic — all methods show the webhook URL group
10. `updateWebhookWarning()` shows "Secured" badge when token exists; no register button shown in normal flow (auto-registers on URL blur)
11. All per-method delivery panels (ntfy, Slack, Discord, etc.) continue to show setup instructions

## Testable Scenarios

- Delivery dropdown does not contain "RPR Proxy" option
- Select "Slack", enter webhook URL, have token -> embed code shows data-proxy (not data-webhook)
- Select "ntfy", enter webhook URL, no token, no admin key -> embed code shows data-webhook (fallback)
- Change delivery method from Slack to Discord -> proxy token persists, embed still shows data-proxy
- Share generator link with proxyToken in hash -> recipient sees data-proxy in embed code
- Generator link without proxyToken -> recipient sees data-webhook or no delivery attribute
