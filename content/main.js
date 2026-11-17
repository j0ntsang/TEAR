// Only with TEAR enabled (Torn's CSS off); the Dev switch reloads the page.
chrome.storage.local.get("tornCssOff").then(({ tornCssOff }) => {
  if (!tornCssOff) return;
  const { slugify, pageName, routeName } = TEAR;
  const root = document.documentElement;

  function stampPage() {
    root.dataset.tearPage = pageName(location.pathname);
    root.dataset.tearRoute = routeName(location.hash);
  }

  function tagPanels() {
    for (const box of document.querySelectorAll("#mainContainer .sortable-box:not([data-tear-panel])")) {
      const slug = slugify(box.querySelector(".box-title")?.textContent ?? "");
      if (slug) box.dataset.tearPanel = slug;
    }
  }

  // Torn's React swaps the items, so the copy is rebuilt whenever it goes stale.
  function loopTicker() {
    const wrap = document.querySelector(".news-ticker-slider-wrapper .scroll-wrap");
    if (!wrap) return;
    const kids = [...wrap.children];
    const originals = kids.filter((el) => !el.hasAttribute("data-tear-clone"));
    const clones = kids.filter((el) => el.hasAttribute("data-tear-clone"));
    const inSync =
      clones.length === originals.length &&
      originals.every((el, i) => el.textContent === clones[i].dataset.tearSource);
    if (inSync && wrap.hasAttribute("data-tear-looped")) return;

    clones.forEach((el) => el.remove());
    for (const el of originals) {
      const copy = el.cloneNode(true);
      copy.dataset.tearSource = el.textContent;
      copy.setAttribute("data-tear-clone", "");
      copy.inert = true;
      wrap.append(copy);
    }
    wrap.setAttribute("data-tear-looped", "");
  }

  function setCharCount(el) {
    if (!el) return;
    const len = String(el.textContent.trim().length || 1);
    if (el.style.getPropertyValue("--tear-len") !== len) el.style.setProperty("--tear-len", len);
  }

  const RING_KINDS = /\b(energy|nerve|happy|life|chain)(?:Bar)?___/;
  const BARS = '[class^="userInformation"] [class^="bar___"], [class^="userInformation"] [class^="chainBar___"]';
  const parseAmount = (n) => {
    const [, digits, unit = ""] = n.match(/([\d.,]+)\s*([km]?)/i);
    return Number(digits.replace(/,/g, "")) * ({ k: 1e3, m: 1e6 }[unit.toLowerCase()] ?? 1);
  };
  // A bar React re-creates (the sidebar swaps between desktop and mobile as the window resizes)
  // starts at --tear-pct 0, so it would sweep up from empty. Its transition starts a frame after
  // its first value is painted.
  const newRings = [];
  let ringFrame = 0;
  function armRings() {
    ringFrame = 0;
    for (const bar of newRings.splice(0)) if (bar.isConnected) bar.setAttribute("data-tear-ring-armed", "");
  }

  function ringBars() {
    for (const bar of document.querySelectorAll(BARS)) {
      const kind = bar.className.match(RING_KINDS)?.[1];
      const value = bar.querySelector('[class^="barValue___"]')?.textContent ?? "";
      const [current, total] = (value.match(/[\d.,]+\s*[km]?/gi) ?? []).map(parseAmount);
      if (!kind || !total) continue;
      // Happy can go over its maximum; a ring can't.
      const pct = Math.min(100, (current / total) * 100).toFixed(1);
      if (bar.dataset.tearRing !== kind) bar.dataset.tearRing = kind;
      if (!bar.parentElement.hasAttribute("data-tear-rings")) bar.parentElement.setAttribute("data-tear-rings", "");
      const full = current >= total;
      bar.toggleAttribute("data-tear-full", full);
      const valueEl = bar.querySelector('[class^="barValue___"]');
      const totalText = full ? value.split("/").pop().trim() : "";
      if (valueEl && valueEl.dataset.tearTotal !== totalText) {
        if (totalText) valueEl.dataset.tearTotal = totalText;
        else valueEl.removeAttribute("data-tear-total");
        valueEl.style.setProperty("--tear-total-len", String(totalText.length || 1));
      }
      // Data attributes, not spans: React owns the text node.
      if (valueEl) {
        const [cur, max = ""] = value.split("/").map((s) => s.trim());
        if (valueEl.dataset.tearCur !== cur) valueEl.dataset.tearCur = cur;
        if (valueEl.dataset.tearMax !== max) valueEl.dataset.tearMax = max;
      }
      if (bar.style.getPropertyValue("--tear-pct") !== pct) bar.style.setProperty("--tear-pct", pct);
      if (!bar.hasAttribute("data-tear-ring-armed") && !newRings.includes(bar)) {
        newRings.push(bar);
        // Two frames: the first value must be painted before the transition exists.
        ringFrame ||= requestAnimationFrame(() => requestAnimationFrame(armRings));
      }
      setCharCount(bar.querySelector('[class^="barValue___"]'));
      countdown(kind, bar, bar.querySelector('[class^="barDescr___"], [class^="barTimeLeft___"]'));
    }
  }

  // Tick length isn't in the DOM and varies with donator status: start short, grow to the longest seen.
  const TICK_SECONDS = { energy: 600, nerve: 300, happy: 900, life: 300, chain: 300 };
  function countdown(kind, bar, el) {
    const parts = el?.textContent.trim().match(/^(?:(\d+):)?(\d+):(\d{2})$/);
    if (!parts) {
      el?.removeAttribute("data-tear-timer");
      bar.removeAttribute("data-tear-timer");
      return;
    }
    const [h, m, sec] = parts.slice(1).map((v) => Number(v ?? 0));
    const left = h * 3600 + m * 60 + sec;
    const tick = (TICK_SECONDS[kind] = Math.max(TICK_SECONDS[kind] ?? 300, Math.ceil(left / 300) * 300));
    const pct = ((left / tick) * 100).toFixed(1);
    el.setAttribute("data-tear-timer", "");
    bar.setAttribute("data-tear-timer", "");
    if (bar.style.getPropertyValue("--tear-timer") !== pct) bar.style.setProperty("--tear-timer", pct);
  }

  // With Torn's CSS off, floats come only from its .left/.right classes.
  const sideOf = (el) => (el.classList.contains("left") ? "left" : el.classList.contains("right") ? "right" : "");

  function tagColumns() {
    const content = document.querySelector(".content-wrapper");
    if (!content) return;
    // Only the outermost columns: floats inside a panel are that panel's own layout.
    for (const box of content.querySelectorAll("div:has(> .left):has(> .right):not([data-tear-columns], [data-tear-col] div)")) {
      const kids = [...box.children].filter((k) => !k.matches(".clear, hr, script, style") && k.offsetHeight > 0);
      if (kids.length < 2) continue;
      const sides = kids.map(sideOf);
      if (!sides.includes("left") || !sides.includes("right") || sides.includes("")) continue;
      // Without Torn's CSS the floats shrink to their content, so their widths say nothing.
      if (box.getBoundingClientRect().width < content.getBoundingClientRect().width * 0.6 || kids.some((k) => k.offsetHeight < 40)) continue;

      const main = kids.filter((k, i) => sides[i] === "left");
      const side = kids.filter((k, i) => sides[i] === "right");
      const rows = Math.max(main.length, side.length);
      for (const [col, blocks] of [["main", main], ["side", side]]) {
        blocks.forEach((k, i) => {
          k.dataset.tearCol = col;
          const last = i === blocks.length - 1;
          k.style.setProperty("--tear-row", `${i + 1} / ${last ? rows + 1 : i + 2}`);
        });
      }
      // Earlier rows fit their blocks; the last takes whatever height a spanning block adds.
      box.style.setProperty("--tear-rows", `${"auto ".repeat(rows - 1)}1fr`);
      box.dataset.tearColumns = "2";
      box.parentElement.dataset.tearStack = "";
    }
    const layout = content.querySelector('[data-tear-columns="2"]') ? "dual" : "single";
    if (content.dataset.tearLayout !== layout) content.dataset.tearLayout = layout;
  }

  const TORN_IMAGES = "https://www.torn.com/images/v2";

  // Torn's logo rules win in this order, last first.
  const LOGO_COUNTRIES = ["argentina", "canada", "cayman-islands", "china", "hawaii", "japan", "mexico", "south-africa", "switzerland", "uae", "uk"];
  const LOGO_CELEBRATIONS = ["aprils-fool", "boxing-day", "christmas-day", "christmas-eve", "easter-sunday", "guy-fawkes", "halloween", "independence", "new-year", "st-patrick", "st-valentine", "thanks-giving", "pride-day"];
  const LOGO_LAYOUTS = ["regular", "hospital", "jail", "federal"];
  function logoFolder({ darkModeLogo, country, celebration, traveling, layout }) {
    if (darkModeLogo === "regular") return "dark_mode/regular";
    if (LOGO_COUNTRIES.includes(country)) return country;
    if (country === "torn" && LOGO_CELEBRATIONS.includes(celebration)) return celebration;
    if (country === "torn" && traveling === "true") return "travel-home";
    return LOGO_LAYOUTS.includes(layout) ? layout : "regular";
  }

  const imageSet = (path) =>
    `image-set(url("${path}@1x.webp") 1x type("image/webp"), url("${path}@2x.webp") 2x type("image/webp"), url("${path}@1x.png") 1x type("image/png"))`;

  function setLogo() {
    const folder = logoFolder(document.body.dataset);
    if (root.dataset.tearLogo === folder) return;
    root.dataset.tearLogo = folder;
    for (const size of ["desktop", "tablet", "mobile"]) {
      root.style.setProperty(`--tear-logo-${size}`, imageSet(`${TORN_IMAGES}/torn_logo/${folder}/${size}/logo`));
    }
  }

  const STATUS_ICONS = [
    "online", "offline", "donator", "subscriber", "level-100", "male", "female", "marriage", "faction", "committee",
    "staff", "low-life", "bounty", "mission", "hospital", "jail", "racing-active", "racing-inactive", "education-complete", "education",
    "job-army", "job-casino", "job-doctor", "job-grocer", "job-lawyer", "job-teacher", "job-company", "outstanding-bookie-collection", "bank-investment", "bank-investment-ready",
    "cayman-islands-bank", "vault", "loan", "auction-house", "bazaar", "item-market", "trade", "stock-market", "booster-cooldown-1", "booster-cooldown-2",
    "booster-cooldown-3", "booster-cooldown-4", "booster-cooldown-5", "medical-cooldown-1", "medical-cooldown-2", "medical-cooldown-3", "medical-cooldown-4", "medical-cooldown-5", "drug-cooldown-1", "drug-cooldown-2",
    "drug-cooldown-3", "drug-cooldown-4", "drug-cooldown-5", "points-market", "auction-house-bid", "auction-house-outbid", "minor-drug-1", "minor-drug-2", "moderate-drug", "severe-drug-1",
    "severe-drug-2", "away", "drug-addiction-50", "drug-addiction-100", "drug-addiction-200", "drug-addiction-300", "drug-addiction-500",
  ];
  const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([a-z])(\d)/g, "$1-$2").toLowerCase();

  function setIconCell(el, cell) {
    if (cell >= 0 && el.style.getPropertyValue("--tear-icon") !== String(cell)) el.style.setProperty("--tear-icon", String(cell));
  }

  function tagStatusIcons() {
    for (const li of document.querySelectorAll('[class^="statusIcons___"] > li')) {
      const n = li.className.match(/\bicon(\d+)___/)?.[1];
      if (n) setIconCell(li, Number(n) - 1);
    }
    // User lists (hospital, jail) number the icon in its id: Torn repeats id="iconTray" per row.
    for (const li of document.querySelectorAll('[id="iconTray"] > li[id^="icon"]')) {
      const n = li.id.match(/^icon(\d+)___/)?.[1];
      if (n) setIconCell(li, Number(n) - 1);
    }
    for (const li of document.querySelectorAll('li[class*="user-status-16-"]')) {
      const name = li.className.match(/user-status-16-([\w-]+)/)?.[1];
      if (name) setIconCell(li, STATUS_ICONS.indexOf(kebab(name)));
    }
  }

  // Rows inside some panels have content blocks of their own; only the visible root is a window.
  const CHAT_WINDOW = '#chatRoot [class*="item___"] [class*="visible___"]:has(> [class*="content___"])';
  // Tabs are keyed by each window's item element: titles can repeat.
  const chatIds = new WeakMap();
  let lastChatId = 0;
  const chatId = (item) => chatIds.get(item) ?? (chatIds.set(item, ++lastChatId), lastChatId);
  let activeChat = 0;
  let knownChats = [];
  const chatTabs = Object.assign(document.createElement("div"), { id: "tear-chat-tabs" });
  chatTabs.setAttribute("role", "tablist");
  chatTabs.setAttribute("aria-label", "Open chats");

  const chatTitle = (win) => win.querySelector('[class*="headingH1___"]')?.textContent.trim() || "Chat";

  function layoutChat() {
    const windows = [...document.querySelectorAll(CHAT_WINDOW)];
    const items = windows.map((win) => win.closest('[class*="item___"]'));
    const ids = items.map(chatId);
    const titles = windows.map(chatTitle);
    const opened = ids.find((id) => !knownChats.includes(id));
    // The active chat survives a reload by its title.
    if (!knownChats.length && !activeChat) activeChat = ids[titles.indexOf(sessionStorage.getItem("tearActiveChat"))] ?? 0;
    else if (opened) activeChat = opened;
    knownChats = ids;
    if (!ids.includes(activeChat)) activeChat = ids.at(-1) ?? 0;
    const activeTitle = titles[ids.indexOf(activeChat)] ?? "";
    if (sessionStorage.getItem("tearActiveChat") !== activeTitle) sessionStorage.setItem("tearActiveChat", activeTitle);

    items.forEach((item, i) => {
      const active = ids[i] === activeChat;
      item.toggleAttribute("data-tear-chat-active", active);
      item.toggleAttribute("data-tear-chat-hidden", !active);
      // The tabs are anchored to this in CSS, so they track it every frame without measuring.
      windows[i].toggleAttribute("data-tear-chat-anchor", active);
    });
    for (const item of document.querySelectorAll("#chatRoot :is([data-tear-chat-active], [data-tear-chat-hidden])")) {
      if (!items.includes(item)) item.removeAttribute("data-tear-chat-active"), item.removeAttribute("data-tear-chat-hidden");
    }
    for (const win of document.querySelectorAll("#chatRoot [data-tear-chat-anchor]")) {
      if (!windows.includes(win)) win.removeAttribute("data-tear-chat-anchor");
    }

    if (windows.length < 2) {
      chatTabs.remove();
      return;
    }
    if (!chatTabs.isConnected) document.body.append(chatTabs);
    const key = ids.map((id, i) => `${id}:${titles[i]}`).join("\n") + "\n" + activeChat;
    if (chatTabs.dataset.key !== key) {
      chatTabs.dataset.key = key;
      chatTabs.replaceChildren(
        ...windows.map((win, i) => {
          const tab = document.createElement("button");
          tab.type = "button";
          tab.setAttribute("role", "tab");
          tab.dataset.chat = String(ids[i]);
          tab.title = titles[i];
          tab.setAttribute("aria-label", titles[i]);
          tab.setAttribute("aria-selected", String(ids[i] === activeChat));
          tab.tabIndex = ids[i] === activeChat ? 0 : -1;
          const icon = win.querySelector(":scope > :first-child svg");
          if (icon) tab.append(icon.cloneNode(true));
          tab.append(Object.assign(document.createElement("span"), { textContent: titles[i] }));
          return tab;
        }),
      );
    }
  }

  function selectChat(id, focus) {
    activeChat = id;
    layoutChat();
    if (focus) chatTabs.querySelector(`[data-chat="${id}"]`)?.focus();
  }

  chatTabs.addEventListener("click", (event) => {
    const tab = event.target.closest("[role=tab]");
    if (tab) selectChat(Number(tab.dataset.chat), false);
  });
  chatTabs.addEventListener("keydown", (event) => {
    const tabs = [...chatTabs.querySelectorAll("[role=tab]")];
    const at = tabs.findIndex((t) => Number(t.dataset.chat) === activeChat);
    const next = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: tabs.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectChat(Number(tabs[(next + tabs.length) % tabs.length].dataset.chat), true);
  });

  // Each bottom bar button holds its unread count in a messageCount wrapper; replay the pop
  // animation whenever a count goes up.
  const CHAT_BAR_BUTTON = "#chatRoot > div > div:last-child button";
  const badgeCounts = new WeakMap();

  function tagChatBadges() {
    for (const button of document.querySelectorAll(CHAT_BAR_BUTTON)) {
      const badge = button.querySelector(':scope > [class^="messageCount___"]');
      const count = parseInt(badge?.textContent ?? "", 10) || 0;
      badge?.toggleAttribute("data-tear-badge", count > 0);
      const previous = badgeCounts.get(button);
      badgeCounts.set(button, count);
      if (previous !== undefined && count > previous) popBadge(button);
    }
  }

  function popBadge(button) {
    button.removeAttribute("data-tear-badge-pop");
    void button.offsetWidth; // restart the animation if it's mid-run
    button.setAttribute("data-tear-badge-pop", "");
  }

  addEventListener("animationend", (event) => {
    if (event.animationName === "tear-badge-glow") event.target.removeAttribute("data-tear-badge-pop");
  });

  function tagStats() {
    for (const row of document.querySelectorAll('[class^="userInformation"] [class^="point-block___"]')) {
      if (!row.dataset.tearStat) {
        const slug = slugify(row.querySelector('[class^="name___"], .wai')?.textContent ?? "");
        if (slug) row.dataset.tearStat = slug;
      }
      if (/^(points|merits)$/.test(row.dataset.tearStat) && !row.hasAttribute("role")) {
        row.setAttribute("role", "button");
        row.tabIndex = 0;
      }
      setCharCount(row.querySelector('[class^="value___"]'));
    }
  }

  // A click that ends a text selection is left alone so values stay copyable.
  addEventListener("click", (event) => {
    const card = event.target.closest?.('[data-tear-stat="points"], [data-tear-stat="merits"]');
    if (!card || event.target.closest("a")) return;
    if (!getSelection().isCollapsed) return;
    card.querySelector('[class^="use___"]')?.click();
  });
  addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest?.('[data-tear-stat="points"][role=button], [data-tear-stat="merits"][role=button]');
    if (!card || event.target !== card) return;
    event.preventDefault();
    card.querySelector('[class^="use___"]')?.click();
  });

  const setOrder = (el, n) => {
    if (el.style.order !== String(n)) el.style.order = String(n);
  };

  // Keyed by the first merit after each divider, so new sections don't shift names.
  const MERIT_SECTIONS = { "Nerve Bar": "General", Brawn: "Combat" };

  function layoutMerits() {
    const tab = document.querySelector('[class^="meritsTab___"]');
    if (!tab) return;
    let order = 0;
    for (const child of tab.children) {
      if (child.matches('[class^="meritsList___"]')) {
        for (const card of child.children) setOrder(card, (order += 2));
      } else if (!child.matches('[class^="dialogWrap___"]')) {
        setOrder(child, (order += 2));
        if (child.matches('[class^="blackLine___"]')) {
          const first = child.nextElementSibling?.querySelector('[class^="title___"] span')?.textContent.trim();
          const label = MERIT_SECTIONS[first];
          if (label && child.dataset.tearLabel !== label) child.dataset.tearLabel = label;
        }
      }
    }
    const dialog = tab.querySelector(':scope > [class^="dialogWrap___"]');
    const selected = tab.querySelector('[class^="merit___"][class*="selected___"]');
    if (!dialog || !selected) return;
    const rowEnd = [...tab.querySelectorAll('[class^="merit___"]')]
      .filter((card) => card.offsetTop === selected.offsetTop)
      .reduce((max, card) => Math.max(max, Number(card.style.order)), 0);
    setOrder(dialog, rowEnd + 1);
  }
  // The body observer doesn't see a resize, but the column count changes.
  addEventListener("resize", () => requestAnimationFrame(layoutMerits));

  // Items › loadouts: compact (Torn's crop; click it for the whole character) or expanded (the
  // whole character always shown). The choice sits on #loadoutsRoot, which React doesn't manage.
  let loadoutView = "compact";
  const loadoutToggle = Object.assign(document.createElement("button"), { type: "button" });
  loadoutToggle.dataset.tearLoadoutView = "";
  loadoutToggle.innerHTML =
    '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2.5a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5zM9.25 9h5.5c.83 0 1.5.67 1.5 1.5V16h-2v5.5h-4.5V16h-2v-5.5c0-.83.67-1.5 1.5-1.5z"/></svg>';
  chrome.storage.local.get("loadoutView").then(({ loadoutView: stored }) => {
    if (stored === "expanded") loadoutView = stored;
    tagLoadout();
  });

  // Expanded view: the equipped items as a cover flow round the selected one, at Torn's large image
  // size. Built from the equipped grid, since the inspector holds only the selected item; a side
  // item's click selects it through Torn's own button, so Torn's controls stay the accessible ones.
  const flow = Object.assign(document.createElement("div"), { ariaHidden: "true" });
  flow.dataset.tearCoverflow = "";
  const flowItems = new Map();
  // Shown at twice the large size, so each density gets the next image up.
  const largeImage = (id) => `/images/items/${id}/large@2x.png 1x, /images/items/${id}/large@4x.png 2x`;

  function coverFlow(loadouts) {
    const review = loadouts.querySelector('[class^="itemReview___"]');
    if (!review) return flow.remove();
    if (flow.parentElement !== review) review.prepend(flow);
    const entries = [...loadouts.querySelectorAll('[class^="itemWrapper___"]')]
      .map((tile) => ({
        tile,
        button: tile.querySelector("button"),
        id: tile.querySelector("img")?.getAttribute("src")?.match(/\/items\/(\d+)\//)?.[1],
      }))
      .filter(({ button, id }) => button && id);
    const active = Math.max(0, entries.findIndex(({ tile }) => / active___/.test(tile.className)));
    const count = entries.length;
    const half = Math.floor(count / 2);
    const shown = new Set();
    entries.forEach(({ button, id }, i) => {
      shown.add(button);
      let item = flowItems.get(button);
      if (!item) {
        item = Object.assign(document.createElement("img"), { alt: "", draggable: false });
        item.addEventListener("click", () => (item.dataset.dist === "0" ? review.querySelector(":scope > img") : button).click());
        flowItems.set(button, item);
      }
      const srcset = largeImage(id);
      if (item.getAttribute("srcset") !== srcset) Object.assign(item, { srcset, src: `/images/items/${id}/large@2x.png` });
      // A ring: each item sits at its shortest distance round from the selection, so the first item
      // has the last ones on its left. One crossing from end to end is out of sight both sides.
      const offset = ((((i - active) % count) + count + half) % count) - half;
      setVar(item, "--dist", String(Math.abs(offset)));
      setVar(item, "--side", String(Math.sign(offset)));
      if (item.dataset.dist !== String(Math.abs(offset))) item.dataset.dist = String(Math.abs(offset));
      if (item.parentElement !== flow) flow.append(item);
    });
    for (const [button, item] of flowItems) {
      if (!shown.has(button)) item.remove(), flowItems.delete(button);
    }
  }

  const setVar = (el, name, value) => {
    if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
  };

  // Selecting an item only swaps classes and image sources, which the page observer doesn't see.
  let watchedLoadouts = null;
  let flowFrame = 0;
  const loadoutChanges = new MutationObserver((records) => {
    if (records.every(({ target }) => flow.contains(target))) return;
    flowFrame ||= requestAnimationFrame(() => {
      flowFrame = 0;
      tagLoadout();
    });
  });

  function tagLoadout() {
    const loadouts = document.getElementById("loadoutsRoot");
    if (!loadouts) return;
    if (loadouts !== watchedLoadouts) {
      loadoutChanges.disconnect();
      watchedLoadouts = loadouts;
      loadoutChanges.observe(loadouts, { attributes: true, attributeFilter: ["class", "src"], subtree: true });
    }
    if (loadouts.dataset.tearLoadout !== loadoutView) loadouts.dataset.tearLoadout = loadoutView;
    coverFlow(loadouts);
    const header = loadouts.querySelector('header[class^="header___"]');
    if (header && loadoutToggle.parentElement !== header) header.insertBefore(loadoutToggle, header.querySelector('[class^="icons___"]'));
    const expanded = loadoutView === "expanded";
    const label = expanded ? "Show the compact loadout" : "Always show the whole character";
    if (loadoutToggle.title !== label) {
      loadoutToggle.title = label;
      loadoutToggle.setAttribute("aria-label", "Whole character");
      loadoutToggle.setAttribute("aria-pressed", String(expanded));
    }
  }

  loadoutToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    loadoutView = loadoutView === "expanded" ? "compact" : "expanded";
    chrome.storage.local.set({ loadoutView });
    tagLoadout();
  });

  const TOP_ROWS = 10;
  const sectionState = {};
  chrome.storage.local.get(["sectionStates", "collapsedSections"]).then(({ sectionStates = {}, collapsedSections }) => {
    collapsedSections?.forEach((name) => (sectionState[name] = "collapsed"));
    Object.assign(sectionState, sectionStates);
    if (collapsedSections) chrome.storage.local.remove("collapsedSections");
    tagSections();
  });

  function sectionRows(header) {
    const rows = [];
    for (let el = header.nextElementSibling; el?.matches('[class*="area-desktop___"]'); el = el.nextElementSibling) rows.push(el);
    return rows;
  }

  function tagSections() {
    for (const header of document.querySelectorAll('[class^="sidebar___"] [class^="header___"]')) {
      const rows = sectionRows(header);
      const title = header.querySelector('[class^="title___"]');
      const name = title?.textContent.trim();
      if (!rows.length || !name) continue;
      if (header.dataset.tearCollapsible !== name) {
        header.dataset.tearCollapsible = name;
        title.setAttribute("role", "button");
        title.tabIndex = 0;
      }
      const state = sectionState[name] ?? "full";
      if (header.dataset.tearState !== state) header.dataset.tearState = state;
      const hidden = state === "top" ? Math.max(0, rows.length - TOP_ROWS) : 0;
      rows.forEach((row, i) => {
        row.toggleAttribute("data-tear-extra", i >= TOP_ROWS);
        if (hidden && i === TOP_ROWS - 1) row.dataset.tearMore = `+${hidden}`;
        else row.removeAttribute("data-tear-more");
      });
      title.setAttribute("aria-expanded", String(state !== "collapsed"));
    }
  }

  function toggleSection(event) {
    // The heading's own controls, like Areas' settings cog, keep working.
    if (event.target.closest('a, button, [class^="titleChild___"]')) return;
    const header = event.target.closest("[data-tear-collapsible]");
    if (!header) return;
    const name = header.dataset.tearCollapsible;
    const current = sectionState[name] ?? "full";
    // Top 10 would look like full on a short section, so skip it there.
    const hasTop = sectionRows(header).length > TOP_ROWS;
    sectionState[name] = current === "full" ? (hasTop ? "top" : "collapsed") : current === "top" ? "collapsed" : "full";
    chrome.storage.local.set({ sectionStates: sectionState });
    tagSections();
  }
  addEventListener("click", toggleSection);
  addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.closest?.("[data-tear-collapsible] [role=button]")) {
      event.preventDefault();
      toggleSection(event);
    }
  });

  const SIDEBAR = '[class^="sidebar___"][class*=" desktop___"]';
  const SECTION_NAMES = { status: "Status", profile: "Profile", bars: "Bars", account: "Account links", areas: "Areas", lists: "Lists" };
  const DEFAULT_ORDER = Object.keys(SECTION_NAMES);
  let savedOrder = [];
  chrome.storage.local.get("sidebarOrder").then(({ sidebarOrder = [] }) => {
    savedOrder = sidebarOrder;
    arrangeSidebar();
  });

  const sectionKeys = () => [...savedOrder.filter((k) => k in SECTION_NAMES), ...DEFAULT_ORDER.filter((k) => !savedOrder.includes(k))];

  function sidebarSections(sb) {
    const ui = sb.querySelector(':scope > [class^="userInformation___"]');
    const stat = (name) => ui?.querySelector(`[data-tear-stat="${name}"]`);
    const listsHeader = sb.querySelector(':scope > [class^="header___"]:has(+ [class*="area-desktop___"])');
    const sections = {
      status: [ui?.querySelector(':scope > div:has(> [class^="statusIcons___"])')],
      profile: [stat("level"), ui?.querySelector(':scope > [class^="menuInfoRow___"]'), stat("money"), stat("points"), stat("merits")],
      bars: [ui?.querySelector(':scope > div:has(> [class*="barDesktop___"])')],
      account: [sb.querySelector(':scope > [class^="accountLinksWrap___"]')],
      areas: [sb.querySelector(':scope > [class^="areas___"]')],
      lists: listsHeader ? [listsHeader, ...sectionRows(listsHeader)] : [],
    };
    for (const key in sections) sections[key] = sections[key].filter(Boolean);
    return sections;
  }

  function arrangeSidebar() {
    const sb = document.querySelector(SIDEBAR);
    if (!sb) return;
    const sections = sidebarSections(sb);
    let first = true;
    sectionKeys().forEach((key, pos) => {
      const members = sections[key];
      let grip = sb.querySelector(`:scope > [data-tear-grip="${key}"]`);
      if (!members.length) return grip?.remove();
      if (!grip) {
        grip = document.createElement("button");
        grip.type = "button";
        grip.dataset.tearGrip = key;
        grip.title = `Drag to move ${SECTION_NAMES[key]} (or focus and use the arrow keys)`;
        grip.setAttribute("aria-label", `Move ${SECTION_NAMES[key]} section`);
        grip.setAttribute("aria-description", "Drag, or use the Up and Down arrow keys");
        sb.append(grip);
      }
      grip.toggleAttribute("data-tear-first", first);
      first = false;
      setOrder(grip, pos * 1000);
      members.forEach((el, i) => {
        setOrder(el, pos * 1000 + 1 + i);
        if (el.dataset.tearSection !== key) el.dataset.tearSection = key;
      });
    });
  }

  const announcer = Object.assign(document.createElement("div"), { className: "tear-announcer" });
  announcer.setAttribute("aria-live", "polite");

  function moveSection(key, to) {
    const keys = sectionKeys().filter((k) => k !== key);
    keys.splice(to, 0, key);
    savedOrder = keys;
    chrome.storage.local.set({ sidebarOrder: keys });
    arrangeSidebar();
    if (!announcer.isConnected) document.body.append(announcer);
    announcer.textContent = `${SECTION_NAMES[key]} moved to position ${keys.indexOf(key) + 1} of ${keys.length}`;
  }

  function sectionBoxes(sb) {
    const sections = sidebarSections(sb);
    return sectionKeys()
      .map((key) => {
        const rects = sections[key].map((el) => el.getBoundingClientRect()).filter((r) => r.height);
        return rects.length && { key, top: Math.min(...rects.map((r) => r.top)), bottom: Math.max(...rects.map((r) => r.bottom)) };
      })
      .filter(Boolean);
  }

  const markSection = (key, attr, on) => {
    for (const el of document.querySelectorAll(`${SIDEBAR} [data-tear-section="${key}"]`)) el.toggleAttribute(attr, on);
  };

  addEventListener("pointerover", (event) => {
    const grip = event.target.closest?.("[data-tear-grip]");
    if (grip) markSection(grip.dataset.tearGrip, "data-tear-section-hover", true);
  });
  addEventListener("pointerout", (event) => {
    const grip = event.target.closest?.("[data-tear-grip]");
    if (grip) markSection(grip.dataset.tearGrip, "data-tear-section-hover", false);
  });

  addEventListener("pointerdown", (event) => {
    const grip = event.target.closest?.("[data-tear-grip]");
    if (!grip || event.button !== 0) return;
    event.preventDefault();
    const sb = grip.parentElement;
    const key = grip.dataset.tearGrip;
    const marker = Object.assign(document.createElement("div"), { className: "tear-drop-marker" });
    document.body.append(marker);
    grip.setPointerCapture(event.pointerId);
    markSection(key, "data-tear-dragging", true);
    let target = null;

    const onMove = (e) => {
      const boxes = sectionBoxes(sb);
      const others = boxes.filter((b) => b.key !== key);
      if (!others.length) {
        target = null;
        marker.hidden = true;
        return;
      }
      const to = others.filter((b) => e.clientY > (b.top + b.bottom) / 2).length;
      const before = others[to - 1];
      const after = others[to];
      const y = before && after ? (before.bottom + after.top) / 2 : before ? before.bottom + 4 : after.top - 4;
      const sbBox = sb.getBoundingClientRect();
      Object.assign(marker.style, { top: `${y}px`, left: `${sbBox.left}px`, width: `${sbBox.width}px` });
      const keys = sectionKeys().filter((k) => k !== key);
      const slot = after ? keys.indexOf(after.key) : before ? keys.indexOf(before.key) + 1 : 0;
      target = slot === sectionKeys().indexOf(key) ? null : slot;
      marker.hidden = target === null;
    };
    const onUp = () => {
      grip.removeEventListener("pointermove", onMove);
      grip.removeEventListener("pointerup", onUp);
      grip.removeEventListener("pointercancel", onUp);
      marker.remove();
      markSection(key, "data-tear-dragging", false);
      if (target !== null) moveSection(key, target);
    };
    grip.addEventListener("pointermove", onMove);
    grip.addEventListener("pointerup", onUp);
    grip.addEventListener("pointercancel", onUp);
  });

  addEventListener("keydown", (event) => {
    const grip = event.target.closest?.("[data-tear-grip]");
    if (!grip || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    const key = grip.dataset.tearGrip;
    const at = sectionKeys().indexOf(key);
    moveSection(key, Math.max(0, at + (event.key === "ArrowUp" ? -1 : 1)));
  });

  // The drawer's state as one attribute on <html>, so CSS needn't body:has() for it.
  let watchedDrawer = null;
  const drawerObserver = new MutationObserver(() => {
    root.toggleAttribute("data-tear-drawer-open", /\bvisible___/.test(watchedDrawer?.className ?? ""));
  });
  function watchDrawer() {
    const drawer = document.querySelector('[class^="flyOutPanel___"]');
    if (drawer === watchedDrawer) return;
    drawerObserver.disconnect();
    watchedDrawer = drawer;
    if (drawer) drawerObserver.observe(drawer, { attributes: true, attributeFilter: ["class"] });
    root.toggleAttribute("data-tear-drawer-open", /\bvisible___/.test(drawer?.className ?? ""));
  }

  // The ticker and sidebar sit outside #mainContainer and update text in place. Chat
  // messages arrive constantly: they only re-lay out the chat tabs.
  const chatRoot = () => document.getElementById("chatRoot");
  let bodyFrame = 0;
  let pageDirty = true;
  let chatDirty = true;
  let badgesDirty = true;
  new MutationObserver((records) => {
    const chat = chatRoot();
    for (const { type, target } of records) {
      if (chat?.contains(target)) {
        chatDirty ||= type === "childList";
        badgesDirty = true;
      } else pageDirty = true;
    }
    if (!pageDirty && !chatDirty && !badgesDirty) return;
    bodyFrame ||= requestAnimationFrame(() => {
      bodyFrame = 0;
      // Reads before writes: tagColumns measures first, while layout may still be clean;
      // layoutMerits measures its own reordering, so it goes last.
      if (pageDirty) {
        pageDirty = false;
        tagColumns();
        loopTicker();
        ringBars();
        tagStats();
        tagSections();
        arrangeSidebar();
        tagStatusIcons();
        watchDrawer();
        tagLoadout();
        layoutMerits();
      }
      if (chatDirty) {
        chatDirty = false;
        layoutChat();
      }
      if (badgesDirty) {
        badgesDirty = false;
        tagChatBadges();
      }
    });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  let frame = 0;
  const main = document.getElementById("mainContainer");
  if (main) {
    new MutationObserver(() => {
      frame ||= requestAnimationFrame(() => {
        frame = 0;
        tagPanels();
      });
    }).observe(main, { childList: true, subtree: true });
  }

  addEventListener("hashchange", stampPage);

  stampPage();
  tagPanels();
  tagColumns();
  loopTicker();
  ringBars();
  tagStats();
  tagStatusIcons();
  tagLoadout();
  layoutMerits();
  setLogo();
  new MutationObserver(setLogo).observe(document.body, { attributes: true, attributeFilter: ["data-layout", "data-country", "data-celebration", "data-traveling", "data-dark-mode-logo"] });
});
