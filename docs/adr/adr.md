# Architectural Decision Records (ADR)

**Product:** RPR Market Reports Embed Widget
**Last Updated:** 2026-05-21

Each ADR documents a significant architectural or technical decision, its context, alternatives considered, and the reasoning behind the chosen approach.

---

## ADR-001: Zero-Dependency, Single-File Client-Side Widget

**Status:** Active
**Date:** 2025 (initial release)

### Context

The widget needs to be deployed by real estate agents with minimal technical skill onto a wide variety of websites (WordPress, Squarespace, Wix, custom HTML). Agents should be able to paste a single code snippet and have it work.

### Decision

Build the widget as a single self-contained JavaScript file with no external dependencies (no React, Vue, jQuery, or build toolchain). All CSS is injected programmatically. The entire script is wrapped in an IIFE to avoid polluting the global scope.

### Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| **React/Vue component + CDN bundle** | Adds 30-100KB of framework code; potential conflicts with host page frameworks; requires build step for updates |
| **Web Component (Shadow DOM)** | Better CSS isolation, but Safari 12 support was spotty at time of development; `document.currentScript` interaction with custom elements adds complexity |
| **iframe embed** | Perfect isolation, but cross-origin restrictions prevent webhook POST from the iframe context without a proxy; also complicates responsive sizing |

### Consequences

- (+) Zero possibility of dependency conflicts on host pages
- (+) Tiny payload (~45KB uncompressed)
- (+) No build step — edit the file and upload
- (-) All CSS must be injected via `<style>` element, not a separate stylesheet
- (-) CSS scoping relies on class-name prefixes (`.rpr-rep-embed`) rather than Shadow DOM encapsulation
- (-) No component model — all DOM construction is imperative

---

## ADR-002: Webhook-Only Lead Delivery (No Email)

**Status:** Active
**Date:** 2025 (initial release)

### Context

Agents need to receive leads when visitors submit the form. The most intuitive delivery mechanism is email, but the widget is deployed by potentially thousands of agents across the nation. Running transactional email infrastructure (SMTP, SendGrid, Mailgun) introduces:
- Cost per email at scale
- Deliverability challenges (SPF, DKIM, bounce handling)
- Server-side infrastructure that must be maintained
- Risk of the sending domain being blacklisted

### Decision

Deliver leads exclusively via HTTPS webhook POST. The agent configures a webhook URL from any service they choose (Zapier, Make, GoHighLevel, Slack, Discord, ntfy, Google Sheets, etc.). The widget POSTs JSON directly to that URL from the visitor's browser.

### Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| **Server-side email relay** | Requires running and maintaining email infrastructure; cost scales with lead volume; deliverability risk |
| **Client-side email (EmailJS, SMTP.js)** | Exposes API keys in page source; limited free tiers; still depends on a third-party service |
| **Hybrid: webhook + optional email via proxy** | Adds server-side complexity; deferred to a future phase |

### Consequences

- (+) Zero server-side infrastructure — fully client-side
- (+) Agent chooses their own delivery channel, including free options
- (+) No email deliverability risk for RPR
- (-) Webhook URL is exposed in page source (visible to anyone who views source)
- (-) Some services require CORS headers for preflight; the widget currently sends `Content-Type: application/json` which triggers preflight
- (-) No built-in retry — if the webhook fails, the lead is lost

---

## ADR-003: Configuration via HTML Data Attributes

**Status:** Active
**Date:** 2025 (initial release)

### Context

The widget needs to be configured per-agent (different reports, branding, webhook URL). Configuration must be embeddable in a single `<script>` tag that non-technical agents can copy-paste.

### Decision

All configuration is passed via `data-*` attributes on the `<script>` tag itself. The widget reads them via `document.currentScript.getAttribute()` during synchronous execution.

### Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| **Global JS variable before the script** | Requires agents to write JavaScript; error-prone; pollutes global scope |
| **Separate JSON config file** | Requires hosting a second file; increases deployment complexity |
| **Query parameters on the script `src` URL** | Non-standard; cache-busting issues; URL length limits |
| **Server-side config endpoint** | Requires server infrastructure; adds latency; defeats the "paste and go" model |

### Consequences

- (+) Single `<script>` tag contains everything — truly "copy, paste, done"
- (+) HTML attributes are familiar to anyone who's edited HTML
- (+) Visual generator can produce the complete snippet automatically
- (-) `document.currentScript` is `null` with `async`/`defer`, so the script cannot be loaded asynchronously
- (-) Large `data-reports` arrays make the HTML attribute very long (practical limit ~50 areas)
- (-) JSON-in-attributes requires careful quoting (single quotes around the attribute, double quotes inside the JSON)

---

## ADR-004: DOM API Construction Over innerHTML

**Status:** Active
**Date:** 2025 (v1.0.3 security hardening)

### Context

The initial implementation used `innerHTML` with template literals to build UI elements. User-controlled data (agent name, area labels, button text) was interpolated directly into HTML strings, creating XSS vulnerabilities.

### Decision

All DOM elements are created via `document.createElement()`, `document.createElementNS()` (for SVG), `textContent`, and `setAttribute()`. The `escHtml()` function exists for the few places where `innerHTML` is still used (hero section headline/subheadline), but these only receive values that have been entity-escaped.

### Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| **DOMPurify library** | Adds a dependency (~10KB); widget is zero-dependency by design (ADR-001) |
| **Template literals with escaping everywhere** | Error-prone; one missed escape creates an XSS hole |
| **Trusted Types API** | Not supported in all target browsers (Firefox behind flag); would require a polyfill |

### Consequences

- (+) XSS via innerHTML is structurally impossible for DOM-API-constructed elements
- (+) No additional dependencies
- (-) DOM API code is more verbose than template literals
- (-) SVG construction via `createElementNS` is particularly verbose

---

## ADR-005: CSS Scoping via Class-Name Prefix

**Status:** Active
**Date:** 2025 (initial release)

### Context

The widget injects CSS into the host page. This CSS must not affect the host page's existing styles, and the host page's styles should minimally affect the widget.

### Decision

All widget CSS selectors are prefixed with `.rpr-rep-embed`. A universal reset (`* { box-sizing: border-box; margin: 0; padding: 0; }`) is scoped under `.rpr-rep-embed` to normalize the widget's internal layout without affecting the host.

### Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| **Shadow DOM** | Better encapsulation, but complicates `document.currentScript` access and had Safari compatibility concerns at launch |
| **CSS Modules / scoped styles** | Requires a build step; widget has no build toolchain (ADR-001) |
| **iframe isolation** | See ADR-001 alternatives |
| **`!important` on all declarations** | Aggressive; breaks host page overrides and makes widget un-customizable |

### Consequences

- (+) Simple, zero-tooling approach
- (+) Host page can intentionally override widget styles if needed
- (-) Host page `*` selectors or aggressive resets can bleed into the widget
- (-) Specificity battles are possible (though rare in practice)

---

## ADR-006: Static Generator with Client-Side Persistence

**Status:** Active
**Date:** 2025 (v1.0.5)

### Context

Agents need a way to configure the widget visually. The configuration tool should be shareable (an agent can send a link to their assistant) and should remember settings between sessions.

### Decision

The generator is a static HTML page (hosted on GitHub Pages) with no backend. Configuration is persisted in two locations:
1. **URL hash** — `location.hash` contains a URLSearchParams-encoded config string, making the URL shareable.
2. **localStorage** — the same string is stored as `rpr-generator-config` for session persistence.

On load, hash takes precedence over localStorage. If neither exists, defaults are used.

### Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| **Server-side database with user accounts** | Requires authentication, server infrastructure, and operational overhead for a configuration tool |
| **localStorage only** | Not shareable — agent can't send a link to their assistant or switch devices |
| **URL hash only** | Long URLs can be truncated by email clients or social media; no persistence across sessions if bookmark is lost |

### Consequences

- (+) Zero backend infrastructure
- (+) Config is shareable via URL
- (+) Config persists across sessions via localStorage
- (-) Webhook URL is included in the shareable URL — agents must be warned not to share it publicly
- (-) Very large configurations (many reports) can make the URL unwieldy
- (-) Legacy config migration (pre-v1.0.6 `webhook` → `deliveryUrl`) must be maintained indefinitely

---

## ADR-007: Google Sheets Integration via Force-Copy Template

**Status:** Active
**Date:** 2025 (v1.0.7)

### Context

Many agents don't use a CRM and want a simple, free way to log leads. Google Sheets is universally accessible and free. However, deploying an Apps Script Web App is non-trivial for non-technical users.

### Decision

Publish a Google Sheets template with the Apps Script (`Code.gs`) already attached. Agents access it via a `/copy` URL that forces Google to create a copy in their Drive. They then deploy the script as a Web App (3 clicks in the Apps Script editor) and paste the resulting URL into the generator.

### Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| **Shared Google Sheet (all agents write to one sheet)** | Privacy disaster — all agents see each other's leads |
| **Agent manually pastes the Apps Script** | Too many steps; agents would paste incorrectly |
| **Server-side proxy that writes to Sheets API** | Requires OAuth, server infrastructure, and per-agent authorization |
| **Airtable/Notion integration** | Not universally free; API limits; requires accounts |

### Consequences

- (+) Completely free for agents
- (+) Each agent's data is isolated in their own Google account
- (+) The script comes pre-attached — agents don't paste code
- (-) Agents must complete the "Deploy as Web App" flow, which involves granting permissions
- (-) Updating the script for existing agents requires them to make a fresh copy
- (-) Google Workspace accounts must set "Who has access" to "Anyone" (not "Anyone in org"), which is a common misconfiguration

---

## ADR-008: Cloudflare R2 for Widget CDN Hosting

**Status:** Active
**Date:** 2025 (v1.0.5)

### Context

The widget script needs to be served from a reliable, fast CDN. Every deployed widget loads this script on every page view.

### Decision

Host the widget script on Cloudflare R2 with a public bucket URL: `pub-6607a59d1d3b4ed18490937c995526d1.r2.dev`.

### Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| **GitHub Pages (same as generator)** | Rate limits and cache behavior are unpredictable for high-traffic script assets |
| **npm CDN (unpkg, jsDelivr)** | Requires publishing to npm; version management adds friction; CDN outages have affected these services |
| **Self-hosted S3 + CloudFront** | More operational overhead than R2; R2 has zero egress fees |

### Consequences

- (+) Cloudflare's global edge network — fast worldwide
- (+) Zero egress fees (R2's differentiator vs S3)
- (+) Simple upload workflow — no build/publish pipeline
- (-) The URL is opaque (hash-based bucket name) — not human-readable
- (-) No built-in versioning — the same URL always serves the latest upload
- (-) Single point of failure if the R2 bucket or Cloudflare has an outage

---

## ADR-010: Cloudflare Worker Lead Proxy

**Status:** Active
**Date:** 2026-05 (v1.3.0)
**Supersedes:** ADR-002 partial (proxy deferral)

### Context

ADR-002 established webhook-only lead delivery with no server-side infrastructure. As the agent base grows, this creates five production-grade problems: (1) webhook URLs visible in page source invite spam and abuse, (2) CORS failures on many webhook services, (3) no server-side retry — lost leads on transient failures, (4) no rate limiting against bots, (5) no observability into delivery health.

Every production competitor (Typeform, Jotform, HubSpot Forms) uses a server-side proxy for form submissions.

### Decision

Build a Cloudflare Worker lead proxy using the Cloudflare Developer Platform:

- **Worker** (single worker with `fetch()` + `queue()` handlers): receives form submissions, validates, enqueues for delivery
- **Cloudflare Queue**: at-least-once delivery with configurable retry and dead letter queue
- **D1 database**: agent config store (token -> webhook URL, rate limit config, HMAC secret)
- **KV namespace**: idempotency — SHA-256 payload hash with 5-minute TTL prevents double-submit
- **Durable Object**: per-IP sliding window rate limiter (configurable per agent)
Widget uses `data-proxy` attribute with fallback to `data-webhook` for backward compatibility. Turnstile bot verification is planned for Phase 3 (requires widget-side integration).

### Alternatives Considered

| Alternative | Why Rejected |
|---|---|
| **AWS Lambda + API Gateway** | Higher cold start, more operational overhead, no native queue integration, separate billing account needed |
| **Separate ingest and delivery Workers** | Adds complexity for local development (experimental multi-config wrangler); RPR's scale (<15M messages/month) doesn't need independent scaling |
| **Durable Objects for retry** (instead of Queues) | Queues are purpose-built for this — at-least-once delivery, DLQ, configurable batch/timeout. DOs for retry is a workaround pattern. |
| **Keep client-side only with localStorage retry** | Only works if same visitor returns to same page on same device. Not viable for >99% delivery target. |

### Consequences

- (+) Webhook URLs hidden from page source — only proxy token visible
- (+) Server-side retry guarantees delivery even if visitor closes browser
- (+) Per-IP rate limiting blocks bot abuse
- (+) Deduplication prevents double-submit from retry
- (+) CORS normalized — browser POSTs to Worker origin, no preflight issues
- (+) HMAC signing enables agents to verify payload authenticity
- (+) ~$5.60/month at 10K agents — cost-effective
- (+) Uses same Cloudflare ecosystem as existing R2 CDN (ADR-008)
- (-) First server-side component — introduces infrastructure to maintain
- (-) Requires Cloudflare account with Workers Paid plan ($5/mo base)
- (-) Agent onboarding requires token provisioning (no self-service UI yet)
