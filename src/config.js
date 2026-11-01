/**
 * Per-site rules.
 *
 * Every entry is keyed by exact hostname. The matching in manifest.json is
 * deliberately broad (`https://*.fsonline.app/*`) so a site can be added here
 * without touching the manifest, and `content.js` gates on the hostname.
 *
 * Fields:
 *   label         Human-readable name shown in the popup.
 *   trapSelectors CSS selectors for invisible click-trap overlays. They are kept
 *                 in the DOM and merely made click-through, because the ad code
 *                 holds references and throws when they vanish.
 *   blockOpen     Neutralise window.open (the actual popunder mechanism).
 *   unlockScroll  Undo inline overflow:hidden used to freeze the page.
 *   removeSelectors  Optional: selectors that are safe to delete outright.
 */

/* eslint-disable no-unused-vars */
const FSB_SITES = {
  'www3.fsonline.app': {
    label: 'fsonline.app',
    trapSelectors: ['#dontfoid', '[znid]'],
    blockOpen: true,
    unlockScroll: true,
    removeSelectors: [],
    notes: 'Adsterra aclib (zone 11692342) served from /q7m3x9.js',
  },
};
