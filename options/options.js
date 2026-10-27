// Full editor: profiles, theme, panel order and visibility, tabs, quick-nav.
// Every edit saves to the active profile; Torn tabs pick it up via
// storage.onChanged. The panel and area lists come from what the content
// scripts last saw on Torn (they vary by account).

(async () => {
  const {
    getActiveProfile, listProfiles, saveProfile, setActiveProfile, newProfile, deleteProfile,
    exportProfile, importProfile, withDefaults, profileKey, mergeOrder, isTornUrl, renderThemeForm, debounce,
  } = TEAR;
  const $ = (id) => document.getElementById(id);
  const el = (tag, props = {}, ...children) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };

  let profile;
  let knownPanels = [];
  let knownAreas = [];

  // What this page wrote recently, so its own saves echoing back through
  // storage.onChanged aren't mistaken for edits made in the popup.
  const written = [];
  const save = () => {
    const clean = withDefaults(profile);
    written.push(JSON.stringify(clean));
    if (written.length > 20) written.shift();
    return saveProfile(clean);
  };
  const saveSoon = debounce(save);

  const moved = (items, from, to) => {
    const next = [...items];
    next.splice(to, 0, ...next.splice(from, 1));
    return next;
  };

  /** A reorderable list: drag rows, or use the ↑ ↓ buttons (keyboard). */
  function sortableList(ul, items, nameOf, fillRow, onMove) {
    const type = `application/x-tear-${ul.id}`;
    ul.replaceChildren();
    items.forEach((item, i) => {
      const li = el("li", { draggable: true });
      li.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData(type, String(i));
        e.dataTransfer.effectAllowed = "move";
        li.classList.add("dragging");
      });
      li.addEventListener("dragend", () => li.classList.remove("dragging"));
      li.addEventListener("dragover", (e) => e.dataTransfer.types.includes(type) && e.preventDefault());
      li.addEventListener("drop", (e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData(type));
        if (from !== i) onMove(from, i);
      });
      fillRow(li, item);
      const name = nameOf(item);
      li.append(
        el("button", { type: "button", textContent: "↑", disabled: i === 0, ariaLabel: `Move ${name} up`, onclick: () => onMove(i, i - 1) }),
        el("button", { type: "button", textContent: "↓", disabled: i === items.length - 1, ariaLabel: `Move ${name} down`, onclick: () => onMove(i, i + 1) }),
      );
      ul.append(li);
    });
  }

  // ---- Profiles ----

  async function renderProfiles() {
    const profiles = await listProfiles();
    $("profile").replaceChildren(...profiles.map((p) => new Option(p.name, p.id, false, p.id === profile.id)));
    $("profile-name").value = profile.name;
    $("profile-delete").disabled = profiles.length < 2;
  }

  const showProfileError = (message = "") => ($("profile-error").textContent = message);

  async function switchTo(id) {
    saveSoon.flush();
    await setActiveProfile(id);
    await load();
  }

  $("profile").addEventListener("change", (e) => switchTo(e.target.value));

  $("profile-name").addEventListener("input", (e) => {
    profile.name = e.target.value;
    const option = $("profile").selectedOptions[0];
    if (option) option.textContent = profile.name || "Default";
    saveSoon();
  });

  $("profile-new").addEventListener("click", async () => {
    const count = (await listProfiles()).length;
    switchTo((await newProfile(`Profile ${count + 1}`)).id);
  });

  $("profile-duplicate").addEventListener("click", async () => {
    saveSoon.flush();
    switchTo((await newProfile(`${profile.name} copy`, profile)).id);
  });

  $("profile-delete").addEventListener("click", async () => {
    if (!confirm(`Delete the profile "${profile.name}"?`)) return;
    try {
      await deleteProfile(profile.id);
      showProfileError();
      await load();
    } catch (err) {
      showProfileError(err.message);
    }
  });

  $("profile-export").addEventListener("click", () => {
    saveSoon.flush();
    const url = URL.createObjectURL(new Blob([exportProfile(profile)], { type: "application/json" }));
    const slug = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "profile";
    el("a", { href: url, download: `tear-${slug}.json` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $("profile-import").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", async (e) => {
    const [file] = e.target.files;
    e.target.value = "";
    if (!file) return;
    try {
      const imported = await saveProfile(importProfile(await file.text()));
      showProfileError();
      await switchTo(imported.id);
    } catch (err) {
      showProfileError(err.message);
    }
  });

  // ---- Theme ----

  function renderTheme() {
    renderThemeForm($("theme"), profile.theme, (theme) => {
      profile.theme = theme;
      saveSoon();
    });
  }

  // ---- Home panels ----

  const labelOf = (slug) => knownPanels.find((p) => p.slug === slug)?.label ?? slug;
  const panelOrder = () => mergeOrder(profile.layout.order, knownPanels.map((p) => p.slug));

  function renderPanels() {
    $("panels-empty").hidden = knownPanels.length > 0;
    const order = panelOrder();
    sortableList(
      $("panels"),
      order,
      labelOf,
      (li, slug) => {
        const box = el("input", { type: "checkbox", checked: !profile.layout.hidden[slug] });
        box.addEventListener("change", () => {
          if (box.checked) delete profile.layout.hidden[slug];
          else profile.layout.hidden[slug] = true;
          save();
        });
        li.append(el("label", { className: "grow row" }, box, labelOf(slug)));
      },
      (from, to) => {
        profile.layout.order = moved(order, from, to);
        save();
        renderPanels();
      },
    );
  }

  $("panels-reset").addEventListener("click", () => {
    profile.layout.order = [];
    save();
    renderPanels();
    renderTabs();
  });

  // ---- Tabs ----

  function renderTabs() {
    const container = $("tabs");
    container.replaceChildren();
    for (const tab of profile.layout.tabs) {
      const name = el("input", { value: tab.name, ariaLabel: "Tab name" });
      name.addEventListener("input", () => {
        tab.name = name.value;
        saveSoon();
      });
      const remove = el("button", { type: "button", textContent: "Remove", ariaLabel: `Remove tab ${tab.name}` });
      remove.addEventListener("click", () => {
        profile.layout.tabs = profile.layout.tabs.filter((t) => t !== tab);
        save();
        renderTabs();
      });

      const chips = el("div", { className: "chips" });
      for (const slug of panelOrder()) {
        const chip = el("button", { type: "button", textContent: labelOf(slug) });
        chip.setAttribute("aria-pressed", String(tab.panels.includes(slug)));
        chip.addEventListener("click", () => {
          tab.panels = tab.panels.includes(slug) ? tab.panels.filter((s) => s !== slug) : [...tab.panels, slug];
          chip.setAttribute("aria-pressed", String(tab.panels.includes(slug)));
          save();
        });
        chips.append(chip);
      }
      if (!knownPanels.length) chips.append(el("span", { className: "note", textContent: "No panels seen yet." }));

      container.append(el("div", { className: "tab" }, el("div", { className: "row" }, name, remove), chips));
    }
  }

  $("tab-add").addEventListener("click", () => {
    profile.layout.tabs.push({ id: crypto.randomUUID().slice(0, 8), name: `Tab ${profile.layout.tabs.length + 1}`, panels: [] });
    save();
    renderTabs();
  });

  // ---- Quick-nav ----

  const showNavError = (message = "") => ($("nav-error").textContent = message);

  function renderNav() {
    sortableList(
      $("nav"),
      profile.nav,
      (link) => link.label,
      (li, link) => {
        const remove = el("button", { type: "button", textContent: "✕", ariaLabel: `Remove ${link.label}` });
        remove.addEventListener("click", () => {
          profile.nav = profile.nav.filter((n) => n !== link);
          save();
          renderNav();
        });
        li.append(el("span", { className: "grow" }, link.label, " ", el("span", { className: "note", textContent: link.href })), remove);
      },
      (from, to) => {
        profile.nav = moved(profile.nav, from, to);
        save();
        renderNav();
      },
    );

    const used = new Set(profile.nav.map((n) => n.href));
    const areas = knownAreas.filter((a) => !used.has(a.href));
    $("nav-area").replaceChildren(
      ...(areas.length
        ? areas.map((a, i) => new Option(a.label, String(i)))
        : [new Option(knownAreas.length ? "All areas added" : "Visit torn.com so TEAR can read the sidebar", "")]),
    );
    $("nav-area").disabled = $("nav-add-area").disabled = !areas.length;
    $("nav-area").dataset.areas = JSON.stringify(areas);
  }

  function addNav(label, href) {
    if (!label.trim()) return showNavError("Give the link a label.");
    if (!isTornUrl(href)) return showNavError("Links must start with https://www.torn.com/.");
    showNavError();
    profile.nav.push({ label: label.trim(), href });
    save();
    renderNav();
  }

  $("nav-add-area").addEventListener("click", () => {
    const area = JSON.parse($("nav-area").dataset.areas)[Number($("nav-area").value)];
    if (area) addNav(area.label, area.href);
  });

  $("nav-add-custom").addEventListener("click", () => {
    addNav($("nav-label").value, $("nav-href").value.trim());
    if (!$("nav-error").textContent) $("nav-label").value = $("nav-href").value = "";
  });

  // ---- Load and stay in sync ----

  async function load() {
    profile = await getActiveProfile();
    // A default that was never edited isn't stored yet; store it so it stays
    // listed once other profiles exist.
    await save();
    await setActiveProfile(profile.id);
    ({ knownPanels = [], knownAreas = [] } = await chrome.storage.local.get(["knownPanels", "knownAreas"]));
    renderProfiles();
    renderTheme();
    renderPanels();
    renderTabs();
    renderNav();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
      if (changes.knownPanels) {
        knownPanels = changes.knownPanels.newValue ?? [];
        renderPanels();
        renderTabs();
      }
      if (changes.knownAreas) {
        knownAreas = changes.knownAreas.newValue ?? [];
        renderNav();
      }
      return;
    }
    if (!profile) return;
    const mine = changes[profileKey(profile.id)];
    const editedElsewhere = mine?.newValue && !written.includes(JSON.stringify(mine.newValue));
    if (editedElsewhere || (changes.activeProfile && changes.activeProfile.newValue !== profile.id)) load();
    else if (Object.keys(changes).some((k) => k.startsWith("profile:"))) renderProfiles();
  });

  document.addEventListener("visibilitychange", () => document.hidden && saveSoon.flush());
  await load();
})();
