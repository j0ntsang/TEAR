// document_start, so Torn's styles never paint. TEAR's own sheets are injected apart and untouched.

(() => {
  const root = document.documentElement;
  const SHEETS = 'link[rel~="stylesheet"], style';
  const OURS = "#tear-color-overrides, #tear-torn-images";
  let off = false;

  // Chrome: a link disabled before its file loads still applies the sheet that arrives.
  function setSheetDisabled(el) {
    if (el.sheet) el.sheet.disabled = off;
  }

  function setSheet(el) {
    if (el.matches(OURS)) return;
    if (off) {
      // Sheets Torn itself keeps off stay Torn's to switch.
      if (!el.hasAttribute("data-tear-disabled") && !el.disabled) {
        el.disabled = true;
        el.setAttribute("data-tear-disabled", "");
        el.addEventListener("load", () => setSheetDisabled(el));
      }
      if (el.hasAttribute("data-tear-disabled")) setSheetDisabled(el);
    } else if (el.hasAttribute("data-tear-disabled")) {
      el.disabled = false;
      el.removeAttribute("data-tear-disabled");
      setSheetDisabled(el);
    }
  }

  // Which sidebar Torn renders, as one attribute for content.css's stacked layout. As html:has()
  // it re-matched against the whole page on every class change. Set from here, at
  // document_start, it is in place before the first paint.
  const SIDEBAR = '[class^="sidebar___"]';
  let sidebars = [];
  const sidebarClasses = new MutationObserver(markSidebar);
  function markSidebar() {
    root.toggleAttribute("data-tear-mobile", off && sidebars.some((el) => / mobile___/.test(el.className)));
  }
  // Torn may swap the class rather than the element, so each sidebar's class is watched too.
  function findSidebars() {
    const found = [...document.querySelectorAll(SIDEBAR)];
    if (found.length !== sidebars.length || found.some((el, i) => el !== sidebars[i])) {
      sidebarClasses.disconnect();
      for (const el of found) sidebarClasses.observe(el, { attributes: true, attributeFilter: ["class"] });
      sidebars = found;
    }
    markSidebar();
  }

  function apply() {
    root.classList.toggle("tear-enabled", off);
    document.querySelectorAll(SHEETS).forEach(setSheet);
    for (const sheet of document.adoptedStyleSheets) sheet.disabled = off;
    findSidebars();
    if (off) bringImages();
    else images.remove();
  }

  const IMAGE = /sprite|icons?[/_]|medals|flags?\/|visitor_font|awards?|honou?rs?|items?\/|digits?|arrows|emblem/i;
  const NOT_IMAGE = /torn_logo|user_status_icons|header\/|input|divider|pattern|texture|gradient|_bg\b|background/i;
  const NOT_IMAGE_VAR = /(^|-)bg(-|$)|background|texture|pattern|gradient/i;
  const KEEP = ["background-image", "background-position", "background-size", "background-repeat", "width", "height", "display"];
  const images = document.createElement("style");
  images.id = "tear-torn-images";

  const assetName = (href) =>
    new URL(href).pathname
      .replace(/^\/images\/(v2\/)?/, "")
      .replace(/\.\w+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const assets = {};
  const MAX_ASSETS = 3000;

  // [class*=x] and [class^=x] subjects keep their operator ("*x", "^x"): Torn paints some sprites
  // that way and positions each cell by its full class (.primary-category-icon).
  const subjects = (selectorText) =>
    selectorText.split(",").flatMap((sel) => {
      const last = sel.trim().split(/\s*[\s>+](?![^[]*\])\s*/).pop();
      return [...last.matchAll(/\.([\w-]+)|\[class([*^~]?)=["']?\s*([\w-]+)/g)].map((m) => m[1] ?? (/[*^]/.test(m[2]) ? m[2] : "") + m[3]);
    });

  // Short substrings ("icon") would pull in sizing rules for half the site.
  const MIN_PARTIAL = 8;
  function paintedBy(painted) {
    const partial = [...painted].filter((t) => /^[*^]/.test(t) && t.length > MIN_PARTIAL);
    const contains = partial.filter((t) => t[0] === "*").map((t) => t.slice(1));
    const starts = partial.filter((t) => t[0] === "^").map((t) => t.slice(1));
    return (t) => painted.has(t) || contains.some((p) => t.includes(p)) || starts.some((p) => t.startsWith(p));
  }

  const absoluteUrls = (value, base) =>
    value.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/g, (_, u) => {
      const href = new URL(u, base).href;
      if (!/^https?:/.test(href)) return `url("${href}")`;
      const name = assetName(href);
      assets[name] = href;
      return `var(--tear-asset-${name}, url("${href}"))`;
    });

  function imageRule(rule, base, painted) {
    const style = rule.style;
    const shorthand = style.getPropertyValue("background");
    const image = style.getPropertyValue("background-image") || shorthand.match(/(?:url|image-set)\(.*\)/)?.[0] || "";
    const urls = [...image.matchAll(/url\(\s*["']?([^"')]+)/g)].map((m) => m[1]);
    if (urls.length) {
      const positioned = style.getPropertyValue("background-position") && !/^(0(px|%)? ?){1,2}$/.test(style.getPropertyValue("background-position").trim());
      if (!(urls.some((u) => IMAGE.test(u)) || positioned) || urls.some((u) => NOT_IMAGE.test(u))) return "";
      for (const t of subjects(rule.selectorText)) painted.add(t);
      const decls = KEEP.filter((p) => p !== "background-image" && style.getPropertyValue(p)).map((p) => `${p}: ${style.getPropertyValue(p)}`);
      return `${rule.selectorText} { background-image: ${absoluteUrls(image, base)}; ${decls.join("; ")} }`;
    }
    // A sprite in a custom property (background: var(--items-options-icons)): kept only if that
    // property turns out to hold an image (see collect), which is known once every sheet is read.
    const varImage = [shorthand, style.getPropertyValue("background-image")].find((v) => v.includes("var(--"));
    if (varImage) {
      const vars = [...varImage.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
      const bg = varImage === shorthand ? `background: ${shorthand}` : `background-image: ${varImage}`;
      const decls = KEEP.filter((p) => p !== "background-image" && style.getPropertyValue(p)).map((p) => `${p}: ${style.getPropertyValue(p)}`);
      return { subjects: subjects(rule.selectorText), vars, text: `${rule.selectorText} { ${[bg, ...decls].join("; ")} }` };
    }
    if (style.getPropertyValue("background-color") || style.getPropertyValue("background")) return "";
    // A display with no size is Torn's page layout (.items-cont .title-wrap { display: inline }),
    // not an icon's box, and this layer outranks TEAR's own page defaults.
    const sized = style.getPropertyValue("width") || style.getPropertyValue("height");
    const decls = KEEP.filter((p) => style.getPropertyValue(p) && (p !== "display" || sized)).map((p) => `${p}: ${style.getPropertyValue(p)}`);
    if (!decls.length) return "";
    return { subjects: subjects(rule.selectorText), text: `${rule.selectorText} { ${decls.join("; ")} }` };
  }

  // Custom properties holding an image, kept with their selector (:root, :root .dark-mode) so the
  // sprites above resolve in either mode once Torn's own sheets are off. Rendered only for the
  // properties a kept sprite uses: Torn's vars.css holds hundreds of KB of other images.
  function imageVars(rule, base, urlVars) {
    const defs = [];
    for (const prop of rule.style) {
      if (!prop.startsWith("--")) continue;
      const value = rule.style.getPropertyValue(prop);
      // Backgrounds (--profile-travelling-…-bg-image) aren't sprites: TEAR paints its own.
      if (!value.includes("url(") || NOT_IMAGE.test(value) || NOT_IMAGE_VAR.test(prop)) continue;
      urlVars.add(prop);
      defs.push([prop, value]);
    }
    return defs.length ? { selector: rule.selectorText, base, defs } : null;
  }

  function collect(rules, base, found, out, cells) {
    for (const rule of rules) {
      if (rule.media) {
        const inner = [];
        const innerCells = [];
        collect(rule.cssRules, base, found, inner, innerCells);
        if (inner.length || innerCells.length) out.push({ media: rule.media.mediaText, inner, cells: innerCells });
      } else if (rule.selectorText && rule.style) {
        const vars = imageVars(rule, base, found.urlVars);
        if (vars) out.push(vars);
        const kept = imageRule(rule, base, found.painted);
        if (typeof kept === "string") kept && out.push(kept);
        else cells.push(kept);
      }
    }
  }

  function* allCells(items, cells) {
    yield* cells;
    for (const item of items) if (item.media) yield* allCells(item.inner, item.cells);
  }

  // Sprites in a custom property count as painted once the property is known to hold an image.
  const keeps = (cell, isPainted, urlVars) => (cell.vars ? cell.vars.some((v) => urlVars.has(v)) : cell.subjects.some(isPainted));

  function renderVars({ selector, base, defs }, usedVars) {
    const used = defs.filter(([prop]) => usedVars.has(prop));
    return used.length ? `${selector} { ${used.map(([prop, value]) => `${prop}: ${absoluteUrls(value, base)}`).join("; ")} }` : "";
  }

  const render = (items, cells, isPainted, urlVars, usedVars) =>
    [
      ...items.map((item) =>
        typeof item === "string" ? item : item.defs ? renderVars(item, usedVars) : `@media ${item.media} {\n${render(item.inner, item.cells, isPainted, urlVars, usedVars)}\n}`,
      ),
      ...cells.filter((c) => keeps(c, isPainted, urlVars)).map((c) => c.text),
    ]
      .filter(Boolean)
      .join("\n");

  // Torn versions its stylesheet URLs (a query, or a hash in the name), so a cached copy is
  // never stale: later pages read them from the cache instead of the network.
  const cacheMode = (href) => (/\?.|\.[0-9a-f]{8,}\.css/.test(href) ? "force-cache" : "default");

  // The links arrive after this document_start script, so each is read as it appears;
  // a sheet's rules are collected once, and a render only stitches them together.
  const read = new Map();
  async function bringImages() {
    if (!images.isConnected) (document.head ?? root).append(images);
    const links = [...document.querySelectorAll('link[rel~="stylesheet"]')].filter((l) => l.href && !read.has(l.href));
    if (!links.length) return;
    for (const link of links) read.set(link.href, null);
    await Promise.all(
      links.map(async (link) => {
        try {
          const sheet = new CSSStyleSheet();
          sheet.replaceSync((await (await fetch(link.href, { cache: cacheMode(link.href) })).text()).replace(/@import[^;]+;/g, ""));
          const found = { painted: new Set(), urlVars: new Set() };
          const out = [];
          const cells = [];
          collect(sheet.cssRules, link.href, found, out, cells);
          read.set(link.href, { ...found, out, cells });
        } catch {}
      }),
    );
    renderSoon();
  }

  let renderFrame = 0;
  function renderSoon() {
    renderFrame ||= requestAnimationFrame(() => {
      renderFrame = 0;
      const parts = [...read.values()].filter(Boolean);
      const urlVars = new Set(parts.flatMap((p) => [...p.urlVars]));
      const painted = new Set(parts.flatMap((p) => [...p.painted]));
      const usedVars = new Set();
      // A var-painted sprite's selector paints too, so its position-only cells are kept.
      for (const { out, cells } of parts) {
        for (const cell of allCells(out, cells)) {
          const used = cell.vars?.filter((v) => urlVars.has(v)) ?? [];
          if (!used.length) continue;
          used.forEach((v) => usedVars.add(v));
          cell.subjects.forEach((t) => painted.add(t));
        }
      }
      const isPainted = paintedBy(painted);
      // Its own layer: under TEAR's unlayered rules.
      images.textContent = `@layer torn-images {\n${parts.map(({ out, cells }) => render(out, cells, isPainted, urlVars, usedVars)).join("\n")}\n}`;
    });
  }

  // The asset list is saved once the page has loaded: one write per page. If the extension was
  // reloaded in that second (hot reload), this copy of the script is orphaned: its chrome.* calls
  // throw "Extension context invalidated", and the tab is about to reload anyway.
  addEventListener("load", () => {
    if (!off) return;
    setTimeout(async () => {
      if (!chrome.runtime?.id) return;
      try {
        const { tornAssets = {} } = await chrome.storage.local.get("tornAssets");
        const merged = Object.entries({ ...tornAssets, ...assets }).slice(-MAX_ASSETS);
        await chrome.storage.local.set({ tornAssets: Object.fromEntries(merged) });
      } catch {}
    }, 1000);
  });

  new MutationObserver((records) => {
    if (!off) return;
    let sheets = false;
    let sidebarAdded = false;
    const take = (el) => {
      setSheet(el);
      sheets ||= el.localName === "link";
    };
    for (const { type, target, addedNodes } of records) {
      if (type === "attributes") {
        if (target.matches(SHEETS)) take(target);
        continue;
      }
      for (const node of addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches(SHEETS)) take(node);
        else if (node.firstElementChild) node.querySelectorAll(SHEETS).forEach(take);
        sidebarAdded ||= node.matches(SIDEBAR) || (node.firstElementChild !== null && node.querySelector(SIDEBAR) !== null);
      }
    }
    if (sidebarAdded || sidebars.some((el) => !el.isConnected)) findSidebars();
    if (sheets) bringImages();
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["rel"] });

  chrome.storage.local.get("tornCssOff").then(({ tornCssOff = false }) => {
    off = tornCssOff;
    apply();
  });
  // Every Torn tab reloads: main.js only sets up as a page loads, so a live switch
  // would leave a tab half-enabled.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && "tornCssOff" in changes) location.reload();
  });
})();
