# Technical Context & Project Background

**Product:** RPR Market Reports Embed Widget
**Last Updated:** 2026-05-21
**Status:** Active — In Production

---

## 1. Project Background

### 1.1 Origin

The RPR Market Reports Embed Widget was created as an internal tool to solve a specific problem in the real estate industry: RPR (Realtors Property Resource) generates high-quality, auto-updating market reports for NAR members, but there was no built-in way to use these reports as lead magnets. Agents were sharing report URLs freely, getting zero lead capture value from them.

This widget bridges that gap by gating report access behind a lightweight lead capture form. An agent pastes a single `<script>` tag onto their website, and the widget handles form rendering, validation, lead delivery, and report presentation.

### 1.2 Design Philosophy

The project was designed around a core constraint: **no server-side infrastructure**. This decision was driven by the intended deployment scale — potentially thousands of agents across the nation — where running and maintaining backend services would introduce operational complexity and cost disproportionate to the product's scope.

This constraint shaped every architectural decision:
- Client-side only → IIFE-wrapped JavaScript, no framework
- Lead delivery via webhooks → no email infrastructure
- Configuration via `data-*` attributes → no config server
- Generator as a static page → no user accounts, no database
- Google Sheets integration → each agent runs their own Apps Script

### 1.3 Development History

| Version | Date | Highlights |
|---|---|---|
| v1.0.0 | 2025 | Initial release — basic lead form with webhook delivery |
| v1.0.1 | 2025 | 10 bug fixes (crash on empty area, XSS via javascript: URLs, stuck button state, wrong error messages) |
| v1.0.2 | 2025 | 6 bug fixes (duplicate config key, stale status text, color helper NaN, invalid CSS radius, modal trigger crash) |
| v1.0.3 | 2025 | 8 security fixes (XSS via innerHTML, CSS injection, PII over HTTP, webhook spam, input sanitization) |
| v1.0.4 | 2025 | Generator improvements — collapsible sections, syntax highlighting, accessibility, debounced rendering |
| v1.0.5 | 2025 | Shareable generator URLs, config persistence, display mode preview, test webhook button, R2 CDN hosting |
| v1.0.6 | 2025 | Generator polish — collapsed sections by default, float button toggle in preview |
| v1.0.7 | 2025 | Lead Delivery dropdown with 12 methods (ntfy, SimplePush, Pushover, Toolkit, Slack, Discord, Sheets, GHL, Make, Zapier, Custom, None) + inline setup guides |
| v1.0.8 | 2025 | Generator hardening — HTTPS validation warning, Reset button, privacy note, external link security |
| v1.1.0 | 2025-2026 | Major generator redesign (side-nav layout, glass cards, form-mode toggle with minimal/full options), new `data-form-mode` attribute |

---

## 2. Codebase Structure

```
rpr-reports-embed/                    Root
├── rpr-reports-embed.js   (1275 lines)  Embed widget — the deployable product
├── generator.js           (1079 lines)  Generator logic — drives the configurator
├── index.html             (1908 lines)  Generator UI + on-page Install Guide & FAQ
├── help.css               (439 lines)   Styles for the on-page help section (scoped .rpr-help)
├── help.js                (114 lines)   Help section interactions (TOC, tabs, copy, FAQ search)
├── README.md              (285 lines)   User-facing documentation
├── avada/                              Avada/WordPress build of the help page
│   ├── help-avada-builder.txt            Native Avada Builder shortcode import
│   ├── help-avada-codeblock.html         Self-contained raw Code Block version
│   ├── help-faq-search-codeblock.html    FAQ live-search (no native equivalent)
│   ├── help-avada-global.css             Polish CSS for the native build
│   └── help-avada-README.md              Install + in-Builder polish guide
├── integrations/
│   └── google-sheets/
│       ├── Code.gs        (123 lines)   Google Sheets Apps Script receiver
│       └── blog-post.md   (167 lines)   Setup guide blog content
└── docs/                               Internal documentation (this folder)
    ├── prd/prd.md                        Product Requirements
    ├── frd/frd.md                        Functional Requirements
    ├── adr/adr.md                        Architectural Decision Records
    ├── design/design.md                  System Design
    ├── guidelines/guidelines.md          Development Guidelines
    ├── infra/infra.md                    Infrastructure & Deployment
    └── context/context.md                This file
```

**Total application code:** ~4,900 lines across 6 files (widget + generator + HTML + help CSS/JS + Apps Script).

The on-page Install Guide & FAQ lives at the bottom of `index.html` (a `.rpr-help` section) and is styled/driven by `help.css` + `help.js`. Its content is scoped under `.rpr-help` so it cannot collide with the generator. The `avada/` folder is a parallel build of the same help content as native Avada Builder elements, for embedding on the WordPress site (`blog.narrpr.com`) — it is not part of the GitHub Pages deployment.

No `package.json`, no `node_modules`, no build configuration, no test framework. The project has **zero build tooling** by design.

---

## 3. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Widget runtime** | Vanilla JavaScript (ES6+) | Zero dependencies; runs on any page |
| **Widget CSS** | Vanilla CSS with custom properties + container queries | No preprocessor needed; container queries for responsive |
| **Generator UI** | Vanilla HTML + CSS + JavaScript | Single-page app without a framework; static hosting |
| **CDN** | Cloudflare R2 | Free egress, global edge, S3-compatible |
| **Generator hosting** | GitHub Pages | Free, auto-deploys from repo |
| **Staging** | WP Engine (WordPress) | Tests widget in a real CMS context |
| **Sheets integration** | Google Apps Script | Runs in agent's Google account; free |
| **Version control** | Git + GitHub | Standard; public repo |
| **Typography** | Google Fonts (optional) | Free, loaded on demand |

---

## 4. Key Technical Patterns

### 4.1 IIFE Encapsulation

The entire widget is wrapped in an IIFE:

```javascript
(function() {
  'use strict';
  // ... all widget code ...
})();
```

This ensures zero global scope pollution. The `CFG` object, all functions, and all state are private to the closure.

### 4.2 Config via `document.currentScript`

The widget reads its configuration from `data-*` attributes on the script tag that loaded it:

```javascript
const scriptEl = document.currentScript;
const raw = scriptEl.getAttribute('data-reports');
```

This works because the script executes synchronously (no `async`/`defer`). The `currentScript` reference is captured immediately at the top of the IIFE and is `null` if the script is deferred.

### 4.3 DOM API Construction

All user-facing DOM elements are built with `createElement`/`textContent`:

```javascript
const nameEl = document.createElement('div');
nameEl.className = 'rpr-r-header-agent-name';
nameEl.textContent = CFG.agentName;
```

SVG icons are built with `createElementNS`:

```javascript
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute('viewBox', '0 0 24 24');
```

### 4.4 CSS Custom Properties for Theming

Brand colors, card styling, and fonts are set as CSS custom properties on the widget root:

```javascript
root.style.setProperty('--rpr-r-brand', CFG.colorBrand);
root.style.setProperty('--rpr-r-card-bg', CFG.cardBg);
```

CSS rules reference these properties:

```css
.rpr-rep-embed .rpr-r-submit {
  background: var(--rpr-r-brand);
  color: var(--rpr-r-btn-text);
}
```

### 4.5 Generator Debounced Rendering

The generator debounces regeneration at 60ms to handle fast typing:

```javascript
let _genTimer = 0;
function generate() {
  if (_suppressGenerate) return;
  clearTimeout(_genTimer);
  _genTimer = setTimeout(_generateNow, 60);
}
```

### 4.6 Config Persistence via URL Hash

Configuration is serialized to URLSearchParams and stored in the URL hash:

```javascript
function persistConfig() {
  const hash = configToHash();
  history.replaceState(null, '', hash ? '#' + hash : location.pathname + location.search);
  localStorage.setItem('rpr-generator-config', hash);
}
```

---

## 5. Known Technical Debt

| # | Item | Severity | Notes |
|---|---|---|---|
| TD-1 | `escHtml()` is duplicated between widget and generator with different implementations | Low | Generator version doesn't escape single quotes |
| TD-2 | Error color `#d0021b` appears as both a CSS variable and a hardcoded inline style | Low | Should use only the CSS variable |
| TD-3 | Inline mode "Back" button doesn't reset `_rprSubmitted` flag | Medium | Creates a dead-end UX in inline display mode |
| TD-4 | Phone field has no format validation | Low | Accepts any string including non-numeric |
| TD-5 | No automated tests | High | All testing is manual; regression risk on every change |
| TD-6 | No linting configuration | Medium | Code style is maintained manually |
| TD-7 | No minification or sourcemaps | Low | Widget is ~45KB uncompressed; acceptable but could be ~12KB minified+gzipped |
| TD-8 | Generator preview uses `innerHTML` with escaped strings | Medium | Works with `esc()` but less robust than pure DOM API |
| TD-9 | Legacy `webhook` parameter migration in hash config | Low | Must be maintained indefinitely for backwards compat |
| TD-10 | No CDN versioning — unversioned single URL | Medium | No rollback capability; bad deploy affects all widgets |

---

## 6. External Integration Points

### 6.1 Inbound (Widget loads from)

| Source | What | Protocol |
|---|---|---|
| Cloudflare R2 | `rpr-reports-embed.js` | HTTPS GET |
| Google Fonts | Font CSS + font files | HTTPS GET (optional) |

### 6.2 Outbound (Widget sends to)

| Destination | What | Protocol |
|---|---|---|
| Agent's webhook URL | Lead JSON payload | HTTPS POST |

### 6.3 Linked (Widget points to)

| Destination | What | Protocol |
|---|---|---|
| RPR (narrpr.com) | Report PDF URLs | HTTPS (user clicks link, new tab) |

### 6.4 Generator Integration Points

| Service | What | Protocol |
|---|---|---|
| Agent's webhook URL | Test lead payload | HTTPS POST (`no-cors`, `text/plain`) |
| Google Fonts | Preview font loading | HTTPS GET |
| Google Sheets | Force-copy template link | HTTPS (user clicks link) |

---

## 7. Deployment Environments

| Environment | URL | Purpose | Deployment |
|---|---|---|---|
| **Production (Widget)** | `https://pub-660...r2.dev/rpr-reports-embed.js` | Live widget loaded by all agent websites | Manual upload to R2 |
| **Production (Generator)** | `https://reggienicolay.github.io/rpr-reports-embed/` | Live generator used by agents | Auto-deploy on push to `main` |
| **Staging** | `https://rprblogstaging.wpengine.com/reports-widget/` | Testing in WordPress context | Manual embed code placement |
| **Local** | `file:///` or `localhost` | Development and testing | Open `index.html` directly |

---

## 8. Maintenance Notes

### 8.1 Updating the Widget

1. Edit `rpr-reports-embed.js`
2. Update version number in file header
3. Update changelog in file header
4. Test locally (open a test HTML file that includes the script tag)
5. Upload to R2 — **this is a live deployment, all widgets update immediately**
6. Verify on staging WordPress site

### 8.2 Updating the Generator

1. Edit `generator.js` and/or `index.html`
2. Commit and push to `main`
3. GitHub Pages deploys automatically (usually within 1-2 minutes)
4. Verify at the GitHub Pages URL

### 8.3 Updating the Google Sheets Template

1. Open the master template in Google Sheets
2. Edit the Apps Script (`Code.gs`) via Extensions > Apps Script
3. Deploy > Manage Deployments > edit the existing deployment > set New Version > Deploy
4. Existing agents' copies are NOT updated — they keep their old script
5. To distribute updates to existing agents, instruct them to make a fresh copy

### 8.4 Common Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Widget doesn't render | `async` or `defer` on script tag | Remove the attribute; widget requires synchronous loading |
| Widget renders but webhook fails | Non-HTTPS webhook URL | Use an HTTPS URL |
| Widget renders but webhook fails silently | CORS preflight failure on webhook endpoint | Webhook service must accept `Content-Type: application/json` POSTs with CORS headers, or use a service that does (Zapier, Make, GHL) |
| Generator shows stale config | Cached localStorage | Click Reset button or clear localStorage manually |
| Google Sheets not receiving leads | Apps Script deployed as "Anyone in org" instead of "Anyone" | Re-deploy with "Anyone" access |
| Generator preview fonts don't load | Misspelled Google Font name | Verify font name at fonts.google.com |
