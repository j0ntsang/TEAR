// The TEAR dock (info and settings buttons, bottom left) and the settings panel.
// The panel lives in a shadow root so neither Torn's CSS nor TEAR's own reaches it.

(() => {
  const { FONTS, MODES, COLOR_TOKENS, DEFAULT_THEME, normalizeTheme, colorCss, getTheme, saveTheme } = TEAR;
  const root = document.documentElement;

  let theme = normalizeTheme(undefined);
  const overrides = document.createElement("style");
  overrides.id = "tear-color-overrides";

  function applyTheme() {
    // Torn's font stacks stay untouched under "Torn default".
    root.toggleAttribute("data-tear-font", Boolean(theme.fontFamily));
    root.style.setProperty("--tear-font-family", theme.fontFamily || "initial");
    overrides.textContent = colorCss(theme.colors);
    if (!overrides.isConnected) document.head.append(overrides);
  }

  // storage.sync caps writes per minute, and a color picker fires on every drag step.
  let saveTimer = 0;
  const saveSoon = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveTheme(theme), 400);
  };
  const update = (next) => {
    theme = normalizeTheme(next);
    applyTheme();
    saveSoon();
    render();
  };

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !("theme" in changes) || saveTimer) return;
    theme = normalizeTheme(changes.theme.newValue);
    applyTheme();
    render();
  });
  getTheme().then((stored) => {
    theme = stored;
    applyTheme();
    render();
  });

  // ---- Defaults ---------------------------------------------------------

  const currentMode = () => (document.body.classList.contains("dark-mode") ? "dark" : "light");

  // Tokens built on Torn's variables only resolve in the mode the page is in, so each
  // mode's resolved values are remembered for when the panel edits the other one.
  const learned = { light: {}, dark: {} };
  chrome.storage.local.get("tornDefaults").then(({ tornDefaults }) => {
    for (const mode of MODES) Object.assign(learned[mode], tornDefaults?.[mode]);
    learnDefaults();
  });

  const canvas = Object.assign(document.createElement("canvas"), { width: 1, height: 1 });
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const hex = (n) => n.toString(16).padStart(2, "0");
  // Painting the computed color reads back any notation, color-mix() included.
  function toHex(cssColor, alpha) {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return `#${hex(r)}${hex(g)}${hex(b)}${alpha && a < 255 ? hex(a) : ""}`;
  }

  function learnDefaults() {
    const mode = currentMode();
    const probe = document.createElement("i");
    probe.hidden = true;
    document.body.append(probe);
    // Read the stylesheet's values, not the user's overrides.
    overrides.disabled = true;
    const found = {};
    for (const token of COLOR_TOKENS.filter((t) => t.torn)) {
      probe.style.color = `var(${token.prop})`;
      found[token.id] = toHex(getComputedStyle(probe).color, token.alpha);
    }
    overrides.disabled = false;
    probe.remove();
    if (Object.keys(found).every((id) => learned[mode][id] === found[id])) return;
    learned[mode] = { ...learned[mode], ...found };
    chrome.storage.local.set({ tornDefaults: learned });
    render();
  }
  new MutationObserver(learnDefaults).observe(document.body, { attributes: true, attributeFilter: ["class"] });

  const defaultColor = (token, mode) => learned[mode][token.id] ?? token[mode];
  const colorOf = (token, mode) => theme.colors[mode][token.id] ?? defaultColor(token, mode);
  const isChanged = (token, mode) => {
    const value = theme.colors[mode][token.id];
    return value !== undefined && value !== defaultColor(token, mode);
  };

  // ---- Dock -------------------------------------------------------------
  // Bottom left, under the sidebar: an info button that pops the sidebar's footer up
  // like the profile menu, and the settings button on its right. Both copy the look of
  // Torn's chat-bar buttons.

  const SVG = "http://www.w3.org/2000/svg";
  const FOOTER = '[class^="footerMenu___"]';

  const dock = document.createElement("div");
  dock.id = "tear-dock";

  function dockButton(attr, label, icon) {
    const el = document.createElement("button");
    el.type = "button";
    el.setAttribute(attr, "");
    el.title = label;
    el.setAttribute("aria-label", label);
    el.setAttribute("aria-expanded", "false");
    el.append(icon);
    dock.append(el);
    return el;
  }

  function icon(d, viewBox = "0 0 24 24") {
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("fill", "currentColor");
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute("d", d);
    svg.append(path);
    return svg;
  }

  const infoButton = dockButton(
    "data-tear-info",
    "Info",
    icon("M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 1.8a8.2 8.2 0 1 0 0 16.4 8.2 8.2 0 0 0 0-16.4zM13.2 10v7h-2.4v-7zM12 6a1.4 1.4 0 1 1 0 2.8A1.4 1.4 0 0 1 12 6z"),
  );
  infoButton.setAttribute("aria-haspopup", "true");

  const button = dockButton(
    "data-tear-settings",
    "TEAR settings",
    icon(
      "M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.2 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z",
    ),
  );
  button.setAttribute("aria-haspopup", "dialog");

  // Torn's own gear, when its chat bar has one, so the copy matches it exactly.
  function useTornGear() {
    const gear = document.querySelector('#chatRoot button:is([aria-label="Settings"], [title="Settings"]) svg');
    if (gear && !button.dataset.tearTornGear) {
      button.replaceChildren(gear.cloneNode(true));
      button.dataset.tearTornGear = "1";
    }
  }

  // The dock lines up with the sidebar's left edge, or the window's on pages without one.
  function placeDock() {
    if (!dock.isConnected) document.body.append(dock);
    const sidebar = document.querySelector('[class^="sidebar___"][class*=" desktop___"]');
    const left = sidebar?.getBoundingClientRect().width ? Math.max(8, sidebar.getBoundingClientRect().left) : 8;
    if (root.style.getPropertyValue("--tear-dock-left") !== `${left}px`) root.style.setProperty("--tear-dock-left", `${left}px`);
    infoButton.hidden = !document.querySelector(FOOTER);
    useTornGear();
  }

  // The footer stays where Torn renders it; CSS lifts it out as the popup.
  const infoOpen = () => root.hasAttribute("data-tear-info-open");
  function setInfo(open) {
    root.toggleAttribute("data-tear-info-open", open);
    infoButton.setAttribute("aria-expanded", String(open));
  }

  // Torn's handlers further up the page never see TEAR's own buttons.
  infoButton.addEventListener("click", (event) => {
    event.stopPropagation();
    close();
    setInfo(!infoOpen());
  });
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    setInfo(false);
    toggle();
  });
  addEventListener("pointerdown", (event) => {
    if (infoOpen() && !event.composedPath().some((el) => el === infoButton || el.matches?.(FOOTER))) setInfo(false);
  });
  addEventListener("keydown", (event) => {
    if (event.key === "Escape" && infoOpen()) {
      setInfo(false);
      infoButton.focus();
    }
  });

  let frame = 0;
  new MutationObserver(() => {
    frame ||= requestAnimationFrame(() => {
      frame = 0;
      placeDock();
    });
  }).observe(document.body, { childList: true, subtree: true });
  addEventListener("resize", placeDock);
  placeDock();

  // ---- Panel ------------------------------------------------------------

  const host = document.createElement("div");
  host.id = "tear-settings-host";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <link rel="stylesheet" href="${chrome.runtime.getURL("content/settings.css")}">
    <section class="panel" role="dialog" aria-label="TEAR settings" hidden>
      <header>
        <h2>TEAR</h2>
        <button type="button" class="close" aria-label="Close">×</button>
      </header>
      <div class="tabs" role="tablist" aria-label="Settings">
        <button type="button" role="tab" id="tab-colors" aria-controls="pane-colors">Colors</button>
        <button type="button" role="tab" id="tab-type" aria-controls="pane-type">Typography</button>
      </div>
      <div class="pane" role="tabpanel" id="pane-colors" aria-labelledby="tab-colors">
        <label class="field mode">
          <span>Configure</span>
          <select id="mode">
            <option value="light">Light mode</option>
            <option value="dark">Dark mode</option>
          </select>
        </label>
        <div id="colors"></div>
      </div>
      <div class="pane" role="tabpanel" id="pane-type" aria-labelledby="tab-type">
        <label class="field">
          <span>Font family</span>
          <select id="font"></select>
        </label>
        <p class="sample" id="sample">The quick brown fox — 1,234,567</p>
      </div>
      <footer>
        <button type="button" class="reset" id="reset">Reset to default</button>
      </footer>
    </section>`;

  const $ = (sel) => shadow.querySelector(sel);
  const panel = $(".panel");
  const tabs = [...shadow.querySelectorAll('[role="tab"]')];
  const modeSelect = $("#mode");
  const fontSelect = $("#font");
  fontSelect.append(...FONTS.map(({ label, value }) => new Option(label, value)));

  let activeTab = "tab-colors";
  let editMode = currentMode();

  // Rows are built once; render() only refreshes their values.
  const rows = new Map();
  let group = "";
  for (const token of COLOR_TOKENS) {
    if (token.group !== group) {
      group = token.group;
      $("#colors").append(Object.assign(document.createElement("h3"), { textContent: group }));
    }
    const row = document.createElement("div");
    row.className = "row";
    const id = `color-${token.id}`;
    row.innerHTML = `
      <label for="${id}"><span class="changed" title="Changed"></span></label>
      <span class="controls">
        <input type="color" id="${id}">
        ${token.alpha ? `<input type="range" min="0" max="255" aria-label="${token.label} opacity" title="Opacity">` : ""}
        <button type="button" class="undo" title="Reset ${token.label}" aria-label="Reset ${token.label}">↺</button>
      </span>`;
    row.querySelector("label").prepend(token.label);
    const [color, range] = row.querySelectorAll("input");
    const set = () => {
      const value = color.value + (range ? hex(Number(range.value)) : "");
      update({ ...theme, colors: { ...theme.colors, [editMode]: { ...theme.colors[editMode], [token.id]: value } } });
    };
    color.addEventListener("input", set);
    range?.addEventListener("input", set);
    row.querySelector(".undo").addEventListener("click", () => {
      const { [token.id]: _, ...rest } = theme.colors[editMode];
      update({ ...theme, colors: { ...theme.colors, [editMode]: rest } });
    });
    rows.set(token, row);
    $("#colors").append(row);
  }

  function render() {
    if (!panel || panel.hidden) return;
    for (const tab of tabs) {
      const selected = tab.id === activeTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      shadow.getElementById(tab.getAttribute("aria-controls")).hidden = !selected;
    }
    modeSelect.value = editMode;
    for (const [token, row] of rows) {
      const value = colorOf(token, editMode);
      const [color, range] = row.querySelectorAll("input");
      // Don't fight the picker while it's being dragged.
      if (shadow.activeElement !== color) color.value = value.slice(0, 7);
      if (range && shadow.activeElement !== range) range.value = String(parseInt(value.slice(7) || "ff", 16));
      row.classList.toggle("is-changed", isChanged(token, editMode));
    }
    fontSelect.value = theme.fontFamily;
    $("#sample").style.fontFamily = theme.fontFamily || "inherit";

    const resetButton = $("#reset");
    const changed =
      activeTab === "tab-colors"
        ? COLOR_TOKENS.some((t) => isChanged(t, editMode))
        : theme.fontFamily !== DEFAULT_THEME.fontFamily;
    resetButton.hidden = !changed;
    resetButton.textContent = activeTab === "tab-colors" ? `Reset ${editMode} colors to default` : "Reset font to default";
    host.dataset.mode = currentMode();
  }

  function selectTab(tab, focus) {
    activeTab = tab.id;
    render();
    if (focus) tab.focus();
  }
  for (const tab of tabs) tab.addEventListener("click", () => selectTab(tab, false));
  $(".tabs").addEventListener("keydown", (event) => {
    const at = tabs.findIndex((t) => t.id === activeTab);
    const next = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: tabs.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectTab(tabs[(next + tabs.length) % tabs.length], true);
  });

  modeSelect.addEventListener("change", () => {
    editMode = modeSelect.value;
    render();
  });
  fontSelect.addEventListener("change", () => update({ ...theme, fontFamily: fontSelect.value }));
  $("#reset").addEventListener("click", () => {
    if (activeTab === "tab-colors") update({ ...theme, colors: { ...theme.colors, [editMode]: {} } });
    else update({ ...theme, fontFamily: DEFAULT_THEME.fontFamily });
  });

  function position() {
    const anchor = button.getBoundingClientRect();
    host.style.setProperty("--bottom", `${Math.max(8, innerHeight - anchor.top + 6)}px`);
    host.style.setProperty("--left", `${Math.max(8, anchor.left)}px`);
  }

  function open() {
    if (!host.isConnected) document.body.append(host);
    editMode = currentMode();
    panel.hidden = false;
    button.setAttribute("aria-expanded", "true");
    position();
    render();
    shadow.getElementById(activeTab).focus();
  }

  function close() {
    if (panel.hidden) return;
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (shadow.activeElement) button.focus();
  }

  const toggle = () => (panel.hidden ? open() : close());

  $(".close").addEventListener("click", close);
  shadow.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  addEventListener("pointerdown", (event) => {
    if (!panel.hidden && !event.composedPath().some((el) => el === host || el === button)) close();
  });
  addEventListener("resize", () => panel.hidden || position());
})();
