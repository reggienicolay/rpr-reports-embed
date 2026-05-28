# Development Guidelines

**Product:** RPR Market Reports Embed Widget
**Last Updated:** 2026-05-21
**Status:** Active

---

## 1. Core Principles

### 1.1 Zero Dependencies

The widget must have **no external runtime dependencies**. No frameworks, no libraries, no polyfills. Every line of code that runs on the agent's website is code we wrote and control.

**Rationale:** The widget runs on thousands of diverse websites. Any dependency is a potential conflict surface. See [ADR-001](../adr/adr.md#adr-001-zero-dependency-single-file-client-side-widget).

### 1.2 Single-File Distribution

The embed widget (`rpr-reports-embed.js`) must remain a **single file**. No module imports, no code splitting, no separate CSS file. The generator (`index.html` + `generator.js`) is a two-file exception because it runs on a controlled hosting environment (GitHub Pages), not on arbitrary host pages.

### 1.3 Backwards Compatibility

Deployed widgets in the wild cannot be updated — they load whatever is currently on the CDN. Any change that would break an existing `data-*` attribute contract or alter default behavior for widgets **without** the new attribute is a breaking change and must be treated with extreme caution.

**Rule:** New `data-*` attributes must default to the previous behavior. Agents who don't update their embed code must see no change.

### 1.4 Security by Default

User-controlled data is hostile until proven otherwise. Every input from `data-*` attributes is validated and sanitized before use. DOM construction uses the DOM API, not string interpolation.

---

## 2. Code Style

### 2.1 JavaScript

| Rule | Standard |
|---|---|
| **Mode** | `'use strict'` inside the IIFE |
| **Encapsulation** | Widget: IIFE. Generator: module-level functions (no global exports except via DOM listeners) |
| **Variable declarations** | `const` by default; `let` only when reassignment is needed; never `var` |
| **Naming** | `camelCase` for variables and functions; `UPPER_SNAKE` for true constants (`REPORTS`, `STYLE_ID`, `COLUMNS`); `CFG` for the config object |
| **Strings** | Single quotes for JS strings; template literals only when interpolation is needed |
| **Semicolons** | Always |
| **Indentation** | Tabs in the widget file; tabs or spaces (consistent) in the generator |
| **Line length** | Soft limit 120 characters; no hard limit |
| **Comments** | Section headers use `/* === §N TITLE === */` format. Inline comments explain *why*, not *what*. Bug/security fix comments reference the fix ID (e.g., `/* BUG 4 FIX: ... */`, `/* SEC-1 FIX: ... */`) |

### 2.2 CSS

| Rule | Standard |
|---|---|
| **Scoping** | All widget selectors under `.rpr-rep-embed` |
| **Naming** | BEM-inspired: `.rpr-r-{block}`, `.rpr-r-{block}-{element}`, `.is-error` for states |
| **Custom properties** | `--rpr-r-{name}` namespace |
| **Units** | `rem` for spacing, `px` for borders and fixed sizes, unitless for line-height |
| **Responsive** | Container queries (`@container`), not viewport media queries, for the widget. Viewport media queries are acceptable in the generator. |
| **Vendor prefixes** | `-webkit-appearance` for form elements; `-webkit-backdrop-filter` for Safari |

### 2.3 HTML (Generator)

| Rule | Standard |
|---|---|
| **Doctype** | `<!DOCTYPE html>` |
| **Language** | `lang="en"` |
| **CSP** | Content Security Policy meta tag restricting script-src, connect-src, img-src, font-src |
| **Accessibility** | ARIA attributes on interactive elements; `role`, `tabindex`, `aria-expanded`, `aria-controls` on custom controls |
| **IDs** | `camelCase` — matching the JS `document.getElementById()` calls |

---

## 3. Security Rules

### 3.1 Mandatory

These rules are non-negotiable. Violations are blocking issues.

| # | Rule |
|---|---|
| S1 | **Never use `innerHTML` with user-controlled data.** Use `textContent`, `setAttribute`, or `createElementNS`. The only exception is the hero section where content is pre-escaped via `escHtml()`. |
| S2 | **All external URLs must be scheme-validated.** Webhook: `https://` only. Logo: `https://` only. Report URLs: `http(s)://` only. Reject `javascript:`, `data:`, `vbscript:`, and all other schemes. |
| S3 | **The `escHtml()` function must escape all five HTML entities:** `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`, `'` → `&#x27;`. |
| S4 | **Font names must be sanitized** to `[a-zA-Z0-9 -]` before use in CSS properties. |
| S5 | **Form IDs must be sanitized** to `[a-zA-Z0-9-_]`. |
| S6 | **CSS selectors from `data-modal-trigger`** must be wrapped in try/catch. |
| S7 | **The honeypot field must not be visually accessible** (offscreen positioning, `tabindex="-1"`, `autocomplete="off"`). |

### 3.2 Recommended

| # | Rule |
|---|---|
| S8 | Validate hex color inputs with `isValidHex()` before passing to color manipulation functions. |
| S9 | Numeric config values (`cardRadius`) should be parsed with `parseInt()` and fall back to defaults on `NaN`. |
| S10 | All `<a>` tags opening in new tabs should include `rel="noopener noreferrer"`. |
| S11 | The generator should warn agents about webhook URL exposure in shareable links. |

---

## 4. Testing Guidelines

### 4.1 Manual Testing Checklist

Before any release, verify:

**Widget:**
- [ ] Widget renders in inline, floating, and modal modes
- [ ] Full form mode shows all 4 fields + area dropdown
- [ ] Minimal form mode shows only email + area dropdown
- [ ] Validation fires for each required field
- [ ] Error messages appear and clear correctly
- [ ] Honeypot silently blocks submission when filled
- [ ] Webhook fires with correct JSON payload
- [ ] Step 2 shows correct report card for selected area
- [ ] "View Report" opens correct URL in new tab
- [ ] Floating button opens/closes overlay; form resets on close
- [ ] Modal trigger opens/closes overlay; form resets on close
- [ ] Escape key closes overlays
- [ ] Custom fonts load and apply correctly
- [ ] Dark card background/text colors apply correctly
- [ ] GDPR checkbox blocks submission when enabled and unchecked
- [ ] Widget does not leak CSS to host page
- [ ] Widget renders correctly when multiple instances are on one page
- [ ] Non-HTTPS webhook URL is rejected with console error
- [ ] `javascript:` URLs in `data-reports` are dropped

**Generator:**
- [ ] All panes switch correctly via side nav
- [ ] Live preview updates in real-time for all field changes
- [ ] Embed code output reflects all configuration
- [ ] "Copy" puts correct code on clipboard
- [ ] "Copy generator link" puts shareable URL on clipboard
- [ ] Config persists in URL hash and survives page reload
- [ ] Config restores from localStorage on fresh visit
- [ ] "Reset" clears all state and reloads with defaults
- [ ] "Send test" fires a test payload and shows result
- [ ] Report URL validation warns on non-narrpr.com URLs
- [ ] HTTPS warning appears for non-HTTPS webhook URLs

### 4.2 Browser Compatibility

Test on:
- Chrome (latest + 60)
- Firefox (latest + 55)
- Safari (latest + 12)
- Edge (latest)
- Mobile Safari (iOS 14+)
- Chrome for Android

### 4.3 Performance Testing

- Widget script parse + render should complete in < 200ms on a mid-tier Android device
- Generator page should be interactive within 1 second on desktop

---

## 5. Versioning & Release Process

### 5.1 Version Numbering

Semantic versioning: `MAJOR.MINOR.PATCH`

| Level | When to Increment |
|---|---|
| **MAJOR** | Breaking change to `data-*` attribute contract or webhook payload schema |
| **MINOR** | New features (new attributes, new display modes, new delivery methods) |
| **PATCH** | Bug fixes, security fixes, CSS tweaks |

### 5.2 Version Locations

The version number must be updated in:
1. `rpr-reports-embed.js` — file header comment (`v1.1.0`)
2. `generator.js` — file header comment
3. `README.md` — version badge at top
4. `docs/prd/prd.md` — version field

### 5.3 Changelog

All changes must be documented in:
1. `rpr-reports-embed.js` — file header changelog section (with fix IDs)
2. `README.md` — changelog section (summary)

Fix IDs follow the convention:
- `BUG N` — numbered bug fixes within a version
- `SEC-N` — numbered security fixes within a version

### 5.4 Release Steps

1. Update version numbers in all locations
2. Update changelog in widget header and README
3. Run manual testing checklist
4. Upload `rpr-reports-embed.js` to Cloudflare R2
5. Commit and push to GitHub (triggers GitHub Pages deployment for generator)
6. Verify the staging URL: `https://rprblogstaging.wpengine.com/reports-widget/`
7. Verify production: `https://reggienicolay.github.io/rpr-reports-embed/`

---

## 6. Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]
```

| Type | Use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `sec` | Security fix |
| `refactor` | Code restructuring without behavior change |
| `style` | CSS or formatting changes |
| `docs` | Documentation only |
| `chore` | Tooling, config, or maintenance |

Examples:
```
feat: data-form-mode="minimal" renders email-only lead form
fix: inline mode Back button resets _rprSubmitted flag
sec: block non-HTTPS webhooks entirely
docs: add Google Sheets setup guide with screenshots
```

---

## 7. File Organization

```
rpr-reports-embed/
├── rpr-reports-embed.js      # Embed widget (single-file, deployed to CDN)
├── generator.js               # Generator logic (deployed with index.html)
├── index.html                 # Generator UI (deployed to GitHub Pages)
├── README.md                  # User-facing documentation
├── docs/                      # Internal documentation
│   ├── prd/                   #   Product Requirements Document
│   ├── frd/                   #   Functional Requirements Document
│   ├── adr/                   #   Architectural Decision Records
│   ├── design/                #   System Design
│   ├── guidelines/            #   Development Guidelines (this file)
│   ├── infra/                 #   Infrastructure & Deployment
│   └── context/               #   Technical Context & Background
└── integrations/              # Third-party integration code
    └── google-sheets/         #   Google Sheets Apps Script
        ├── Code.gs            #     Apps Script receiver
        └── blog-post.md       #     Setup guide content
```
