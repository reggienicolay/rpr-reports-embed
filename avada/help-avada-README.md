# RPR Help page — Avada native-element build

This folder rebuilds the Install Guide & FAQ as **native, click-to-edit Avada
elements** (instead of one raw-HTML Code Block), so non-developers can edit it
in Fusion Builder.

## Two ways to put this on an Avada page

- **Option A — Native elements (recommended, this folder):** import
  `help-avada-builder.txt` so the page is click-to-edit Avada elements. Best for
  ongoing edits. Steps below.
- **Option B — One raw Code Block (`help-avada-codeblock.html`):** paste that
  single self-contained file into one Avada **Code Block**. Fastest to place, but
  it's raw HTML/CSS/JS — edits mean editing code, not the visual builder.

## Files

| File | What it is | Where it goes |
|------|------------|---------------|
| `help-avada-builder.txt` | The page as Avada Builder shortcodes (Option A) | Paste into the page content, then open Avada Builder |
| `help-faq-search-codeblock.html` | The live FAQ search (no native equivalent) | Paste into a **Code Block** element above the first FAQ group |
| `help-avada-global.css` | Small polish CSS (inline code, callout left-bars, search box) | Avada → Options → Custom CSS |
| `help-avada-codeblock.html` | Self-contained raw-HTML version (Option B) | Paste into a single Avada **Code Block** |

## Install order

1. **Import the structure.** Edit the page in the WP **Code editor**, paste
   everything between `>>> START` and `<<< END` from `help-avada-builder.txt`,
   save, then open **Avada Builder**. It renders as native elements.
2. **Add the CSS.** Paste `help-avada-global.css` into Avada → Options → Custom CSS.
3. **Add the FAQ search.** In the Builder, drop a **Code Block** element where the
   `<!-- PASTE THE FAQ-SEARCH CODE BLOCK HERE -->` comment is (just above the
   "Common setup questions" accordion) and paste `help-faq-search-codeblock.html`.
4. Do the **Polish in Builder** steps below.

## Polish in Builder (the ~6 clicks the import can't set blind)

Avada's docs publish UI labels, not raw shortcode attribute names, so a few
cosmetic options were intentionally left at default in the import. Set them here:

1. **Sticky TOC column** — select the left (1/4) column → Extras tab → confirm
   **Position Sticky = On**, set **Responsive Position Sticky** to desktop/tablet
   only, and set **Sticky Column Offset** to clear your header (try `100px`).
   ⚠️ The parent Container's **Column Justification must NOT be "Stretch"** or
   sticky won't work.
2. **Table of Contents** — select the ToC element → set **Accepted Headings** to
   `H2, H3` and turn **Highlight Current Heading = On**. (Optional: set the
   highlight color to your orange `#f37737`.)
3. **Toggles styling** — for each FAQ accordion, set **Boxed Mode** to taste and
   set **Toggle Hover/Active Accent Color** to `#f37737`. (Behavior can stay as
   Toggles or switch to Accordion = one-open-at-a-time.)
4. **Tabs styling** — select the Step 4 Tabs element → choose **Design** (Clean)
   and **Layout** (Horizontal); optionally Justify.
5. **Syntax Highlighter** — select the embed-code element → confirm **Copy to
   Clipboard = On** and pick a dark **Theme**. If the `<script>` body imported
   mangled, retype/paste it into the element's Code field here.
6. **Callout left-bars** — handled by `help-avada-global.css` via the
   `rpr-callout` class already on each Alert. If you'd rather use Avada's default
   full-border alert look, just skip that CSS rule.

## What's native vs. custom after this build

- **Native (edit in Builder):** layout, sticky TOC + active highlight, hero,
  all 5 steps, 7-way platform tabs, embed-code block **with copy button**, all
  31 FAQ toggles, callouts, the "Still stuck" CTA + button. All text edits are
  click-to-edit.
- **One custom island:** the FAQ search Code Block (~30 lines). Everything else
  is zero custom JS — the scroll-spy TOC, tabs, and copy button are native Avada.
- **Small CSS:** `help-avada-global.css` (inline-code styling + callout left-bars
  + search box). Optional but recommended for visual parity with the design.

## Accuracy / content

All copy here matches the corrected content (real delivery methods: ntfy,
SimplePush, Pushover, Toolkit.app, Slack, Discord, Google Sheets, GoHighLevel,
Make, Zapier-paid, Custom; real `data-*` attributes; modal = `data-modal-trigger`
CSS selector; the generator auto-saves; etc.). It is the same corrected content
as the standalone `index.html` help section — keep the two in sync if you edit one.

## Optional: FAQ schema (SEO)

If you want `schema.org/FAQPage` structured data, rebuild the FAQ groups using
Avada's **FAQ Custom Post Type + FAQ element** instead of plain Toggles, and
enable Avada → Options → Advanced → Features → **Rich Snippets**. Verify the
output with Google's Rich Results Test (Avada's docs don't guarantee the exact
JSON-LD). Not included here because it trades some editing simplicity for schema.
