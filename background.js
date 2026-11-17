// The service worker: keeps Torn's stylesheets from downloading while TEAR is on, and runs hot
// reload on unpacked installs.

importScripts("dev-reload.js");

const BLOCK_TORN_CSS = 1;

// With TEAR on, Torn's stylesheets were downloaded only to be switched off, and they block the
// page from rendering until they arrive. The page gets an empty sheet instead, not an error, so
// a stylesheet Torn's scripts wait on still loads. torn-css.js reads the sprite rules it needs
// with fetch(), which this rule (stylesheets only) doesn't touch.
async function syncTornCssRule() {
  const { tornCssOff = false } = await chrome.storage.local.get("tornCssOff");
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [BLOCK_TORN_CSS],
    addRules: tornCssOff
      ? [
          {
            id: BLOCK_TORN_CSS,
            priority: 1,
            action: { type: "redirect", redirect: { url: "data:text/css," } },
            condition: { requestDomains: ["torn.com"], resourceTypes: ["stylesheet"] },
          },
        ]
      : [],
  });
}

chrome.runtime.onInstalled.addListener(syncTornCssRule);
chrome.runtime.onStartup.addListener(syncTornCssRule);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && "tornCssOff" in changes) syncTornCssRule();
});
