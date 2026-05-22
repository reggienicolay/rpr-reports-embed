# Project Rules — AI Behavioral Guidelines

**Product:** RPR Market Reports Embed Widget
**Last Updated:** 2026-05-21

These rules guide AI behavior when working on this specific project. They supplement the general user rules and are derived from the project's architecture, conventions, and constraints.

---

## 1. Architecture Rules

- **Never introduce external dependencies.** The widget (`rpr-reports-embed.js`) must remain a zero-dependency, single-file script. No npm packages, no CDN-loaded libraries, no polyfills.
- **Never add `async` or `defer` to any documentation examples.** The widget relies on `document.currentScript`, which is `null` when deferred.
- **The widget must remain a single IIFE.** No module imports, no ES modules, no code splitting. All code lives inside `(function() { ... })();`.
- **The generator is a static single-page app.** No backend, no build step, no framework. `index.html` + `generator.js` only.
- **Keep the Google Sheets integration self-contained** in `integrations/google-sheets/`. It must not depend on any other project files.

## 2. Security Rules (Non-Negotiable)

- **Never use `innerHTML` with user-controlled data.** Use `textContent`, `setAttribute`, `createElement`, or `createElementNS`. The only exception is content pre-escaped via `escHtml()`.
- **Always validate URL schemes.** Webhook: `https://` only. Logo: `https://` only. Report URLs: `http(s)://` only. Reject all other schemes.
- **Always sanitize font names** to `[a-zA-Z0-9 -]` before use in CSS.
- **Always sanitize form IDs** to `[a-zA-Z0-9-_]`.
- **Wrap `querySelectorAll` calls with user-provided selectors** in try/catch.
- **`escHtml()` must escape all five entities:** `&`, `<`, `>`, `"`, `'`.

## 3. Backwards Compatibility Rules

- **New `data-*` attributes must default to the previous behavior.** Agents who don't update their embed code must see zero change.
- **Never rename or remove an existing `data-*` attribute.** Deprecate and add a new one if needed.
- **Never change the webhook payload schema** without incrementing the MAJOR version.
- **The generator must handle legacy URL hash configs** (e.g., `webhook` → `deliveryUrl` migration).

## 4. Code Style Rules

- **Widget file:** tabs for indentation, `'use strict'`, single quotes, semicolons always.
- **Section headers:** `/* === §N TITLE === */` format.
- **Bug/security fix comments:** reference the fix ID (e.g., `/* BUG 4 FIX: ... */`, `/* SEC-1 FIX: ... */`).
- **CSS class naming:** `.rpr-r-{block}[-{element}]` inside `.rpr-rep-embed` scope.
- **CSS custom properties:** `--rpr-r-{name}` namespace.
- **Generator IDs:** `camelCase` matching `document.getElementById()` calls.

## 5. Testing Rules

- **Always test all three display modes** (inline, floating, modal) after any widget change.
- **Always test both form modes** (minimal and full) after any form-related change.
- **Always verify the webhook payload** after any form or submission logic change.
- **Test on at least Chrome + Safari + Firefox** before any release.
- **Test the generator's config persistence** (URL hash round-trip) after any generator change.

## 6. Documentation Rules

- **Update the version number in all four locations** when releasing: widget header, generator header, README, and PRD.
- **Update the changelog** in the widget file header and README for every release.
- **Update the FRD** if any functional behavior changes.
- **Add a new ADR** if any significant architectural decision is made.
- **Keep `rules.md`** (this file) current if any project conventions change.

## 7. Deployment Rules

- **Never upload to R2 without testing on staging first.** A bad upload breaks all deployed widgets worldwide.
- **Always keep the previous working version** available for rollback.
- **Generator deploys automatically on push to `main`.** Ensure all changes are tested before pushing.
- **Webhook URLs in generator links are sensitive.** Warn agents not to share generator links publicly.

## 8. Scope Rules

- **One feature per development cycle.** Implement, test, and commit before starting the next feature.
- **Always propose two approaches before implementing** a non-trivial feature.
- **Read the documentation before starting any implementation.** Start with `prd.md`, `frd.md`, and `adr.md`.
- **Check for existing patterns** in the codebase before introducing new ones (e.g., check how color validation is already done before adding new color inputs).
