# Hide Rumble Shorts

A Chrome and Brave extension that removes Rumble Shorts from the logged-in **Subscriptions** feed (`https://rumble.com/subscriptions`).

Rumble currently injects a `<rum-shorts-row>` web component at the top of that feed. This extension hides it, keeps hiding it when the page loads more items, and lets you turn the filter off or edit it if Rumble changes the markup.

## What it does

- Hides matching Shorts rows on `/subscriptions` while you are logged in
- Leaves the rest of the My Feed videos alone
- Does **not** hide the dedicated Shorts page (`/subscriptions/shorts` or `/shorts`) unless you add those paths yourself
- Updates as soon as you toggle or save — no reload required on an already-open Rumble tab
- Stores settings in `chrome.storage.sync`, so they follow your browser profile

Default filter:

| Setting | Default |
| --- | --- |
| Enabled | On |
| Selectors | `rum-shorts-row` |
| Pages | `/subscriptions` |
| Extra CSS | empty |

## Install in Chrome or Brave

The extension is unpacked (loaded from this folder). It is not on the Chrome Web Store.

1. Open the extensions page:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked**.
4. Select this folder: `C:\_o\_dev\anaker_rumble`
5. Pin **Hide Rumble Shorts** to the toolbar if you want one-click access.
6. Open `https://rumble.com/subscriptions` while logged in. The Shorts row should disappear. The toolbar badge reads **ON**.

After you update files in this folder, go back to the extensions page and click **Reload** on this extension, then refresh the Rumble tab if the popup asks you to.

## Use

Click the toolbar icon:

- **Toggle** — turn hiding on or off
- **Selectors to hide** — CSS selectors, one per line
- **Pages to match** — pathnames or URL patterns
- **Extra CSS** — optional rules if Rumble wraps the row in extra markup
- **Reset defaults** — restore the original filter
- **Open full options** — same settings on a larger page (`chrome://extensions` → Details → Extension options)

Lines that are empty or start with `#` are ignored.

### Page patterns

- `/subscriptions` matches that pathname only (query strings and a trailing slash are allowed). It does not match `/subscriptions/shorts`.
- `https://rumble.com/*` matches the whole site.
- `*` is the only wildcard. `#` comments are allowed.

### If Rumble changes the Shorts row

1. Open `https://rumble.com/subscriptions` while logged in.
2. Temporarily turn the extension **off** so the Shorts row is visible.
3. Right-click the Shorts row → **Inspect**.
4. Copy a stable selector, for example:
   - `rum-shorts-row`
   - `[feed-path="/subscriptions/shorts"]`
   - `[feed-path*="shorts"]`
5. Paste it into **Selectors to hide**, save, and turn the extension back **on**.

If the row is wrapped in a container that still leaves a gap, put a rule in **Extra CSS**, for example:

```css
section:has(rum-shorts-row) {
  display: none !important;
}
```

## Files

```
anaker_rumble/
  manifest.json      Manifest V3 (Chrome / Brave / other Chromium browsers)
  defaults.js        Default settings and URL matching
  content.js         Injects hide CSS and watches the live feed
  background.js      Toolbar badge (ON / OFF)
  popup.html/.css/.js
  options.html       Full settings page
  icons/             Toolbar icons (source: icons/icon.svg)
  README.md
```

Required permission: `storage` (to save the toggle and selectors). Host access is limited to `rumble.com`.

## Uninstall

`chrome://extensions` or `brave://extensions` → **Remove** on Hide Rumble Shorts.

## Notes

- The extension only changes how the page is displayed in your browser. It does not log in for you, call Rumble APIs, or send data anywhere else.
- Custom elements such as `<rum-shorts-row>` can appear after first paint. The content script injects CSS at `document_start` and uses a `MutationObserver` so late rows are still hidden.
- Tested against the logged-in My Feed at `https://rumble.com/subscriptions`, where the Shorts block is a `<rum-shorts-row feed-path="/subscriptions/shorts">` list item sitting with the regular `<rum-card-video>` items.
