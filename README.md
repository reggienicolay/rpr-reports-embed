# rpr-reports-embed.js

**Version:** 1.0.3  
**Compatibility:** All modern browsers (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)  
**Dependencies:** None — no framework, no jQuery

A self-contained lead capture widget for embedding RPR market reports on any website. Visitors select an area, submit their contact information, and are presented with a link to the corresponding RPR PDF report. Lead data is delivered to a webhook of your choosing.

---

## How it works

The widget operates in two steps:

1. **Lead capture** — a form collects first name, last name, email, phone, and an area selection from a dropdown you populate. On submission, the lead is sent to your webhook and the form transitions to step 2.
2. **Report delivery** — a card displays the report matching the selected area, with a button that opens the RPR PDF in a new tab.

No data is stored by the widget itself. All lead data flows exclusively to your webhook endpoint.

---

## Installation

Add one `<script>` tag to your page. No build step, no package manager, no dependencies.

**Do not add `async` or `defer`** to the script tag. The widget relies on `document.currentScript` to read its configuration, which is only available during synchronous execution.

---

## Quickstart

```html
<script
  src="https://reggienicolay.github.io/rpr-reports-embed/rpr-reports-embed.js"
  data-webhook="https://hooks.zapier.com/hooks/catch/12345/abcdef/"
  data-agent-name="Sarah Johnson"
  data-brokerage="Luxury Realty Group"
  data-color-brand="#1a1a2e"
  data-reports='[
    {"label":"Beverly Hills 90210","url":"https://www.narrpr.com/reports-v2/UUID/pdf"},
    {"label":"Santa Monica 90401","url":"https://www.narrpr.com/reports-v2/UUID/pdf"},
    {"label":"Malibu 90265","url":"https://www.narrpr.com/reports-v2/UUID/pdf"}
  ]'
></script>
```

The form renders inline at the script tag's location. See [Display modes](#display-modes) for floating and modal alternatives.

---

## Getting report URLs from RPR

1. Log into [narrpr.com](https://narrpr.com)
2. Run a market activity report for the ZIP code or city you want
3. Click **Share** and copy the PDF link — it will look like `https://www.narrpr.com/reports-v2/UUID/pdf`
4. Paste it into the `data-reports` array as the `url` value for that area

---

## Configuration reference

### Required

| Attribute | Description |
|-----------|-------------|
| `data-reports` | JSON array of area objects. Each object must have a `label` (shown in the dropdown and on the report card) and a `url` (the RPR PDF link). Must contain at least one valid entry. All `url` values must begin with `http://` or `https://`; entries failing this check are silently dropped. |
| `data-webhook` | HTTPS URL that receives lead data on each submission. Must begin with `https://` — non-HTTPS values are rejected and no data is transmitted. |

### Branding

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-agent-name` | — | Agent display name, shown in the card header |
| `data-brokerage` | — | Brokerage name, shown below the agent name in the card header |
| `data-logo-url` | — | Logo image URL. Must begin with `https://`; HTTP and data URIs are rejected |
| `data-color-brand` | `#1a1a2e` | Primary brand color (3- or 6-digit hex). Used for the header bar, submit button, and focus rings. Button text color is computed automatically for contrast |
| `data-color-brand-hover` | auto | Hover state for buttons. If omitted, derived by darkening `data-color-brand` by 20 points |
| `data-font-heading` | inherit | Google Font name for headings. Loaded automatically if provided. Only letters, numbers, spaces, and hyphens are accepted |
| `data-font-body` | inherit | Google Font name for body text and form inputs |
| `data-card-bg` | `#ffffff` | Card background color. Change for dark-themed host pages |
| `data-card-text` | `#333333` | Card body text color |
| `data-card-radius` | `18` | Card corner radius in pixels. Must be numeric; non-numeric values fall back to `18` |

### Copy

| Attribute | Default |
|-----------|---------|
| `data-headline` | `What's happening in your neighborhood?` |
| `data-subheadline` | `Select your area below and get a free local market report — no obligation.` |
| `data-btn-label` | `Get My Market Report` |
| `data-disclaimer` | `Your information is kept private and never sold.` |
| `data-area-label` | `Area of interest` |
| `data-area-placeholder` | `Select an area…` |
| `data-reports-heading` | `Your Market Report` |

### Display modes

| Attribute | Values | Default |
|-----------|--------|---------|
| `data-display-mode` | `inline` \| `floating` \| `modal` | `inline` |
| `data-float-label` | Any string | `Get Market Report` |
| `data-float-position` | `bottom-right` \| `bottom-left` | `bottom-right` |
| `data-modal-trigger` | CSS selector | — (renders a fallback button) |

**`inline`** — The form renders at the script tag's location in the page. Suited for a dedicated landing page where the form is the primary content.

**`floating`** — A fixed button appears in the corner of every page. Clicking it opens the form in a modal overlay. Suited for site-wide lead capture without interrupting navigation.

**`modal`** — No UI is added automatically. Instead, provide a CSS selector via `data-modal-trigger` pointing to an existing element on the page; clicking that element opens the form. If `data-modal-trigger` is omitted or its selector matches nothing, a fallback button is rendered at the script tag's location.

### GDPR

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-gdpr-enabled` | `false` | Set to `"true"` to show a consent checkbox. Submission is blocked until the box is checked |
| `data-gdpr-text` | `I agree to receive communications about local real estate market activity.` | Checkbox label text |

### Advanced

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-form-id` | auto-generated | Identifier included in the webhook payload as `form_id`. Restricted to letters, numbers, hyphens, and underscores. Useful for distinguishing multiple embeds in analytics or CRM routing |

---

## Webhook payload

On each successful submission the widget sends a JSON POST to your webhook URL:

```json
{
  "form_id":       "rpr-reports-abc123",
  "first_name":    "Sarah",
  "last_name":     "Johnson",
  "email":         "sarah@example.com",
  "phone":         "555-555-5555",
  "selected_area": "Beverly Hills 90210",
  "report_url":    "https://www.narrpr.com/reports-v2/UUID/pdf",
  "agent_name":    "Agent Name",
  "brokerage":     "Brokerage Name",
  "gdpr_consent":  1,
  "source_url":    "https://example.com/market-reports",
  "timestamp":     "2026-03-16T10:00:00.000Z"
}
```

`gdpr_consent` is `1` (checked), `0` (unchecked), or `null` (GDPR not enabled).

`report_url` is the exact URL of the report the lead selected, making CRM routing and automated email delivery straightforward.

The webhook fires once per submission. If the webhook URL is absent or non-HTTPS, the lead is not captured and the form does not proceed to step 2.

---

## Display mode examples

### Inline — dedicated landing page

```html
<div class="my-section">
  <script
    src="https://reggienicolay.github.io/rpr-reports-embed/rpr-reports-embed.js"
    data-display-mode="inline"
    data-reports='[…]'
    data-webhook="https://…"
  ></script>
</div>
```

### Floating — site-wide button

```html
<script
  src="https://reggienicolay.github.io/rpr-reports-embed/rpr-reports-embed.js"
  data-display-mode="floating"
  data-float-label="Get Market Report"
  data-float-position="bottom-right"
  data-reports='[…]'
  data-webhook="https://…"
></script>
```

### Modal — triggered by an existing button

```html
<button id="market-report-cta">See Local Market Data</button>

<script
  src="https://reggienicolay.github.io/rpr-reports-embed/rpr-reports-embed.js"
  data-display-mode="modal"
  data-modal-trigger="#market-report-cta"
  data-reports='[…]'
  data-webhook="https://…"
></script>
```

---

## Security

- `data-webhook` must be HTTPS. Non-HTTPS values are rejected at startup; no data is transmitted.
- `data-logo-url` must be HTTPS. HTTP and data URIs are rejected.
- All report URLs in `data-reports` must begin with `http://` or `https://`. Entries with `javascript:` or other schemes are silently dropped during parsing and again at render time.
- Font names from `data-font-heading` and `data-font-body` are stripped to letters, numbers, spaces, and hyphens before use in CSS.
- A client-side honeypot field silently blocks automated submissions without revealing the mechanism to the sender.
- After one successful submission the form locks against re-submission for the duration of the page session. In floating and modal modes, closing and reopening the overlay resets the form and allows a new submission.

---

## Changelog

**v1.0.3** — 8 security fixes  
**v1.0.2** — 6 bug fixes  
**v1.0.1** — 10 bug fixes  
**v1.0.0** — Initial release

Full changelog is in the file header of `rpr-reports-embed.js`.
