# Infrastructure & Deployment Document

**Product:** RPR Market Reports Embed Widget
**Last Updated:** 2026-05-21
**Status:** Active

---

## 1. Infrastructure Overview

The RPR Market Reports Embed Widget has a **serverless, fully static infrastructure**. There are no application servers, databases, or persistent backend services. All components are served from edge CDNs or static hosting.

```
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE MAP                            │
│                                                                  │
│  ┌──────────────────────┐    ┌───────────────────────────────┐  │
│  │  Cloudflare R2       │    │  GitHub Pages                 │  │
│  │  (Widget CDN)        │    │  (Generator Hosting)          │  │
│  │                      │    │                               │  │
│  │  rpr-reports-embed.js│    │  index.html                   │  │
│  │                      │    │  generator.js                 │  │
│  │  Bucket: pub-660...  │    │  README.md                    │  │
│  │  Region: auto        │    │                               │  │
│  │  Access: public read │    │  Repo: reggienicolay/         │  │
│  │  Egress: $0          │    │        rpr-reports-embed      │  │
│  └──────────────────────┘    └───────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────┐    ┌───────────────────────────────┐  │
│  │  Google Fonts CDN    │    │  WP Engine (Staging)          │  │
│  │  (Optional fonts)    │    │  (WordPress staging site)     │  │
│  │                      │    │                               │  │
│  │  fonts.googleapis.com│    │  rprblogstaging.wpengine.com  │  │
│  │  fonts.gstatic.com   │    │  /reports-widget/             │  │
│  └──────────────────────┘    └───────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Agent-Side Infrastructure (per agent, not RPR-managed)  │   │
│  │                                                          │   │
│  │  - Agent's website (WordPress, Squarespace, Wix, etc.)  │   │
│  │  - Webhook endpoint (Zapier, Make, Slack, Sheets, etc.) │   │
│  │  - Google Sheets + Apps Script (optional)                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Hosting Environments

### 2.1 Cloudflare R2 — Widget CDN

| Property | Value |
|---|---|
| **Service** | Cloudflare R2 (S3-compatible object storage with global CDN) |
| **Bucket URL** | `https://pub-6607a59d1d3b4ed18490937c995526d1.r2.dev` |
| **Files hosted** | `rpr-reports-embed.js` |
| **Access** | Public read (no authentication required) |
| **Egress cost** | $0 (R2's key differentiator — zero egress fees) |
| **Storage cost** | Free tier: 10GB storage, 10M class A requests/month, 10M class B/month |
| **Caching** | Cloudflare edge cache; cache-control headers set on upload |
| **Versioning** | None currently — the same URL always serves the latest upload |
| **Redundancy** | Cloudflare's global edge network; automatic multi-region replication |

**Upload process:**
1. Edit `rpr-reports-embed.js` locally
2. Upload to R2 bucket via Cloudflare dashboard or `wrangler` CLI
3. Verify at the public URL
4. All deployed widgets worldwide immediately serve the new version

**Risk:** No rollback mechanism. A bad upload affects all deployed widgets. Mitigation: test thoroughly on staging before uploading.

### 2.2 GitHub Pages — Generator Hosting

| Property | Value |
|---|---|
| **Service** | GitHub Pages (static site hosting from GitHub repo) |
| **URL** | `https://reggienicolay.github.io/rpr-reports-embed/` |
| **Files hosted** | `index.html`, `generator.js`, `help.css`, `help.js`, `README.md`, static assets |
| **Deployment trigger** | Push to `main` branch (or configured branch) |
| **Build step** | None — files are served as-is (no Jekyll, no build pipeline) |
| **Custom domain** | Not configured (using default `github.io` subdomain) |
| **HTTPS** | Enforced by GitHub Pages |
| **Rate limits** | Soft: 100GB bandwidth/month, 10 builds/hour |

### 2.3 WP Engine — Staging Environment

| Property | Value |
|---|---|
| **Service** | WP Engine managed WordPress hosting |
| **URL** | `https://rprblogstaging.wpengine.com/reports-widget/` |
| **Purpose** | Staging/testing environment for the widget in a real WordPress context |
| **Deployment** | Manual — widget embed code is placed in WordPress page content |

### 2.4 Google Apps Script — Sheets Integration

| Property | Value |
|---|---|
| **Service** | Google Apps Script (serverless JS runtime bound to Google Sheets) |
| **Hosting** | Google's infrastructure — per-agent, in their Google account |
| **URL pattern** | `https://script.google.com/macros/s/{deployment-id}/exec` |
| **Execution** | Triggered by HTTP POST (doPost) or GET (doGet) |
| **Quotas** | 20,000 URL fetch calls/day, 6 min execution time, 50MB SpreadsheetApp data |
| **Management** | Each agent manages their own deployment; RPR has no access or control |

---

## 3. Domain & DNS

| Domain | Service | Purpose |
|---|---|---|
| `pub-6607a59d1d3b4ed18490937c995526d1.r2.dev` | Cloudflare R2 | Widget script CDN |
| `reggienicolay.github.io` | GitHub Pages | Generator UI |
| `rprblogstaging.wpengine.com` | WP Engine | Staging environment |
| `fonts.googleapis.com` | Google | Font CSS loading |
| `fonts.gstatic.com` | Google | Font file serving |

---

## 4. CI/CD Pipeline

### 4.1 Current State

There is **no automated CI/CD pipeline**. Deployment is manual:

| Component | Deployment Method |
|---|---|
| Widget (`rpr-reports-embed.js`) | Manual upload to Cloudflare R2 via dashboard or CLI |
| Generator (`index.html` + `generator.js`) | `git push` to GitHub → auto-deployed via GitHub Pages |
| Google Sheets template | Manual update in Google Sheets → manual re-deploy in Apps Script |
| Staging | Manual placement of embed code in WordPress page |

### 4.2 Recommended CI/CD Pipeline (Future)

```
Developer pushes to `main`
         │
         ▼
GitHub Actions workflow triggers
         │
         ├─── Lint: ESLint on rpr-reports-embed.js + generator.js
         │
         ├─── Test: Playwright tests for widget rendering + form behavior
         │
         ├─── Build: (no build step needed, but can minify + generate sourcemaps)
         │
         ├─── Deploy Generator: GitHub Pages (automatic via existing config)
         │
         └─── Deploy Widget: Upload to R2 via wrangler CLI
              │
              ├─── Upload as rpr-reports-embed.js (latest)
              └─── Upload as rpr-reports-embed@{version}.js (versioned)
```

### 4.3 Recommended Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code; deploys to GitHub Pages on push |
| `staging` | Pre-release testing; deploy widget to staging R2 bucket or staging URL |
| `feature/*` | Feature branches; merged to `main` via PR |
| `fix/*` | Bug fix branches; merged to `main` via PR |

---

## 5. Monitoring & Observability

### 5.1 Current State

There is **no monitoring or observability**. The widget runs entirely client-side with no telemetry. Errors are logged to `console.error` / `console.warn` in the visitor's browser, which is not visible to the product team.

### 5.2 Recommended Monitoring (Future)

| Signal | Method | Purpose |
|---|---|---|
| Widget load count | `navigator.sendBeacon()` to a counter endpoint | Know how many widgets are active |
| Form submission count | Beacon on successful submit | Measure conversion volume |
| Webhook errors | Beacon on fetch failure | Detect broken webhook configurations |
| Script errors | `window.onerror` or `addEventListener('error')` scoped to widget | Detect runtime failures |
| CDN health | Cloudflare R2 analytics dashboard | Monitor availability and latency |
| Generator usage | GitHub Pages traffic (built-in analytics) or a simple beacon | Measure generator adoption |

**Privacy requirement:** Any telemetry must be anonymous (no PII, no user identifiers). IP addresses should not be logged. Consider a privacy-first analytics tool (e.g., Plausible, Umami) or a simple custom counter.

---

## 6. Security Infrastructure

### 6.1 Transport Security

| Component | HTTPS | Notes |
|---|---|---|
| Widget CDN (R2) | Enforced | Cloudflare terminates TLS |
| Generator (GitHub Pages) | Enforced | GitHub Pages enforces HTTPS |
| Webhook POSTs | Enforced by widget | Widget rejects non-HTTPS webhook URLs |
| Google Fonts | HTTPS | Always served over HTTPS |
| Logo images | Enforced by widget | Widget rejects non-HTTPS logo URLs |

### 6.2 Content Security Policy

The generator page (`index.html`) includes a CSP meta tag:

```
default-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com;
img-src https: data:;
script-src 'self';
connect-src 'self' https:;
```

The widget itself does not set a CSP (it runs on the agent's page, which may have its own CSP). The widget's network behavior is compatible with:
- `script-src` allowing the R2 domain
- `style-src 'unsafe-inline'` (widget injects a `<style>` element)
- `connect-src https:` (webhook POST to HTTPS)
- `font-src https://fonts.gstatic.com` (if Google Fonts are configured)
- `img-src https:` (if logo URL is configured)

### 6.3 Dependency Supply Chain

The widget has **zero runtime dependencies**. There is no `node_modules`, no `package.json`, no build step. The supply chain attack surface is:

| Vector | Risk | Mitigation |
|---|---|---|
| Cloudflare R2 account compromise | High — attacker could replace the widget script | Strong account security (2FA, access controls) |
| GitHub account compromise | Medium — attacker could modify generator code | Strong account security; GitHub Pages auto-deploys from repo |
| Google Fonts CDN compromise | Low — Google's infrastructure is robust | Fonts are optional; widget works without them |

---

## 7. Disaster Recovery

### 7.1 Widget CDN Failure

**Scenario:** Cloudflare R2 is unavailable.
**Impact:** All deployed widgets fail to load. Agent websites show no widget (graceful degradation — no broken page, just missing widget).
**Recovery:** Wait for Cloudflare to restore service. No action needed from product team.
**Mitigation:** Consider a fallback CDN or self-hosting option documented for agents.

### 7.2 Bad Widget Deployment

**Scenario:** A broken version of `rpr-reports-embed.js` is uploaded to R2.
**Impact:** All deployed widgets worldwide are broken immediately.
**Recovery:** Upload the previous working version to R2.
**Mitigation:** Implement versioned URLs (see ADR recommendations). Keep the previous version available for rollback.

### 7.3 GitHub Pages Outage

**Scenario:** GitHub Pages is unavailable.
**Impact:** The generator is inaccessible. Deployed widgets are unaffected (they load from R2, not GitHub Pages).
**Recovery:** Wait for GitHub to restore service. The generator can be self-hosted as a fallback.

### 7.4 Google Sheets Template Corruption

**Scenario:** The master Google Sheets template is accidentally modified or deleted.
**Impact:** New agents cannot make a copy. Existing agents' copies are unaffected.
**Recovery:** Restore from a backup copy or recreate the template.

---

## 8. Cost Structure

| Component | Cost | Notes |
|---|---|---|
| Cloudflare R2 | $0 (free tier) | Free: 10GB storage, 10M Class A, 10M Class B requests/month |
| GitHub Pages | $0 | Free for public repos |
| GitHub (repo) | $0 | Free for public repos |
| Google Fonts | $0 | Free service |
| Google Apps Script | $0 | Runs in each agent's Google account; their quotas |
| WP Engine (staging) | Included in existing WP Engine plan | No incremental cost |
| **Total** | **$0/month** | Entire infrastructure runs at zero cost |
