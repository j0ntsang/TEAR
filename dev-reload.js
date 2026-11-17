// Unpacked extensions serve files from disk, so polling sees edits. Store
// installs have an update_url, so this never runs there.

const WATCHED = [
  "manifest.json",
  "background.js",
  "content/assets.css",
  "content/content.css",
  "content/dock.css",
  "content/main.js",
  "content/panel-styles.js",
  "content/settings.js",
  "content/torn-css.js",
  "lib/model.js",
];

const isUnpacked = !("update_url" in chrome.runtime.getManifest());

async function snapshot() {
  const bodies = await Promise.all(
    WATCHED.map((path) =>
      fetch(chrome.runtime.getURL(path), { cache: "no-store" })
        .then((res) => (res.ok ? res.text() : ""))
        .catch(() => ""),
    ),
  );
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bodies.join("\u0000")));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function reloadTornTabs() {
  const tabs = await chrome.tabs.query({ url: "https://www.torn.com/*" });
  for (const tab of tabs) chrome.tabs.reload(tab.id);
}

if (isUnpacked) {
  chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "update") reloadTornTabs();
  });

  // The last snapshot is stored, not just held: Chrome still stops the worker now and then, and a
  // fresh worker comparing against its own first look would miss edits made while it was stopped.
  // Stored before reloading, so the restarted worker matches it instead of reloading again.
  let last;
  let checking = false;
  setInterval(async () => {
    // Any extension API call keeps the MV3 worker from idling out.
    chrome.runtime.getPlatformInfo();
    if (checking) return;
    checking = true;
    try {
      const now = await snapshot();
      last ??= (await chrome.storage.local.get("devReloadSnapshot")).devReloadSnapshot;
      if (now === last) return;
      const changed = last !== undefined;
      last = now;
      await chrome.storage.local.set({ devReloadSnapshot: now });
      if (changed) chrome.runtime.reload();
    } finally {
      checking = false;
    }
  }, 1000);
}
