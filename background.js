// The service worker: keeps Torn's stylesheets from downloading while TEAR is on, and runs hot
// reload on unpacked installs.

importScripts("dev-reload.js");

const BLOCK_TORN_CSS = 1;
const ALLOW_TORN_CHAT_CSS = 2;

// With TEAR on, Torn's stylesheets were downloaded only to be switched off, and they block the
// page from rendering until they arrive. The page gets an empty sheet instead, not an error, so
// a stylesheet Torn's scripts wait on still loads. torn-css.js reads the sprite rules it needs
// with fetch(), which this rule (stylesheets only) doesn't touch.
// The "Torn's own chat" feature lets the chat's stylesheets (/builds/tchat/) through: an allow rule
// that outranks the block.
async function syncTornCssRule() {
  const { tornCssOff = false, featuresOn } = await chrome.storage.local.get(["tornCssOff", "featuresOn"]);
  const tornChat = Array.isArray(featuresOn) && featuresOn.includes("tornChat");
  const addRules = [];
  if (tornCssOff) {
    addRules.push({
      id: BLOCK_TORN_CSS,
      priority: 1,
      action: { type: "redirect", redirect: { url: "data:text/css," } },
      condition: { requestDomains: ["torn.com"], resourceTypes: ["stylesheet"] },
    });
    if (tornChat) {
      addRules.push({
        id: ALLOW_TORN_CHAT_CSS,
        priority: 2,
        action: { type: "allow" },
        condition: { urlFilter: "||www.torn.com/builds/tchat/", resourceTypes: ["stylesheet"] },
      });
    }
  }
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [BLOCK_TORN_CSS, ALLOW_TORN_CHAT_CSS], addRules });
}

chrome.runtime.onInstalled.addListener(syncTornCssRule);
chrome.runtime.onStartup.addListener(syncTornCssRule);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && ("tornCssOff" in changes || "featuresOn" in changes)) syncTornCssRule();
});
