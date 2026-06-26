'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');

let pushLanMod = null;

function createPostLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: 'rate_limited', message: 'Demasiadas solicitudes.' }),
  });
}

async function getPushLanMod() {
  if (!pushLanMod) {
    pushLanMod = await import('./equipos-push-lan.mjs');
  }
  return pushLanMod;
}

function getVapidPrivateJwk() {
  return String(process.env.EQUIPOS_VAPID_PRIVATE_JWK || '').trim();
}

/**
 * @param {object} r express Router
 * @param {object} ctx
 */
function mountEquiposPushRoutes(r, ctx) {
  const postLimiter = createPostLimiter();

  r.get('/push/vapid-public-key', (_req, res) => {
    const publicKey = String(process.env.EQUIPOS_VAPID_PUBLIC_KEY || '').trim();
    if (!publicKey) {
      return res.status(503).json({
        error: 'push_unconfigured',
        message: 'Notificaciones no configuradas en el anfitrión.',
      });
    }
    res.json({ ok: true, publicKey });
  });

  r.post('/push/subscribe', postLimiter, express.json({ limit: '8kb' }), ctx.authEquipos, async (req, res) => {
    try {
      const push = await getPushLanMod();
      const mod = req.equiposMod;
      const deviceType = mod.normalizeEquiposDeviceType(req.body?.deviceType);
      const name = mod.normalizeReporterName(req.body?.reporterName);
      const rot = mod.normalizeEquiposRotation(req.body?.rotation);
      if (!deviceType || !name || !rot) {
        return res.status(400).json({ error: 'invalid_input', message: 'Datos inválidos.' });
      }
      const inQueue = req.equiposDb
        .prepare(
          `SELECT 1 AS x FROM equipos_waitlist
           WHERE device_type = ? AND reporter_name = ? AND rotation = ?`
        )
        .get(deviceType, name, rot);
      if (!inQueue) {
        return res.status(400).json({
          error: 'not_in_queue',
          message: 'Debes estar en la cola para activar notificaciones.',
        });
      }
      const endpoint = String(req.body?.endpoint || '').trim();
      const p256dh = String(req.body?.p256dh || req.body?.keys?.p256dh || '').trim();
      const auth = String(req.body?.auth || req.body?.keys?.auth || '').trim();
      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ error: 'invalid_subscription', message: 'Suscripción inválida.' });
      }
      const out = push.upsertPushSubscriptionSync(req.equiposDb, {
        endpoint,
        p256dh,
        auth,
        reporterName: name,
        rotation: rot,
        deviceType,
      });
      res.json({ ok: true, ...out });
    } catch (e) {
      ctx.handleEquiposErr(res, e);
    }
  });

  r.post('/push/unsubscribe', postLimiter, express.json({ limit: '8kb' }), ctx.authEquipos, async (req, res) => {
    try {
      const push = await getPushLanMod();
      const mod = req.equiposMod;
      const deviceType = mod.normalizeEquiposDeviceType(req.body?.deviceType);
      const name = mod.normalizeReporterName(req.body?.reporterName);
      const rot = mod.normalizeEquiposRotation(req.body?.rotation);
      const endpoint = String(req.body?.endpoint || '').trim();
      if (!deviceType || !name || !rot || !endpoint) {
        return res.status(400).json({ error: 'invalid_input', message: 'Datos inválidos.' });
      }
      const removed = push.removePushSubscriptionSync(req.equiposDb, {
        endpoint,
        deviceType,
        reporterName: name,
        rotation: rot,
      });
      res.json({ ok: true, removed });
    } catch (e) {
      ctx.handleEquiposErr(res, e);
    }
  });
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {'device_available'|'lumify_return'|'malfunction'|'missing_material'|'waitlist_next'} kind
 * @param {object} pushCtx
 */
async function scheduleLanPush(db, kind, pushCtx) {
  const jwk = getVapidPrivateJwk();
  if (!jwk) return;
  const push = await getPushLanMod();
  void push.notifyEquiposWaitlistSync(db, kind, pushCtx, jwk).catch((e) => {
    console.error('[equipos-push]', e?.message || e);
  });
}

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} deviceType
 */
async function scheduleLanWaitlistHeadPush(db, deviceType) {
  const jwk = getVapidPrivateJwk();
  if (!jwk) return;
  const push = await getPushLanMod();
  void push.notifyEquiposWaitlistHeadSync(db, deviceType, jwk).catch((e) => {
    console.error('[equipos-push]', e?.message || e);
  });
}

module.exports = { mountEquiposPushRoutes, scheduleLanPush, scheduleLanWaitlistHeadPush, getVapidPrivateJwk };
