# System Design Document

**Product:** RPR Market Reports Embed Widget
**Version:** 1.1.0
**Last Updated:** 2026-05-21
**Status:** Active

---

## 1. Architecture Overview

The RPR Market Reports Embed Widget follows a **fully client-side, serverless architecture**. There are no backend services, databases, or APIs owned by the product. All logic executes in the visitor's browser, and lead data flows directly from the browser to the agent's configured webhook endpoint.

### C4 Model — System Context (Level 1)

```
┌─────────────────────────────────────────────────────┐
│                   EXTERNAL ACTORS                    │
├──────────────┬──────────────────┬───────────────────┤
│  Website     │  Real Estate     │  Webhook          │
│  Visitor     │  Agent           │  Services          │
│  (end user)  │  (configurator)  │  (Zapier, Slack,  │
│              │                  │   Sheets, etc.)   │
└──────┬───────┴────────┬─────────┴─────────┬─────────┘
       │                │                   │
       │ Visits agent   │ Configures        │ Receives
       │ website        │ widget via        │ lead data
       │                │ generator         │ via POST
       ▼                ▼                   ▲
┌──────────────────────────────────────────────────────┐
│           RPR REPORTS EMBED WIDGET SYSTEM            │
│                                                      │
│  ┌───────────────┐    ┌──────────────────────────┐  │
│  │ Embed Widget  │    │ Embed Generator          │  │
│  │ (JS runtime)  │    │ (Static SPA)             │  │
│  │               │──▶ │                          │  │
│  │ Runs on agent │    │ Runs on GitHub Pages     │  │
│  │ website       │    │                          │  │
│  └───────────────┘    └──────────────────────────┘  │
│                                                      │
│  ┌───────────────┐    ┌──────────────────────────┐  │
│  │ Widget CDN    │    │ Google Sheets Integration │  │
│  │ (Cloudflare   │    │ (Apps Script template)    │  │
│  │  R2)          │    │                          │  │
│  └───────────────┘    └──────────────────────────┘  │
└──────────────────────────────────────────────────────┘
       │
       │ Report links point to
       ▼
┌──────────────────┐
│  RPR (narrpr.com)│
│  Report PDFs     │
└──────────────────┘
```

### C4 Model — Container Diagram (Level 2)

```
┌──────────────────────────────────────────────────────────────────┐
│                     AGENT'S WEBSITE                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  <script> tag with data-* attributes                       │  │
│  │  (configuration is embedded in the HTML)                   │  │
│  └─────────────────────┬──────────────────────────────────────┘  │
│                        │ loads                                    │
│                        ▼                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  rpr-reports-embed.js (from R2 CDN)                        │  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐ │  │
│  │  │ Config   │  │ DOM      │  │ Validation│  │ Webhook  │ │  │
│  │  │ Parser   │─▶│ Builder  │─▶│ Engine    │─▶│ Sender   │ │  │
│  │  │ (§0)     │  │ (§4)     │  │ (§5)      │  │ (§6)     │ │  │
│  │  └──────────┘  └──────────┘  └───────────┘  └────┬─────┘ │  │
│  │                                                    │       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐       │       │  │
│  │  │ Style    │  │ Font     │  │ Display   │       │       │  │
│  │  │ Injector │  │ Loader   │  │ Mode Init │       │       │  │
│  │  │ (§2)     │  │ (§1)     │  │ (§8)      │       │       │  │
│  │  └──────────┘  └──────────┘  └───────────┘       │       │  │
│  └────────────────────────────────────────────────────┼───────┘  │
│                                                       │          │
└───────────────────────────────────────────────────────┼──────────┘
                                                        │
                          HTTPS POST (JSON)             │
                                                        ▼
                                              ┌──────────────────┐
                                              │ Agent's Webhook  │
                                              │ (Zapier, Slack,  │
                                              │  Sheets, GHL,    │
                                              │  Make, etc.)     │
                                              └──────────────────┘
```

---

## 2. Component Architecture

### 2.1 Embed Widget (`rpr-reports-embed.js`)

The widget is organized into numbered sections within a single IIFE:

| Section | Responsibility | Key Functions |
|---|---|---|
| **§0** Config Parser | Read `data-*` attributes, parse JSON, validate inputs, build `CFG` object | `attr()`, `sanitizeFontName()`, `isValidHex()` |
| **§1** Font Loader | Load Google Fonts via `<link>` injection | `loadGoogleFonts()` |
| **§2** Style Injector | Inject scoped CSS as `<style>` element (deduplicated by ID) | Inline style string |
| **§3** Token Applicator | Set CSS custom properties on widget root elements | `applyTokens()` |
| **§4** DOM Builder | Construct all DOM elements for header, step 1, step 2 | `buildHeader()`, `buildStep1()`, `buildStep2()`, `populateStep2()`, `buildCard()` |
| **§5** Validation | Validate form fields before submission | `validateStep1()`, `setError()`, `clearError()` |
| **§6** Payload Collector | Assemble webhook JSON payload from form state | `collectPayload()` |
| **§7** Utility | HTML entity escaping | `escHtml()` |
| **§8** Display Modes | Initialize inline, floating, or modal rendering | `initInline()`, `initFloating()`, `initModal()` |
| **§9** Init | Entry point — dispatch to display mode initializer | `init()` |

### 2.2 Embed Generator (`generator.js`)

The generator is a single JavaScript file that drives the configurator UI:

| Module | Responsibility |
|---|---|
| **Defaults & Constants** | `DEFAULTS` object, `FIELD_KEYS` array, `DELIVERY_META` lookup |
| **Boot** | `DOMContentLoaded` handler — restore config, wire listeners, initial render |
| **Collapsible Sections** | Legacy accordion pattern (hidden in v1.1, kept for compat) |
| **Delivery Handler** | Show/hide instruction panels and URL field based on selected method |
| **Webhook Test** | Send test payload with `no-cors` mode |
| **Report Rows** | Add/remove/validate report area rows |
| **Side Nav** | Switch visible pane |
| **Form Mode** | Toggle minimal/full mode |
| **Display Mode** | Switch inline/floating/modal with mode-specific fields |
| **Value Reader** | `vals()` reads all form inputs into a config object |
| **Code Generator** | `renderCode()` builds the syntax-highlighted `<script>` tag |
| **Preview Renderer** | `renderPreview()` updates the live card with current config |
| **Persistence** | `configToHash()` / `hashToConfig()` / `persistConfig()` |
| **Clipboard** | Copy embed code or generator link |

### 2.3 Generator UI (`index.html`)

Static HTML page with the following layout structure:

```
┌─────────────────────────────────────────────────────────┐
│  Site Header (sticky, glass effect)          [Reset]    │
├────────┬──────────────────────┬─────────────────────────┤
│        │                      │                         │
│ Side   │  Config Panel        │  Preview Panel          │
│ Nav    │  (scrollable)        │  (dark stage)           │
│        │                      │                         │
│ ■ Mkt  │  ┌────────────────┐  │  ┌─────────────────┐   │
│   Rpts │  │ Glass Card     │  │  │ Live Preview    │   │
│ ○ Lead │  │ (active pane)  │  │  │ Card            │   │
│ ○ Brnd │  └────────────────┘  │  └─────────────────┘   │
│ ○ Disp │                      │                         │
│ ○ Sets │                      │  ┌─────────────────┐   │
│        │                      │  │ Output Panel    │   │
│        │                      │  │ (embed code)    │   │
│        │                      │  │ [Copy] [Link]   │   │
│        │                      │  └─────────────────┘   │
└────────┴──────────────────────┴─────────────────────────┘
  220px        ~1fr                    ~1fr
```

---

## 3. Data Flow

### 3.1 Lead Capture Flow

```
Visitor lands on agent website
         │
         ▼
Browser loads <script> tag
         │
         ▼
Widget parses data-* attributes → builds CFG object
         │
         ▼
Widget injects CSS → builds DOM → renders Step 1 form
         │
         ▼
Visitor fills form → clicks Submit
         │
         ├─── Validation fails → show errors, stop
         │
         ├─── Honeypot filled → silent abort
         │
         ├─── Already submitted → silent abort
         │
         ▼
Widget POSTs JSON to data-webhook URL
         │
         ├─── Network error → show retry message, stop
         │
         ├─── HTTP error → log warning, continue
         │
         ▼
Set _rprSubmitted flag
Hide Step 1 → Show Step 2 (report card)
         │
         ▼
Visitor clicks "View Report" → new tab opens RPR PDF
```

### 3.2 Generator Configuration Flow

```
Agent opens generator URL
         │
         ├─── URL has hash? → parse config from hash
         │
         ├─── localStorage has config? → parse from storage
         │
         ├─── Neither? → seed defaults + example rows
         │
         ▼
Render all panes → render live preview → render embed code
         │
         ▼
Agent edits any field
         │
         ▼
Debounced generate() → re-render preview + code + persist to hash + localStorage
         │
         ▼
Agent clicks "Copy"
         │
         ▼
Raw embed code written to clipboard
         │
         ▼
Agent pastes into website HTML
```

### 3.3 Google Sheets Integration Flow

```
Agent clicks "Make a copy" link in generator
         │
         ▼
Google Drive creates a copy of the template Sheet
(Apps Script comes pre-attached)
         │
         ▼
Agent opens Extensions > Apps Script
         │
         ▼
Agent deploys as Web App (Execute as: Me, Access: Anyone)
         │
         ▼
Agent copies the /exec URL → pastes into generator
         │
         ▼
Widget POSTs lead JSON to the /exec URL
         │
         ▼
Apps Script doPost() parses JSON → appends row to "Leads" sheet
```

---

## 4. Security Architecture

### 4.1 Threat Model

| Threat | Vector | Mitigation |
|---|---|---|
| **XSS via data attributes** | Attacker controls agent's website HTML, injects malicious `data-*` values | DOM API construction (no innerHTML with user data); `escHtml()` for template-rendered content |
| **XSS via report URLs** | `javascript:` URLs in `data-reports` | URL scheme allowlist (`http://` or `https://`) enforced at parse time AND render time |
| **CSS injection via font names** | Malicious font name closes CSS context | `sanitizeFontName()` strips everything except `[a-zA-Z0-9 -]` |
| **PII exfiltration** | Webhook over HTTP exposes lead data in transit | HTTPS-only enforcement for `data-webhook`; non-HTTPS values are rejected |
| **Credential leak via logo** | HTTP logo URL could expose cookies/referrer | HTTPS-only enforcement for `data-logo-url` |
| **Webhook spam** | Bot submits fake leads repeatedly | Honeypot field; `_rprSubmitted` per-session guard; **Gap: no rate limiting or CAPTCHA** |
| **Webhook URL theft** | Attacker views page source, extracts webhook URL, sends fake data | **Known gap** — webhook URL is exposed in HTML; planned mitigation: server-side proxy |
| **CSRF on webhook** | Malicious page triggers POST to agent's webhook | Webhook endpoints are typically not CSRF-protected (they accept any POST); this is inherent to the webhook model |

### 4.2 Input Sanitization Map

| Input | Sanitization |
|---|---|
| `data-reports` JSON | `JSON.parse` + type checks + URL scheme filter |
| `data-webhook` | `startsWith('https://')` check |
| `data-logo-url` | `startsWith('https://')` check via regex |
| `data-font-heading`, `data-font-body` | `sanitizeFontName()` — `[a-zA-Z0-9 -]` only |
| `data-color-brand`, `data-color-brand-hover` | `isValidHex()` — `#[0-9a-fA-F]{3,6}` regex |
| `data-card-radius` | `parseInt()` with `NaN` fallback to `18` |
| `data-form-id` | Regex strip to `[a-zA-Z0-9-_]`; empty falls back to random |
| `data-modal-trigger` | `querySelectorAll()` wrapped in try/catch |
| All text content | Rendered via `textContent` (not innerHTML) |
| Hero headline/subheadline | Rendered via `innerHTML` but entity-escaped via `escHtml()` |

---

## 5. CSS Architecture

### 5.1 Scoping Strategy

All widget styles are scoped under `.rpr-rep-embed`:

```css
.rpr-rep-embed * { box-sizing: border-box; margin: 0; padding: 0; }
.rpr-rep-embed .rpr-r-card { ... }
.rpr-rep-embed .rpr-r-header { ... }
```

### 5.2 Naming Convention

All widget CSS classes follow the pattern: `rpr-r-{component}[-{modifier}]`

| Prefix | Meaning |
|---|---|
| `rpr-r-` | RPR Reports widget namespace |
| `rpr-rep-embed` | Widget root element class |

### 5.3 Theming via Custom Properties

The widget uses CSS custom properties set on the root element:

| Property | Source |
|---|---|
| `--rpr-r-brand` | `data-color-brand` |
| `--rpr-r-brand-hover` | `data-color-brand-hover` or auto-derived |
| `--rpr-r-btn-text` | Computed from brand luminance |
| `--rpr-r-focus-ring` | Brand color at 15% opacity |
| `--rpr-r-error` | Hardcoded `#d0021b` |
| `--rpr-r-card-radius` | `data-card-radius` |
| `--rpr-r-card-bg` | `data-card-bg` |
| `--rpr-r-card-border` | Derived from `card-bg` (solid for white, translucent for dark) |
| `--rpr-r-card-text` | `data-card-text` |
| `--rpr-r-font-heading` | `data-font-heading` (quoted for CSS) |
| `--rpr-r-font-body` | `data-font-body` (quoted for CSS) |

### 5.4 Responsive Design

Uses CSS Container Queries instead of viewport media queries:

```css
.rpr-rep-embed .rpr-r-card { container-type: inline-size; }

@container (max-width: 480px) {
  .rpr-rep-embed .rpr-r-fields { grid-template-columns: 1fr; }
}
```

This ensures the widget responds to its parent container's width, not the viewport — critical for widgets embedded in sidebars or narrow columns.

---

## 6. State Management

The widget has minimal state, all stored on DOM elements:

| State | Storage | Scope |
|---|---|---|
| `_rprSubmitted` | Property on wrapper element (`wrap._rprSubmitted`) | Per-widget instance |
| `_rprReset` | Function on wrapper element (`wrap._rprReset`) | Per-widget instance |
| Form field values | DOM input elements | Per-widget instance |
| Error states | CSS classes on input elements | Per-widget instance |
| Overlay open/close | CSS class `open` on overlay element | Per-widget instance |
| Configuration | `CFG` const in IIFE closure | Per-widget instance (via closure) |

The generator has more state, managed via:

| State | Storage |
|---|---|
| All config values | DOM input elements (read via `vals()`) |
| Display mode | Module-level `displayMode` variable |
| Row counter | Module-level `rowId` variable |
| Generate suppression flag | Module-level `_suppressGenerate` |
| Loaded fonts cache | Module-level `_loadedFonts` Set |
| Debounce timer | Module-level `_genTimer` |
| Persisted config | URL hash + localStorage |

---

## 7. Performance Characteristics

| Metric | Value | Notes |
|---|---|---|
| Widget script size | ~45KB uncompressed, ~12KB gzipped | Single file, no dependencies |
| Generator page | ~115KB HTML + ~45KB JS uncompressed | Single page, no framework |
| DOM nodes created (widget, full mode) | ~60-80 | Depends on number of areas |
| CSS rules injected | ~120 declarations | Single `<style>` element |
| Network requests (widget) | 1 (script) + 0-1 (Google Fonts) + 1 (webhook POST) | Minimal |
| Time to interactive | < 200ms on mid-tier devices | Synchronous script, immediate DOM construction |
| Render debounce (generator) | 60ms | Prevents layout thrashing during fast typing |
