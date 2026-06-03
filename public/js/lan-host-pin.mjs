/** Pinned LAN host URL for the shift (IM-08). */

const PINNED_HOST_KEY = 'rpc-lan-pinned-host-url';

export function getPinnedHostUrl() {
  try {
    return String(localStorage.getItem(PINNED_HOST_KEY) || '')
      .trim()
      .replace(/\/+$/, '');
  } catch (_e) {
    return '';
  }
}

export function setPinnedHostUrl(hostUrl) {
  const url = String(hostUrl || '')
    .trim()
    .replace(/\/+$/, '');
  if (!url) {
    clearPinnedHostUrl();
    return;
  }
  try {
    localStorage.setItem(PINNED_HOST_KEY, url);
  } catch (_e) {}
}

export function clearPinnedHostUrl() {
  try {
    localStorage.removeItem(PINNED_HOST_KEY);
  } catch (_e) {}
}
