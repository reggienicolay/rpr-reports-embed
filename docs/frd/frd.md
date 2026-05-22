# Functional Requirements Document (FRD)

**Product:** RPR Market Reports Embed Widget
**Version:** 1.1.0
**Last Updated:** 2026-05-21
**Status:** Active

---

## 1. Overview

This document specifies the detailed functional behavior of each component in the RPR Market Reports Embed Widget system. It covers the embed widget runtime, the visual generator, and the Google Sheets integration.

Cross-reference: Product goals and user stories are defined in [/docs/prd/prd.md](../prd/prd.md).

---

## 2. Component: Embed Widget (`rpr-reports-embed.js`)

### 2.1 Initialization

| ID | Requirement | Details |
|---|---|---|
| FW-001 | Script must execute synchronously | The script reads `document.currentScript` to locate its `data-*` attributes. If loaded with `async` or `defer`, `currentScript` is `null`. The script must detect this and log a descriptive error via `console.error`, then abort. |
| FW-002 | Script must self-initialize on DOM ready | If `document.readyState === 'loading'`, register a `DOMContentLoaded` listener. Otherwise, initialize immediately. |
| FW-003 | Script must parse `data-reports` as JSON | Parse the attribute value as a JSON array. Each entry must have `label` (string) and `url` (string, starting with `http://` or `https://`). Invalid entries are silently dropped. If no valid entries remain after filtering, log an error and abort. |
| FW-004 | Script must read all `data-*` configuration attributes | Each attribute maps to a config key with a defined default. Missing or empty attributes fall back to defaults. |
| FW-005 | Script must validate `data-webhook` | If present, must start with `https://`. Non-HTTPS values are rejected: log an error and set webhook to empty string (widget still renders, but leads are not captured). |

### 2.2 Configuration Attributes

| Attribute | Config Key | Type | Default | Validation |
|---|---|---|---|---|
| `data-reports` | `reports` | JSON array | (required) | Each entry must have `label` + `url` starting with `http(s)://` |
| `data-webhook` | `webhook` | URL string | `""` | Must start with `https://` if present |
| `data-form-mode` | `formMode` | `"full"` \| `"minimal"` | `"full"` | Anything other than `"minimal"` falls back to `"full"` |
| `data-agent-name` | `agentName` | string | `""` | No validation |
| `data-brokerage` | `brokerage` | string | `""` | No validation |
| `data-logo-url` | `logoUrl` | URL string | `""` | Must start with `https://`; others rejected |
| `data-color-brand` | `colorBrand` | hex color | `"#1a1a2e"` | Must be valid 3- or 6-digit hex; falls back to default |
| `data-color-brand-hover` | `colorBrandHover` | hex color | (auto-derived) | Must be valid hex if present; otherwise auto-derived by darkening brand by 20 |
| `data-font-heading` | `fontHeading` | string | `""` | Sanitized: only `[a-zA-Z0-9 -]` allowed |
| `data-font-body` | `fontBody` | string | `""` | Sanitized: only `[a-zA-Z0-9 -]` allowed |
| `data-headline` | `headline` | string | `"What's happening in your neighborhood?"` | HTML-escaped on render |
| `data-subheadline` | `subheadline` | string | `"Select your area below and get a free local market report — no obligation."` | HTML-escaped on render |
| `data-btn-label` | `btnLabel` | string | `"Get My Market Report"` | Text content only (no HTML) |
| `data-disclaimer` | `disclaimer` | string | `"Your information is kept private and never sold."` | Text content only |
| `data-display-mode` | `displayMode` | `"inline"` \| `"floating"` \| `"modal"` | `"inline"` | Anything unrecognized falls back to `"inline"` |
| `data-float-label` | `floatLabel` | string | `"Get Market Report"` | Text content only |
| `data-float-position` | `floatPosition` | `"bottom-right"` \| `"bottom-left"` | `"bottom-right"` | — |
| `data-modal-trigger` | `modalTrigger` | CSS selector | `""` | Wrapped in try/catch; invalid selector logged and ignored |
| `data-card-radius` | `cardRadius` | number (px) | `18` | Parsed via `parseInt`; NaN falls back to `18` |
| `data-card-bg` | `cardBg` | hex color | `"#ffffff"` | — |
| `data-card-text` | `cardText` | hex color | `"#333333"` | — |
| `data-gdpr-enabled` | `gdprEnabled` | boolean | `false` | Only `"true"` enables it |
| `data-gdpr-text` | `gdprText` | string | `"I agree to receive communications about local real estate market activity."` | Text content only |
| `data-reports-heading` | `reportsHeading` | string | `"Your Market Report"` | Text content only |
| `data-area-label` | `areaLabel` | string | `"Area of interest"` | Text content only |
| `data-area-placeholder` | `areaPlaceholder` | string | `"Select an area…"` | Text content only |
| `data-form-id` | `formId` | string | auto-generated | Sanitized to `[a-zA-Z0-9-_]`; empty falls back to random ID |

### 2.3 Rendering

| ID | Requirement |
|---|---|
| FW-010 | Widget DOM is constructed entirely via DOM API (`createElement`, `textContent`, `setAttribute`). User-controlled data is never interpolated into `innerHTML`. |
| FW-011 | All CSS is injected as a single `<style>` element with ID `rpr-reports-embed-styles`. If the element already exists (multiple widgets on one page), no duplicate is injected. |
| FW-012 | All CSS selectors are scoped under `.rpr-rep-embed` to prevent leaking styles to the host page. |
| FW-013 | The widget wrapper element receives CSS custom properties (`--rpr-r-brand`, `--rpr-r-card-bg`, etc.) for theming. |
| FW-014 | Google Fonts are loaded by injecting a `<link>` element into `<head>` with the configured font families. Multi-word font names are URL-encoded (spaces → `+`). |
| FW-015 | Container queries (`@container`) drive responsive layout — the form grid switches from 2-column to 1-column at 480px container width. |

### 2.4 Step 1: Lead Capture Form

| ID | Requirement |
|---|---|
| FW-020 | **Full mode** renders: first name, last name (2-column), email, phone (2-column), area dropdown (full-width). |
| FW-021 | **Minimal mode** renders: area dropdown (full-width), email (full-width). First/last/phone are omitted from DOM. |
| FW-022 | Area dropdown is populated from `data-reports` entries. Each option's `value` is the numeric index into the reports array. Placeholder option is disabled + selected. |
| FW-023 | If `gdprEnabled` is true, a checkbox + label is rendered. The checkbox must be checked before submission proceeds. |
| FW-024 | A hidden honeypot input (`name="rpr_rep_hp"`, `tabindex="-1"`, positioned offscreen) is always rendered. If this field has a value on submit, submission is silently aborted. |
| FW-025 | Submit button displays the configured `btnLabel` as text content. |

### 2.5 Form Validation

| ID | Field | Rule | Error Message |
|---|---|---|---|
| FV-001 | `first_name` | Required in full mode; `.trim().length >= 2` | "Please enter your first name" |
| FV-002 | `last_name` | Required in full mode; `.trim().length >= 2` | "Please enter your last name" |
| FV-003 | `email` | Required; regex `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` | "Enter a valid email address" |
| FV-004 | `area` | Required; value must not be empty string | "Please select an area" |
| FV-005 | `consent` (GDPR) | Required when `gdprEnabled`; checkbox must be checked | GDPR wrapper gets `is-error` class |

Validation behavior:
- All fields are validated on submit. The first invalid field is not focused (no auto-scroll).
- Error state is an `is-error` CSS class on the input + error message text in an adjacent `.rpr-r-error-msg` element.
- Error state clears on `input` or `change` event for that field.
- GDPR error state clears on checkbox `change`.

### 2.6 Form Submission

| ID | Requirement |
|---|---|
| FS-001 | On submit click: check `_rprSubmitted` flag — if true, abort (prevents duplicate submissions). |
| FS-002 | Run validation (FV-001 through FV-005). If any fail, abort. |
| FS-003 | Check honeypot field. If non-empty, abort silently. |
| FS-004 | Parse selected area index. If NaN or out of bounds, abort. |
| FS-005 | Disable submit button. Show "Sending…" status text. |
| FS-006 | If webhook URL is configured: POST JSON payload to webhook. If response is not `ok`, log warning but continue. If fetch throws (network error), show error message for 4 seconds, re-enable button, and abort (do not proceed to step 2). |
| FS-007 | If webhook is not configured: clear status text, re-enable button. |
| FS-008 | On success: set `_rprSubmitted = true`, hide step 1, show step 2, populate step 2 with the selected report. |

### 2.7 Webhook Payload

The widget POSTs the following JSON body with `Content-Type: application/json`:

| Field | Type | Source |
|---|---|---|
| `form_id` | string | Config `formId` or auto-generated |
| `first_name` | string | Form input (empty string in minimal mode) |
| `last_name` | string | Form input (empty string in minimal mode) |
| `email` | string | Form input |
| `phone` | string | Form input (empty string in minimal mode) |
| `selected_area` | string | The `label` of the selected report entry |
| `report_url` | string | The `url` of the selected report entry |
| `agent_name` | string | Config `agentName` |
| `brokerage` | string | Config `brokerage` |
| `gdpr_consent` | `1` \| `0` \| `null` | `1` if checked, `0` if unchecked, `null` if GDPR not enabled |
| `source_url` | string | `window.location.href` at time of submission |
| `timestamp` | string | ISO 8601 UTC timestamp |

### 2.8 Step 2: Report Delivery

| ID | Requirement |
|---|---|
| FR-001 | Display a "Back" button that returns to step 1. |
| FR-002 | Display the configured `reportsHeading` as heading text. |
| FR-003 | Display a report card with: icon (document SVG), area label, "Local market report · RPR" meta text, and a "View Report" button. |
| FR-004 | "View Report" button is an `<a>` tag with `target="_blank"` and `rel="noopener noreferrer"`. URL is validated against `http(s)://` regex before assignment. |
| FR-005 | SVG icons are constructed via `document.createElementNS` (DOM API), not innerHTML. |

### 2.9 Display Modes

#### 2.9.1 Inline

| ID | Requirement |
|---|---|
| FD-001 | Create a `.rpr-rep-embed` wrapper element. Insert it into the DOM immediately before the `<script>` tag. Build the full card inside it. |

#### 2.9.2 Floating

| ID | Requirement |
|---|---|
| FD-010 | Create a `.rpr-rep-embed` root appended to `document.body`. |
| FD-011 | Render a fixed-position button (`.rpr-r-float-btn`) in the configured corner (`bottom-right` or `bottom-left`). |
| FD-012 | Clicking the float button opens a modal overlay containing the card. |
| FD-013 | Clicking outside the card (on the overlay backdrop) closes the overlay and calls `_rprReset()`. |
| FD-014 | Pressing Escape closes the overlay and calls `_rprReset()`. |

#### 2.9.3 Modal

| ID | Requirement |
|---|---|
| FD-020 | Create a `.rpr-rep-embed` root appended to `document.body`. |
| FD-021 | If `data-modal-trigger` is provided: query all matching elements and attach click handlers that open the overlay. Invalid selectors are caught and logged. |
| FD-022 | If `data-modal-trigger` is absent or matches nothing: render a fallback button at the script tag location using `btnLabel` text. |
| FD-023 | Overlay close behavior is identical to floating mode (backdrop click + Escape). |

### 2.10 Reset Behavior

| ID | Requirement |
|---|---|
| FX-001 | `_rprReset()` restores step 1 visibility, clears all input fields, resets area dropdown to placeholder, unchecks GDPR checkbox, clears all error states, re-enables submit button, clears status text, and resets `_rprSubmitted` flag. |
| FX-002 | `_rprReset()` is called when floating/modal overlays close. |
| FX-003 | **Known issue:** In inline mode, the "Back" button shows step 1 but does not reset `_rprSubmitted`, creating a dead-end state where the form is visible but cannot be resubmitted. |

---

## 3. Component: Embed Generator (`index.html` + `generator.js`)

### 3.1 Layout

| ID | Requirement |
|---|---|
| FG-001 | Three-column layout: side navigation (220px), center configuration panel, right preview panel (dark stage). |
| FG-002 | Side nav switches between five panes: Market Reports, Lead Delivery, Branding, Display, Settings. Only one pane is visible at a time. All inputs remain in the DOM regardless of active pane. |
| FG-003 | Preview panel shows a live-rendered card that updates in real-time as inputs change. |
| FG-004 | Output panel at the bottom of the preview shows syntax-highlighted embed code. |

### 3.2 Configuration Panes

#### Market Reports Pane
| ID | Requirement |
|---|---|
| FG-010 | Report area rows: label input + URL input + remove button. Minimum 1 row; maximum 50 rows. |
| FG-011 | "Add area" button appends a new empty row. |
| FG-012 | Remove button deletes the row. Disabled when only 1 row remains. |
| FG-013 | Report URL validation: if the URL does not contain `narrpr.com`, show a warning that it may not be an RPR report. |
| FG-014 | Widget title, subheadline, and button label are text inputs with default values. |
| FG-015 | Form mode toggle: two radio-card buttons ("Minimal" and "Full") that write to a hidden `#formMode` input. |

#### Lead Delivery Pane
| ID | Requirement |
|---|---|
| FG-020 | Delivery method dropdown with 12 options: none, ntfy, SimplePush, Pushover, Toolkit, Slack, Discord, Google Sheets, GoHighLevel, Make, Zapier, Custom. |
| FG-021 | Selecting a method shows an instruction panel with step-by-step setup guide for that service. |
| FG-022 | Selecting a method (except "none") shows the webhook URL input field with a service-specific placeholder. |
| FG-023 | Webhook URL input: if non-empty and not starting with `https://`, show an inline HTTPS warning. |
| FG-024 | "Send test" button: visible only when a URL is entered. Sends a test JSON payload via `fetch` with `mode: 'no-cors'` and `Content-Type: text/plain`. Shows success ("Test sent — check your [destination]") or error message. |
| FG-025 | "No delivery" warning banner: shown when no delivery method is selected or "none" is chosen. |

#### Branding Pane
| ID | Requirement |
|---|---|
| FG-030 | Agent name and brokerage text inputs. |
| FG-031 | Logo URL input with "must be https://" hint. |
| FG-032 | Brand color: color picker swatch + hex text input, bidirectionally synced. |
| FG-033 | Heading font and body font: text inputs accepting Google Font family names. |

#### Display Pane
| ID | Requirement |
|---|---|
| FG-040 | Three-tab display mode selector: Inline, Floating, Modal. |
| FG-041 | Floating mode reveals: float button label input, position dropdown (bottom-right/bottom-left). |
| FG-042 | Modal mode reveals: trigger CSS selector input. |
| FG-043 | Preview updates to show mode-specific chrome (float button, modal overlay hint). |

#### Settings Pane
| ID | Requirement |
|---|---|
| FG-050 | GDPR checkbox toggle + conditional label text input. |
| FG-051 | Card background color picker + hex input. |
| FG-052 | Card text color picker + hex input. |
| FG-053 | Card border radius numeric input. |
| FG-054 | Area dropdown label text input. |
| FG-055 | Step 2 heading text input. |

### 3.3 Code Generation

| ID | Requirement |
|---|---|
| FG-060 | Code output is a single `<script>` tag with `src` pointing to the R2-hosted widget and `data-*` attributes for all configured values. |
| FG-061 | `data-reports` is emitted as a single-quoted JSON array (to avoid escaping double quotes in attribute values). |
| FG-062 | Attributes at their default values are omitted to keep the embed code minimal. Exception: `data-form-mode` is always emitted for explicitness. |
| FG-063 | All attribute values are HTML-entity-escaped (ampersands, quotes, angle brackets). |
| FG-064 | Syntax highlighting colors: tag names (pink), attribute names (blue), double-quoted values (green), single-quoted values (yellow). |
| FG-065 | "Copy" button writes the raw (unhighlighted) embed code to the clipboard. Falls back to `document.execCommand('copy')` if `navigator.clipboard` is unavailable. |
| FG-066 | "Copy generator link" button writes the current page URL (with hash config) to the clipboard. |

### 3.4 Persistence

| ID | Requirement |
|---|---|
| FG-070 | All configuration is serialized to a URL search-params string and stored in both `location.hash` and `localStorage` key `rpr-generator-config`. |
| FG-071 | On load: hash takes precedence over localStorage. If both are empty, seed with default values + two example report rows. |
| FG-072 | Backwards compatibility: pre-v1.0.6 configs that stored `webhook=…` are migrated to `deliveryMethod=custom` + `deliveryUrl=…`. |
| FG-073 | "Reset" button: confirms with the user, clears localStorage key, strips URL hash, and reloads the page. |

### 3.5 Live Preview

| ID | Requirement |
|---|---|
| FG-080 | Preview card renders the same visual layout as the deployed widget: header bar, hero text, form fields, submit button, disclaimer. |
| FG-081 | Preview is read-only: all inputs have `tabindex="-1"` and `readonly`. |
| FG-082 | Card background, text color, and border radius are applied directly to the preview element. |
| FG-083 | Google Fonts are loaded into the generator page and applied to the preview via inline styles. |
| FG-084 | Desktop/mobile toggle: switches the preview frame width (100% vs 375px). |
| FG-085 | Generation is debounced at 60ms to handle fast typing without lag. |

---

## 4. Component: Google Sheets Integration (`integrations/google-sheets/`)

### 4.1 Apps Script (`Code.gs`)

| ID | Requirement |
|---|---|
| FI-001 | `doPost(e)`: Parse the POST body as JSON. Append a row to the "Leads" sheet with columns: Timestamp, First Name, Last Name, Email, Phone, Area, Report URL. |
| FI-002 | Tolerate both `application/json` and `text/plain` content types (the generator test button sends `text/plain` due to `no-cors`). |
| FI-003 | `doGet()`: Return a friendly HTML status page confirming the Web App is active. |
| FI-004 | `getOrCreateLeadsSheet()`: Find the "Leads" sheet by name. If not found, check if the active sheet has matching column headers. If neither, create a new "Leads" sheet with headers and frozen first row. |
| FI-005 | All errors are caught and logged via `console.error`. The function always returns a JSON response (never throws, which would cause Google to return a 500). |

### 4.2 Template Distribution

| ID | Requirement |
|---|---|
| FI-010 | The master template is a Google Sheet with the Apps Script attached. |
| FI-011 | Agents access it via a force-copy URL (`/copy` suffix) linked from the generator's Sheets setup panel. |
| FI-012 | Each agent's copy is independent — updating the master script does not auto-update existing copies. |

---

## 5. Cross-Cutting Concerns

### 5.1 Security Requirements

| ID | Requirement |
|---|---|
| FS-001 | All user-controlled data rendered via `textContent` or DOM API. Never via `innerHTML` interpolation. |
| FS-002 | `escHtml()` escapes `&`, `<`, `>`, `"`, `'` (five entities). |
| FS-003 | Report URLs validated at parse time AND at render time (defense in depth). |
| FS-004 | Font names sanitized to `[a-zA-Z0-9 -]` before use in CSS. |
| FS-005 | `data-form-id` sanitized to `[a-zA-Z0-9-_]`. |
| FS-006 | Webhook must be HTTPS. Non-HTTPS values are rejected with console error. |
| FS-007 | Logo must be HTTPS. HTTP/data URIs are rejected. |
| FS-008 | Honeypot field positioned offscreen, `tabindex="-1"`, `autocomplete="off"`. |
| FS-009 | `_rprSubmitted` flag prevents duplicate webhook fires within a session. |
| FS-010 | Generator CSP: `script-src 'self'`; `connect-src 'self' https:`; `img-src https: data:`; `font-src https://fonts.gstatic.com`. |

### 5.2 Accessibility Requirements

| ID | Requirement | Status |
|---|---|---|
| FA-001 | Form fields have associated `<label>` elements with `htmlFor` matching field `id`. | Implemented |
| FA-002 | Error messages are adjacent to their field (visual proximity). | Implemented |
| FA-003 | Focus ring visible on all interactive elements via `box-shadow`. | Implemented |
| FA-004 | Generator collapsible sections have `role="button"`, `tabindex="0"`, `aria-expanded`, `aria-controls`. | Implemented |
| FA-005 | Modal overlay should trap focus within the card. | **Not yet implemented** |
| FA-006 | Modal overlay should have `role="dialog"` and `aria-modal="true"`. | **Not yet implemented** |
| FA-007 | Error messages should be linked to fields via `aria-describedby`. | **Not yet implemented** |
