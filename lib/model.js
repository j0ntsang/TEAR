// TEAR shared model. Loaded as a classic script by the content script (there's
// no bundler), so it hangs everything off globalThis.TEAR.
//
// Storage: sync `theme` = { fontFamily, colors: { light: { id: hex }, dark: { id: hex } } }.
// `colors` holds only the overrides; a token with no entry keeps its stylesheet value.

(() => {
  const FONTS = [
    { label: "Torn default", value: "" },
    { label: "JetBrains Mono", value: '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace' },
    { label: "Fira Code", value: '"Fira Code", ui-monospace, Menlo, Consolas, monospace' },
    { label: "Cascadia Code", value: '"Cascadia Code", ui-monospace, Menlo, Consolas, monospace' },
    { label: "Source Code Pro", value: '"Source Code Pro", ui-monospace, Menlo, Consolas, monospace' },
    { label: "IBM Plex Mono", value: '"IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace' },
    { label: "System monospace", value: "ui-monospace, Menlo, Consolas, monospace" },
  ];

  const MODES = ["light", "dark"];

  // Defaults mirror content.css. `torn` marks values that come from Torn's own theme
  // variables; the settings panel replaces those defaults with what the page resolves.
  // `scope` is the element the variable is set on when it isn't body.
  const COLOR_TOKENS = [
    { group: "Page", id: "bg", label: "Page background", prop: "--tear-bg", light: "#1a1a1a", dark: "#1a1a1a" },
    { group: "Page", id: "surface", label: "Panel surface", prop: "--tear-surface", light: "#f2f2f2", dark: "#333333", torn: true },
    { group: "Page", id: "surfaceSunk", label: "Sunken surface", prop: "--tear-surface-sunk", light: "#cccccc", dark: "#222222", torn: true },
    { group: "Page", id: "panelBg", label: "Panel background", prop: "--tear-panel-bg", light: "#f2f2f2", dark: "#2a2a2a", torn: true },
    { group: "Page", id: "strip", label: "News ticker", prop: "--tear-strip", light: "#f5f5f5", dark: "#f5f5f5" },
    { group: "Page", id: "stripText", label: "News ticker text", prop: "--tear-strip-text", light: "#000000", dark: "#000000" },
    { group: "Text", id: "text", label: "Text", prop: "--tear-text", light: "#333333", dark: "#dddddd", torn: true },
    { group: "Text", id: "textStrong", label: "Strong text", prop: "--tear-text-strong", light: "#000000", dark: "#ffffff" },
    { group: "Text", id: "link", label: "Links and accent", prop: "--tear-link", light: "#0a58ca", dark: "#93c5fd" },
    { group: "Accents", id: "money", label: "Money", prop: "--tear-money", light: "#678c00", dark: "#8fd16a", torn: true },
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
    { group: "Bars", id: "lcdBg", label: "Readout background", prop: "--tear-lcd-bg", light: "#e8e8e8", dark: "#0a0d0a", torn: true },
    { group: "Shading", id: "shadow", label: "Shadow", prop: "--tear-shadow", light: "#00000026", dark: "#00000080", alpha: true },
    { group: "Shading", id: "hole", label: "Ring hole", prop: "--tear-hole", light: "#ffffff99", dark: "#00000059", alpha: true },
    { group: "Shading", id: "grooveLight", label: "Groove highlight", prop: "--tear-groove-light", light: "#ffffffe6", dark: "#ffffff14", alpha: true },
    { group: "Shading", id: "lcdBezel", label: "Readout bezel", prop: "--tear-lcd-bezel", light: "#00000026", dark: "#00000073", alpha: true },
  ];

  const DEFAULT_THEME = {
    fontFamily: FONTS[1].value,
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
      // Only fonts from the list: the value goes straight into a CSS property.
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

  // A panel's title carries live counts, e.g. "Personal Perks (38)".
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
