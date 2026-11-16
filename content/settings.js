// The panel lives in a shadow root so neither Torn's CSS nor TEAR's own reaches it.

(() => {
  const { FONTS, MODES, COLOR_TOKENS, DEFAULT_THEME, normalizeTheme, colorCss, getTheme, saveTheme } = TEAR;
  const root = document.documentElement;

  let theme = normalizeTheme(undefined);
  const overrides = document.createElement("style");
  overrides.id = "tear-color-overrides";

  function applyTheme() {
    overrides.textContent = colorCss(theme.colors) + (tornCssOff ? tornFallbackCss() : "");
    if (!overrides.isConnected) document.head.append(overrides);
  }

  // storage.sync caps writes per minute, and a color picker fires on every drag step.
  let saveTimer = 0;
  const saveSoon = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = 0;
      saveTheme(theme);
    }, 400);
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

  let tornCssOff = false;
  // torn-css.js reloads every Torn tab when this changes.
  const setTornCssOff = (off) => chrome.storage.local.set({ tornCssOff: off });
  function syncTornCssOff(off) {
    tornCssOff = off;
    applyTheme();
    render();
  }
  chrome.storage.local.get("tornCssOff").then(({ tornCssOff: off = false }) => syncTornCssOff(off));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "tornCssOff" in changes) syncTornCssOff(Boolean(changes.tornCssOff.newValue));
  });

  // Not !important: the user's own colors still win.
  function tornFallbackCss() {
    return MODES.map((mode) => {
      const body = mode === "dark" ? "body.body.dark-mode" : "body.body:not(.dark-mode)";
      const decls = COLOR_TOKENS.filter((t) => t.torn).map((t) => `${t.prop}: ${defaultColor(t, mode)};`);
      return `\n${body} { ${decls.join(" ")} }`;
    }).join("");
  }

  const currentMode = () => (document.body.classList.contains("dark-mode") ? "dark" : "light");

  // Torn-based tokens only resolve in the current mode, so each mode's values are remembered.
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
    if (tornCssOff || root.classList.contains("tear-enabled")) return;
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
  infoButton.setAttribute("aria-haspopup", "dialog");

  const settingsButton = dockButton(
    "data-tear-settings",
    "TEAR settings",
    icon(
      "M19.4 13a7.5 7.5 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.5 7.5 0 0 0 0 2l-2.2 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z",
    ),
  );
  settingsButton.setAttribute("aria-haspopup", "dialog");

  function useTornGear() {
    const gear = document.querySelector('#chatRoot button:is([aria-label="Settings"], [title="Settings"]) svg');
    if (gear && !settingsButton.dataset.tearTornGear) {
      settingsButton.replaceChildren(gear.cloneNode(true));
      settingsButton.dataset.tearTornGear = "1";
    }
  }

  const setVar = (name, value) => {
    if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
  };

  function placeDock() {
    if (!dock.isConnected) document.body.append(dock);
    useTornGear();
    const first = [...(document.querySelector("#chatRoot > div > div:last-child")?.children ?? [])].find((c) => c.offsetWidth > 2);
    if (first) {
      setVar("--tear-dock-right", `${Math.max(8, innerWidth - first.getBoundingClientRect().left + 2)}px`);
      setVar("--tear-dock-left", "auto");
    } else {
      setVar("--tear-dock-right", "auto");
      setVar("--tear-dock-left", "8px");
    }
  }

  // Torn's sidebar footer is desktop-only; this shows the same at every width. Torn City Time is UTC.

  const infoHost = document.createElement("div");
  infoHost.id = "tear-info-host";
  const infoShadow = infoHost.attachShadow({ mode: "open" });
  infoShadow.adoptedStyleSheets = [TEAR.panelStyles];
  infoShadow.innerHTML = `
    <section class="panel info" role="dialog" aria-label="Torn City info" tabindex="-1" hidden>
      <p class="label">Torn City time</p>
      <p class="clock"><time id="tct"></time></p>
      <p class="date" id="tct-date"></p>
      <p class="server">Server <span id="server">–</span></p>
    </section>`;
  const infoPanel = infoShadow.querySelector(".panel");
  const pad = (n) => String(n).padStart(2, "0");
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function renderInfo() {
    const now = new Date();
    const tct = infoShadow.getElementById("tct");
    tct.textContent = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
    tct.dateTime = now.toISOString();
    infoShadow.getElementById("tct-date").textContent =
      `${DAYS[now.getUTCDay()]} ${pad(now.getUTCDate())}/${pad(now.getUTCMonth() + 1)}/${String(now.getUTCFullYear()).slice(2)}`;
    const footer = document.querySelector(FOOTER)?.textContent.match(/Server:\s*(\S+)/)?.[1];
    const menu = document.querySelector(".settings-menu .server-link")?.textContent.trim();
    infoShadow.getElementById("server").textContent = footer || menu || "–";
  }

  let infoTimer = 0;
  const infoOpen = () => !infoPanel.hidden;
  function setInfo(open) {
    if (open === infoOpen()) return;
    if (open) {
      if (!infoHost.isConnected) document.body.append(infoHost);
      const anchor = infoButton.getBoundingClientRect();
      infoHost.style.setProperty("--right", `${Math.max(8, innerWidth - anchor.right)}px`);
      infoHost.style.setProperty("--bottom", `${Math.max(8, innerHeight - anchor.top + 6)}px`);
      infoHost.dataset.mode = document.body.classList.contains("dark-mode") ? "dark" : "light";
      renderInfo();
      infoTimer = setInterval(renderInfo, 1000);
    } else {
      clearInterval(infoTimer);
    }
    const hadFocus = infoShadow.activeElement === infoPanel;
    infoPanel.hidden = !open;
    infoButton.setAttribute("aria-expanded", String(open));
    if (open) infoPanel.focus();
    else if (hadFocus) infoButton.focus();
  }

  // Torn's handlers further up the page never see TEAR's own buttons.
  infoButton.addEventListener("click", (event) => {
    event.stopPropagation();
    close();
    setInfo(!infoOpen());
  });
  settingsButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setInfo(false);
    toggle();
  });
  addEventListener("pointerdown", (event) => {
    if (infoOpen() && !event.composedPath().some((el) => el === infoButton || el === infoHost)) setInfo(false);
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

  const host = document.createElement("div");
  host.id = "tear-settings-host";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.adoptedStyleSheets = [TEAR.panelStyles];
  shadow.innerHTML = `
    <section class="panel" role="dialog" aria-label="TEAR settings" hidden>
      <header>
        <h2>TEAR</h2>
        <button type="button" class="close" aria-label="Close">×</button>
      </header>
      <div class="tabs" role="tablist" aria-label="Settings">
        <button type="button" role="tab" id="tab-colors" aria-controls="pane-colors">Colors</button>
        <button type="button" role="tab" id="tab-type" aria-controls="pane-type">Typography</button>
        <button type="button" role="tab" id="tab-dev" aria-controls="pane-dev">Dev</button>
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
      <div class="pane" role="tabpanel" id="pane-dev" aria-labelledby="tab-dev">
        <label class="check">
          <input type="checkbox" id="css-off">
          <span>Disable Torn's CSS
            <small>Switches off every stylesheet Torn loads, so only TEAR's styles apply. Torn's layout goes with it. This browser only.</small>
          </span>
        </label>
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
  const cssOff = $("#css-off");
  let editMode = currentMode();

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

    cssOff.checked = tornCssOff;

    const resetButton = $("#reset");
    const view = {
      "tab-colors": [COLOR_TOKENS.some((t) => isChanged(t, editMode)), `Reset ${editMode} colors to default`],
      "tab-type": [theme.fontFamily !== DEFAULT_THEME.fontFamily, "Reset font to default"],
      "tab-dev": [tornCssOff, "Reset dev options"],
    }[activeTab];
    resetButton.hidden = !view[0];
    resetButton.textContent = view[1];
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
  cssOff.addEventListener("change", () => setTornCssOff(cssOff.checked));
  $("#reset").addEventListener("click", () => {
    if (activeTab === "tab-colors") update({ ...theme, colors: { ...theme.colors, [editMode]: {} } });
    else if (activeTab === "tab-type") update({ ...theme, fontFamily: DEFAULT_THEME.fontFamily });
    else setTornCssOff(false);
  });

  function position() {
    const anchor = settingsButton.getBoundingClientRect();
    host.style.setProperty("--bottom", `${Math.max(8, innerHeight - anchor.top + 6)}px`);
    host.style.setProperty("--right", `${Math.max(8, innerWidth - anchor.right)}px`);
  }

  function open() {
    if (!host.isConnected) document.body.append(host);
    editMode = currentMode();
    panel.hidden = false;
    settingsButton.setAttribute("aria-expanded", "true");
    position();
    render();
    shadow.getElementById(activeTab).focus();
  }

  function close() {
    if (panel.hidden) return;
    panel.hidden = true;
    settingsButton.setAttribute("aria-expanded", "false");
    if (shadow.activeElement) settingsButton.focus();
  }

  const toggle = () => (panel.hidden ? open() : close());

  $(".close").addEventListener("click", close);
  shadow.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  addEventListener("pointerdown", (event) => {
    if (!panel.hidden && !event.composedPath().some((el) => el === host || el === settingsButton)) close();
  });
  addEventListener("resize", () => panel.hidden || position());
})();
