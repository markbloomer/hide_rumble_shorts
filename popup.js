const enabledEl = document.getElementById("enabled");
const enabledLabel = document.getElementById("enabledLabel");
const selectorsEl = document.getElementById("selectors");
const urlPatternsEl = document.getElementById("urlPatterns");
const extraCssEl = document.getElementById("extraCss");
const statusEl = document.getElementById("status");
const saveStateEl = document.getElementById("saveState");
const formEl = document.getElementById("settingsForm");
const resetEl = document.getElementById("reset");
const optionsLink = document.getElementById("optionsLink");

function settingsFromForm() {
  return normalizeSettings({
    enabled: enabledEl.checked,
    selectors: selectorsEl.value.split(/\r?\n/),
    urlPatterns: urlPatternsEl.value.split(/\r?\n/),
    extraCss: extraCssEl.value
  });
}

function fillForm(settings) {
  enabledEl.checked = settings.enabled;
  enabledLabel.textContent = settings.enabled ? "On" : "Off";
  selectorsEl.value = settings.selectors.join("\n");
  urlPatternsEl.value = settings.urlPatterns.join("\n");
  extraCssEl.value = settings.extraCss;
}

function setSaveState(message, isError) {
  saveStateEl.textContent = message;
  saveStateEl.classList.toggle("error", Boolean(isError));
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function refreshStatus(settings) {
  const tab = await getActiveTab();
  if (!tab || !tab.url) {
    statusEl.className = "status warn";
    statusEl.textContent = "Open rumble.com/subscriptions to see hide status.";
    return;
  }

  const matched = urlMatchesPatterns(tab.url, settings.urlPatterns);
  if (!/^https:\/\/(www\.)?rumble\.com\//i.test(tab.url)) {
    statusEl.className = "status warn";
    statusEl.textContent = "This tab is not Rumble. The filter runs on rumble.com.";
    return;
  }

  if (!settings.enabled) {
    statusEl.className = "status warn";
    statusEl.textContent = "Hiding is turned off. Shorts stay visible.";
    return;
  }

  if (!matched) {
    statusEl.className = "status warn";
    statusEl.textContent = "This Rumble page is not in the match list.";
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "anaker-get-status" });
    const count = response && typeof response.hiddenCount === "number" ? response.hiddenCount : 0;
    statusEl.className = "status ok";
    statusEl.textContent =
      count === 1 ? "Hiding 1 matching Shorts row on this page." : `Hiding ${count} matching elements on this page.`;
  } catch {
    statusEl.className = "status warn";
    statusEl.textContent = "Reload the Rumble tab after installing or updating the extension.";
  }
}

function invalidSelectors(selectors) {
  return selectors.filter((selector) => {
    try {
      document.querySelector(selector);
      return false;
    } catch {
      return true;
    }
  });
}

async function persist(settings, quiet) {
  const bad = invalidSelectors(settings.selectors);
  if (bad.length) {
    throw new Error(`Invalid selector: ${bad[0]}`);
  }
  const saved = await saveSettings(settings);
  fillForm(saved);
  if (!quiet) setSaveState("Saved. The feed updates immediately.");
  await refreshStatus(saved);
  return saved;
}

enabledEl.addEventListener("change", async () => {
  enabledLabel.textContent = enabledEl.checked ? "On" : "Off";
  try {
    await persist(settingsFromForm(), true);
    setSaveState(enabledEl.checked ? "Hiding enabled." : "Hiding disabled.");
  } catch (error) {
    setSaveState(error.message || "Could not save settings.", true);
  }
});

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await persist(settingsFromForm());
  } catch (error) {
    setSaveState(error.message || "Could not save settings.", true);
  }
});

resetEl.addEventListener("click", async () => {
  fillForm(DEFAULT_SETTINGS);
  await persist(DEFAULT_SETTINGS);
  setSaveState("Restored default selectors and pages.");
});

if (optionsLink && typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.openOptionsPage) {
  optionsLink.addEventListener("click", (event) => {
    event.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

loadSettings()
  .then(async (settings) => {
    fillForm(settings);
    await refreshStatus(settings);
  })
  .catch(() => {
    fillForm(DEFAULT_SETTINGS);
    statusEl.className = "status warn";
    statusEl.textContent = "Open this from the installed extension to use live status.";
  });
