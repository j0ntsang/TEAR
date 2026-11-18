# What a torn.com page load fetches

Captured 2026-11-17 from a logged-in tab, read-only: `performance.getEntriesByType("resource")`, the DOM's `<link>`/`<script>`/`<iframe>` tags, `document.fonts`, and DevTools network requests. Pages: profile and hospital with TEAR off; items (with loadouts) and hospital with TEAR on. Counts are for one load; per-page assets vary.

**Intercept?** column: **block**: safe to stop, and TEAR wants it stopped. **keep**: the game, or the page's content, needs it. **candidate**: cosmetic or third-party; could be blocked or replaced, but nothing requires it.

## Stylesheets

| What | Count | TEAR off | TEAR on | Intercept? |
|---|---|---|---|---|
| Legacy sheets `/css/style/**.css?v=…` (reset, `light_mode/`/`dark_mode/` vars, main, header, menu, icon, buttons, dropdown, per-page sheets like `items.css`, `profile_page.css`, `colors/hospital.css`, …) and `/css/base.css` | 35–45 per page | loaded | the DNR rule redirects each to an empty `data:text/css,` (DevTools shows the original request as 503, then a pending `data:`) | **block** (done) |
| Per-app build sheets `/builds/<app>/app.<hash>.css` (tchat, header, sidebar, profile, profile-mini, item-info, loadouts, go-to-top, attacking-effects) | 7–9 | loaded | blocked the same way | **block** (done) |
| Google Fonts `fonts.googleapis.com/css2` | 1 | `@import`ed from a Torn sheet | gone with the sheet | **block** (follows the sheets) |
| `<style>` tags in the page | 4 | applied | disabled by `torn-css.js` | n/a (not a request) |

**TEAR re-downloads Torn's CSS itself.** With the *sprites* feature on, `torn-css.js` `fetch()`es every Torn stylesheet to extract its sprite and icon rules. The DNR rule covers only `resourceType: stylesheet`, so these fetches go through: the TEAR-on capture shows each sheet twice, once blocked and once fetched with 200. They use `cache: "force-cache"` for versioned URLs, so after the first page they normally come from the HTTP cache, but they are still full sheets parsed on every page. Turning *Torn sprites and icons* off stops the fetches. A future option is to cache the extracted sprite CSS per sheet URL in `chrome.storage` and skip the fetch.

## Fonts

| What | Loaded by | Intercept? |
|---|---|---|
| `/fonts/Fjalla_One/fjallaone-regular.woff` | Torn CSS `@font-face` | **block**: only requested while Torn's CSS applies |
| `/fonts/visitor1/visitor1.ttf` | Torn CSS `@font-face` | **block**: same |
| Google Fonts (`fonts.googleapis.com/css2` and the font files it lists) | Torn CSS `@import` | **block**: same |

With TEAR on, `document.fonts` is empty: no web fonts load, and the page uses system Arial.

## Favicon, manifest, icons

| What | Notes | Intercept? |
|---|---|---|
| `<link rel="shortcut icon">` + 8× `<link rel="icon">` | inline `data:image/svg+xml` (no request) | keep. TEAR could swap the `<link>` for its own icon |
| `/favicon.ico` | Chrome requests it on its own (9× in one capture) | keep |
| `<link rel="apple-touch-icon">` `/favicon/torn/…png` | iOS home screen | keep |
| `<link rel="manifest">` `/manifest.json` → `/images/v2/manifest/icon-144x144.png` | PWA install | keep |

## Images

| What | Intercept? |
|---|---|
| Sprites Torn's CSS paints: `/images/v2/main/medals*`, `svg_icons/sprites/user_status_icons_sprite.svg`, `main/icons/*`, `items/dark_mode/item_icons_n.svg`, `grey_arrows_sprite.png`, `visitor_font_sprite.svg`, `faction/chain*` | keep only what the *sprites* feature re-adds; the rest isn't requested once Torn's CSS is off |
| Header/profile backgrounds from Torn's CSS: `header/*`, `rps/*`, `profile/neutral*` | **candidate**: TEAR paints its own |
| Logo `/images/v2/torn_logo/<state>/<size>/logo@2x.webp` | keep (the *logo* feature sets it) |
| Content `<img>`: `avatars.torn.com`, `profileimages.torn.com`, `/images/items/<id>/{medium,large}@2x.png`, `/images/items/silhouettes/*.svg`, `/images/v2/user_model/{items,masks,body,background}/*`, `/images/honors/*` | keep. Loadouts' cover flow adds `large@2x`/`@4x` item images |
| `/images/v2/main/ajax-loader-white.gif` | keep (loading state) |

## Scripts

| What | Intercept? |
|---|---|
| jQuery 1.8.2, jQuery UI 1.9.1 and ~30 legacy libs under `/js/script/**`, `/js/base.js`, `/js/templates.js`, page scripts (`n_items.js`, `profile-page.js`, …) | **keep**: the game runs on them |
| React DOM 19.2 UMD `/builds/react-umd/…`, `/builds/core/{runtime,vendors,app}`, and runtime/vendors/app for each React app (tchat, header, sidebar, profile, profile-mini, item-info, loadouts, go-to-top, attacking-effects, leave-site-alert) | **keep** |
| Worker `/js/script/lib/custom/timers_web_worker.js` | **keep** (sidebar timers) |
| Sentry `/js/debug/sentry-10.11.0.min.js` + `/js/debug/mon.js` → POSTs to `air.torn.com/api/{8,10}/envelope/` | **candidate**: error reporting to Torn. Blocking it hides TEAR-caused errors from Torn, but may also look odd to them; leave it alone |

## Game data (XHR / fetch)

**Never intercept.** TEAR is cosmetic only.

- `sidebarAjaxAction.php` (server time, sidebar data), `onlinestatus.php` (polled; 11 calls in one profile load), `missionChecker.php`, `page.php?sid=…` (loadouts: `getEquippedItems`, `getAllUpgrades`, `getUserUpgrades`), `item.php`/`profiles.php` POSTs
- Chat: `/tchat/{me,rooms,unread,dm,dm/active}`
- **WebSocket**: Centrifugo (`centrifuge.min.js`, `websocket_handlers/common_handler.js`). The URL is built at runtime: `getCentrifugeCredentials()` returns `credentials.url`, and the client connects to `<credentials.url>/connection/websocket`. Resource timing and the request log don't list sockets; see DevTools → Network → WS for the host.

## Third parties

| Host | What | Intercept? |
|---|---|---|
| `www.googletagmanager.com/gtag/js` → `www.google-analytics.com/g/collect` | Google Analytics page views | **candidate** (pure analytics) |
| `firebase.googleapis.com/v1alpha/projects/-/apps/…/webConfig` | Firebase config (push / installations; GA's `ep.origin=firebase`) | keep unless push notifications are unwanted |
| `accounts.google.com/gsi/client` | Google Sign-In | keep (login) |
| `www.torn.com/cdn-cgi/speculation` | Cloudflare speculation rules (prefetch hints) | keep |

## Not Torn's

- `chrome-extension://aeblfdkhhhdcdjpifhhbdiojplfjncoa/inline/injected.js`: another installed extension (a password manager's injector), not part of the page.
- TEAR's own CSS and scripts are content scripts and don't show up as page requests.
