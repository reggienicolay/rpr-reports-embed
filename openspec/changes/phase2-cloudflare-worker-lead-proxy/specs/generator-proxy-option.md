# Spec: generator-proxy-option

**Capability:** Generator "RPR Proxy" delivery method
**Type:** Modified (generator-code-output, generator-test-button)

---

## Requirements

1. New radio group in Lead Delivery section: "Direct Webhook" (default) vs "RPR Proxy (Recommended)"
2. When "RPR Proxy" selected:
   - Show agent token input field (placeholder: `agt_your_token_here`)
   - Show proxy base URL input (default: workers.dev subdomain, editable for custom domains)
   - Hide webhook URL input
3. When "Direct Webhook" selected: existing behavior unchanged
4. Code output when proxy selected: emit `data-proxy="https://{base}/{token}"` instead of `data-webhook`
5. Test button when proxy selected: standard CORS POST (not `no-cors`) to proxy URL
6. Test result when proxy: show real success/fail feedback from proxy response
7. Test result: "Lead queued for delivery" on 202, "Duplicate submission" on 200 duplicate, error message on 4xx/5xx
8. Proxy token validation: must match `agt_` prefix + alphanumeric pattern
9. Code warning: show warning if token field is empty (same pattern as empty reports guard from Phase 1)
10. Preview: when proxy selected, live preview behaves identically (proxy doesn't affect display)

## Testable Scenarios

- Select "RPR Proxy" -> webhook URL input hidden, token input shown
- Select "Direct Webhook" -> token input hidden, webhook URL input shown
- Enter valid token + click Test -> POST to proxy URL with standard CORS
- Proxy returns 202 -> "Lead queued for delivery" message
- Proxy returns 400 -> show error from response
- Empty token + click Copy -> copy blocked, warning shown
- Generated code with proxy -> contains `data-proxy`, no `data-webhook`
- Generated code with webhook -> contains `data-webhook`, no `data-proxy` (existing)
- Switch between proxy and webhook -> code output updates live
