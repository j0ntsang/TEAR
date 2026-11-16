// Unpacked extensions serve files from disk, so polling sees edits. Store
// installs have an update_url, so this never runs there.

const WATCHED = [
  "manifest.json",
  "content/content.css",
  "content/main.js",
  "content/settings.css",
  "content/settings.js",
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
  return bodies.join("\u0000");
}

async function reloadTornTabs() {
  const tabs = await chrome.tabs.query({ url: "https://www.torn.com/*" });
  for (const tab of tabs) chrome.tabs.reload(tab.id);
}

if (isUnpacked) {
  chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "update") reloadTornTabs();
  });

  let last;
  setInterval(async () => {
    // Any extension API call keeps the MV3 worker from idling out.
    chrome.runtime.getPlatformInfo();
    const now = await snapshot();
    if (last !== undefined && now !== last) chrome.runtime.reload();
    last = now;
  }, 1000);
}
