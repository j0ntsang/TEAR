# TEAR — Torn Element Arrange & Restyle

A Chrome extension that restyles torn.com:

- **Popup**: page background color and font family.
- **`content/content.css`**: a stylesheet with every known Torn selector already written out, grouped by layout, page and section. Edit it to style anything else.

It's cosmetic only. TEAR never clicks, submits or automates anything in the game.

## Install (local dev)

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose this folder.
3. Pin TEAR from the puzzle-piece menu, then open or refresh torn.com.

There's no build step: Chrome runs these files as they are.

## Customizing the CSS

`content/content.css` explains its own structure and confidence tags at the top. The loop:

1. Try a rule live in torn.com's DevTools (Elements → Styles → **+**).
2. Paste it into the matching block in `content.css`.
3. ↻ TEAR in `chrome://extensions`, then refresh torn.com.

CSS can't see the URL or match text, so `content/main.js` stamps three hooks the stylesheet selects on:

| Hook | Example |
|---|---|
| `html[data-tear-page]` | `index`, `gym`, `page` (the file name without `.php`) |
| `html[data-tear-route]` | `market`, `cardskimming` (first part of a `page.php` hash route) |
| `.sortable-box[data-tear-panel]` | `battle-stats` (a Home panel's title as a slug, counts removed) |

## Making changes

| Changed | Then |
|---|---|
| `content/*`, `lib/model.js`, `manifest.json` | ↻ on the TEAR card in `chrome://extensions`, then refresh torn.com |
| `popup/*`, `lib/ui.css` | close and reopen the popup |

Content-script logs are in torn.com's own DevTools console (pick the TEAR context in the dropdown). For the popup, right-click it → **Inspect**.

Unit tests for `lib/model.js` use vitest (`lib/__tests__/`).

## Layout

```
manifest.json
lib/model.js         theme defaults, validation, storage, slug/page helpers
lib/ui.css           popup styles
content/content.css  the stylesheet you customize
content/main.js      applies the popup theme, stamps page/panel hooks
popup/               toolbar popup
torn-theme/          selector research (ui-map.md, layout-map.md)
```

If Torn ships a frontend update and something stops applying, re-check the hashed `[class*="prefix___"]` selectors in `torn-theme/ui-map.md` first.
