/** Web Push registration for equipos waitlist. */

import { equiposFetch } from './equipos-api.mjs';

const SW_URL = '/equipos-sw.js?v=12';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function registerEquiposServiceWorker() {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: '/' });
  } catch (_e) {
    return null;
  }
}

/**
 * @param {string} apiBase
 * @param {string} token
 */
export async function fetchVapidPublicKey(apiBase, token) {
  try {
    const data = await equiposFetch(apiBase, token, '/push/vapid-public-key');
    return data.publicKey || null;
  } catch (_e) {
    return null;
  }
}

/**
 * @param {ServiceWorkerRegistration} reg
 * @param {string} publicKey
 */
async function subscribePush(reg, publicKey) {
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  return sub;
}

/**
 * Activate push when user joins a device queue.
 * @param {object} opts
 * @param {string} opts.apiBase
 * @param {string} opts.token
 * @param {string} opts.deviceType
 * @param {string} opts.reporterName
 * @param {string} opts.rotation
 */
export async function enableQueuePush(opts) {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  const reg = (await navigator.serviceWorker.ready) || (await registerEquiposServiceWorker());
  if (!reg) return { ok: false, reason: 'no_sw' };

  const publicKey = await fetchVapidPublicKey(opts.apiBase, opts.token);
  if (!publicKey) return { ok: false, reason: 'unconfigured' };

  const sub = await subscribePush(reg, publicKey);
  const json = sub.toJSON();
  await equiposFetch(opts.apiBase, opts.token, '/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceType: opts.deviceType,
      reporterName: opts.reporterName,
      rotation: opts.rotation,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    }),
  });
  return { ok: true };
}

/**
 * @param {object} opts
 */
export async function disableQueuePush(opts) {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    try {
      await equiposFetch(opts.apiBase, opts.token, '/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceType: opts.deviceType,
          reporterName: opts.reporterName,
          rotation: opts.rotation,
          endpoint: sub.endpoint,
        }),
      });
    } catch (_e) {
      void _e;
    }
  }
}
