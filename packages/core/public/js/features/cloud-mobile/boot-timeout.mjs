/** Max wait for active-room lookup before showing login/join again. */
export const CLOUD_MOBILE_ROOM_RESOLVE_TIMEOUT_MS = 12_000;

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} [label]
 * @returns {Promise<T>}
 */
export function withCloudMobileBootTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise(function (_resolve, reject) {
      setTimeout(function () {
        reject(new Error(label || 'cloud_mobile_boot_timeout'));
      }, ms);
    }),
  ]);
}
