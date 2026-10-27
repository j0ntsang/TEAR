// Applies the active profile to the page and keeps it applied: Torn renders
// parts of the page late, and the popup/options page change settings live.

(() => {
  const { getActiveProfile, profileKey, activeTabKey, panels, nav } = TEAR;
  const root = document.documentElement;
  let profile = null;
  let activeTab = "all";
  let lastPanels = "";
  let lastAreas = "";

  function applyTheme(t) {
    root.style.setProperty("--tear-bg", t.bgColor);
    root.style.setProperty("--tear-panel-bg", t.panelBg);
    root.style.setProperty("--tear-text", t.textColor);
    root.style.setProperty("--tear-link", t.linkColor);
    // Font overrides are opt-in attributes: "Torn default" / size 0 must leave
    // Torn's own stacks alone, not fall back to the CSS defaults.
    root.toggleAttribute("data-tear-font", Boolean(t.fontFamily));
    root.style.setProperty("--tear-font-family", t.fontFamily || "initial");
    root.toggleAttribute("data-tear-size", t.fontSize > 0);
    root.style.setProperty("--tear-font-size", `${t.fontSize}px`);
  }

  function pickTab(id) {
    activeTab = id;
    chrome.storage.local.set({ [activeTabKey(profile.id)]: id });
    applyLayout();
  }

  function applyLayout() {
    const found = panels.apply(profile.layout, activeTab, pickTab);
    const known = JSON.stringify(found.map(({ slug, label }) => ({ slug, label })));
    if (found.length && known !== lastPanels) {
      lastPanels = known;
      chrome.storage.local.set({ knownPanels: JSON.parse(known) });
    }
  }

  function harvestAreas() {
    const areas = nav.harvest();
    const known = JSON.stringify(areas);
    if (areas.length && known !== lastAreas) {
      lastAreas = known;
      chrome.storage.local.set({ knownAreas: areas });
    }
  }

  async function load() {
    profile = await getActiveProfile();
    const key = activeTabKey(profile.id);
    activeTab = (await chrome.storage.local.get(key))[key] ?? "all";
    applyTheme(profile.theme);
    applyLayout();
    nav.render(profile.nav);
  }

  let frame = 0;
  const schedule = () => {
    if (frame || !profile) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      applyLayout();
      nav.render(profile.nav);
    });
  };

  const isOurs = (node) => node.nodeType === 1 && node.closest(".tear-tabbar, .tear-navbar");
  const observer = new MutationObserver((records) => {
    if (records.every((r) => isOurs(r.target))) return;
    schedule();
  });
  const main = document.getElementById("mainContainer");
  if (main) observer.observe(main, { childList: true, subtree: true });
  // Torn's React header can re-render and drop the nav bar from beside it.
  observer.observe(document.body, { childList: true });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && profile && ("activeProfile" in changes || profileKey(profile.id) in changes)) load();
  });

  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type === "GET_PANELS") reply(panels.tag().map(({ slug, label }) => ({ slug, label })));
  });

  load();
  // The React sidebar mounts after document_idle on slow loads.
  for (const delay of [0, 1500, 5000]) setTimeout(harvestAreas, delay);
})();
