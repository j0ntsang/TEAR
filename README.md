# TEAR — Torn Element Arrange & Restyle

A Chrome extension that restyles torn.com:

- **Popup**: page background color and font family.
- **`content/content.css`**: the stylesheet. Besides a skeleton of known Torn selectors to fill in, it restyles the header and news ticker, the sidebar (character card, resource rings, Areas/Lists), the narrow-window HUD, the fly-out and profile menus, and the Awards and Settings pages.
- **Light and dark**: follows Torn's own Dark Mode setting by building on Torn's theme variables.

It's cosmetic only. TEAR never submits or automates anything in the game. Its scripts only add attributes and CSS order, copy the ticker's headlines for the scroll loop, and act on your own clicks: a Points/Merits card opens its "use" link, and a section heading collapses its section.

## Install (local dev)

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose this folder.
3. Pin TEAR from the puzzle-piece menu, then open or refresh torn.com.

There's no build step: Chrome runs these files as they are.

### Hot reload

`dev-reload.js` runs as the background service worker. In an unpacked install it polls the extension's files every second; when one changes it reloads the extension and any open torn.com tabs. Add new files to its `WATCHED` list. A Web Store install has an `update_url`, so the worker does nothing there.

## Customizing the CSS

1. Try a rule live in torn.com's DevTools (Elements → Styles → **+**).
2. Add it to `content/content.css`. Torn's selectors are specific, so write declarations with `!important`.
3. Save. Hot reload picks it up.

Colors, spacing, radii and type sizes are variables on `body` at the top of the file, with dark-mode overrides on `body.dark-mode`. They have to live on `body`, not `:root`: Torn sets its dark values on `body.dark-mode`, and TEAR's light values point at Torn's (`--default-bg-panel-color`, `--default-full-text-color`, …).

CSS can't read the URL, text or numbers, so `content/main.js` stamps hooks the stylesheet selects on:

| Hook | On | Example |
|---|---|---|
| `data-tear-page` | `html` | `index`, `gym`, `page` (file name without `.php`) |
| `data-tear-route` | `html` | `market`, `cardskimming` (first part of a `page.php` hash route) |
| `data-tear-panel` | `.sortable-box` | `battle-stats` (Home panel title as a slug, counts removed) |
| `data-tear-ring`, `--tear-pct` | sidebar bars | `energy`, `62.0` (fill %, from the `62 / 100` text) |
| `data-tear-timer`, `--tear-timer` | sidebar bars | time left as a % of the regen tick |
| `data-tear-full` | sidebar bars | bar at its maximum |
| `data-tear-stat` | stat rows | `money`, `level`, `points`, `merits` |
| `--tear-len` | values | character count, for shrink-to-fit text |
| `data-tear-link` | links | `1` on links Torn draws in blue |
| `data-tear-state`, `data-tear-more` | Areas/Lists headings | `full`, `top`, `collapsed`; hidden-row count |
| `data-tear-label`, `style.order` | Awards › Merits | section names; grid order for the info panel |
| `data-tear-looped`, `data-tear-clone` | ticker | headline copy for the seamless loop |

## Making changes

| Changed | Then |
|---|---|
| `content/*`, `lib/model.js`, `manifest.json` | nothing: hot reload reloads the extension and torn.com tabs |
| `popup/*`, `lib/ui.css` | close and reopen the popup |

Content-script logs are in torn.com's own DevTools console (pick the TEAR context in the dropdown). For the popup, right-click it → **Inspect**.

Unit tests for `lib/model.js` use vitest (`lib/__tests__/`).

## Storage

| Area | Key | Holds |
|---|---|---|
| `sync` | `theme` | `{ bgColor, fontFamily }` from the popup |
| `local` | `sectionStates` | Areas/Lists heading → `full`, `top` or `collapsed` |

## Layout

```
manifest.json
dev-reload.js        hot reload for unpacked installs
lib/model.js         theme defaults, validation, storage, slug/page helpers
lib/ui.css           popup styles
content/content.css  the stylesheet
content/main.js      applies the popup theme, stamps the hooks above
popup/               toolbar popup
torn-theme/          selector research (ui-map.md, layout-map.md)
```

If Torn ships a frontend update and something stops applying, re-check the hashed `[class*="prefix___"]` selectors in `torn-theme/ui-map.md` first.
