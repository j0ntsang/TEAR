// Quick controls: switch profile, tweak the theme, show/hide the panels on the
// open Torn tab. Layout, tabs, nav and profile management live on the options page.

(async () => {
  const { getActiveProfile, listProfiles, saveProfile, setActiveProfile, isTornUrl, renderThemeForm, debounce } = TEAR;
  const $ = (id) => document.getElementById(id);
  let profile = await getActiveProfile();

  const saveSoon = debounce(() => saveProfile(profile));
  // Closing the popup would drop a pending save.
  document.addEventListener("visibilitychange", () => document.hidden && saveSoon.flush());

  async function renderProfiles() {
    const select = $("profile");
    select.replaceChildren(...(await listProfiles()).map((p) => new Option(p.name, p.id, false, p.id === profile.id)));
  }

  $("profile").addEventListener("change", async (e) => {
    saveSoon.flush();
    await setActiveProfile(e.target.value);
    profile = await getActiveProfile();
    render();
  });

  async function renderPanels() {
    const list = $("panels");
    const note = $("panels-note");
    list.replaceChildren();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // tab.url is only visible for torn.com (the one host TEAR has access to).
    if (!tab || !isTornUrl(tab.url)) {
      note.textContent = "Open torn.com to choose panels.";
      return;
    }
    let panels;
    try {
      panels = await chrome.tabs.sendMessage(tab.id, { type: "GET_PANELS" });
    } catch {
      note.textContent = "Refresh the Torn tab, then reopen TEAR.";
      return;
    }
    if (!panels?.length) {
      note.textContent = "Panels are on Torn's Home page.";
      return;
    }
    note.textContent = "";
    for (const { slug, label } of panels) {
      const box = Object.assign(document.createElement("input"), { type: "checkbox", checked: !profile.layout.hidden[slug] });
      box.addEventListener("change", () => {
        if (box.checked) delete profile.layout.hidden[slug];
        else profile.layout.hidden[slug] = true;
        saveProfile(profile);
      });
      const row = document.createElement("label");
      row.append(box, label);
      const li = document.createElement("li");
      li.append(row);
      list.append(li);
    }
  }

  function render() {
    renderProfiles();
    renderThemeForm($("theme"), profile.theme, (theme) => {
      profile.theme = theme;
      saveSoon();
    });
    renderPanels();
  }

  $("options").addEventListener("click", () => chrome.runtime.openOptionsPage());
  render();
})();
