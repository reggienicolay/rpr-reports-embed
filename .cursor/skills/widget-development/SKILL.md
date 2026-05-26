# Widget Development Skill

Activate this skill when working on `rpr-reports-embed.js` — the core embed widget.

## Architecture

The widget is a single IIFE (~1100 lines) that:
1. Reads config from `data-*` attributes on its own `<script>` tag via `document.currentScript`
2. Injects a scoped `<style>` block into the page
3. Builds the UI via DOM API (never `innerHTML` with user data)
4. Handles form validation, submission, and webhook delivery
5. Supports three display modes and two form modes

## File Structure (Sections)

The widget uses numbered section headers `/* === §N TITLE === */`:

| Section | Content |
|---------|---------|
| §1 | Configuration parsing (`data-*` attributes -> `CFG` object) |
| §2 | Utility functions (`escHtml`, `isValidHex`, `hexToRgba`, URL validation) |
| §3 | CSS injection (scoped styles, custom properties, responsive rules) |
| §4 | DOM construction (form fields, cards, buttons, overlay) |
| §5 | Form validation and error display |
| §6 | Webhook submission (fetch POST, error handling, step transitions) |
| §7 | Display mode initialization (inline, floating, modal) |
| §8 | Event binding and lifecycle |

## Key Objects and Functions

| Name | Purpose |
|------|---------|
| `CFG` | Parsed config object from `data-*` attributes |
| `escHtml(str)` | HTML entity escape (5 entities) |
| `isValidHex(hex)` | Hex color validation |
| `hexToRgba(hex, alpha)` | Color manipulation for hover states |
| `buildField(cfg)` | Creates a form field with label, input, and error span |
| `showStep(wrap, n)` | Transitions between form (step 1) and report card (step 2) |
| `closeOverlay(overlay, wrap)` | Closes floating/modal overlay and resets form |
| `wrap._rprReset()` | Resets form fields, errors, and submission flag |

## Display Modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| `inline` | None — renders directly | Form + cards render in-place in the page flow |
| `floating` | FAB button bottom-right | Click opens full-screen overlay with form |
| `modal` | Custom CSS selector via `data-modal-trigger` | Click on trigger element opens overlay |

## Form Modes

| Mode | Fields | Use case |
|------|--------|----------|
| `full` | First name, last name, email, phone, area dropdown | Maximum lead data |
| `minimal` | Email, area dropdown | Low-friction capture |

## CSS Scoping

- Root class: `.rpr-rep-embed`
- Class prefix: `.rpr-r-*` (e.g., `.rpr-r-card`, `.rpr-r-form`, `.rpr-r-btn`)
- Custom properties: `--rpr-r-*` (e.g., `--rpr-r-brand`, `--rpr-r-card-bg`)
- Style ID: `rpr-rep-embed-style` (prevents duplicate injection on multi-widget pages)

## Adding a New `data-*` Attribute

1. Add parsing in §1 with a sensible default that preserves existing behavior
2. Validate the value (hex -> `isValidHex`, URL -> scheme check, string -> sanitize)
3. Use the value in the appropriate section
4. Update `docs/frd/frd.md` with the new attribute
5. Update the generator (`generator.js` + `index.html`) to expose the option
6. Add the attribute to the manual testing checklist in `docs/guidelines/guidelines.md`

## Adding a New Display/Form Mode

1. Add the mode value to the §1 config parser with validation
2. Build the mode-specific DOM in §4
3. Add mode-specific CSS in §3
4. Wire up events in §7/§8
5. Test all existing modes still work (regression)
6. Update FRD, PRD, and design docs

## Common Pitfalls

- `document.currentScript` is `null` if the script is loaded with `async` or `defer`
- Multiple widgets on one page share the same `<style>` block (injected once via `STYLE_ID` check)
- The `_rprSubmitted` flag must be reset on overlay close AND back button
- Floating/modal modes create overlay elements; inline mode does not
- CSS custom properties set on `.rpr-rep-embed` scope each widget instance independently
