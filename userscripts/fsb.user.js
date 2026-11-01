// ==UserScript==
// @name         FSonline popunder & click-trap killer
// @namespace    fsonline.kill
// @version      1.0.0
// @description  Kills the Adsterra (aclib) popunder, its transparent full-screen click-trap (#dontfoid) and scroll locks on fsonline.app
// @match        https://*.fsonline.app/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

/*
 * Standalone equivalent of the extension, for browsers without extension
 * loading or for quick testing. Same two countermeasures: the trap div is made
 * click-through, and window.open is neutered.
 *
 * Shift-click passes a real popup through; Alt+K toggles for this host.
 */

(() => {
  'use strict';

  if (window.__fsbInstalled) return;
  window.__fsbInstalled = true;

  const KEY = 'fsonline.kill';
  const enabled = () => localStorage.getItem(KEY) !== 'off';

  const realOpen = window.open.bind(window);
  const fakeWindow = {
    closed: false,
    focus() {},
    blur() {},
    close() {},
    postMessage() {},
    location: { href: 'about:blank', assign() {}, replace() {} },
    document: { write() {}, close() {} },
  };

  window.open = function (url, name, features) {
    if (!enabled() || (window.event && window.event.shiftKey)) {
      return realOpen(url, name, features);
    }
    if (url) fakeWindow.location.href = String(url);
    console.debug('[FSB] blocked window.open ->', url);
    return fakeWindow;
  };

  const CSS = `
    #dontfoid,
    [znid] {
      pointer-events: none !important;
    }
    #dontfoid {
      background: transparent !important;
    }
  `;

  const injectStyle = () => {
    if (!enabled() || document.getElementById('fsb-style')) return;
    const style = document.createElement('style');
    style.id = 'fsb-style';
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  };
  injectStyle();

  const unlockScroll = () => {
    if (!enabled()) return;
    for (const el of [document.documentElement, document.body]) {
      if (!el) continue;
      if (el.style.overflow === 'hidden' || getComputedStyle(el).overflow === 'hidden') {
        el.style.setProperty('overflow', 'auto', 'important');
      }
    }
  };

  let last = 0;
  new MutationObserver(() => {
    const now = Date.now();
    if (now - last < 250) return;
    last = now;
    injectStyle();
    unlockScroll();
  }).observe(document.documentElement, { childList: true, subtree: true });

  addEventListener(
    'keydown',
    (e) => {
      if (!e.altKey || e.code !== 'KeyK') return;
      e.preventDefault();
      const nextOn = !enabled();
      localStorage.setItem(KEY, nextOn ? 'on' : 'off');
      document.getElementById('fsb-style')?.remove();
      if (nextOn) injectStyle();
      toast(`FSB ${nextOn ? 'ON' : 'OFF'}`);
    },
    true,
  );

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
      'font:13px/1.4 system-ui,sans-serif',
      'padding:8px 12px',
      'border-radius:6px',
      'opacity:.95',
      'pointer-events:none',
    ].join(';');
    (document.body || document.documentElement).appendChild(box);
    setTimeout(() => box.remove(), 1800);
  }
})();
