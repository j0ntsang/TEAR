
(() => {
  const FONTS = [{ label: "Torn default (Arial)", value: "" }];

  const MODES = ["light", "dark"];

  // `torn`: built on Torn's theme variables, as that expression; the panel replaces these defaults with
  // what it resolves to on a page with Torn's own CSS.
  const COLOR_TOKENS = [
    { group: "Page", id: "bg", label: "Page background", prop: "--tear-bg", light: "#dcdfe3", dark: "#1a1a1a" },
    { group: "Page", id: "topBar", label: "Top bar", prop: "--tear-topbar", light: "#f2f2f2", dark: "#333333" },
    { group: "Page", id: "surface", label: "Panel surface", prop: "--tear-surface", light: "#f2f2f2", dark: "#333333", torn: "var(--default-bg-panel-color)" },
    { group: "Page", id: "surfaceSunk", label: "Sunken surface", prop: "--tear-surface-sunk", light: "#cccccc", dark: "#222222", torn: "var(--default-panel-divider-outer-side-color)" },
    { group: "Page", id: "panelBg", label: "Panel background", prop: "--tear-panel-bg", light: "#f2f2f2", dark: "#2a2a2a", torn: "var(--default-bg-panel-color)" },
    { group: "Page", id: "strip", label: "News ticker", prop: "--tear-strip", light: "#f2f2f2", dark: "#2a2a2a" },
    { group: "Page", id: "stripText", label: "News ticker text", prop: "--tear-strip-text", light: "#1f1f1f", dark: "#dddddd" },
    { group: "Text", id: "text", label: "Text", prop: "--tear-text", light: "#333333", dark: "#dddddd", torn: "var(--default-full-text-color)" },
    { group: "Text", id: "textStrong", label: "Strong text", prop: "--tear-text-strong", light: "#000000", dark: "#ffffff" },
    { group: "Text", id: "link", label: "Links and accent", prop: "--tear-link", light: "#0a58ca", dark: "#93c5fd" },
    { group: "Accents", id: "money", label: "Money", prop: "--tear-money", light: "#678c00", dark: "#8fd16a", torn: "var(--default-green-color)" },
    { group: "Accents", id: "gold", label: "Level and awards", prop: "--tear-gold", light: "#e8b64c", dark: "#e8b64c" },
    { group: "Accents", id: "events", label: "Events", prop: "--chip", scope: '[class^="accountLinksWrap___"] a[class^="events___"]', light: "#e8913a", dark: "#e8913a" },
    { group: "Accents", id: "live", label: "Live badge", prop: "--tear-live", light: "#c8102e", dark: "#c8102e" },
    { group: "Accents", id: "liveDot", label: "Live dot", prop: "--tear-live-dot", light: "#39ff6a", dark: "#39ff6a" },
    { group: "Accents", id: "infoButton", label: "Info button", prop: "--tear-info-button", light: "#3d5a73", dark: "#3d5a73" },
    { group: "Accents", id: "settingsButton", label: "Settings button", prop: "--tear-settings-button", light: "#6e3a9c", dark: "#6e3a9c" },
    { group: "Bars", id: "energy", label: "Energy", prop: "--ring-color", scope: '[data-tear-ring="energy"]', light: "#6cad2b", dark: "#6cad2b" },
    { group: "Bars", id: "nerve", label: "Nerve", prop: "--ring-color", scope: '[data-tear-ring="nerve"]', light: "#cc7032", dark: "#cc7032" },
    { group: "Bars", id: "happy", label: "Happy", prop: "--ring-color", scope: '[data-tear-ring="happy"]', light: "#cccc32", dark: "#cccc32" },
    { group: "Bars", id: "life", label: "Life", prop: "--ring-color", scope: '[data-tear-ring="life"]', light: "#708bdb", dark: "#708bdb" },
    { group: "Bars", id: "chain", label: "Chain", prop: "--ring-color", scope: '[data-tear-ring="chain"]', light: "#b0b0b0", dark: "#b0b0b0" },
    { group: "Bars", id: "lcdBg", label: "Readout background", prop: "--tear-lcd-bg", light: "#e8e8e8", dark: "#0a0d0a", torn: "color-mix(in srgb, var(--default-bg-panel-color), var(--default-panel-divider-outer-side-color) 30%)" },
    { group: "Shading", id: "shadow", label: "Shadow", prop: "--tear-shadow", light: "#00000026", dark: "#00000080", alpha: true },
    { group: "Shading", id: "hole", label: "Ring hole", prop: "--tear-hole", light: "#ffffff99", dark: "#00000059", alpha: true },
    { group: "Shading", id: "grooveLight", label: "Groove highlight", prop: "--tear-groove-light", light: "#ffffffe6", dark: "#ffffff14", alpha: true },
    { group: "Shading", id: "lcdBezel", label: "Readout bezel", prop: "--tear-lcd-bezel", light: "#00000026", dark: "#00000073", alpha: true },
  ];

  // The Features tab. `on`: switched on until the user changes something. Each id gates content/features/<id>.css (html.tear-f-<id>) and, where it has
  // one, the script that stamps that area's hooks. `note`: what a switch-off can't take back. `requires`: features whose CSS
  // this one reads (Theme's tokens); without them it stays off. Every feature but these reads Theme's tokens.
  const STANDALONE = ["theme", "sprites", "tornChat"];
  const FEATURES = [
    { group: "Foundation", id: "theme", on: true, label: "Theme", description: "TEAR's colour, spacing and motion variables, panel colours, your colour overrides" },
    { group: "Foundation", id: "sprites", label: "Torn sprites and icons", description: "Brings back Torn's icon sprites, read from its stylesheets", note: "Reads Torn's stylesheets again with fetch(); switching it off stops further reads" },
    { group: "Foundation", id: "widgets", label: "Shared widgets", description: "Tooltips, app headers, data grids, info messages, pagination, user lists" },
    { group: "Layout", id: "grid", label: "Page grid", description: "One grid for the page: top, sidebar or HUD, content, footer; tiers from phones to wide screens and dual screens" },
    { group: "Layout", id: "pageHeader", label: "Page headers", description: "Each page's title row, its icon link buttons and the rule under it (the same markup on every page)" },
    { group: "Layout", id: "panels", label: "Panels", description: "Content blocks stack in the content column on the grid's gap and fit its width; title bars and bodies" },
    { group: "Header", id: "header", label: "Top bar", description: "Logo, menu or drawer, and tools on the page grid's lines; search, clock, history and account popouts" },
    { group: "Header", id: "ticker", label: "News ticker", description: "The headline bar as a seamless scrolling loop" },
    { group: "Header", id: "logo", label: "Logo", description: "Torn's logo for your state, country or the day" },
    { group: "Sidebar", id: "card", label: "Character card", description: "Level, money, points and merits tiles; a card's click uses it" },
    { group: "Sidebar", id: "rings", label: "Resource rings", description: "Energy, nerve, happy, life and chain as rings with regen timers" },
    { group: "Sidebar", id: "accountLinks", label: "Account links", description: "Messages, events and awards with unread badges" },
    { group: "Sidebar", id: "areas", label: "Areas and Lists", description: "Navigation rows; headings collapse to top 10 or closed" },
    { group: "Sidebar", id: "sidebarOrder", label: "Sidebar order", description: "Drag grips to reorder the sidebar's sections" },
    { group: "Sidebar", id: "statusIcons", label: "Status icons", description: "One sprite cell per status icon" },
    { group: "Sidebar", id: "mobile", label: "Mobile layout", description: "The stacked header, HUD and fly-out drawer" },
    { group: "Pages", id: "profiles", label: "Profiles", description: "Profile card, honor bar, stats and interaction log" },
    { group: "Pages", id: "awards", label: "Awards and Settings", description: "Merits grid with an info panel; page tabs" },
    { group: "Pages", id: "items", label: "Items", description: "Item list and thumbnails" },
    { group: "Pages", id: "loadouts", label: "Loadouts", description: "Items › loadouts, with the whole-character cover flow" },
    { group: "Pages", id: "attackLog", label: "Attack log", description: "Log, fighters and stats" },
    { group: "Pages", id: "events", label: "Events", description: "The events list" },
    { group: "Chat", id: "tornChat", label: "Torn's own chat", description: "Torn's chat stylesheets, untouched; off, the chat is Torn's bare HTML", note: "Reloads Torn tabs", reload: true },
  ];
  for (const f of FEATURES) f.requires = STANDALONE.includes(f.id) ? [] : ["theme"];
  const FEATURE_IDS = FEATURES.map((f) => f.id);
  const requiresOf = (id) => FEATURES.find((f) => f.id === id)?.requires ?? [];

  const DEFAULT_FEATURES = FEATURES.filter((f) => f.on).map((f) => f.id);
  /** The enabled feature ids, from the stored list of those switched on. Nothing stored: the defaults.
   *  A feature added after the list was saved is off, and so is one whose requirements are off. */
  const enabledFeatures = (featuresOn) => {
    const on = Array.isArray(featuresOn) ? featuresOn : DEFAULT_FEATURES;
    return new Set(FEATURE_IDS.filter((id) => on.includes(id) && requiresOf(id).every((r) => on.includes(r))));
  };

  /** The stored list after switching one feature: on brings its requirements with it. */
  const switchFeature = (featuresOn, id, on) => {
    const next = new Set(featuresOn);
    if (on) for (const r of [id, ...requiresOf(id)]) next.add(r);
    else next.delete(id);
    return FEATURE_IDS.filter((f) => next.has(f));
  };

  // The settings panel's size, from the Settings tab's sliders (px). It never exceeds the window.
  const PANEL_SIZE = { width: { min: 280, max: 640, default: 340 }, height: { min: 320, max: 1000, default: 560 } };
  const DEFAULT_PANEL_SIZE = { width: PANEL_SIZE.width.default, height: PANEL_SIZE.height.default };

  /** A valid panel size from whatever was stored: in range, whole pixels, defaults for the rest. */
  function normalizePanelSize(raw) {
    const size = {};
    for (const dim of ["width", "height"]) {
      const { min, max, default: fallback } = PANEL_SIZE[dim];
      const value = Number(raw?.[dim]);
      size[dim] = Number.isFinite(value) ? Math.round(Math.min(max, Math.max(min, value))) : fallback;
    }
    return size;
  }

  const DEFAULT_THEME = {
    fontFamily: FONTS[0].value,
    colors: { light: {}, dark: {} },
  };

  const isHex = (v) => typeof v === "string" && /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v);
  const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

  /** A valid theme from whatever was stored: bad or missing fields get defaults. */
  function normalizeTheme(raw) {
    const t = isRecord(raw) ? raw : {};
    const colors = { light: {}, dark: {} };
    for (const mode of MODES) {
      const stored = isRecord(t.colors) && isRecord(t.colors[mode]) ? t.colors[mode] : {};
      for (const { id } of COLOR_TOKENS) {
        // Only known tokens and plain hex: the value goes straight into a stylesheet.
        if (isHex(stored[id])) colors[mode][id] = stored[id].toLowerCase();
      }
    }
    // Before per-mode colors, one `bgColor` applied in both modes.
    if (isHex(t.bgColor) && t.bgColor.toLowerCase() !== "#1a1a1a") {
      for (const mode of MODES) colors[mode].bg ??= t.bgColor.toLowerCase();
    }
    return {
      fontFamily: FONTS.some((f) => f.value === t.fontFamily) ? t.fontFamily : DEFAULT_THEME.fontFamily,
      colors,
    };
  }

  /** The stylesheet that applies a theme's color overrides. */
  function colorCss(colors) {
    const rules = [];
    for (const mode of MODES) {
      const body = mode === "dark" ? "body.body.dark-mode" : "body.body:not(.dark-mode)";
      const byScope = new Map();
      for (const token of COLOR_TOKENS) {
        const value = colors[mode]?.[token.id];
        if (!isHex(value)) continue;
        const selector = token.scope ? `${body} ${token.scope}` : body;
        byScope.set(selector, [...(byScope.get(selector) ?? []), `${token.prop}: ${value} !important;`]);
      }
      for (const [selector, decls] of byScope) rules.push(`${selector} { ${decls.join(" ")} }`);
    }
    return rules.join("\n");
  }

  const COUNT = /\s*\(\d[\d,]*\)\s*$/;
  const slugify = (title) =>
    title
      .replace(COUNT, "")
      .trim()
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  /** "index" for /index.php, "page" for /page.php, "" for /. */
  const pageName = (pathname) => (pathname.split("/").pop() ?? "").replace(/\.php$/, "");

  /** First segment of a SPA hash route: "#/market/view=1" → "market". */
  const routeName = (hash) => hash.replace(/^#\/?/, "").split(/[/?&=]/)[0] ?? "";

  async function getTheme() {
    const { theme } = await chrome.storage.sync.get("theme");
    return normalizeTheme(theme);
  }

  const saveTheme = (theme) => chrome.storage.sync.set({ theme: normalizeTheme(theme) });

  globalThis.TEAR = {
    FONTS,
    MODES,
    COLOR_TOKENS,
    FEATURES,
    FEATURE_IDS,
    DEFAULT_FEATURES,
    requiresOf,
    enabledFeatures,
    switchFeature,
    PANEL_SIZE,
    DEFAULT_PANEL_SIZE,
    normalizePanelSize,
    DEFAULT_THEME,
    normalizeTheme,
    colorCss,
    slugify,
    pageName,
    routeName,
    getTheme,
    saveTheme,
  };
})();
