'use strict';

const express = require('express');
const { WebSocketServer } = require('ws');
const rateLimit = require('express-rate-limit');

/** Lazy ESM imports (Node test + server). */
let _esm;
async function esm() {
  if (_esm) return _esm;
  _esm = {
    getInternoScopeContext: (await import('../db/clinical-access-db.mjs')).getInternoScopeContext,
    getSalaInternoAccess: (await import('../db/clinical-access-db.mjs')).getSalaInternoAccess,
    verifySalaInternoToken: (await import('../db/clinical-access-db.mjs')).verifySalaInternoToken,
    normalizeInternoSala: (await import('../db/clinical-access-db.mjs')).normalizeInternoSala,
    touchActiveGuardiaVitalsCheck: (await import('../db/clinical-access-db.mjs')).touchActiveGuardiaVitalsCheck,
    loadCensusPatientIdSet: (await import('../db/clinical-access-db.mjs')).loadCensusPatientIdSet,
    filterInternoScopePatients: (await import('./interno-scope.mjs')).filterInternoScopePatients,
    resolveInternoBoardPatients: (await import('./interno-scope.mjs')).resolveInternoBoardPatients,
    resolveSalaR1GuardiaUserIds: (await import('./interno-scope.mjs')).resolveSalaR1GuardiaUserIds,
    buildInternoBoardDto: (await import('./interno-board.mjs')).buildInternoBoardDto,
    patchGuardiaPendienteComplete: (await import('./interno-pendientes.mjs'))
      .patchGuardiaPendienteComplete,
    buildInternoMedicion: (await import('./interno-vitals.mjs')).buildInternoMedicion,
    applyInternoMedicionToPatient: (await import('./interno-vitals.mjs')).applyInternoMedicionToPatient,
    salaFromSlug: (await import('./sala-slug.mjs')).salaFromSlug,
    renderQrSvg: (await import('./qr-svg.mjs')).renderQrSvg,
  };
  return _esm;
}

const AUTH_TIMEOUT_MS = 3000;
const internoRooms = new Map();

function internoRoomKey(sala) {
  return `interno:${sala}`;
}

function broadcastInterno(sala, obj) {
  const set = internoRooms.get(internoRoomKey(sala));
  if (!set) return;
  const payload = JSON.stringify(obj);
  for (const ws of set) {
    if (ws.readyState === 1) ws.send(payload);
  }
}

/**
 * @param {{
 *   store: { getState: () => { patients: object[] }, upsertPatient: (p: object, v: number) => object },
 *   getDb: () => import('better-sqlite3').Database | null,
 *   broadcastSync?: (name: string, obj: object) => void,
 *   onHostSync?: (obj: object) => void,
 *   httpServer?: import('http').Server,
 * }} deps
 */
function createInternoRouter(deps) {
  const r = express.Router();
  const postLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ error: 'rate_limited' }),
  });

  async function readBoard(sala) {
    const mod = await esm();
    const normalized = mod.normalizeInternoSala(sala);
    if (!normalized) return null;

    const db = deps.getDb?.();
    if (!db) {
      return { sala: normalized, active: false, inactive: true, summary: { total: 0 }, patients: [] };
    }

    const access = db
      .prepare('SELECT is_active FROM sala_interno_access WHERE sala = ?')
      .get(normalized);
    if (!access || access.is_active !== 1) {
      return { sala: normalized, active: false, inactive: true, summary: { total: 0 }, patients: [] };
    }

    const scope = mod.getInternoScopeContext(db);
    const activeGuardias = db
      .prepare(`SELECT * FROM active_guardias WHERE status = 'Active' ORDER BY assigned_at`)
      .all();
    const censusPatientIds = mod.loadCensusPatientIdSet(db);
    const state = deps.store.getState();
    const patients = mod.resolveInternoBoardPatients(
      state.patients || [],
      activeGuardias,
      normalized,
      scope,
      { censusPatientIds }
    );

    const guardiasByPatientId = new Map();
    for (const g of activeGuardias) {
      guardiasByPatientId.set(String(g.patient_id), g);
    }

    return mod.buildInternoBoardDto(normalized, patients, guardiasByPatientId);
  }

  async function authInterno(req, res, next) {
    try {
      const mod = await esm();
      const sala = mod.normalizeInternoSala(
        req.query.sala || req.headers['x-interno-sala'] || req.body?.sala
      );
      const token = String(
        req.headers['x-interno-token'] || req.query.t || req.body?.token || ''
      ).trim();
      if (!sala || !token) {
        return res.status(401).json({ error: 'auth_required' });
      }
      const db = deps.getDb?.();
      if (!db) {
        return res.status(503).json({ error: 'db_unavailable' });
      }
      const row = mod.getSalaInternoAccess(db, sala);
      if (!row || row.is_active !== 1) {
        return res.status(403).json({ error: 'interno_inactive' });
      }
      if (!mod.verifySalaInternoToken(db, token, sala)) {
        return res.status(403).json({ error: 'invalid_token' });
      }
      req.internoSala = sala;
      req.internoToken = token;
      next();
    } catch (e) {
      res.status(500).json({ error: e.message || 'auth_failed' });
    }
  }

  r.get('/ping', (_req, res) => {
    res.json({ ok: true, interno: true, board: 'v2' });
  });

  r.get('/qr.svg', async (req, res) => {
    try {
      const data = String(req.query.data || '').trim();
      if (!data || data.length > 2048) {
        return res.status(400).json({ error: 'data_required' });
      }
      const mod = await esm();
      res.type('image/svg+xml').send(mod.renderQrSvg(data));
    } catch (e) {
      res.status(500).json({ error: e.message || 'qr_failed' });
    }
  });

  r.get('/board', authInterno, async (req, res) => {
    try {
      const board = await readBoard(req.internoSala);
      if (!board) return res.status(400).json({ error: 'invalid_sala' });
      res.json(board);
    } catch (e) {
      res.status(500).json({ error: e.message || 'board_failed' });
    }
  });

  r.patch(
    '/patients/:patientId/pendientes/:itemId',
    postLimiter,
    express.json({ limit: '16kb' }),
    authInterno,
    async (req, res) => {
      try {
        const mod = await esm();
        const patientId = String(req.params.patientId || '').trim();
        const itemId = String(req.params.itemId || '').trim();
        if (!patientId || !itemId) {
          return res.status(400).json({ error: 'patient_or_item_required' });
        }

        const board = await readBoard(req.internoSala);
        if (!board?.active) return res.status(403).json({ error: 'interno_inactive' });
        if (!board.patients.some((p) => p.id === patientId)) {
          return res.status(403).json({ error: 'patient_out_of_scope' });
        }

        const db = deps.getDb?.();
        if (!db) return res.status(503).json({ error: 'db_unavailable' });

        const reporterName = String(req.body?.reporterName || '').trim();
        const completedBy = {
          kind: 'interno',
          ...(reporterName ? { name: reporterName } : {}),
        };

        const result = mod.patchGuardiaPendienteComplete(db, patientId, itemId, completedBy);
        if (!result.ok) {
          if (result.error === 'guardia_not_found' || result.error === 'item_not_found') {
            return res.status(404).json({ error: result.error });
          }
          return res.status(400).json({ error: result.error });
        }

        if (typeof deps.broadcastSync === 'function') {
          deps.broadcastSync('sync', { type: 'guardias-updated' });
        }
        broadcastInterno(req.internoSala, { type: 'board-changed', patientId, itemId });

        res.json({ ok: true, item: result.item });
      } catch (e) {
        res.status(500).json({ error: e.message || 'pendiente_failed' });
      }
    }
  );

  r.post('/vitals', postLimiter, express.json({ limit: '64kb' }), authInterno, async (req, res) => {
    try {
      const mod = await esm();
      const patientId = String(req.body?.patientId || '').trim();
      if (!patientId) return res.status(400).json({ error: 'patient_id_required' });

      const board = await readBoard(req.internoSala);
      if (!board?.active) return res.status(403).json({ error: 'interno_inactive' });
      if (!board.patients.some((p) => p.id === patientId)) {
        return res.status(403).json({ error: 'patient_out_of_scope' });
      }

      const built = mod.buildInternoMedicion({
        vitals: req.body?.vitals,
        glucometrias: req.body?.glucometrias,
        reporterName: req.body?.reporterName,
        sala: req.internoSala,
      });
      if (!built.ok) return res.status(400).json({ error: 'empty_medicion' });

      const state = deps.store.getState();
      const stored = (state.patients || []).find((p) => String(p.id) === patientId);
      const cur =
        stored ||
        ({
          id: patientId,
          monitoreo: { historial: [], estadoClinico: {}, confirmado: {} },
        });
      const isNewPatient = !stored;

      const nextPatient = structuredClone(cur);
      if (!nextPatient.monitoreo) {
        nextPatient.monitoreo = { historial: [], estadoClinico: {}, confirmado: {} };
      }
      const applied = mod.applyInternoMedicionToPatient(nextPatient, built.medicion);
      if (!applied.ok) return res.status(400).json({ error: 'apply_failed' });

      const updated = isNewPatient
        ? deps.store.upsertPatient(nextPatient)
        : deps.store.upsertPatient(nextPatient, Number(cur.version || 0));

      const db = deps.getDb?.();
      if (db) mod.touchActiveGuardiaVitalsCheck(db, patientId);

      const syncPayload = {
        type: 'patients-updated',
        patientId,
        monitoreo: nextPatient.monitoreo || null,
      };
      if (typeof deps.broadcastSync === 'function') {
        deps.broadcastSync('sync', syncPayload);
        deps.broadcastSync('sync', { type: 'guardias-updated', patientId });
      }
      if (typeof deps.onHostSync === 'function') {
        deps.onHostSync(syncPayload);
        deps.onHostSync({ type: 'guardias-updated', patientId });
      }
      broadcastInterno(req.internoSala, {
        type: 'board-changed',
        patientId,
        hasAlterations: built.hasAlterations,
      });

      res.json({
        ok: true,
        patientId,
        version: updated.version,
        hasAlterations: built.hasAlterations,
      });
    } catch (e) {
      if (e.code === 'CONFLICT') {
        return res.status(409).json({ error: 'conflict' });
      }
      res.status(500).json({ error: e.message || 'vitals_failed' });
    }
  });

  if (deps.httpServer) {
    attachInternoWs(deps.httpServer, deps.getDb);
  }

  return r;
}

/** @param {import('http').Server} httpServer @param {() => import('better-sqlite3').Database|null} getDb */
function attachInternoWs(httpServer, getDb) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const u = new URL(req.url || '', 'http://localhost');
      if (u.pathname !== '/api/interno/v1/ws') return;

      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.__authenticated = false;
        ws.__authTimer = setTimeout(() => {
          try {
            ws.terminate();
          } catch (_e) {
            /* ignore */
          }
        }, AUTH_TIMEOUT_MS);
        wss.emit('connection', ws, req);
      });
    } catch (_e) {
      try {
        socket.destroy();
      } catch (_inner) {
        /* ignore */
      }
    }
  });

  wss.on('connection', (ws) => {
    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg?.type === 'auth') {
          const mod = await esm();
          const sala = mod.normalizeInternoSala(msg.sala);
          const token = String(msg.token || '').trim();
          const db = typeof getDb === 'function' ? getDb() : null;
          if (!sala || !token || !db || !mod.verifySalaInternoToken(db, token, sala)) {
            ws.close(4001, 'auth_failed');
            return;
          }
          clearTimeout(ws.__authTimer);
          ws.__authenticated = true;
          ws.__sala = sala;
          const key = internoRoomKey(sala);
          if (!internoRooms.has(key)) internoRooms.set(key, new Set());
          internoRooms.get(key).add(ws);
          ws.send(JSON.stringify({ type: 'auth-ok', sala }));
          return;
        }
        if (!ws.__authenticated) {
          ws.close(4001, 'auth_required');
        }
      } catch (_e) {
        ws.close(4002, 'bad_message');
      }
    });

    ws.on('close', () => {
      if (ws.__sala) {
        const set = internoRooms.get(internoRoomKey(ws.__sala));
        if (set) {
          set.delete(ws);
          if (set.size === 0) internoRooms.delete(internoRoomKey(ws.__sala));
        }
      }
    });
  });
}

module.exports = { createInternoRouter, broadcastInterno };
