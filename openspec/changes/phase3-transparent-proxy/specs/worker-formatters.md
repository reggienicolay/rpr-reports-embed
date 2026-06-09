# Spec: worker-formatters

**Capability:** Server-side destination-aware payload formatting in the Worker delivery handler
**Type:** New

---

## Requirements

1. The delivery handler detects the destination type from the agent's `webhook_url` using URL pattern matching
2. Destination detection uses the same regex patterns as the widget's client-side formatters:
   - `hooks.slack.com/` -> Slack
   - `discord.com/api/webhooks/` or `discordapp.com/api/webhooks/` -> Discord
   - `ntfy.sh/` -> ntfy
   - `simplepush.io/` or `simplepu.sh/` -> SimplePush
   - `api.pushover.net/` -> Pushover
   - All other URLs -> default (raw JSON passthrough)
3. Each formatter returns a `FormattedRequest` object: `{ url, method, headers, body }` so that URL rewrites (SimplePush, Pushover) and non-JSON bodies (ntfy) are supported
4. **Slack formatter** produces Block Kit payload with `text` fallback, mrkdwn fields for name/email/phone/area/source, context footer with timestamp
5. **Discord formatter** produces `{ embeds: [{ title, color: 34534, fields, timestamp, footer }] }` with inline fields for name/email/phone
6. **ntfy formatter** produces plain text body with `Title`, `Tags: house`, and optional `Click` headers. All header values must be Latin-1 safe (strip code points > 255)
7. **SimplePush formatter** extracts the key from the webhook URL path, POSTs JSON `{ key, title, msg }` to `https://api.simplepush.io/send`
8. **Pushover formatter** extracts `token` and `user` from webhook URL query params, POSTs JSON `{ token, user, title, message, sound: "cashregister" }` to `https://api.pushover.net/1/messages.json`, with optional `url` and `url_title` for report link
9. **Default formatter** passes the raw lead payload as JSON with `_proxy` metadata appended (existing behavior, for Google Sheets, GHL, Make, Zapier, custom endpoints)
10. The handler preserves existing behavior: HMAC signing headers (`X-RPR-Signature`), delivery ID headers (`X-RPR-Delivery-Id`, `X-RPR-Attempt`), User-Agent, timeout, retry classification, and DLQ routing
11. The lead payload fields used by formatters: `first_name`, `last_name`, `email`, `phone`, `selected_area`, `report_url`, `source_url`, `timestamp`
12. Formatters are pure functions with no side effects, I/O, or env dependencies — easy to unit test

## Testable Scenarios

- Slack webhook URL -> delivery sends Block Kit JSON with `text` + `blocks` -> Slack returns 200 -> message appears in channel
- Discord webhook URL -> delivery sends `{ embeds }` JSON with color 34534 -> Discord returns 204 -> embed appears in channel
- ntfy.sh URL -> delivery sends plain text body with Title/Tags/Click headers -> ntfy returns 200 -> notification received
- SimplePush URL -> delivery extracts key, POSTs to api.simplepush.io/send -> notification received
- Pushover URL with token/user params -> delivery POSTs to /1/messages.json -> notification received
- Google Sheets / custom URL -> delivery sends raw JSON with `_proxy` metadata -> endpoint receives full payload
- Unknown URL pattern -> default formatter used (raw JSON passthrough)
- Formatter output preserves HMAC signature headers when hmac_secret is configured
- Formatter does not mutate the original payload object
