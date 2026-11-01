# FSonline Popunder Blocker

![Manifest V3](https://img.shields.io/badge/manifest-v3-16a34a)
![Chrome · Edge · Brave](https://img.shields.io/badge/brave%20%C2%B7%20chrome%20%C2%B7%20edge-supported-2563eb)
![No telemetry](https://img.shields.io/badge/network%20requests-none-64748b)
![MIT](https://img.shields.io/badge/license-MIT-blue)

A tiny Manifest V3 extension that removes the Adsterra popunder, the invisible full-page
click-trap and the scroll locks on **fsonline.app**.

No build step, no dependencies, no network traffic, no analytics. Roughly 200 lines of
readable JavaScript.

---

## The problem

Opening a film on fsonline.app spawns an ad tab on almost every click, and the episode links
often feel dead. Both symptoms have one cause.

The site loads an obfuscated Adsterra "aclib" bundle (`/q7m3x9.js`) plus an inline
`aclib.runPop({ zoneId: '11692342' })`. That bundle:

1. injects an **empty, transparent, `position: fixed` div over the whole viewport** —
   `div#dontfoid`, carrying the zone id in a `znid` attribute, with `z-index: 2147483647`;
2. installs a **document-level `click` listener** that calls
   `window.open(url, '_blank', 'noopener,noreferrer')`.

Every click lands on the overlay instead of the link, and the listener opens an ad tab. The
overlay also swallows the clicks it intercepted, which is why real navigation breaks.

Deleting the div is not enough — the ad code keeps a reference and throws
`Uncaught TypeError: Cannot read properties of null (reading 'removeChild')`. Removing the
listener is not enough either, because it cannot be enumerated from page script.

## How it works

Two independent, deliberately blunt countermeasures:

| Layer | Mechanism |
| --- | --- |
| `src/sites.css` | `pointer-events: none !important` on the trap selectors. Declared in the manifest, so it applies before any page script and links receive clicks again. The div stays in the DOM, so nothing throws. |
| `src/content.js` | Wraps `window.open`. The ad listener still runs, still gets a return value, but no tab opens. A small dummy `Window` is returned so callers that touch it don't crash. |

`window.open` is restored on **Shift-click**, so a real popup is one modifier key away. A
`MutationObserver` re-asserts scroll unlocking and any `removeSelectors` as the ad code
re-adds DOM, and `<kbd>Alt</kbd>+<kbd>K</kbd>` toggles protection for the current host.

The extension gates itself two ways: `manifest.json` restricts injection to
`https://*.fsonline.app/*`, and `config.js` must contain an entry for the exact hostname.
Hosts without an entry are untouched even if they match the manifest glob.

## Install (unpacked)

1. Download or clone this repository.
2. Open `brave://extensions` (or `chrome://extensions`, `edge://extensions`).
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select this folder.
5. Open fsonline.app and click anywhere — no ad tab.

Pin the toolbar icon to reach the popup: global switch, per-site switch, and live status.

## Usage

- **Click** normally. Links, the player and AJAX navigation work; ads do not.
- **Shift-click** a link when you actually want the popup.
- **Alt+K** toggles the current site.
- The toolbar badge reads **ON** (green) or **OFF** (grey) for the active tab.

## Supported sites

| Host | Status | Notes |
| --- | --- | --- |
| `www3.fsonline.app` | supported | Adsterra aclib, zone `11692342` |

More hosts are welcome — open an issue with the URL and a description of the behaviour if you
would rather not write it yourself.

## Adding a site

1. Copy `src/config.js` and add an entry keyed by exact hostname.
2. Add the host's selectors to `src/sites.css`, scoped with `html:not([data-fsb-off])`.
3. Broaden `host_permissions` and the `content_scripts.matches` glob in `manifest.json` if the
   new host is not already covered.
4. Reload the extension and verify with the DevTools console open.

```js
{
  'example.com': {
    label: 'Example',
    trapSelectors: ['#click-trap'],
    blockOpen: true,
    unlockScroll: true,
    removeSelectors: ['iframe[src*="adserver"]'],
  }
}
```

`trapSelectors` are neutralised in CSS only; `removeSelectors` are actually deleted. Prefer
the former when the ad script may hold references.

## Project layout

```
manifest.json            MV3 manifest: matches, permissions, assets
src/config.js            per-host rules (the allowlist)
src/sites.css            static click-through rules
src/content.js           window.open shim, scroll unlock, observer, toggle
src/background.js        defaults, badge, badge clearing
src/popup/               toolbar popup (master switch, per-site switch, status)
icons/                   generated PNGs
tools/make-icons.py      icon source (Pillow)
userscripts/fsb.user.js  standalone userscript equivalent
```

## Development

There is no bundler. Edit, then hit **Reload** on the extension card and refresh the page.

Sanity checks:

```sh
node --check src/content.js src/background.js src/popup/popup.js
python3 tools/make-icons.py    # only after changing the icon source
```

Useful verification steps on a live page:

```js
document.elementsFromPoint(innerWidth / 2, innerHeight / 2).map(e => e.tagName + '#' + e.id)
getComputedStyle(document.getElementById('dontfoid')).pointerEvents   // "none"
```

Then click once with the DevTools console open: there must be no new tab and no
`removeChild` error.

## Permissions & privacy

| Permission | Why |
| --- | --- |
| `storage` | Remember your switches. |
| `activeTab` | Let the popup read the current tab's host. |
| `host_permissions` for `*.fsonline.app` | Inject at document_start. |

The extension makes **no network requests** and collects nothing. All state stays in
`chrome.storage.local`. There are no remote config files and no update pings.

## Known limitations

- Only exact hosts listed in `config.js` are touched. A new subdomain needs an entry.
- `window.open` is blocked wholesale on matched hosts. A site feature that legitimately opens
  a window will need Shift-click; per-origin allowlisting is a future improvement.
- Selectors and zone ids are specific to the current ad deployment. If the site rotates them,
  the CSS files need updating — that is a maintenance reality with ad code, not a bug.
- Not affiliated with fsonline.app or Adsterra.

## License

MIT — see [LICENSE](LICENSE).
