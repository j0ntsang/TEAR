# TEAR — Torn Element Arrange & Restyle

A Chrome extension that restyles torn.com:

- **Dock** (bottom right, left of Torn's chat buttons): an **info** button showing Torn City time and the server, and a purple **settings** gear that opens the settings panel. The toolbar icon does nothing. **Colors** edits every TEAR color separately for light and dark mode; **Typography** shows the font (Torn's Arial); **Dev** switches Torn's own stylesheets off, which is what turns TEAR on. Changed values can be reset to default.
- **TEAR only applies with Torn's CSS off**: `content/torn-css.js` then sets `html.tear-enabled`, which gates `content.css` and `main.js`. With Torn's CSS on, the page is Torn's own; only the dock shows.
- **`content/content.css`**: the stylesheet. Besides a skeleton of known Torn selectors to fill in, it restyles the header and news ticker, the sidebar (character card, resource rings, Areas/Lists), the narrow-window HUD, the fly-out and profile menus, and the Awards and Settings pages.
- **Light and dark**: follows Torn's own Dark Mode setting by building on Torn's theme variables.

It's cosmetic only. TEAR never submits or automates anything in the game. Its scripts only add attributes and CSS order, copy the ticker's headlines for the scroll loop, and act on your own clicks: a Points/Merits card opens its "use" link, and a section heading collapses its section.

## Install (local dev)

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose this folder.
3. Open or refresh torn.com. The info and settings buttons sit in the bottom right, left of the chat buttons. Turn TEAR on with the Enable TEAR button at the top of the settings panel.

There's no build step: Chrome runs these files as they are.

### Hot reload

`dev-reload.js` runs as the background service worker. In an unpacked install it polls the extension's files every second; when one changes it reloads the extension and any open torn.com tabs. Add new files to its `WATCHED` list. A Web Store install has an `update_url`, so the worker does nothing there.

## Customizing the CSS

1. Try a rule live in torn.com's DevTools (Elements → Styles → **+**).
2. Add it to `content/content.css`, inside its Gate block. TEAR's styles apply only while Torn's own CSS is off (settings → Dev), so there's nothing of Torn's to override: no `!important`.
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
| `data-tear-ring-armed` | sidebar bars | set a frame after the first fill paints; `--tear-pct` only transitions once armed |
| `data-tear-stat` | stat rows | `money`, `level`, `points`, `merits` |
| `--tear-len` | values | character count, for shrink-to-fit text |
| `data-tear-state`, `data-tear-more` | Areas/Lists headings | `full`, `top`, `collapsed`; hidden-row count |
| `data-tear-label`, `style.order` | Awards › Merits | section names; grid order for the info panel |
| `data-tear-looped`, `data-tear-clone` | ticker | headline copy for the seamless loop |
| `data-tear-rings` | sidebar | the bars' container |
| `data-tear-columns`, `data-tear-col`, `--tear-row(s)` | content | Torn's float pairs as a 2/3 + 1/3 grid |
| `data-tear-layout` | `.content-wrapper` | `single` or `dual` |
| `data-tear-section`, `data-tear-grip` | desktop sidebar | draggable sections and their grips |
| `--tear-icon` | status icons | sprite cell |
| `data-tear-logo`, `--tear-logo-*` | `html` | the logo for the player's state |
| `data-tear-drawer-open` | `html` | the mobile navigation drawer is open |
| `data-tear-mobile` | `html` | Torn renders its mobile sidebar (the stacked layout); set by `torn-css.js` |
| `data-tear-chat-active`, `data-tear-chat-hidden` | chat items | the tabbed chat window |
| `data-tear-chat-anchor` | active chat window | the chat tabs' CSS anchor |

## Making changes

| Changed | Then |
|---|---|
| `content/*`, `lib/model.js`, `manifest.json` | nothing: hot reload reloads the extension and torn.com tabs |

Content-script logs are in torn.com's own DevTools console (pick the TEAR context in the dropdown). The settings panel lives in a shadow root on `#tear-settings-host`, the info popup on `#tear-info-host`; their CSS is in `content/panel-styles.js`.

Unit tests for `lib/model.js` use vitest (`lib/__tests__/`).

## Storage

| Area | Key | Holds |
|---|---|---|
| `sync` | `theme` | `{ fontFamily, colors: { light, dark } }`: only the colors changed from default |
| `local` | `tornDefaults` | per mode, the colors Torn's own variables resolved to (shown as defaults) |
| `local` | `sidebarOrder` | desktop sidebar section order |
| `local` | `tornCssOff` | Enable/Disable TEAR button: Torn's stylesheets switched off in this browser |
| `local` | `sectionStates` | Areas/Lists heading → `full`, `top` or `collapsed` |
| `local` | `tornAssets` | Torn image assets by name → URL (`--tear-asset-*`), saved once per page, capped at 3000 |
| `session` (`sessionStorage`) | `tearActiveChat` | the active chat tab's title |

## Layout

```
manifest.json
background.js        service worker: keeps Torn's stylesheets from downloading while TEAR is on
dev-reload.js        hot reload for unpacked installs
lib/model.js         color tokens, theme defaults, validation, storage, slug/page helpers
content/assets.css   Torn's image assets as --tear-asset-* variables
content/content.css  the stylesheet (under html.tear-enabled)
content/dock.css     always on: the dock buttons, their size tokens, the room under the page
content/torn-css.js  Enable TEAR: disables Torn's stylesheets (document_start) and brings back its sprite and icon rules, from cached copies
content/main.js      stamps the hooks above; sidebar dragging; chat tabs (only when TEAR is enabled)
content/settings.js  dock, info popup and settings panel; applies the theme
content/panel-styles.js the settings and info panels' styles, adopted by their shadow roots (no web-accessible files)
torn-theme/          selector research (ui-map.md, layout-map.md)
```

If Torn ships a frontend update and something stops applying, re-check the hashed `[class*="prefix___"]` selectors in `torn-theme/ui-map.md` first.
