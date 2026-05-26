# Testing Skill

Activate this skill for code review, verification, regression checks, and pre-release testing.

## Code Review Checklist

### Security
- [ ] No `innerHTML` with user-controlled data
- [ ] URL schemes validated (`https://` for webhooks, `http(s)://` for reports)
- [ ] `escHtml()` used for all user strings inserted into DOM
- [ ] Font names sanitized to `[a-zA-Z0-9 -]`
- [ ] Form IDs sanitized to `[a-zA-Z0-9-_]`
- [ ] Hex colors validated with `isValidHex()` before CSS use
- [ ] No exposed API keys, webhook URLs, or secrets in code
- [ ] Honeypot field properly hidden (`tabindex="-1"`, offscreen, `autocomplete="off"`)

### Backwards Compatibility
- [ ] New `data-*` attributes default to previous behavior
- [ ] No renamed or removed `data-*` attributes
- [ ] Webhook payload schema unchanged (or MAJOR version bumped)
- [ ] Existing embed codes still render correctly without changes

### Code Quality
- [ ] `const`/`let` used (no new `var`)
- [ ] DOM API used for element creation (not string concatenation)
- [ ] Error handling for all fetch/async operations
- [ ] No `console.log` in production (widget `console.warn` for config errors OK)
- [ ] CSS scoped under `.rpr-rep-embed` with `.rpr-r-*` prefix
- [ ] Section headers follow `/* === §N TITLE === */` format

### UX
- [ ] Form validation shows clear error messages
- [ ] Submission feedback is honest (not "success" on failure)
- [ ] Overlay close resets form state
- [ ] Back button from step 2 allows resubmission
- [ ] Keyboard navigation works (Escape closes overlay, Tab order logical)

## Verification Workflow

1. **Lint check**: Run ReadLints on all edited files
2. **Regression scan**: Search for references to modified functions/variables — ensure no broken callers
3. **Display mode test**: Verify inline, floating, and modal modes all render correctly
4. **Form mode test**: Verify both minimal and full form modes work
5. **Submission test**: Verify webhook fires with correct payload on form submit
6. **Multi-widget test**: Verify two widgets on the same page don't interfere

## Widget Testing Checklist

### Form & Submission
- [ ] All required fields validate on empty submit
- [ ] Error messages appear below the correct field
- [ ] Errors clear when the user types
- [ ] Valid submission fires webhook with correct JSON
- [ ] Step 2 shows the correct report card for the selected area
- [ ] "View Report" opens correct URL in new tab
- [ ] Honeypot silently blocks when filled
- [ ] GDPR checkbox blocks submission when enabled and unchecked
- [ ] Phone validation accepts international formats, rejects garbage

### Display Modes
- [ ] Inline: renders in page flow, no overlay
- [ ] Floating: FAB button shows, click opens overlay, form works
- [ ] Modal: trigger element exists, click opens overlay, form works
- [ ] Overlay close resets form and clears `_rprSubmitted`
- [ ] Escape key closes overlay only when open
- [ ] Multiple widgets on one page each work independently

### Appearance
- [ ] Custom brand color applies to buttons and accents
- [ ] Card background and text colors apply correctly
- [ ] Custom font loads via Google Fonts and applies
- [ ] Card border radius respects `data-card-radius`
- [ ] Widget CSS does not leak to host page
- [ ] Dark color combinations remain readable

## Generator Testing Checklist

- [ ] All panes switch correctly via side nav
- [ ] Live preview updates for all field changes
- [ ] Embed code reflects current configuration
- [ ] Copy button puts correct code on clipboard
- [ ] Generator link preserves full config in URL hash
- [ ] Config restores from localStorage on fresh visit
- [ ] Reset clears all state
- [ ] Send test fires payload and shows result
- [ ] Empty reports array blocks copy and shows warning

## Browser Compatibility

| Browser | Minimum |
|---------|---------|
| Chrome | 60+ |
| Firefox | 55+ |
| Safari | 12+ |
| Edge | Latest |
| Mobile Safari | iOS 14+ |
| Chrome Android | Latest |

## Review Output Format

When reporting review findings, use severity levels:

| Severity | Meaning |
|----------|---------|
| **CRITICAL** | Security vulnerability or data loss risk — blocks merge |
| **HIGH** | Bug that affects core functionality — blocks merge |
| **MEDIUM** | UX issue or non-critical bug — should fix before merge |
| **LOW** | Style issue, minor improvement — can fix later |
| **INFO** | Observation, no action required |
