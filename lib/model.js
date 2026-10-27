// TEAR shared model. Loaded as a classic script by the content scripts, the
// popup and the options page (there's no bundler), so it hangs everything off
// globalThis.TEAR instead of exporting.
//
// Storage layout:
//   sync   activeProfile            id of the profile in use
//   sync   profile:<id>             one key per profile (sync caps items at 8 KB)
//   local  knownPanels, knownAreas  what the content scripts last saw on Torn
//   local  activeTab:<id>           the Home tab picked in that profile

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
    panelBg: "#2a2a2a",
    textColor: "#dddddd",
    linkColor: "#6cb6ff",
    fontFamily: FONTS[1].value,
    fontSize: 15, // px; 0 leaves Torn's sizes alone
  };

  const DEFAULT_ID = "default";
  const profileKey = (id) => `profile:${id}`;
  const activeTabKey = (id) => `activeTab:${id}`;

  // A panel's title carries live counts, e.g. "Personal Perks (38)".
  const COUNT = /\s*\(\d[\d,]*\)\s*$/;
  const panelLabel = (title) => title.replace(COUNT, "").trim();
  const slugify = (title) =>
    panelLabel(title)
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  /** Slugs in `order` first (when present), then the rest as given. */
  function mergeOrder(order, slugs) {
    const present = new Set(slugs);
    const head = [...new Set(order)].filter((s) => present.has(s));
    const placed = new Set(head);
    return [...head, ...slugs.filter((s) => !placed.has(s))];
  }

  function isTornUrl(href) {
    try {
      const url = new URL(href);
      return url.protocol === "https:" && url.hostname === "www.torn.com";
    } catch {
      return false;
    }
  }

  const uid = () => crypto.randomUUID().slice(0, 8);
  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const list = (v) => (Array.isArray(v) ? v : []);
  const strings = (v) => list(v).filter((s) => typeof s === "string" && s);
  const isColor = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
  const isRecord = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

  /**
   * A complete, valid profile from whatever was stored or imported: missing or
   * bad fields fall back to defaults, unknown fields are dropped.
   */
  function withDefaults(raw) {
    const p = isRecord(raw) ? raw : {};
    const t = isRecord(p.theme) ? p.theme : {};
    const l = isRecord(p.layout) ? p.layout : {};
    const size = Number(t.fontSize);
    const hidden = {};
    if (isRecord(l.hidden)) for (const [slug, on] of Object.entries(l.hidden)) if (on === true) hidden[slug] = true;

    return {
      id: str(p.id) || DEFAULT_ID,
      name: str(p.name) || "Default",
      theme: {
        bgColor: isColor(t.bgColor) ? t.bgColor : DEFAULT_THEME.bgColor,
        panelBg: isColor(t.panelBg) ? t.panelBg : DEFAULT_THEME.panelBg,
        textColor: isColor(t.textColor) ? t.textColor : DEFAULT_THEME.textColor,
        linkColor: isColor(t.linkColor) ? t.linkColor : DEFAULT_THEME.linkColor,
        // Only fonts from the list: the value goes straight into a CSS property.
        fontFamily: FONTS.some((f) => f.value === t.fontFamily) ? t.fontFamily : DEFAULT_THEME.fontFamily,
        fontSize: Number.isInteger(size) && size >= 0 && size <= 32 ? size : DEFAULT_THEME.fontSize,
      },
      layout: {
        order: [...new Set(strings(l.order))],
        hidden,
        tabs: list(l.tabs)
          .filter(isRecord)
          .map((tab) => ({ id: str(tab.id) || uid(), name: str(tab.name) || "Tab", panels: [...new Set(strings(tab.panels))] })),
      },
      nav: list(p.nav)
        .filter((n) => isRecord(n) && str(n.label) && isTornUrl(n.href))
        .map((n) => ({ label: str(n.label), href: n.href })),
    };
  }

  const EXPORT_FORMAT = "tear-profile";

  function exportProfile(profile) {
    const { id, ...rest } = withDefaults(profile);
    return JSON.stringify({ format: EXPORT_FORMAT, version: 1, profile: rest }, null, 2);
  }

  /** Parses an export into a new profile (fresh id). Throws on anything else. */
  function importProfile(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("That file isn't JSON.");
    }
    if (!isRecord(data) || data.format !== EXPORT_FORMAT || !isRecord(data.profile)) {
      throw new Error("That file isn't a TEAR profile export.");
    }
    return withDefaults({ ...data.profile, id: uid() });
  }

  // ---- chrome.storage ----

  const sync = () => chrome.storage.sync;

  async function getActiveId() {
    const { activeProfile } = await sync().get("activeProfile");
    return typeof activeProfile === "string" ? activeProfile : DEFAULT_ID;
  }

  async function getActiveProfile() {
    const id = await getActiveId();
    const key = profileKey(id);
    const stored = (await sync().get(key))[key];
    if (stored) return withDefaults(stored);
    // The active one was deleted elsewhere: fall back to any profile.
    const [first] = await listProfiles();
    return first;
  }

  /** All saved profiles, by name. Never empty: there's always a default. */
  async function listProfiles() {
    const all = await sync().get(null);
    const profiles = Object.entries(all)
      .filter(([key]) => key.startsWith("profile:"))
      .map(([, value]) => withDefaults(value))
      .sort((a, b) => a.name.localeCompare(b.name));
    return profiles.length ? profiles : [withDefaults({ id: DEFAULT_ID })];
  }

  async function saveProfile(profile) {
    const clean = withDefaults(profile);
    await sync().set({ [profileKey(clean.id)]: clean });
    return clean;
  }

  const setActiveProfile = (id) => sync().set({ activeProfile: id });

  /** A new saved profile, copied from `from` when given. */
  function newProfile(name, from) {
    return saveProfile({ ...(from ? structuredClone(from) : {}), id: uid(), name });
  }

  async function deleteProfile(id) {
    const rest = (await listProfiles()).filter((p) => p.id !== id);
    if (!rest.length) throw new Error("Can't delete the only profile.");
    await sync().remove(profileKey(id));
    if ((await getActiveId()) === id) {
      // Save it so a default that was never edited still exists to switch to.
      await saveProfile(rest[0]);
      await setActiveProfile(rest[0].id);
    }
  }

  globalThis.TEAR = {
    FONTS,
    DEFAULT_THEME,
    profileKey,
    activeTabKey,
    panelLabel,
    slugify,
    mergeOrder,
    isTornUrl,
    withDefaults,
    exportProfile,
    importProfile,
    getActiveId,
    getActiveProfile,
    listProfiles,
    saveProfile,
    setActiveProfile,
    newProfile,
    deleteProfile,
  };
})();
