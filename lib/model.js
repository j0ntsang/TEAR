// TEAR shared model. Loaded as a classic script by the content script and the
// popup (there's no bundler), so it hangs everything off globalThis.TEAR.
//
// Storage: sync `theme` = { bgColor, fontFamily }.

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

  const DEFAULT_THEME = {
    bgColor: "#1a1a1a",
    fontFamily: FONTS[1].value,
  };

  const isColor = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
  const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

  /** A valid theme from whatever was stored: bad or missing fields get defaults. */
  function normalizeTheme(raw) {
    const t = isRecord(raw) ? raw : {};
    return {
      bgColor: isColor(t.bgColor) ? t.bgColor : DEFAULT_THEME.bgColor,
      // Only fonts from the list: the value goes straight into a CSS property.
      fontFamily: FONTS.some((f) => f.value === t.fontFamily) ? t.fontFamily : DEFAULT_THEME.fontFamily,
    };
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

  globalThis.TEAR = { FONTS, DEFAULT_THEME, normalizeTheme, slugify, pageName, routeName, getTheme, saveTheme };
})();
