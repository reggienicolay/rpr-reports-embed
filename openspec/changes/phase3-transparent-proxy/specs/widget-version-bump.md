# Spec: widget-version-bump

**Capability:** Widget version bump to v1.5.0
**Type:** Modified (widget meta)

---

## Requirements

1. Widget file header comment updated from `v1.4.0` to `v1.5.0`
2. New changelog entry added for v1.5.0 describing Phase 3 — Transparent Proxy
3. `_meta.widget_version` in the webhook payload updated to `'1.5.0'`
4. No functional changes to widget delivery logic — `CFG.proxy || CFG.webhook` already handles both paths
5. SEMVER rationale: new feature (admin API, auto-register), backward compatible = MINOR bump

## Testable Scenarios

- Widget script header shows `v1.5.0`
- Webhook payload `_meta.widget_version` is `'1.5.0'`
- Existing data-proxy embeds continue working (no delivery logic change)
- Existing data-webhook embeds continue working (no delivery logic change)
- Widget with neither attribute works (no delivery, form only) — no change
