# Torn.com portfolio app — status

Goal: embed Torn.com in a window inside the portfolio OS, let the user log in, and apply a custom theme/layout (background color, font, font size, show/hide or regroup UI sections) via injected CSS/DOM changes — not via Torn's own API (that path was explored and set aside; see conversation history if needed, not captured in these docs).

## Decisions made

- **Iframe embedding of the real torn.com is not possible**: Torn sends `X-Frame-Options: SAMEORIGIN`, and separately this portfolio site forces `COEP: require-corp` site-wide (via `coi-serviceworker.js`, since GitHub Pages can't set custom response headers) — either one alone blocks it. No workaround exists client-side. A server-side reverse proxy could theoretically strip the header, but GH Pages can't host one, and proxying an authenticated session likely violates Torn's ToS — not pursued.
- Torn has **no native skin/custom-CSS setting** (checked `/preferences.php` fully) — any visual reskinning must be injected externally.
- Inspection tool: **Claude in Chrome** MCP (`mcp__claude-in-chrome__*`), attached to the user's own logged-in Chrome session, used strictly read-only (DOM inspection, screenshots, no clicks on anything that performs a game action, no form submission) to avoid any ToS risk around automation.
- A test `<style>` override was injected live into the real session and verified working (font, size, link color, panel backgrounds), then removed — confirmed the approach is technically sound.

## Files in this folder

- **`ui-map.md`** — CSS/selector reference: stable containers, the legacy-vs-React-CSS-Modules distinction (hashed classnames rotate on deploy, use substring `[class*="prefix___"]` selectors), typography per page type, per-page findings (Home, Settings, Crimes/Card Skimming, Item Market).
- **`layout-map.md`** — structural/categorical inventory: Home's 13 dashboard panels, sidebar nav, header nav, and the finding that panel presence is account/state-driven (not a fixed list) with no stable selector beyond `.box-title` text — a lookup must be run live, not hardcoded.
- **`extension-plan.md`** — the original build spec, superseded by TEAR (the extension at the repo root). Kept for its reasoning.

## Delivery mechanism: TEAR (built)

Iframe embedding is ruled out (see "Decisions made" above). The reskin ships as **TEAR — Torn Element Arrange & Restyle**, a standalone Manifest V3 Chrome extension at the repo root. It isn't tied to the portfolio, and a web page can't install or inject an extension anyway. Its popup sets background and font; everything else is hand-written in [`content/content.css`](../content/content.css), which carries every selector from these notes. Install instructions are in the [root README](../README.md).

## Not yet done (next steps)

1. **Verify on live Torn.** TEAR has only been smoke-tested against a mock Home page. Still to check on the real site:
   - That the hashed sidebar selectors still match.
   - The `data-tear-route` values for Item Market and the Crimes routes.
2. **Portfolio-side launcher**: set aside. TEAR is standalone for now.
3. Sections not yet inspected: Education, Travel Agency, Friends/Targets list pages, other Crimes sub-activities beyond Card Skimming, and whether Property Vault is a separate page or a tab within Properties.
