// Quick-nav bar: your own row of links under Torn's header. Plain <a href>s,
// nothing that acts on the game. Also harvests the sidebar's area links so the
// options page can offer Torn's real routes (several are SPA hash routes).

(() => {
  const { isTornUrl } = TEAR;

  /** Sidebar "Areas" links as [{label, href}], deduped by href. */
  function harvest() {
    const seen = new Map();
    for (const a of document.querySelectorAll('[class*="areas___"] a[href]')) {
      const label = a.textContent.replace(/\s+/g, " ").trim();
      if (label && isTornUrl(a.href) && !seen.has(a.href)) seen.set(a.href, { label, href: a.href });
    }
    return [...seen.values()];
  }

  function render(nav) {
    let bar = document.querySelector(".tear-navbar");
    if (!nav.length) {
      bar?.remove();
      return;
    }
    const key = JSON.stringify(nav);
    if (bar?.dataset.key === key) return;

    // After #header-root, not inside it: that's React's, and a re-render could drop it.
    const header = document.getElementById("header-root");
    if (!header) return;
    bar?.remove();
    bar = document.createElement("nav");
    bar.className = "tear-navbar";
    bar.setAttribute("aria-label", "TEAR quick nav");
    bar.dataset.key = key;
    for (const { label, href } of nav) {
      const a = document.createElement("a");
      a.href = href;
      a.textContent = label;
      bar.append(a);
    }
    header.after(bar);
  }

  TEAR.nav = { harvest, render };
})();
