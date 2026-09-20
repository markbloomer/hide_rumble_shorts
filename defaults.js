const DEFAULT_SETTINGS = {
  enabled: true,
  selectors: ["rum-shorts-row"],
  urlPatterns: ["/subscriptions"],
  extraCss: ""
};

const STYLE_ID = "anaker-hide-rumble-shorts";
const HIDDEN_ATTR = "data-anaker-shorts-hidden";
const STORAGE_KEYS = Object.keys(DEFAULT_SETTINGS);

function normalizeSettings(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const selectors = Array.isArray(input.selectors)
    ? input.selectors
    : typeof input.selectors === "string"
      ? input.selectors.split(/\r?\n/)
      : DEFAULT_SETTINGS.selectors;
  const urlPatterns = Array.isArray(input.urlPatterns)
    ? input.urlPatterns
    : typeof input.urlPatterns === "string"
      ? input.urlPatterns.split(/\r?\n/)
      : DEFAULT_SETTINGS.urlPatterns;

  return {
    enabled: input.enabled !== false,
    selectors: sanitizeLines(selectors, DEFAULT_SETTINGS.selectors),
    urlPatterns: sanitizeLines(urlPatterns, DEFAULT_SETTINGS.urlPatterns),
    extraCss: typeof input.extraCss === "string" ? input.extraCss : ""
  };
}

function sanitizeLines(lines, fallback) {
  const cleaned = lines
    .map((line) => String(line || "").trim())
    .filter((line) => line && !line.startsWith("#"));
  return cleaned.length ? cleaned : fallback.slice();
}

function globToRegExp(pattern) {
  let source = "^";
  for (const char of pattern) {
    if (char === "*") {
      source += ".*";
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  source += "$";
  return new RegExp(source, "i");
}

function urlMatchesPatterns(href, patterns) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return false;
  }

  const hrefNoHash = `${url.origin}${url.pathname}${url.search}`;
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  return patterns.some((pattern) => {
    if (pattern.startsWith("/")) {
      const pathPattern = pattern.split("?")[0];
      if (pathPattern.includes("*")) {
        return globToRegExp(pathPattern).test(url.pathname);
      }
      return pathname === (pathPattern.replace(/\/+$/, "") || "/");
    }
    return globToRegExp(pattern).test(hrefNoHash);
  });
}

function buildHideCss(settings) {
  const selectors = settings.selectors.join(",\n");
  const hideRule = `${selectors} {
  display: none !important;
  height: 0 !important;
  max-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
}`;
  return settings.extraCss.trim()
    ? `${hideRule}\n\n${settings.extraCss.trim()}`
    : hideRule;
}

function requireStorage() {
  if (!globalThis.chrome || !chrome.storage || !chrome.storage.sync) {
    throw new Error("Install and open this from the extension to save settings.");
  }
}

async function loadSettings() {
  requireStorage();
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return normalizeSettings(stored);
}

async function saveSettings(next) {
  requireStorage();
  const settings = normalizeSettings(next);
  await chrome.storage.sync.set(settings);
  return settings;
}
