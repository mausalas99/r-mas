import { buildPushHTTPRequest } from '@pushforge/builder';

/**
 * @param {object} subscription
 * @param {string} subscription.endpoint
 * @param {string} subscription.p256dh
 * @param {string} subscription.auth
 * @param {object} payload Notification JSON for the service worker
 * @param {string|object} vapidPrivateJwk JSON JWK string or object
 */
export async function sendEquiposWebPush(subscription, payload, vapidPrivateJwk) {
  const privateJWK =
    typeof vapidPrivateJwk === 'string' ? JSON.parse(vapidPrivateJwk) : vapidPrivateJwk;

  const { endpoint, headers, body } = await buildPushHTTPRequest({
    privateJWK,
    subscription: {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    message: {
      payload,
      adminContact: 'mailto:equipos@rmas.local',
      options: { ttl: 86400, urgency: 'high' },
    },
  });

  const res = await fetch(endpoint, { method: 'POST', headers, body });
  return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
}
