# Product Requirements Document (PRD)

**Product:** RPR Market Reports Embed Widget
**Version:** 1.1.0
**Last Updated:** 2026-05-21
**Owner:** Reggie Nicolay
**Status:** Active — In Production

---

## 1. Executive Summary

The RPR Market Reports Embed Widget is a self-contained, zero-dependency JavaScript widget that enables real estate agents across the United States to capture leads by offering free local market reports from RPR (Realtors Property Resource). Agents drop a single `<script>` tag onto any website, and visitors fill out a short form to receive a link to a dynamic, auto-updating market report. Lead data is delivered to the agent via a webhook endpoint of their choice.

The product consists of two primary components:

1. **Embed Widget** (`rpr-reports-embed.js`) — The client-side widget that renders on agent websites and handles lead capture + report delivery.
2. **Embed Generator** (`index.html` + `generator.js`) — A visual configuration tool that lets agents build their embed code without writing any HTML or JSON.

A supporting **Google Sheets integration** (`integrations/google-sheets/`) provides a free, zero-cost lead storage option for agents who don't use a CRM.

---

## 2. Problem Statement

### 2.1 Context

RPR generates dynamic market reports (Market Activity, Neighborhood, Market Trends, Trade Area) that automatically update with the latest MLS data. These reports are valuable lead magnets for real estate agents — homeowners and buyers are interested in local market conditions, and agents can use that interest to initiate conversations.

### 2.2 Current Pain Points

| Pain Point | Who Feels It | Impact |
|---|---|---|
| RPR report links are bare URLs with no lead capture | Agents | Reports are shared freely with no way to identify or follow up with the recipient |
| Agents lack technical skills to build custom lead forms | Agents | Most agents can't write HTML/JS, so they either pay for expensive tools or don't gate their reports at all |
| Email-based lead delivery requires server infrastructure | Product team (RPR) | Running SMTP or transactional email at scale across thousands of agents introduces infrastructure complexity, cost, and deliverability challenges |
| Existing lead capture tools (landing page builders, form tools) are generic | Agents | They aren't designed for the specific workflow of "select an area → get a market report" |

### 2.3 Opportunity

Provide a purpose-built, embeddable widget that:
- Gates RPR report access behind a lightweight lead capture form
- Delivers leads via webhooks (avoiding email infrastructure entirely)
- Requires zero technical skill to configure (visual generator)
- Works on any website regardless of platform (WordPress, Squarespace, Wix, custom HTML)
- Scales to thousands of agents with zero marginal server cost (fully client-side)

---

## 3. Target Users

### 3.1 Primary: Real Estate Agents (NAR members with RPR access)

- **Technical proficiency:** Low to moderate. Can copy/paste HTML. Cannot write code.
- **Websites:** WordPress (dominant), Squarespace, Wix, IDX-integrated sites, brokerage-provided sites.
- **Goal:** Capture leads from their website visitors using free RPR market data as the value exchange.
- **Scale:** Potentially thousands of agents across the nation, each deploying 1-5 widgets on their sites.

### 3.2 Secondary: Brokerage Marketing Teams

- **Technical proficiency:** Moderate. May manage websites for multiple agents.
- **Goal:** Deploy branded widgets across agent roster with consistent branding.
- **Needs:** Customizable branding (logo, colors, fonts), multiple area configurations.

### 3.3 Tertiary: RPR Product/Marketing Team

- **Goal:** Drive RPR adoption and demonstrate platform value by making reports a lead generation tool.
- **Needs:** Analytics on widget deployments and lead volumes (not yet implemented).

---

## 4. Product Goals & Success Metrics

### 4.1 Goals

| # | Goal | Priority |
|---|---|---|
| G1 | Enable any agent to deploy a branded lead capture widget in under 5 minutes with no coding | P0 |
| G2 | Deliver leads reliably to agents through their preferred channel (webhook, push notification, Slack, Sheets, CRM) | P0 |
| G3 | Ensure the widget is secure, performant, and works on any website without conflicts | P0 |
| G4 | Provide a polished, professional appearance that agents are proud to put on their website | P1 |
| G5 | Operate at scale with zero server-side infrastructure cost | P1 |
| G6 | Support GDPR/privacy compliance for agents operating in regulated markets | P2 |

### 4.2 Success Metrics

| Metric | Target | Measurement Method |
|---|---|---|
| Time to deploy (generator → live widget) | < 5 minutes | User testing |
| Webhook delivery success rate | > 99% | Future: analytics beacon |
| Widget load time (on target page) | < 200ms (script parse + render) | Performance testing |
| Cross-browser compatibility | Chrome 60+, Firefox 55+, Safari 12+, Edge 79+ | Manual + automated testing |
| Zero host page conflicts | No CSS leaks, no global JS pollution | Scoped CSS + IIFE encapsulation |
| Lead form conversion rate (impressions → submissions) | Benchmark TBD per agent | Future: analytics |

---

## 5. Product Scope

### 5.1 In Scope (Current — v1.1.0)

| Feature | Status |
|---|---|
| Lead capture form with configurable fields (minimal: email+area, full: first/last/email/phone+area) | Shipped |
| Area selection dropdown populated from agent-configured report list | Shipped |
| Step 2 report delivery — card with direct link to RPR PDF | Shipped |
| Webhook-based lead delivery (JSON POST to any HTTPS endpoint) | Shipped |
| Visual embed generator with live preview, syntax-highlighted output, and 12 delivery method guides | Shipped |
| Three display modes: inline, floating button, modal | Shipped |
| Full branding customization: colors, fonts (Google Fonts), logo, copy | Shipped |
| GDPR consent checkbox (optional) | Shipped |
| Dark site support (card background/text color customization) | Shipped |
| Client-side honeypot for basic bot protection | Shipped |
| Google Sheets integration (Apps Script template) | Shipped |
| Config persistence via URL hash + localStorage in generator | Shipped |
| CDN-hosted widget script (Cloudflare R2) | Shipped |

### 5.2 Out of Scope (Current)

| Feature | Reason |
|---|---|
| Server-side webhook proxy | Not yet built — would hide webhook URLs and enable rate limiting/retry |
| CAPTCHA / bot protection (Turnstile, reCAPTCHA) | Not yet integrated — honeypot is the only defense |
| Analytics / telemetry | No tracking of widget deployments, impressions, or conversion rates |
| Email-based lead delivery | Avoided by design due to infrastructure complexity at scale |
| Multi-language / i18n support | All copy is English; agents can override via data attributes |
| A/B testing of form variants | Not supported — single form configuration per embed |
| Lead storage / database | The widget stores nothing; all data flows to the agent's webhook |
| User accounts / authentication | Agents are anonymous; the generator is a static page |

---

## 6. User Stories

### 6.1 Agent Setup

| ID | Story | Priority |
|---|---|---|
| US-1 | As an agent, I want to configure my widget visually so I don't have to write any code | P0 |
| US-2 | As an agent, I want to add my name, brokerage, and logo so the widget looks like my brand | P1 |
| US-3 | As an agent, I want to choose where my leads are sent (phone notification, Slack, Sheets, CRM) so I'm notified immediately | P0 |
| US-4 | As an agent, I want to test my webhook before deploying so I know it works | P1 |
| US-5 | As an agent, I want to save my generator configuration so I can come back and edit it later | P1 |
| US-6 | As an agent, I want to share my generator link with my assistant so they can help me set it up | P2 |

### 6.2 Visitor Experience

| ID | Story | Priority |
|---|---|---|
| US-7 | As a website visitor, I want to select my area of interest and provide my email to receive a local market report | P0 |
| US-8 | As a visitor, I want to see the report immediately after submitting the form, not wait for an email | P0 |
| US-9 | As a visitor, I want the form to look professional and match the agent's website branding | P1 |
| US-10 | As a visitor, I want the form to work on my phone without horizontal scrolling or tiny text | P0 |
| US-11 | As a visitor, I want clear error messages if I fill something out wrong | P1 |

### 6.3 Lead Delivery

| ID | Story | Priority |
|---|---|---|
| US-12 | As an agent, I want leads delivered to my CRM automatically so I don't have to manually transfer data | P1 |
| US-13 | As an agent, I want leads logged in a Google Sheet so I have a free, zero-cost record | P1 |
| US-14 | As an agent, I want to receive a push notification on my phone when a new lead comes in so I can respond quickly | P1 |

### 6.4 Security & Compliance

| ID | Story | Priority |
|---|---|---|
| US-15 | As an agent, I want my visitors' PII transmitted only over HTTPS so their data is protected | P0 |
| US-16 | As an agent operating in an EU/GDPR market, I want to add a consent checkbox to the form | P2 |
| US-17 | As an agent, I don't want bots spamming fake leads through my widget | P1 |

---

## 7. Functional Requirements Summary

> Detailed functional specifications are in [/docs/frd/frd.md](../frd/frd.md).

| Area | Requirement |
|---|---|
| **Embed Widget** | Self-contained IIFE, zero dependencies, renders via DOM API, scoped CSS, three display modes |
| **Form Validation** | Required fields enforced client-side, email regex, area selection required, GDPR checkbox blocking when enabled |
| **Webhook Delivery** | JSON POST to HTTPS endpoint, non-blocking (form still transitions on webhook failure in current implementation) |
| **Generator** | Visual configuration, live preview, syntax-highlighted embed code output, 12 delivery methods with inline guides, config persistence |
| **Security** | HTTPS-only webhooks, HTTPS-only logos, URL scheme validation, XSS-safe DOM construction, honeypot, re-submission guard, input sanitization |

---

## 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Performance** | Widget script < 50KB uncompressed; render < 200ms on mid-tier devices |
| **Compatibility** | Chrome 60+, Firefox 55+, Safari 12+, Edge 79+; no framework dependencies |
| **Accessibility** | Keyboard navigable form fields, visible focus rings, error messages adjacent to fields |
| **Scalability** | Fully client-side; no server costs scale with number of deployed widgets |
| **Reliability** | Widget must render even if webhook endpoint is unreachable |
| **Security** | Zero use of `innerHTML` with user-controlled data; all URLs validated against scheme allowlists |
| **Maintainability** | Single-file widget with clear section headers; generator is a separate single-page app |

---

## 9. Technical Constraints

| Constraint | Rationale |
|---|---|
| No `async` or `defer` on the script tag | Widget reads config from `document.currentScript`, which is `null` when deferred |
| No server-side component | Design decision to avoid infrastructure cost and operational complexity at scale |
| HTTPS-only for all external URLs | PII protection for webhook payloads; credential safety for logo URLs |
| Widget CSS must not leak to host page | All selectors scoped under `.rpr-rep-embed`; no global resets |
| Widget JS must not pollute global scope | Entire widget wrapped in an IIFE; no global variables |
| Generator is a static page | Hosted on GitHub Pages; no backend, no database, no auth |
| `data-reports` JSON is embedded in the script tag | Limits practical area count (~50) due to HTML attribute size; URL-encoded characters add overhead |

---

## 10. Known Limitations & Risks

| # | Limitation / Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Webhook URL is visible in page source — anyone can extract it and POST fake leads | High | Planned: server-side proxy to hide real webhook URLs |
| R2 | No rate limiting — bots can submit repeatedly across sessions | Medium | Planned: optional Cloudflare Turnstile integration |
| R3 | No webhook retry — failed POSTs lose the lead permanently | Medium | Planned: localStorage queue with retry logic, or server-side proxy with retry |
| R4 | No analytics — no visibility into how many widgets are deployed or converting | Medium | Planned: privacy-respecting analytics beacon |
| R5 | CDN URL is unversioned — pushing a broken update affects all deployed widgets instantly | Medium | Planned: versioned CDN URLs with `latest` alias |
| R6 | Inline mode "Back" button creates a dead end (form shows but can't re-submit) | Low | Bug fix pending |
| R7 | Phone field accepts any string with no format validation | Low | Enhancement pending |
| R8 | Modal overlay lacks focus trap and ARIA roles for screen readers | Low | Enhancement pending |

---

## 11. Roadmap (Proposed)

### Phase 1 — Hardening (Current Priority)

- Fix inline-mode Back button bug (R6)
- Add phone validation and tighten email validation (R7)
- Add accessibility to modal/floating overlays (R8, focus trap, ARIA)
- Fix `escHtml` inconsistency between widget and generator

### Phase 2 — Security & Reliability

- Build Cloudflare Worker proxy to hide webhook URLs (R1) and enable rate limiting (R2) + retry (R3)
- Add optional Cloudflare Turnstile integration for bot protection (R2)
- Implement versioned CDN URLs (R5)

### Phase 3 — Intelligence & Growth

- Add privacy-respecting analytics beacon (R4)
- Direct CRM integrations (Follow Up Boss, kvCORE, HubSpot Forms API)
- Multi-language support / i18n framework
- A/B testing capabilities (form variants, copy testing)

---

## 12. Dependencies

| Dependency | Type | Notes |
|---|---|---|
| Cloudflare R2 | CDN hosting | Widget script served from `pub-6607a59d1d3b4ed18490937c995526d1.r2.dev` |
| GitHub Pages | Static hosting | Generator UI served from `reggienicolay.github.io` |
| Google Fonts API | External service | Optional; loaded only when `data-font-heading` or `data-font-body` are configured |
| Google Apps Script | Integration | Powers the Google Sheets lead receiver; runs in agent's own Google account |
| RPR (narrpr.com) | Content source | Report PDF URLs are RPR-hosted; widget links to them but does not proxy or cache |

---

## 13. Glossary

| Term | Definition |
|---|---|
| **RPR** | Realtors Property Resource — a national property database and analytics platform available to NAR members |
| **Widget** | The embeddable lead capture form (`rpr-reports-embed.js`) |
| **Generator** | The visual configuration tool (`index.html` + `generator.js`) that produces embed code |
| **Embed code** | The `<script>` tag with `data-*` attributes that an agent pastes into their website |
| **Webhook** | An HTTPS endpoint that receives a JSON POST when a visitor submits the lead form |
| **Lead** | A website visitor who submits their contact information through the widget |
| **Form mode** | `minimal` (email + area) or `full` (first/last/email/phone + area) — controls which fields appear |
| **Display mode** | `inline`, `floating`, or `modal` — controls how the widget appears on the page |
| **Step 1** | The lead capture form (visitor fills in their info) |
| **Step 2** | The report delivery card (visitor sees and clicks through to their report) |
