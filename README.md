# RPR Market Reports — Embed Widget

**Version:** 1.0.4
**Compatibility:** All modern browsers (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)
**Dependencies:** None — no framework, no jQuery

A self-contained lead capture widget for embedding RPR market reports on any website. Visitors select an area, submit their contact information, and receive a link to the corresponding RPR report. Lead data is delivered to a webhook of your choosing (Zapier, Make, GoHighLevel, etc.).

---

## For Realtors: Getting started

The fastest way to set up the widget is the **Embed Generator** — a visual tool that builds your embed code without touching any JSON or HTML by hand.

**Open the generator:** [https://reggienicolay.github.io/rpr-reports-embed/](https://reggienicolay.github.io/rpr-reports-embed/)

### Step 1 — Get your report URLs from RPR

Log into [narrpr.com](https://narrpr.com) and generate the reports you want to offer. RPR supports several report types:

| Report type | Best for | How to generate |
|-------------|----------|-----------------|
| **Market Activity Report** | Showing active, pending, and sold listings in a ZIP code or city | Search a location, select Market Activity, choose your filters, and generate the report |
| **Neighborhood Report** | Giving buyers/sellers a snapshot of a specific neighborhood | Search a neighborhood or subdivision, select Neighborhood Report, and generate |
| **Market Trends Report** | Visualizing price trends, days on market, and inventory over time | Search a location, select Market Trends, choose your date range, and generate |
| **Trade Area Report** (Commercial) | Analyzing demographics, traffic, and consumer spending for a commercial area | Switch to RPR Commercial, search a location or draw a trade area, and generate |

For each report:

1. Click **Share** and copy the PDF link — it will look like `https://www.narrpr.com/reports-v2/UUID/pdf`
2. In the generator, click **Add area**, type a label (e.g. "Beverly Hills 90210"), and paste the URL

You can mix report types in the same widget — for example, offer a Market Activity Report for one area and a Neighborhood Report for another.

### Step 2 — Configure branding

Fill in your name, brokerage, logo URL, and brand color. The live preview updates in real time so you can see exactly what visitors will see.

### Step 3 — Set up your webhook (recommended)

Paste your webhook URL (from Zapier, Make, GoHighLevel, or any service that accepts JSON POST requests). This is where lead data is sent when someone submits the form.

If you skip the webhook, the widget still works — visitors can view reports — but contact information won't be captured anywhere.

### Step 4 — Copy and paste

Click **Copy** at the bottom of the generator. Paste the embed code into your website wherever you want the form to appear — your homepage, a landing page, a blog post, etc.

If you use WordPress, paste the code into a **Custom HTML** block. If you use Squarespace, Wix, or another builder, look for an "Embed" or "Custom Code" option.

---

## How it works

The widget operates in two steps:

1. **Lead capture** — a form collects first name, last name, email, phone, and an area selection from a dropdown you populate. On submission, the lead is sent to your webhook and the form transitions to step 2.
2. **Report delivery** — a card displays the report matching the selected area, with a button that opens the RPR PDF in a new tab.

No data is stored by the widget itself. All lead data flows exclusively to your webhook endpoint.

---

## Manual installation

If you prefer to write the embed code by hand (or need to customize beyond what the generator offers), add one `<script>` tag to your page. No build step, no package manager, no dependencies.

**Do not add `async` or `defer`** to the script tag. The widget relies on `document.currentScript` to read its configuration, which is only available during synchronous execution.

### Quickstart

```html
<script
  src="https://pub-6607a59d1d3b4ed18490937c995526d1.r2.dev/rpr-reports-embed.js"
  data-webhook="https://hooks.zapier.com/hooks/catch/12345/abcdef/"
  data-agent-name="Sarah Johnson"
  data-brokerage="Luxury Realty Group"
  data-color-brand="#0086E6"
  data-reports='[
    {"label":"Beverly Hills 90210","url":"https://www.narrpr.com/reports-v2/UUID/pdf"},
    {"label":"Santa Monica 90401","url":"https://www.narrpr.com/reports-v2/UUID/pdf"},
    {"label":"Malibu 90265","url":"https://www.narrpr.com/reports-v2/UUID/pdf"}
  ]'
></script>
```

The form renders inline at the script tag's location. See [Display modes](#display-modes) for floating and modal alternatives.

---

## Configuration reference

### Required

| Attribute | Description |
|-----------|-------------|
| `data-reports` | JSON array of area objects. Each object must have a `label` (shown in the dropdown and on the report card) and a `url` (the RPR PDF link). Must contain at least one valid entry. All `url` values must begin with `http://` or `https://`; entries failing this check are silently dropped. |

### Recommended

| Attribute | Description |
|-----------|-------------|
| `data-webhook` | HTTPS URL that receives lead data on each submission. Must begin with `https://` — non-HTTPS values are rejected and no data is transmitted. If omitted, the form still displays reports but leads are not captured. |

### Branding

| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-agent-name` | — | Agent display name, shown in the card header |
| `data-brokerage` | — | Brokerage name, shown below the agent name in the card header |
| `data-logo-url` | — | Logo image URL. Must begin with `https://`; HTTP and data URIs are rejected |
| `data-color-brand` | `#0086E6` | Primary brand color (3- or 6-digit hex). Used for the header bar, submit button, and focus rings. Button text color is computed automatically for contrast |
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
| `data-subheadline` | `Select your area and get a free local market report.` |
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
    src="https://pub-6607a59d1d3b4ed18490937c995526d1.r2.dev/rpr-reports-embed.js"
    data-display-mode="inline"
    data-reports='[…]'
    data-webhook="https://…"
  ></script>
</div>
```

### Floating — site-wide button

```html
<script
  src="https://pub-6607a59d1d3b4ed18490937c995526d1.r2.dev/rpr-reports-embed.js"
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
  src="https://pub-6607a59d1d3b4ed18490937c995526d1.r2.dev/rpr-reports-embed.js"
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

**v1.0.4** — Default brand color updated to RPR blue (#0086E6). Generator: collapsible sections, syntax highlighting fix, accessibility improvements, debounced rendering, clipboard fallback, DEFAULTS consolidation.
**v1.0.3** — 8 security fixes
**v1.0.2** — 6 bug fixes
**v1.0.1** — 10 bug fixes
**v1.0.0** — Initial release

Full changelog is in the file header of `rpr-reports-embed.js`.
