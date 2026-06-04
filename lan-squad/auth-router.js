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
  getHostToken,
  getHostUrl,
  getRequiresMigrationNotice,
}) {
  const r = express.Router();
  const getState = () => ({ teamCodeHash: hashTeamCode(getHostToken()) });
  const bearerAuth = createBearerAuthMiddleware(getState, {
    onAuthFail: () => auditLanSecurity('lan.auth.fail', { reason: 'invalid_token' }),
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

    if (hasTicket && hasPin) {
      auditLanSecurity('lan.auth.fail', { reason: 'ambiguous_credentials' });
      return res.status(400).json({ error: 'ambiguous_credentials' });
    }
    if (!hasTicket && !hasPin) {
      auditLanSecurity('lan.auth.fail', { reason: 'missing_credentials' });
      return res.status(400).json({ error: 'missing_credentials' });
    }

    try {
      const result = ticketStore.exchange({
        ticket: hasTicket ? String(body.ticket).trim() : undefined,
        pin: hasPin ? String(body.pin).trim() : undefined,
      });

      if (!result || !result.token) {
        auditLanSecurity('lan.auth.fail', { reason: 'invalid_ticket' });
        return res.status(401).json({ error: 'invalid_ticket' });
      }

      auditLanSecurity('lan.ticket.exchange', {});
      res.json({
        token: result.token,
        hostUrl: resolveHostUrlForClient(req, getHostUrl),
        persist: true,
        storageTarget: 'userData',
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
