/**
 * FSonline Popunder Blocker — content script.
 *
 * Runs at document_start on hosts listed in config.js. Two independent jobs:
 *
 *  1. Neutralise the popunder. The ad library installs a document-level click
 *     listener that calls window.open(url, '_blank', 'noopener,noreferrer') on
 *     every click. window.open is wrapped so the call still happens and callers
 *     receive a plausible object, but no tab is created.
 *
 *  2. Make the click-trap click-through. The ad library paints a transparent,
 *     empty, fixed, full-viewport div over the page; CSS (sites.css) disables
 *     its pointer events so links receive clicks again.
 *
 * Nothing here is site-specific by accident: selectors and switches come from
 * FSB_SITES (config.js).
 */

(() => {
  'use strict';

  const HOST = location.hostname;
  const SITE = FSB_SITES[HOST];
  if (!SITE) return;

  const KEY = 'fsb';
  const DEFAULTS = { enabled: true, sites: {} };

  // Defaults are permissive so protection works during the few ms before the
  // asynchronous storage read completes.
  let masterOn = true;
  let siteOn = true;
  let observedAt = 0;

  /* ------------------------------------------------------------------ *
   * window.open
   * ------------------------------------------------------------------ */

  const realOpen = window.__fsbRealOpen || window.open.bind(window);
  window.__fsbRealOpen = realOpen;

  // Plausible enough that code touching the result does not throw.
  const fakeWindow = {
    closed: false,
    focus() {},
    blur() {},
    close() {},
    postMessage() {},
    location: { href: 'about:blank', assign() {}, replace() {} },
    document: { write() {}, close() {} },
  };

  const allowed = () => masterOn && siteOn;

  if (SITE.blockOpen && !window.__fsbPatched) {
    window.__fsbPatched = true;
    window.open = function (url, name, features) {
      // Shift-click always lets a real popup through.
      if (!allowed() || (window.event && window.event.shiftKey)) {
        return realOpen(url, name, features);
      }
      if (url) fakeWindow.location.href = String(url);
      console.debug('[FSB] blocked window.open ->', url);
      return fakeWindow;
    };
  }

  /* ------------------------------------------------------------------ *
   * Scroll locks
   * ------------------------------------------------------------------ */

  const unlockScroll = () => {
    if (!SITE.unlockScroll || !allowed()) return;
    for (const el of [document.documentElement, document.body]) {
      if (!el) continue;
      const inline = el.style.overflow;
      if (inline === 'hidden' || (!inline && getComputedStyle(el).overflow === 'hidden')) {
        el.style.setProperty('overflow', 'auto', 'important');
      }
    }
  };

  /* ------------------------------------------------------------------ *
   * Late traps
   * ------------------------------------------------------------------ */

  const sweep = () => {
    if (!allowed()) return;
    unlockScroll();
    for (const sel of SITE.removeSelectors || []) {
      for (const el of document.querySelectorAll(sel)) el.remove();
    }
  };

  // Cheap debounce: ad code mutates a lot, and this runs for every batch.
  const onMutate = () => {
    const now = Date.now();
    if (now - observedAt < 250) return;
    observedAt = now;
    sweep();
  };

  new MutationObserver(onMutate).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class'],
  });

  /* ------------------------------------------------------------------ *
   * State
   * ------------------------------------------------------------------ */

  const apply = () => {
    const on = allowed();
    document.documentElement.toggleAttribute('data-fsb-off', !on);
    if (on) sweep();
    report();
  };

  const load = async () => {
    const stored = (await chrome.storage.local.get(KEY))[KEY] || {};
    const settings = { ...DEFAULTS, ...stored, sites: { ...DEFAULTS.sites, ...(stored.sites || {}) } };
    masterOn = settings.enabled !== false;
    siteOn = settings.sites[HOST] !== false;
    apply();
  };

  const toggleSite = async () => {
    const stored = (await chrome.storage.local.get(KEY))[KEY] || {};
    const sites = { ...(stored.sites || {}) };
    sites[HOST] = sites[HOST] === false;
    await chrome.storage.local.set({ [KEY]: { ...DEFAULTS, ...stored, sites } });
    siteOn = sites[HOST];
    apply();
    toast(`FSB ${siteOn ? 'ON' : 'OFF'} for ${HOST}`);
  };

  const report = () => {
    chrome.runtime.sendMessage({ type: 'fsb:state', host: HOST, enabled: allowed() }).catch(() => {});
  };

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[KEY]) return;
    const next = changes[KEY].newValue || {};
    masterOn = next.enabled !== false;
    siteOn = (next.sites || {})[HOST] !== false;
    apply();
  });

  addEventListener(
    'keydown',
    (e) => {
      if (!e.altKey || e.code !== 'KeyK') return;
      e.preventDefault();
      toggleSite();
    },
    true,
  );

  /* ------------------------------------------------------------------ *
   * Toast
   * ------------------------------------------------------------------ */

  function toast(msg) {
    const box = document.createElement('div');
    box.textContent = msg;
    box.style.cssText = [
      'position:fixed',
      'left:12px',
      'bottom:12px',
      'z-index:2147483647',
      'background:#0f172a',
      'color:#f8fafc',
      'font:13px/1.4 ui-sans-serif,system-ui,sans-serif',
      'padding:8px 12px',
      'border-radius:6px',
      'box-shadow:0 4px 12px rgb(0 0 0 / .3)',
      'opacity:.95',
      'pointer-events:none',
    ].join(';');
    (document.body || document.documentElement).appendChild(box);
    setTimeout(() => box.remove(), 1800);
  }

  load();
})();
