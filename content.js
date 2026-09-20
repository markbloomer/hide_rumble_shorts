let currentSettings = normalizeSettings(DEFAULT_SETTINGS);
let observer = null;
let lastHref = location.href;

function pageIsMatched() {
  return urlMatchesPatterns(location.href, currentSettings.urlPatterns);
}

function ensureStyleEl() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    (document.documentElement || document.head || document.body).appendChild(style);
  }
  return style;
}

function removeStyleEl() {
  const style = document.getElementById(STYLE_ID);
  if (style) style.remove();
}

function hideMatchingElements() {
  const shouldHide = currentSettings.enabled && pageIsMatched();
  document.querySelectorAll(`[${HIDDEN_ATTR}]`).forEach((el) => {
    if (!shouldHide || !currentSettings.selectors.some((sel) => safeMatches(el, sel))) {
      el.style.removeProperty("display");
      el.removeAttribute(HIDDEN_ATTR);
    }
  });

  if (!shouldHide) return 0;

  let count = 0;
  for (const selector of currentSettings.selectors) {
    let nodes;
    try {
      nodes = document.querySelectorAll(selector);
    } catch {
      continue;
    }
    nodes.forEach((el) => {
      el.style.setProperty("display", "none", "important");
      el.setAttribute(HIDDEN_ATTR, "1");
      count += 1;
    });
  }
  return count;
}

function safeMatches(el, selector) {
  try {
    return el.matches(selector);
  } catch {
    return false;
  }
}

function validSelector(selector) {
  try {
    document.querySelector(selector);
    return true;
  } catch {
    return false;
  }
}

function applySettings() {
  if (currentSettings.enabled && pageIsMatched()) {
    const selectors = currentSettings.selectors.filter(validSelector);
    const css = selectors.length
      ? buildHideCss({ ...currentSettings, selectors })
      : currentSettings.extraCss.trim();
    if (css) ensureStyleEl().textContent = css;
    else removeStyleEl();
  } else {
    removeStyleEl();
  }
  return hideMatchingElements();
}

function startObserver() {
  if (observer || !document.documentElement) return;
  let frame = 0;
  observer = new MutationObserver(() => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (location.href !== lastHref) {
        lastHref = location.href;
        applySettings();
        return;
      }
      if (currentSettings.enabled && pageIsMatched() && !document.getElementById(STYLE_ID)) {
        applySettings();
        return;
      }
      hideMatchingElements();
    });
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

function hookSpaNavigation() {
  const notify = () => {
    if (location.href === lastHref) return;
    lastHref = location.href;
    applySettings();
  };
  window.addEventListener("popstate", notify);
  window.addEventListener("hashchange", notify);

  const wrap = (method) => {
    const original = history[method];
    history[method] = function wrappedHistory() {
      const result = original.apply(this, arguments);
      notify();
      return result;
    };
  };
  wrap("pushState");
  wrap("replaceState");
}

function countHidden() {
  if (!currentSettings.enabled || !pageIsMatched()) return 0;
  let count = 0;
  for (const selector of currentSettings.selectors) {
    try {
      count += document.querySelectorAll(selector).length;
    } catch {
      // ignore invalid selectors
    }
  }
  return count;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (!STORAGE_KEYS.some((key) => key in changes)) return;
  loadSettings().then((settings) => {
    currentSettings = settings;
    applySettings();
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "anaker-get-status") {
    sendResponse({
      href: location.href,
      matched: pageIsMatched(),
      enabled: currentSettings.enabled,
      hiddenCount: countHidden()
    });
    return true;
  }
  if (message && message.type === "anaker-apply") {
    currentSettings = normalizeSettings(message.settings || currentSettings);
    const hiddenCount = applySettings();
    sendResponse({
      href: location.href,
      matched: pageIsMatched(),
      enabled: currentSettings.enabled,
      hiddenCount
    });
    return true;
  }
  return false;
});

loadSettings().then((settings) => {
  currentSettings = settings;
  applySettings();
  startObserver();
  hookSpaNavigation();
});

applySettings();
startObserver();
