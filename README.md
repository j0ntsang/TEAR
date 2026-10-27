# TEAR — Torn Element Arrange & Restyle

A Chrome extension that customizes torn.com's interface:

- **Restyle**: background, panel, text and link colors, font, font size
- **Show/hide** Home dashboard panels
- **Reorder** Home panels (each stays in its own column)
- **Tabs**: group Home panels so you see one group at a time
- **Quick-nav bar**: your own row of links under Torn's header
- **Profiles**: named presets of all the above, with JSON export and import

It's cosmetic only. TEAR never clicks, submits or automates anything in the game. It only adds CSS, hides or moves elements already on the page, and adds plain links.

## Install (local dev)

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose this `tear/` folder.
3. Pin TEAR from the puzzle-piece menu, then open or refresh torn.com.

There's no build step: Chrome runs these files as they are.

## Use

- **Toolbar popup**: switch profile, edit the theme, show or hide the panels on the Torn tab you're on.
- **Options page** (popup → "Edit layout, tabs & nav…", or right-click the icon → Options): manage profiles, reorder panels, set up tabs and quick-nav.

The options page lists the panels and sidebar areas TEAR last saw on Torn, because they vary by account. Visit Torn's Home page once before editing the layout.

## Making changes

| Changed | Then |
|---|---|
| `content/*`, `lib/model.js`, `manifest.json` | ↻ on the TEAR card in `chrome://extensions`, then refresh torn.com |
| `popup/*` | close and reopen the popup |
| `options/*`, `lib/theme-form.js`, `lib/ui.css` | reload the options tab |

To debug:
- Content-script logs are in torn.com's own DevTools console. Pick the TEAR context in the dropdown.
- For the popup, right-click it → **Inspect**.

Unit tests for `lib/model.js` run with the site's `npm run test:unit`.

## Layout

```
manifest.json
lib/model.js          profiles, defaults, validation, storage (shared by everything)
lib/theme-form.js     theme controls (popup + options)
lib/ui.css            popup/options styles
content/content.css   the restyle + hide rules + TEAR's injected UI
content/panels.js     tag, hide, reorder, tab-filter Home panels
content/nav.js        quick-nav bar, sidebar area harvesting
content/main.js       applies the active profile and keeps it applied
popup/                toolbar popup
options/              full editor
```

The selectors come from the research in [`docs/torn-theme/`](../docs/torn-theme/). If Torn ships a frontend update and something stops applying, re-check the hashed `[class*="prefix___"]` selectors in `ui-map.md` first.

## Known limits

- **Panels exist only on Home.** Show/hide, reorder and tabs do nothing on other pages, though the theme and quick-nav still apply.
- **Torn's own drag-to-reorder still works**, but TEAR's saved order is applied on top when a page loads. **Reset to Torn's order** on the options page hands ordering back to Torn.
- **A panel's slug comes from its title text**, e.g. `equipped-weapons-and-armor`. If Torn renames a panel, its saved order, hidden state and tab membership are dropped.
