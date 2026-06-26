import { newEquiposId } from './constants.js';
import { buildEquiposPushPayload } from '../../../lib/equipos/equipos-push-messages.mjs';
import { sendEquiposWebPush } from '../../../lib/equipos/equipos-webpush.mjs';

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} deviceType */
async function listWaitlistRows(db, deviceType) {
  const { results } = await db
    .prepare(
      `SELECT reporter_name, rotation, position FROM equipos_waitlist
       WHERE device_type = ? ORDER BY position ASC`
    )
    .bind(deviceType)
    .all();
  return results || [];
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} deviceType @param {string} name @param {string} rot */
async function listPushSubsForWaiter(db, deviceType, name, rot) {
  const { results } = await db
    .prepare(
      `SELECT id, endpoint, p256dh, auth FROM equipos_push_subscriptions
       WHERE device_type = ? AND reporter_name = ? AND rotation = ?`
    )
    .bind(deviceType, name, rot)
    .all();
  return results || [];
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {string} subId */
async function deletePushSub(db, subId) {
  await db.prepare(`DELETE FROM equipos_push_subscriptions WHERE id = ?`).bind(subId).run();
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {object} input */
export async function upsertPushSubscription(db, input) {
  const now = new Date().toISOString();
  const existing = await db
    .prepare(`SELECT id FROM equipos_push_subscriptions WHERE endpoint = ? AND device_type = ?`)
    .bind(input.endpoint, input.deviceType)
    .first();

  if (existing?.id) {
    await db
      .prepare(
        `UPDATE equipos_push_subscriptions SET
          p256dh = ?, auth = ?, reporter_name = ?, rotation = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(input.p256dh, input.auth, input.reporterName, input.rotation, now, existing.id)
      .run();
    return { id: existing.id, updated: true };
  }

  const id = newEquiposId();
  await db
    .prepare(
      `INSERT INTO equipos_push_subscriptions (
        id, endpoint, p256dh, auth, reporter_name, rotation, device_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.endpoint,
      input.p256dh,
      input.auth,
      input.reporterName,
      input.rotation,
      input.deviceType,
      now,
      now
    )
    .run();
  return { id, updated: false };
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {object} input */
export async function removePushSubscription(db, input) {
  const res = await db
    .prepare(
      `DELETE FROM equipos_push_subscriptions
       WHERE endpoint = ? AND device_type = ? AND reporter_name = ? AND rotation = ?`
    )
    .bind(input.endpoint, input.deviceType, input.reporterName, input.rotation)
    .run();
  return (res.meta?.changes || 0) > 0;
}

/** @param {import('@cloudflare/workers-types').D1Database} db @param {object} input */
export async function clearPushSubsForWaiter(db, input) {
  await db
    .prepare(
      `DELETE FROM equipos_push_subscriptions
       WHERE device_type = ? AND reporter_name = ? AND rotation = ?`
    )
    .bind(input.deviceType, input.reporterName, input.rotation)
    .run();
}

/**
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {'device_available'|'lumify_return'|'malfunction'|'missing_material'|'waitlist_next'} kind
 * @param {object} ctx
 * @param {string} vapidPrivateJwk
 */
export async function notifyEquiposWaitlist(db, kind, ctx, vapidPrivateJwk) {
  if (!vapidPrivateJwk) return { sent: 0, pruned: 0 };
  const waitlist = await listWaitlistRows(db, ctx.deviceType);
  if (!waitlist.length) return { sent: 0, pruned: 0 };

  let sent = 0;
  let pruned = 0;

  for (let i = 0; i < waitlist.length; i++) {
    const row = waitlist[i];
    const isNext = i === 0;
    const payload = buildEquiposPushPayload(kind, {
      deviceType: ctx.deviceType,
      position: i + 1,
      isNext,
      chargePct: ctx.chargePct,
      message: ctx.message,
    });
    const subs = await listPushSubsForWaiter(db, ctx.deviceType, row.reporter_name, row.rotation);
    for (const sub of subs) {
      try {
        const result = await sendEquiposWebPush(sub, payload, vapidPrivateJwk);
        if (result.gone) {
          await deletePushSub(db, sub.id);
          pruned += 1;
        } else if (result.ok) {
          sent += 1;
        }
      } catch (_e) {
        void _e;
      }
    }
  }

  return { sent, pruned };
}

/**
 * @param {import('@cloudflare/workers-types').D1Database} db
 * @param {string} deviceType
 * @param {string} vapidPrivateJwk
 */
export async function notifyEquiposWaitlistHead(db, deviceType, vapidPrivateJwk) {
  if (!vapidPrivateJwk) return { sent: 0, pruned: 0 };
  const waitlist = await listWaitlistRows(db, deviceType);
  if (!waitlist.length) return { sent: 0, pruned: 0 };

  const row = waitlist[0];
  const payload = buildEquiposPushPayload('waitlist_next', { deviceType, isNext: true });
  let sent = 0;
  let pruned = 0;
  const subs = await listPushSubsForWaiter(db, deviceType, row.reporter_name, row.rotation);
  for (const sub of subs) {
    try {
      const result = await sendEquiposWebPush(sub, payload, vapidPrivateJwk);
      if (result.gone) {
        await deletePushSub(db, sub.id);
        pruned += 1;
      } else if (result.ok) {
        sent += 1;
      }
    } catch (_e) {
      void _e;
    }
  }
  return { sent, pruned };
}

/**
 * Fire-and-forget push dispatch (never blocks API response).
 * @param {import('@cloudflare/workers-types').ExecutionContext} [execCtx]
 */
export function scheduleEquiposWaitlistHeadPush(db, execCtx, deviceType, vapidPrivateJwk) {
  const task = notifyEquiposWaitlistHead(db, deviceType, vapidPrivateJwk).catch((e) => {
    console.error('[equipos-push]', e?.message || e);
  });
  if (execCtx?.waitUntil) execCtx.waitUntil(task);
  else void task;
}

/**
 * Fire-and-forget push dispatch (never blocks API response).
 * @param {import('@cloudflare/workers-types').ExecutionContext} [execCtx]
 */
export function scheduleEquiposPush(db, execCtx, kind, ctx, vapidPrivateJwk) {
  const task = notifyEquiposWaitlist(db, kind, ctx, vapidPrivateJwk).catch((e) => {
    console.error('[equipos-push]', e?.message || e);
  });
  if (execCtx?.waitUntil) execCtx.waitUntil(task);
  else void task;
}
