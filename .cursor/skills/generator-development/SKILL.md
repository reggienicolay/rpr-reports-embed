# Generator Development Skill

Activate this skill when working on `index.html` and `generator.js` — the visual configuration tool for the widget.

## Architecture

The generator is a static single-page app (no backend, no build step):
- `index.html` — UI layout, inline CSS, CSP meta tag, Google Fonts
- `generator.js` — All logic: config state, live preview, embed code generation, URL hash persistence

## Key Concepts

### Side-Navigation Panes

The generator uses a vertical side-nav with panes:
- Target Areas (report URLs + labels)
- Form Configuration (mode, fields, GDPR)
- Appearance (colors, fonts, layout)
- Delivery Method (webhook setup, 12 options with guides)
- Embed Code (output + copy + test)

### Live Preview

Every configuration change immediately updates a live preview iframe/element. The preview renders the actual widget using the current settings.

### Config Persistence

Configuration is persisted in two ways:
1. **URL hash** — shareable link containing full config (Base64 JSON)
2. **localStorage** — auto-save/restore on same domain

### Embed Code Generation

The generator builds the `<script>` tag with all `data-*` attributes based on current config. Attributes at their default values are omitted to keep the embed code clean.

## Key Functions

| Function | Purpose |
|----------|---------|
| `getReports()` | Collects report URL + label pairs from the Target Areas rows |
| `getConfig()` | Assembles the full config object from all form inputs |
| `generateEmbedCode()` | Builds the `<script>` tag string from config |
| `updatePreview()` | Refreshes the live preview with current config |
| `copyToClipboard(text)` | Copies text and shows feedback |
| `saveToHash()` | Serializes config to URL hash |
| `loadFromHash()` | Deserializes config from URL hash |
| `escHtml(str)` / `esc(str)` / `av(str)` | HTML/attribute escaping helpers |

## Delivery Methods (12 options)

Each delivery method has its own setup guide panel in the Delivery section:
Zapier, Make (Integromat), Slack, Google Sheets, HubSpot, Follow Up Boss, Email (SMTP), Custom Webhook, Pabbly Connect, n8n, IFTTT, Microsoft Power Automate

## Adding a New Delivery Method

1. Add the option to the delivery method selector in `index.html`
2. Add the setup guide HTML panel with step-by-step instructions
3. Wire up the show/hide logic in `generator.js`
4. Test that the webhook URL field and test button work with the new method
5. Update `docs/frd/frd.md` with the new delivery option

## Adding a New Configuration Option

1. Add the UI control in the appropriate `index.html` pane
2. Add the change listener and state management in `generator.js`
3. Include the value in `getConfig()` and `generateEmbedCode()`
4. Update the live preview in `updatePreview()`
5. Ensure the value round-trips through URL hash persistence
6. Update the corresponding `data-*` attribute docs in `docs/frd/frd.md`

## Test Webhook Flow

The "Send Test" button fires a test payload to the configured webhook URL:
- Currently uses `mode: 'no-cors'` with `Content-Type: text/plain` (due to CORS limitations)
- This differs from production behavior (`application/json` with CORS)
- The test result message should honestly reflect this limitation

## Common Pitfalls

- Generator IDs use `camelCase` to match `document.getElementById()` calls
- The `escHtml` in the generator is NOT the same implementation as the widget's — unification is a known issue (Phase 1.7 in improvement plan)
- Empty `getReports()` result (all rows incomplete) should block the Copy button
- The generator's default brand color (`#0086E6`) must match the widget's default — mismatch is a known bug (Phase 1.6)
- URL hash configs from older versions may use different field names — handle gracefully
