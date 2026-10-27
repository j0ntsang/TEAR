// Home dashboard panels: tag, hide, reorder and filter by tab.
//
// Panels have no stable id or data attribute, only their .box-title text
// (docs/torn-theme/layout-map.md), so tag() stamps data-panel from it. Nothing
// is re-parented: Torn's own scripts expect the original structure, so tabs
// work by hiding, and reordering moves boxes only within their own column.

(() => {
  const { slugify, panelLabel, mergeOrder } = TEAR;
  const BOX = "#mainContainer .sortable-box";
  let nextIndex = 0;

  /** Every titled panel on the page, tagged. [] off the Home page. */
  function tag() {
    const panels = [];
    const boxes = document.querySelectorAll(BOX);
    const taken = new Set([...boxes].map((box) => box.dataset.panel).filter(Boolean));
    for (const box of boxes) {
      if (!box.dataset.panel) {
        const title = box.querySelector(".box-title")?.textContent ?? "";
        const base = slugify(title);
        if (!base) continue;
        let slug = base;
        for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
        taken.add(slug);
        box.dataset.panel = slug;
        box.dataset.panelLabel = panelLabel(title);
        // Torn's order on load, so clearing TEAR's order puts it back.
        box.dataset.tearIndex = String(nextIndex++);
      }
      panels.push({ slug: box.dataset.panel, label: box.dataset.panelLabel, box });
    }
    return panels;
  }

  function reorder(panels, order) {
    const byParent = new Map();
    for (const p of panels) {
      const siblings = byParent.get(p.box.parentElement) ?? [];
      siblings.push(p);
      byParent.set(p.box.parentElement, siblings);
    }
    for (const [parent, siblings] of byParent) {
      const original = [...siblings].sort((a, b) => a.box.dataset.tearIndex - b.box.dataset.tearIndex);
      const wanted = mergeOrder(order, original.map((p) => p.slug));
      const inPlace = [...parent.children].filter((el) => el.dataset.panel);
      if (wanted.join() === inPlace.map((el) => el.dataset.panel).join()) continue; // Also stops the observer looping.

      // Keep the boxes where they were among the column's other children.
      const anchor = inPlace.at(-1).nextSibling;
      const boxes = new Map(siblings.map((p) => [p.slug, p.box]));
      for (const slug of wanted) parent.insertBefore(boxes.get(slug), anchor);
    }
  }

  /** The nearest element containing every panel, where the tab bar goes. */
  function commonAncestor(panels) {
    let el = panels[0].box.parentElement;
    while (el && !panels.every((p) => el.contains(p.box))) el = el.parentElement;
    return el;
  }

  function renderTabBar(panels, tabs, activeTab, onPick) {
    let bar = document.querySelector(".tear-tabbar");
    if (!tabs.length || !panels.length) {
      bar?.remove();
      return;
    }
    const key = JSON.stringify(tabs.map((t) => [t.id, t.name]));
    if (!bar || bar.dataset.key !== key) {
      bar?.remove();
      bar = document.createElement("div");
      bar.className = "tear-tabbar";
      bar.setAttribute("role", "tablist");
      bar.dataset.key = key;
      for (const { id, name } of [{ id: "all", name: "All" }, ...tabs]) {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("role", "tab");
        button.dataset.tab = id;
        button.textContent = name;
        button.addEventListener("click", () => onPick(id));
        bar.append(button);
      }
      const host = commonAncestor(panels);
      host?.insertBefore(bar, host.firstChild);
    }
    for (const button of bar.querySelectorAll("button")) {
      button.setAttribute("aria-selected", String(button.dataset.tab === activeTab));
    }
  }

  function apply(layout, activeTab, onPickTab) {
    const panels = tag();
    if (!panels.length) return panels;

    const tab = layout.tabs.find((t) => t.id === activeTab);
    const shown = tab ? new Set(tab.panels) : null;
    for (const { slug, box } of panels) {
      box.toggleAttribute("data-tear-hidden", layout.hidden[slug] === true);
      box.toggleAttribute("data-tear-tab-hidden", shown !== null && !shown.has(slug));
    }
    reorder(panels, layout.order);
    renderTabBar(panels, layout.tabs, tab ? tab.id : "all", onPickTab);
    return panels;
  }

  TEAR.panels = { tag, apply };
})();
