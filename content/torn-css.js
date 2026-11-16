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

  function apply() {
    root.classList.toggle("tear-enabled", off);
    document.querySelectorAll(SHEETS).forEach(setSheet);
    for (const sheet of document.adoptedStyleSheets) sheet.disabled = off;
    if (off) bringImages();
    else images.remove();
  }

  const IMAGE = /sprite|icons?[/_]|medals|flags?\/|visitor_font|awards?|honou?rs?|items?\/|digits?|arrows|emblem/i;
  const NOT_IMAGE = /torn_logo|user_status_icons|header\/|input|divider|pattern|texture|gradient|_bg\b|background/i;
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

  const subjects = (selectorText) =>
    selectorText.split(",").flatMap((sel) => {
      const last = sel.trim().split(/\s*[\s>+](?![^[]*\])\s*/).pop();
      return [...last.matchAll(/\.([\w-]+)|\[class[*^~]?=["']?\s*([\w-]+)/g)].map((m) => m[1] ?? m[2]);
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
      const absolute = image.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/g, (_, u) => {
        const href = new URL(u, base).href;
        if (!/^https?:/.test(href)) return `url("${href}")`;
        const name = assetName(href);
        assets[name] = href;
        return `var(--tear-asset-${name}, url("${href}"))`;
      });
      const decls = KEEP.filter((p) => p !== "background-image" && style.getPropertyValue(p)).map((p) => `${p}: ${style.getPropertyValue(p)}`);
      return `${rule.selectorText} { background-image: ${absolute}; ${decls.join("; ")} }`;
    }
    if (style.getPropertyValue("background-color") || style.getPropertyValue("background")) return "";
    const decls = KEEP.filter((p) => style.getPropertyValue(p)).map((p) => `${p}: ${style.getPropertyValue(p)}`);
    if (!decls.length) return "";
    return { subjects: subjects(rule.selectorText), text: `${rule.selectorText} { ${decls.join("; ")} }` };
  }

  function collect(rules, base, painted, out, cells) {
    for (const rule of rules) {
      if (rule.media) {
        const inner = [];
        const innerCells = [];
        collect(rule.cssRules, base, painted, inner, innerCells);
        if (inner.length || innerCells.length) out.push({ media: rule.media.mediaText, inner, cells: innerCells });
      } else if (rule.selectorText && rule.style) {
        const kept = imageRule(rule, base, painted);
        if (typeof kept === "string") kept && out.push(kept);
        else cells.push(kept);
      }
    }
  }

  const render = (items, cells, painted) =>
    [
      ...items.map((item) => (typeof item === "string" ? item : `@media ${item.media} {\n${render(item.inner, item.cells, painted)}\n}`)),
      ...cells.filter((c) => c.subjects.some((t) => painted.has(t))).map((c) => c.text),
    ]
      .filter(Boolean)
      .join("\n");

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
          sheet.replaceSync((await (await fetch(link.href)).text()).replace(/@import[^;]+;/g, ""));
          const painted = new Set();
          const out = [];
          const cells = [];
          collect(sheet.cssRules, link.href, painted, out, cells);
          read.set(link.href, { painted, out, cells });
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
      const painted = new Set(parts.flatMap((p) => [...p.painted]));
      // Its own layer: under TEAR's unlayered rules.
      images.textContent = `@layer torn-images {\n${parts.map(({ out, cells }) => render(out, cells, painted)).join("\n")}\n}`;
    });
  }

  // The asset list is saved once the page has loaded: one write per page.
  addEventListener("load", () => {
    if (!off) return;
    setTimeout(async () => {
      const { tornAssets = {} } = await chrome.storage.local.get("tornAssets");
      const merged = Object.entries({ ...tornAssets, ...assets }).slice(-MAX_ASSETS);
      chrome.storage.local.set({ tornAssets: Object.fromEntries(merged) });
    }, 1000);
  });

  new MutationObserver((records) => {
    if (!off) return;
    let sheets = false;
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
      }
    }
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
