'use strict';

/**
 * Electron window.open / shell.openExternal allowlist (audit M1).
 * Mirrors open-external IPC in main.js.
 */
function isAllowedExternalUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

module.exports = { isAllowedExternalUrl };
