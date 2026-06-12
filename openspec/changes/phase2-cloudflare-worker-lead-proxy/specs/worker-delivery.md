# Spec: worker-delivery

**Capability:** Cloudflare Queue consumer — lead delivery
**Type:** New

---

## Requirements

1. Queue handler receives batches of messages from `lead-delivery` queue
2. For each message: extract agent webhook URL and lead payload
3. POST payload to agent webhook URL with `Content-Type: application/json`
4. Include `X-RPR-Signature: sha256=<hmac-hex>` header (signed with agent's HMAC secret)
5. Include `X-RPR-Delivery-Id: <uuid>` header for traceability
6. Include `X-RPR-Attempt: <N>` header with current attempt number
7. On HTTP 2xx response: acknowledge message (remove from queue)
8. On HTTP 5xx or timeout: let message retry (Cloudflare Queue handles backoff)
9. On HTTP 4xx: acknowledge message as permanently failed, log to console
10. Dead Letter Queue receives messages that exhaust all retry attempts
11. Webhook POST timeout: 30 seconds
12. All fetch calls must be `await`ed inside the queue handler

## Testable Scenarios

- Message with valid webhook URL -> POST delivered, message acknowledged
- Message with webhook returning 500 -> message retried by queue
- Message with webhook returning 404 -> message acknowledged (permanent fail)
- Message with webhook timing out -> message retried
- Message with HMAC secret -> X-RPR-Signature header present and correct
- Message without HMAC secret -> X-RPR-Signature header absent
- Batch of 3 messages -> all 3 processed independently
