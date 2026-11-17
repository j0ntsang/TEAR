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

  // On the dock, not <html>: a custom property set on the root restyles the whole page.
  const setDockVar = (name, value) => {
    if (dock.style.getPropertyValue(name) !== value) dock.style.setProperty(name, value);
  };

  // Called from a ResizeObserver, after layout: the reads below cost nothing extra, and the
  // dock moves in the same frame as the bar.
  function placeDock() {
    const first = watchedButtons.find((c) => c.offsetWidth > 2);
    if (first) {
      // clientWidth, not innerWidth: fixed positions don't count the scrollbar.
      const gap = parseFloat(getComputedStyle(first.parentElement).columnGap) || 0;
      setDockVar("--tear-dock-right", `${Math.max(8, root.clientWidth - first.getBoundingClientRect().left + gap)}px`);
      setDockVar("--tear-dock-left", "auto");
    } else {
      setDockVar("--tear-dock-right", "auto");
      setDockVar("--tear-dock-left", "8px");
    }
  }

  // The dock sits just left of Torn's chat bar. The bar spans the viewport, so its size changes
  // on a resize; a button's size changes when it shows or hides; <html> covers the scrollbar.
  const CHAT_BAR = "#chatRoot > div > div:last-child";
  let watchedBar = null;
  let watchedButtons = [];
  const dockAnchors = new ResizeObserver(placeDock);
  function watchChatBar() {
    const bar = document.querySelector(CHAT_BAR);
    const buttons = bar ? [...bar.children] : [];
    if (bar === watchedBar && buttons.length === watchedButtons.length && buttons.every((b, i) => b === watchedButtons[i])) return;
    dockAnchors.disconnect();
    watchedBar = bar;
    watchedButtons = buttons;
    // Observing fires once straight away, which places the dock.
    for (const el of [root, bar, ...buttons]) if (el) dockAnchors.observe(el);
  }

  function setUpDock() {
    if (!dock.isConnected) document.body.append(dock);
    useTornGear();
    watchChatBar();
  }

  // Torn's sidebar footer is desktop-only; this shows the same at every width. Torn City is UTC.

  const infoHost = document.createElement("div");
  infoHost.id = "tear-info-host";
  const infoShadow = infoHost.attachShadow({ mode: "open" });
  infoShadow.adoptedStyleSheets = [TEAR.panelStyles];
  infoShadow.innerHTML = `
    <section class="panel info" role="dialog" aria-label="Torn City time and server" tabindex="-1" hidden>
      <header>
        <span>Torn City</span>
        <a class="server" id="server" href="/usersonline.php" title="Server">–</a>
      </header>
      <div class="now">
        <time class="clock" id="tct"><span id="tct-h"></span><span class="tick">:</span><span id="tct-m"></span></time>
        <span class="date"><b id="tct-day"></b><span id="tct-month"></span></span>
      </div>
    </section>`;
  const infoPanel = infoShadow.querySelector(".panel");
  const pad = (n) => String(n).padStart(2, "0");
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const setText = (id, text) => {
    const el = infoShadow.getElementById(id);
    if (el.textContent !== text) el.textContent = text;
    return el;
  };

  function renderInfo() {
    const now = new Date();
    infoShadow.getElementById("tct").dateTime = now.toISOString();
    setText("tct-h", pad(now.getUTCHours()));
    setText("tct-m", pad(now.getUTCMinutes()));
    setText("tct-day", `${DAYS[now.getUTCDay()]} ${now.getUTCDate()}`);
    setText("tct-month", `${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()}`);
    const footer = document.querySelector(FOOTER)?.textContent.match(/Server:\s*(\S+)/)?.[1];
    const menuLink = document.querySelector(".settings-menu .server-link");
    const server = setText("server", footer || menuLink?.textContent.trim() || "–");
    if (menuLink?.href && server.href !== menuLink.href) server.href = menuLink.href;
  }

  // Placed over the Info button by dock.css (anchor positioning), so it follows a resize on its own.
  let infoTimer = 0;
  const infoOpen = () => !infoPanel.hidden;
  function setInfo(open) {
    if (open === infoOpen()) return;
    if (open) {
      if (!infoHost.isConnected) document.body.append(infoHost);
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

  // Only finds the bar and its buttons: no layout is read here.
  let frame = 0;
  new MutationObserver(() => {
    frame ||= requestAnimationFrame(() => {
      frame = 0;
      setUpDock();
    });
  }).observe(document.body, { childList: true, subtree: true });
  setUpDock();

  const host = document.createElement("div");
  host.id = "tear-settings-host";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.adoptedStyleSheets = [TEAR.panelStyles];
  shadow.innerHTML = `
    <section class="panel" role="dialog" aria-label="TEAR settings" hidden>
      <header>
        <h2>TEAR</h2>
        <button type="button" class="power" id="power" title="Switches Torn's own stylesheets off so only TEAR's apply. Reloads Torn tabs. This browser only."></button>
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
  // TEAR is on while Torn's stylesheets are off; switching reloads every Torn tab.
  const power = $("#power");
  power.addEventListener("click", () => {
    power.disabled = true;
    setTornCssOff(!tornCssOff);
  });
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
    power.textContent = tornCssOff ? "Disable TEAR" : "Enable TEAR";
    power.setAttribute("aria-pressed", String(tornCssOff));
    fontSelect.value = theme.fontFamily;
    $("#sample").style.fontFamily = theme.fontFamily || "inherit";

    const resetButton = $("#reset");
    const view = {
      "tab-colors": [COLOR_TOKENS.some((t) => isChanged(t, editMode)), `Reset ${editMode} colors to default`],
      "tab-type": [theme.fontFamily !== DEFAULT_THEME.fontFamily, "Reset font to default"],
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
  $("#reset").addEventListener("click", () => {
    if (activeTab === "tab-colors") update({ ...theme, colors: { ...theme.colors, [editMode]: {} } });
    else if (activeTab === "tab-type") update({ ...theme, fontFamily: DEFAULT_THEME.fontFamily });
  });

  function open() {
    if (!host.isConnected) document.body.append(host);
    editMode = currentMode();
    panel.hidden = false;
    settingsButton.setAttribute("aria-expanded", "true");
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
})();
