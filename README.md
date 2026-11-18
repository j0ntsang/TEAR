# TEAR — Torn Element Arrange & Restyle

A Chrome extension that restyles torn.com:

- **Dock** (bottom right, left of Torn's chat buttons): an **info** button showing Torn City time and the server, and a purple **settings** gear that opens the settings panel. The toolbar icon does nothing. **Features** (the first tab) switches each part of TEAR on or off, live; only Theme starts on; **Settings** sizes the panel and resets everything; **Customization** edits every TEAR color separately for light and dark mode, and picks the font (Torn's Arial, applied by Theme); **Dev** switches Torn's own stylesheets off, which is what turns TEAR on. Changed values can be reset to default.
- **TEAR only applies with Torn's CSS off**: `content/torn-css.js` then sets `html.tear-enabled`, which gates the feature stylesheets and `main.js`. With Torn's CSS on, the page is Torn's own; only the dock shows.
- **Features**: TEAR is cut into areas (theme, sprites, widgets, page grid, page headers, panels, top bar, ticker, logo, character card, rings, account links, Areas/Lists, sidebar order, status icons, mobile, a few pages, and Torn's own chat). Each has its own stylesheet in `content/features/` and, where it needs one, its own part of `main.js`. Switched off, its CSS stops applying and its script stops: observers disconnected, listeners removed, and every attribute, style and node it added taken back. With TEAR enabled and everything off, the page is Torn's bare HTML plus the dock. Every feature but Theme, sprites and Torn's own chat reads Theme's tokens, so it needs Theme (`requires` in `lib/model.js`): switching one on brings Theme with it, and with Theme off they stay off. TEAR doesn't restyle the chat: with Torn's own chat on, Torn's chat stylesheets load untouched; off, the chat is Torn's bare HTML.
- **Light and dark**: follows Torn's own Dark Mode setting by building on Torn's theme variables.

It's cosmetic only. TEAR never submits or automates anything in the game. Its scripts only add attributes and CSS order, copy the ticker's headlines for the scroll loop, and act on your own clicks: a Points/Merits card opens its "use" link, and a section heading collapses its section.

## Install (local dev)

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and choose this folder.
3. Open or refresh torn.com. The info and settings buttons sit in the bottom right, left of the chat buttons. Turn TEAR on with the Enable TEAR button at the top of the settings panel, then switch on the features you want (or All on) in the Features tab.

There's no build step: Chrome runs these files as they are.

### Hot reload

`dev-reload.js` runs as the background service worker. In an unpacked install it polls the extension's files every second; when one changes it reloads the extension and any open torn.com tabs. Add new files to its `WATCHED` list. A Web Store install has an `update_url`, so the worker does nothing there.

## Customizing the CSS

1. Try a rule live in torn.com's DevTools (Elements → Styles → **+**).
2. Add it to the feature's file in `content/features/`, inside its gate block (`html.tear-enabled:where(.tear-f-<id>)`). The `:where()` keeps specificity what it was before features: the files' order in `manifest.json` doesn't match the old single file's order exactly, and is only safe because rules in different features don't compete at equal specificity. Keep rules that override each other in the same file. TEAR's styles apply only while Torn's own CSS is off (settings → Dev), so there's nothing of Torn's to override: no `!important`.
3. Save. Hot reload picks it up.

Each stylesheet opens with a generated banner (the feature's name in block letters, its gate, and a table of contents) and is split into numbered `§N ▸ TITLE` sections, with `§N.M` sub-sections. Put a new rule in the section it belongs to; if it starts a new one, print the header with `python3 tools/css-section.py <indent> <N> "<Title>" "<what it styles>"` (100 columns, so they all line up), then run `python3 tools/css-banners.py .` to refresh every banner's table of contents (`--check` fails if one is stale). Sections follow the file's order: moving rules to tidy a section can change which of two equal-specificity rules wins.

Colors, spacing, radii and type sizes are variables on `body` at the top of `features/theme.css`, with dark-mode overrides on `body.dark-mode`. They have to live on `body`, not `:root`: Torn sets its dark values on `body.dark-mode`, and TEAR's light values point at Torn's (`--default-bg-panel-color`, `--default-full-text-color`, …).

### Layout

The page is one grid (`features/grid.css`), with no floats. Its columns are named lines:

```
[full-start] gutter [main-start side-start] sidebar [side-end] gap [content-start] content [content-end main-end] gutter [full-end]
```

| Area | Element |
|---|---|
| `top` | `#header-root`: a subgrid, continued by the top bar (`#header-wrapper-top`) and the ticker row (`.header-wrapper-bottom`) |
| `sidebar` | `#sidebarroot` with Torn's desktop sidebar |
| `hud` | `#sidebarroot` with Torn's mobile sidebar (`html[data-tear-mobile]`) |
| `content` | `.content-wrapper` |
| `footer` | `.footer` |

Inside the top bar: `logo | menu | tools` with the desktop markup, `logo | drawer | tools` with the mobile one. Torn's markup picks the template; widths set `--page-gutter`, `--page-gap` and `--sidebar-w`. With the mobile markup, the sidebar track and its gap are 0.

| Tier | From | Devices |
|---|---|---|
| xs | 0 | iPhone SE (1st gen) 320, Galaxy Fold cover |
| phone | 360 | 360 / 375 / 390 / 393 / 412 / 414 / 430 |
| fold | 480 | Surface Duo (one screen) 540, foldables unfolded, small tablets |
| tablet | 768 | iPad mini, Air, Pro (portrait) |
| laptop | 1024 | iPad landscape, 1280, 1366 |
| desktop | 1440 | 1440, 1536, 1680 |
| wide | 1920 | 1920, 2560: content fills the width |

On dual screens (the `horizontal-viewport-segments` and `vertical-viewport-segments` media queries), the header and sidebar or HUD take one screen and the content takes the other. Nothing straddles the hinge.

CSS can't read the URL, text or numbers, so `content/main.js` stamps hooks the stylesheet selects on:

Each hook belongs to the feature that stamps it, and is removed when that feature is switched off. `data-tear-page`, `data-tear-route` and `data-tear-panel` are stamped while any feature is on; `data-tear-mobile` comes from `torn-css.js` on the same terms.

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
| `data-tear-search-open` | `html` | the top bar's mobile search is open |
| `data-tear-mobile` | `html` | Torn renders its mobile sidebar (the stacked layout); set by `torn-css.js` |

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
| `local` | `featuresOn` | Features tab: the feature ids switched on (absent = the defaults, only `theme`; a feature added after the list was saved is off) |
| `local` | `loadoutView` | Loadouts: `compact` or `expanded` |
| `local` | `panelSize` | Settings tab: the panel's `{ width, height }` in px (280–640 × 320–1000, default 340 × 560) |
| `local` | `sectionStates` | Areas/Lists heading → `full`, `top` or `collapsed` |
| `local` | `tornAssets` | Torn image assets by name → URL (`--tear-asset-*`), saved once per page, capped at 3000 |

## Layout

```
manifest.json
background.js        service worker: keeps Torn's stylesheets from downloading while TEAR is on
dev-reload.js        hot reload for unpacked installs
lib/model.js         feature registry, color tokens, theme defaults, validation, storage, slug/page helpers (loaded at document_start)
content/assets.css   TEAR's cascade layer order; Torn's image assets as --tear-asset-* variables
content/features/    one stylesheet per feature (html.tear-enabled:where(.tear-f-<id>)); ids and labels in lib/model.js FEATURES
content/dock.css     always on: the dock buttons, their size tokens, the room under the page
content/torn-css.js  Enable TEAR: disables Torn's stylesheets (document_start), sets the feature classes, and brings back its sprite and icon rules, from cached copies
content/main.js      the features' scripts, each with start/stop: stamps the hooks above; sidebar dragging (only when TEAR is enabled)
content/settings.js  dock, info popup and settings panel; applies the theme
content/panel-styles.js the settings and info panels' styles, adopted by their shadow roots (no web-accessible files)
tools/               css-banners.py (stylesheet banners and contents), css-section.py (section headers)
torn-theme/          selector research (ui-map.md, layout-map.md); what a page load fetches (network-map.md)
```

If Torn ships a frontend update and something stops applying, re-check the hashed `[class*="prefix___"]` selectors in `torn-theme/ui-map.md` first.
