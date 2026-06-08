'use strict';

const express = require('express');
const { hashTeamCode } = require('./team-code.js');
const { createBearerAuthMiddleware } = require('./bearer-auth.js');
const { redactAuthBody } = require('./redact-secrets.js');
const { resolveHostUrlForClient } = require('./lan-request-host.js');

function auditLanSecurity(eventType, meta = {}) {
  const dbManager =
    typeof globalThis !== 'undefined' && globalThis.__rplusDbManager
      ? globalThis.__rplusDbManager
      : null;
  if (!dbManager || !dbManager.isUnlocked()) return;
  dbManager
    .withTransaction((_db, { audit }) => {
      audit('desktop-host', eventType, meta);
    })
    .catch(() => {});
}

function createAuthRouter({
  ticketStore,
  shiftPinStore,
  wardHostRegistry,
  getHostToken,
  getHostUrl,
  getRequiresMigrationNotice,
}) {
  const r = express.Router();
  const getState = () => ({ teamCodeHash: hashTeamCode(getHostToken()) });
  const bearerAuth = createBearerAuthMiddleware(getState, {
    onAuthFail: () => auditLanSecurity('lan.auth.fail', { reason: 'invalid_token' }),
  });

  /** Unauthenticated subnet discovery (no roster data). */
  r.get('/beacon', (_req, res) => {
    const shift = shiftPinStore && typeof shiftPinStore.getStatus === 'function'
      ? shiftPinStore.getStatus()
      : null;
    res.json({
      ok: true,
      lan: true,
      shiftPinActive: !!shift,
    });
  });

  r.get('/auth/ward-host-hints', bearerAuth, (_req, res) => {
    if (!wardHostRegistry || typeof wardHostRegistry.getHintsForExchange !== 'function') {
      return res.json({ hostUrls: [], prefixes: [] });
    }
    try {
      res.json(wardHostRegistry.getHintsForExchange());
    } catch (e) {
      console.error('[auth/ward-host-hints]', e && e.message);
      res.status(500).json({ error: 'ward_host_hints_failed' });
    }
  });

  r.get('/auth/shift-pin', bearerAuth, (_req, res) => {
    if (!shiftPinStore) {
      return res.status(503).json({ error: 'shift_pin_unavailable' });
    }
    try {
      const body = shiftPinStore.ensure();
      auditLanSecurity('lan.shift_pin.ensure', {});
      res.json(body);
    } catch (e) {
      console.error('[auth/shift-pin]', e && e.message);
      res.status(500).json({ error: 'shift_pin_failed' });
    }
  });

  r.post('/auth/shift-pin/regenerate', bearerAuth, (_req, res) => {
    if (!shiftPinStore || typeof shiftPinStore.regenerate !== 'function') {
      return res.status(503).json({ error: 'shift_pin_unavailable' });
    }
    try {
      const body = shiftPinStore.regenerate();
      auditLanSecurity('lan.shift_pin.regenerate', {});
      res.json(body);
    } catch (e) {
      console.error('[auth/shift-pin/regenerate]', e && e.message);
      res.status(500).json({ error: 'shift_pin_failed' });
    }
  });

  r.post('/auth/tickets', bearerAuth, (_req, res) => {
    try {
      const { ticketId, pin, expiresAt } = ticketStore.mint();
      auditLanSecurity('lan.ticket.mint', {});
      const hostUrl = resolveHostUrlForClient(_req, getHostUrl);
      res.json({
        ticketId,
        pin,
        expiresAt,
        joinUrl: `${hostUrl}/join/${ticketId}`,
      });
    } catch (e) {
      console.error('[auth/tickets]', e && e.message);
      res.status(500).json({ error: 'ticket_mint_failed' });
    }
  });

  r.post('/auth/exchange', express.json(), (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const hasTicket = body.ticket != null && String(body.ticket).trim() !== '';
    const hasPin = body.pin != null && String(body.pin).trim() !== '';
    const hasShiftPin = body.shiftPin != null && String(body.shiftPin).trim() !== '';
    const credCount = [hasTicket, hasPin, hasShiftPin].filter(Boolean).length;

    if (credCount > 1) {
      auditLanSecurity('lan.auth.fail', { reason: 'ambiguous_credentials' });
      return res.status(400).json({ error: 'ambiguous_credentials' });
    }
    if (credCount === 0) {
      auditLanSecurity('lan.auth.fail', { reason: 'missing_credentials' });
      return res.status(400).json({ error: 'missing_credentials' });
    }

    try {
      let result = null;
      if (hasShiftPin) {
        if (!shiftPinStore || typeof shiftPinStore.exchange !== 'function') {
          return res.status(503).json({ error: 'shift_pin_unavailable' });
        }
        result = shiftPinStore.exchange(String(body.shiftPin).trim());
        if (!result || !result.token) {
          auditLanSecurity('lan.auth.fail', { reason: 'invalid_shift_pin' });
          return res.status(401).json({ error: 'invalid_shift_pin' });
        }
        auditLanSecurity('lan.shift_pin.exchange', {});
      } else {
        result = ticketStore.exchange({
          ticket: hasTicket ? String(body.ticket).trim() : undefined,
          pin: hasPin ? String(body.pin).trim() : undefined,
        });

        if (!result || !result.token) {
          auditLanSecurity('lan.auth.fail', { reason: 'invalid_ticket' });
          return res.status(401).json({ error: 'invalid_ticket' });
        }
        auditLanSecurity('lan.ticket.exchange', {});
      }

      const hostUrl = resolveHostUrlForClient(req, getHostUrl);
      if (wardHostRegistry && typeof wardHostRegistry.recordUrl === 'function' && hostUrl) {
        try {
          wardHostRegistry.recordUrl(hostUrl, { source: 'host' });
        } catch (_rec) {}
      }
      const wardHostHints =
        wardHostRegistry && typeof wardHostRegistry.getHintsForExchange === 'function'
          ? wardHostRegistry.getHintsForExchange()
          : null;
      res.json({
        token: result.token,
        hostUrl,
        persist: true,
        storageTarget: 'userData',
        ...(wardHostHints ? { wardHostHints } : {}),
      });
    } catch (e) {
      console.error('[auth/exchange]', redactAuthBody(body), e && e.message);
      res.status(500).json({ error: 'exchange_failed' });
    }
  });

  r.get('/host-status', bearerAuth, (_req, res) => {
    res.json({
      ok: true,
      requiresMigrationNotice: Boolean(getRequiresMigrationNotice()),
      lan: true,
    });
  });

  return r;
}

module.exports = { createAuthRouter, auditLanSecurity };
