'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { broadcastEquipos } = require('./equipos-router-broadcast.js');
const { loadEquiposEsm } = require('./equipos-router-ws.js');

function createPostLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: 'rate_limited', message: 'Demasiadas solicitudes.' }),
  });
}

/**
 * @param {object} r express Router
 * @param {object} ctx
 */
function mountEquiposReadRoutes(r, ctx) {
  r.get('/ping', async (_req, res) => {
    const db = ctx.getDb?.();
    let lease = null;
    if (db) {
      const mod = await loadEquiposEsm();
      const row = mod.getEquiposHostLease(db);
      if (row) {
        lease = { mode: row.mode, rank: row.holder_rank, hostUrl: row.host_url };
      }
    }
    res.json({ ok: true, equipos: true, lease });
  });

  r.get('/board', ctx.authEquipos, (req, res) => {
    const board = req.equiposMod.buildEquiposBoard(req.equiposDb);
    res.json({ ok: true, ...board });
  });

  r.get('/reports', ctx.authEquipos, (req, res) => {
    const adminKey = String(req.headers['x-equipos-admin-key'] || '').trim();
    const expected = String(process.env.EQUIPOS_ADMIN_KEY || '').trim();
    if (!expected || adminKey !== expected) {
      return res.status(403).json({
        error: 'admin_required',
        message: 'Se requiere clave de administrador.',
      });
    }
    const since = req.equiposMod.equiposHistorySinceIso();
    const sessions = req.equiposMod.listEquiposSessionsPaged(req.equiposDb, { since, limit: 100 });
    const reports = req.equiposMod.listEquiposTeamReportsPaged(req.equiposDb, { since, limit: 100 });
    res.json({ ok: true, sessions, reports });
  });
}

/**
 * @param {object} r express Router
 * @param {object} ctx
 */
function mountEquiposCustodyRoutes(r, ctx) {
  const postLimiter = createPostLimiter();
  const notifyBoard = () => broadcastEquipos({ type: 'board-changed' });

  r.post('/checkout', postLimiter, express.json({ limit: '3mb' }), ctx.authEquipos, async (req, res) => {
    try {
      let pickupPhotoId = null;
      if (req.body?.photoBase64) {
        pickupPhotoId = await ctx.savePhotoFromBase64(req.body.photoBase64, {
          deviceType: req.body.deviceType,
          photoKind: 'pickup',
        });
      }
      const out = req.equiposMod.equiposCheckout(req.equiposDb, {
        deviceType: req.body.deviceType,
        reporterName: req.body.reporterName,
        rotation: req.body.rotation,
        pickupChargePct: req.body.pickupChargePct,
        pickupPhotoId,
      });
      notifyBoard();
      res.json({ ok: true, ...out });
    } catch (e) {
      ctx.handleEquiposErr(res, e);
    }
  });

  r.post('/return', postLimiter, express.json({ limit: '3mb' }), ctx.authEquipos, async (req, res) => {
    try {
      let returnPhotoId = null;
      if (req.body?.photoBase64) {
        returnPhotoId = await ctx.savePhotoFromBase64(req.body.photoBase64, {
          deviceType: req.body.deviceType,
          photoKind: 'return',
        });
      }
      const out = req.equiposMod.equiposReturn(req.equiposDb, {
        deviceType: req.body.deviceType,
        reporterName: req.body.reporterName,
        rotation: req.body.rotation,
        chargePct: req.body.chargePct,
        gelEmpty: req.body.gelEmpty,
        returnPhotoId,
        adminForce: !!req.body.adminForce,
      });
      notifyBoard();
      res.json({ ok: true, ...out });
    } catch (e) {
      ctx.handleEquiposErr(res, e);
    }
  });

  r.post('/waitlist/join', postLimiter, express.json({ limit: '16kb' }), ctx.authEquipos, (req, res) => {
    try {
      const out = req.equiposMod.equiposWaitlistJoin(req.equiposDb, req.body);
      notifyBoard();
      res.json({ ok: true, ...out });
    } catch (e) {
      ctx.handleEquiposErr(res, e);
    }
  });

  r.post('/waitlist/leave', postLimiter, express.json({ limit: '16kb' }), ctx.authEquipos, (req, res) => {
    try {
      req.equiposMod.equiposWaitlistLeave(req.equiposDb, req.body);
      notifyBoard();
      res.json({ ok: true });
    } catch (e) {
      ctx.handleEquiposErr(res, e);
    }
  });
}

/**
 * @param {object} r express Router
 * @param {object} ctx
 */
function mountEquiposAlertRoutes(r, ctx) {
  const postLimiter = createPostLimiter();
  const notifyBoard = () => broadcastEquipos({ type: 'board-changed' });

  r.post('/alert', postLimiter, express.json({ limit: '3mb' }), ctx.authEquipos, async (req, res) => {
    try {
      let photoId = null;
      if (req.body?.photoBase64) {
        photoId = await ctx.savePhotoFromBase64(req.body.photoBase64, {
          deviceType: req.body.deviceType,
          photoKind: 'alert',
        });
      }
      const out = req.equiposMod.equiposCreateAlert(req.equiposDb, {
        deviceType: req.body.deviceType,
        reporterName: req.body.reporterName,
        rotation: req.body.rotation,
        kind: req.body.kind,
        message: req.body.message,
        photoId,
      });
      notifyBoard();
      res.json({ ok: true, ...out });
    } catch (e) {
      ctx.handleEquiposErr(res, e);
    }
  });

  r.post('/alert/:id/ack', postLimiter, express.json({ limit: '16kb' }), ctx.authEquipos, (req, res) => {
    try {
      req.equiposMod.equiposAckAlert(req.equiposDb, req.params.id, req.body);
      notifyBoard();
      res.json({ ok: true });
    } catch (e) {
      ctx.handleEquiposErr(res, e);
    }
  });
}

module.exports = { mountEquiposReadRoutes, mountEquiposCustodyRoutes, mountEquiposAlertRoutes, createPostLimiter };
