(() => {
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
      copy.setAttribute("aria-hidden", "true");
      wrap.append(copy);
    }
    wrap.setAttribute("data-tear-looped", "");
  }

  function setLength(el) {
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
  function ringBars() {
    for (const bar of document.querySelectorAll(BARS)) {
      const kind = bar.className.match(RING_KINDS)?.[1];
      const value = bar.querySelector('[class^="barValue___"]')?.textContent ?? "";
      const [current, total] = (value.match(/[\d.,]+\s*[km]?/gi) ?? []).map(parseAmount);
      if (!kind || !total) continue;
      // Happy can go over its maximum; a ring can't.
      const pct = Math.min(100, (current / total) * 100).toFixed(1);
      if (bar.dataset.tearRing !== kind) bar.dataset.tearRing = kind;
      const full = current >= total;
      bar.toggleAttribute("data-tear-full", full);
      // A full bar's readout can show just its total ("1475" for "1475 / 1475").
      const valueEl = bar.querySelector('[class^="barValue___"]');
      const totalText = full ? value.split("/").pop().trim() : "";
      if (valueEl && valueEl.dataset.tearTotal !== totalText) {
        if (totalText) valueEl.dataset.tearTotal = totalText;
        else valueEl.removeAttribute("data-tear-total");
        valueEl.style.setProperty("--tear-total-len", String(totalText.length || 1));
      }
      if (bar.style.getPropertyValue("--tear-pct") !== pct) bar.style.setProperty("--tear-pct", pct);
      setLength(bar.querySelector('[class^="barValue___"]'));
      countdown(kind, bar, bar.querySelector('[class^="barDescr___"], [class^="barTimeLeft___"]'));
    }
  }

  // The timers count down to the next regen tick. Tick length isn't in the DOM and
  // depends on donator status, so start at the shortest and grow to the longest seen.
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

  // Recolour only the links Torn draws in some blue; its grey nav and white overlay links stay.
  function tagLinks() {
    for (const a of document.querySelectorAll("a:not([data-tear-link])")) {
      const [r, g, b] = (getComputedStyle(a).color.match(/[\d.]+/g) ?? []).map(Number);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const blue = max === b && g >= r && b - r > 40 && (max - min) / (max || 1) > 0.35;
      a.dataset.tearLink = blue ? "1" : "0";
    }
  }

  function tagStats() {
    // The narrow-window panel's labels are the visually hidden .wai.
    for (const row of document.querySelectorAll('[class^="userInformation"] [class^="point-block___"]')) {
      if (!row.dataset.tearStat) {
        const slug = slugify(row.querySelector('[class^="name___"], .wai')?.textContent ?? "");
        if (slug) row.dataset.tearStat = slug;
      }
      if (/^(points|merits)$/.test(row.dataset.tearStat) && !row.hasAttribute("role")) {
        row.setAttribute("role", "button");
        row.tabIndex = 0;
      }
      setLength(row.querySelector('[class^="value___"]'));
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

  // Torn inserts a card's info panel after its original row of three, which the
  // fluid grid splits; CSS order puts it after the selected card's visual row.
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

  // Each nav section cycles full -> top 10 -> collapsed, remembered by heading text.
  const TOP_ROWS = 10;
  const sectionState = {};
  chrome.storage.local.get(["sectionStates", "collapsedSections"]).then(({ sectionStates = {}, collapsedSections = [] }) => {
    collapsedSections.forEach((name) => (sectionState[name] = "collapsed"));
    Object.assign(sectionState, sectionStates);
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
        // The last row shown carries the hidden count for its tab.
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
    chrome.storage.local.remove("collapsedSections");
    tagSections();
  }
  addEventListener("click", toggleSection);
  addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.closest?.("[data-tear-collapsible] [role=button]")) {
      event.preventDefault();
      toggleSection(event);
    }
  });

  // Desktop sidebar sections, reordered by dragging the grip above each one.
  // CSS flattens the sidebar into one flex container, so `order` places every piece.
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

  function moveSection(key, to) {
    const keys = sectionKeys().filter((k) => k !== key);
    keys.splice(to, 0, key);
    savedOrder = keys;
    chrome.storage.local.set({ sidebarOrder: keys });
    arrangeSidebar();
  }

  // Only sections that are on screen count as drop targets; a collapsed section's rows have no box.
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
      // Index among the other sections where the dragged one would land.
      const to = others.filter((b) => e.clientY > (b.top + b.bottom) / 2).length;
      const before = others[to - 1];
      const after = others[to];
      const y = before && after ? (before.bottom + after.top) / 2 : before ? before.bottom + 4 : after.top - 4;
      const sbBox = sb.getBoundingClientRect();
      Object.assign(marker.style, { top: `${y}px`, left: `${sbBox.left}px`, width: `${sbBox.width}px` });
      // Map the slot among visible sections back to a slot in the full order.
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

  let bodyFrame = 0;
  // The ticker and sidebar sit outside #mainContainer and update text in place.
  new MutationObserver(() => {
    bodyFrame ||= requestAnimationFrame(() => {
      bodyFrame = 0;
      loopTicker();
      ringBars();
      tagStats();
      tagLinks();
      layoutMerits();
      tagSections();
      arrangeSidebar();
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
  loopTicker();
  ringBars();
  tagStats();
  tagLinks();
  layoutMerits();
})();
