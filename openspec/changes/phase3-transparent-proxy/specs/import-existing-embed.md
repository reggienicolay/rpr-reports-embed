# Spec: import-existing-embed

**Capability:** Import an existing embed script tag and migrate to proxy
**Type:** New

---

## Requirements

1. An "Import Embed" button is displayed in the generator header (next to "Reset")
2. Clicking "Import Embed" shows a `prompt()` dialog asking the user to paste their existing `<script>` tag
3. The pasted HTML is parsed using DOM (`createElement('div').innerHTML`) to extract the `<script>` element
4. If no `<script>` tag is found, an `alert()` error is shown
5. The following `data-*` attributes are extracted and mapped to generator fields:
   - `data-webhook` -> `deliveryUrl`
   - `data-reports` -> parsed as JSON array
   - `data-agent-name` -> `agentName`
   - `data-brokerage` -> `brokerage`
   - `data-logo-url` -> `logoUrl`
   - `data-color-brand` -> `colorBrandHex`
   - `data-font-heading` -> `fontHeading`
   - `data-font-body` -> `fontBody`
   - `data-headline` -> `headline`
   - `data-subheadline` -> `subheadline`
   - `data-btn-label` -> `btnLabel`
   - `data-display-mode` -> `displayMode`
   - `data-float-label` -> `floatLabel`
   - `data-float-position` -> `floatPosition`
   - `data-modal-trigger` -> `modalTrigger`
   - `data-form-mode` -> `formMode`
   - `data-card-bg` -> `cardBg`
   - `data-card-text` -> `cardText`
   - `data-card-radius` -> `cardRadius`
   - `data-area-label` -> `areaLabel`
   - `data-reports-heading` -> `reportsHeading`
   - `data-gdpr-enabled` -> `gdprEnabled` (boolean)
   - `data-gdpr-text` -> `gdprText`
6. The delivery method is auto-detected from the webhook URL pattern:
   - `ntfy.sh/` -> ntfy
   - `hooks.slack.com/` -> slack
   - `discord.com/api/webhooks/` or `discordapp.com/api/webhooks/` -> discord
   - `simplepush.io/` or `simplepu.sh/` -> simplepush
   - `api.pushover.net/` -> pushover
   - `script.google.com/` -> sheets
   - `leadconnectorhq.com/` -> ghl
   - `make.com/` -> make
   - `zapier.com/` -> zapier
   - `gettoolkit.app/` -> toolkit
   - Any other URL -> custom
7. If `data-proxy` is present, the proxy token is extracted from the URL path (`/agt_XXXXX`)
8. After extraction, `applyConfig()` is called to populate all generator fields
9. If a webhook URL was extracted and no proxy token exists, `registerConfig()` is called automatically after a short delay (300ms) — no admin key needed (public registration)
10. The generator code output updates to show `data-proxy` after registration

## Testable Scenarios

- Paste embed with data-webhook="https://ntfy.sh/topic" -> delivery method set to ntfy, URL populated
- Paste embed with data-proxy="…/agt_xyz123" -> proxy token extracted, no re-registration
- Paste embed with data-reports, agent-name, branding -> all fields populated
- Paste embed with webhook URL -> auto-registers (public, no admin key needed) and shows data-proxy in output
- Paste non-script HTML -> error alert
- Paste empty string -> dialog dismissed, no change
- Cancel prompt -> no change
