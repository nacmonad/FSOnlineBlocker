const KEY = 'fsb';
const DEFAULTS = { enabled: true, sites: {} };

const $ = (id) => document.getElementById(id);

let host = null;

async function currentHost() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:/.test(tab.url)) return null;
  try {
    return new URL(tab.url).hostname;
  } catch {
    return null;
  }
}

function render(state) {
  const master = state.enabled !== false;
  const site = master && host ? state.sites?.[host] !== false : false;

  $('master').checked = master;
  $('site').checked = site;
  $('site-row').hidden = !host;
  $('site-label').textContent = host || 'This site';

  const status = $('status');
  status.className = '';
  if (!master) {
    status.textContent = 'Paused everywhere';
  } else if (!host) {
    status.textContent = 'Not a web page';
  } else if (!site) {
    status.textContent = 'Off for this site';
    status.className = 'off';
  } else {
    status.textContent = 'Blocking popunders';
    status.className = 'on';
  }
}

async function save(mutate) {
  const stored = (await chrome.storage.local.get(KEY))[KEY] || {};
  const next = { ...DEFAULTS, ...stored, sites: { ...(stored.sites || {}) } };
  mutate(next);
  await chrome.storage.local.set({ [KEY]: next });
  render(next);
}

(async () => {
  host = await currentHost();
  $('version').textContent = 'v' + chrome.runtime.getManifest().version;

  const stored = (await chrome.storage.local.get(KEY))[KEY] || {};
  render({ ...DEFAULTS, ...stored });

  $('master').addEventListener('change', (e) => {
    save((next) => {
      next.enabled = e.target.checked;
    });
  });

  $('site').addEventListener('change', (e) => {
    if (!host) return;
    save((next) => {
      next.sites[host] = e.target.checked;
    });
  });
})();
