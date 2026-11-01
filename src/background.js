/**
 * Service worker: defaults, badge, and clearing the badge on navigation.
 */

const KEY = 'fsb';
const DEFAULTS = { enabled: true, sites: {} };

const BADGE_ON = { text: 'ON', color: '#16a34a' };
const BADGE_OFF = { text: 'OFF', color: '#64748b' };

async function paint(tabId, enabled) {
  const badge = enabled ? BADGE_ON : BADGE_OFF;
  try {
    await chrome.action.setBadgeText({ tabId, text: badge.text });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color });
    await chrome.action.setBadgeTextColor?.({ tabId, color: '#ffffff' });
  } catch {
    /* tab may have gone */
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = (await chrome.storage.local.get(KEY))[KEY];
  if (!stored) await chrome.storage.local.set({ [KEY]: DEFAULTS });
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === 'fsb:state' && sender.tab?.id != null) {
    paint(sender.tab.id, msg.enabled);
  }
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading') chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
});
