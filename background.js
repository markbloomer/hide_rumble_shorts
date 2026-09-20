importScripts("defaults.js");

function badgeText(enabled) {
  return enabled ? "ON" : "OFF";
}

function badgeColor(enabled) {
  return enabled ? "#85c742" : "#6b7280";
}

async function updateBadge() {
  const settings = await loadSettings();
  await chrome.action.setBadgeText({ text: badgeText(settings.enabled) });
  await chrome.action.setBadgeBackgroundColor({ color: badgeColor(settings.enabled) });
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(null);
  const merged = normalizeSettings({ ...DEFAULT_SETTINGS, ...stored });
  await chrome.storage.sync.set(merged);
  await updateBadge();
});

chrome.runtime.onStartup.addListener(updateBadge);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && ("enabled" in changes || STORAGE_KEYS.some((key) => key in changes))) {
    updateBadge();
  }
});

updateBadge();
