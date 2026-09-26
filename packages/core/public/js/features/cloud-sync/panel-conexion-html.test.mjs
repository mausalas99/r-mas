import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCloudStatusChipLabel,
  cloudSyncTransportLabel,
  statusHeroHtml,
  pipelineChainHtml,
  techSummaryLine,
} from './panel-conexion-html.mjs';
import { conexionHeroBlockHtml } from './panel-conexion-views.mjs';

describe('formatCloudStatusChipLabel', () => {
  it('appends WS or Poll for healthy states', () => {
    assert.equal(formatCloudStatusChipLabel('idle', 'ws'), 'Nube al día · WS');
    assert.equal(formatCloudStatusChipLabel('idle', 'poll'), 'Nube al día · Poll');
    assert.equal(formatCloudStatusChipLabel('syncing', 'ws'), 'Sincronizando… · WS');
  });

  it('omits transport suffix on error and offline', () => {
    assert.equal(formatCloudStatusChipLabel('error', 'ws'), 'Error');
    assert.equal(formatCloudStatusChipLabel('offline', 'poll'), 'Sin conexión Nube');
  });

  it('appends a detail for pending and syncing when present', () => {
    assert.equal(
      formatCloudStatusChipLabel('pending', 'poll', '5 cambios sin enviar'),
      'Pendiente · Poll · 5 cambios sin enviar'
    );
    assert.equal(
      formatCloudStatusChipLabel('syncing', 'ws', 'Enviando 3/8 cambios'),
      'Sincronizando… · WS · Enviando 3/8 cambios'
    );
  });

  it('drops the detail separator for pending/syncing with no detail, and never appends it elsewhere', () => {
    assert.equal(formatCloudStatusChipLabel('pending', 'poll', ''), 'Pendiente · Poll');
    assert.equal(formatCloudStatusChipLabel('idle', 'poll', 'ignored'), 'Nube al día · Poll');
    assert.equal(formatCloudStatusChipLabel('error', 'poll', 'ignored'), 'Error');
  });
});

describe('cloudSyncTransportLabel', () => {
  it('maps transport modes', () => {
    assert.equal(cloudSyncTransportLabel('ws'), 'WS');
    assert.equal(cloudSyncTransportLabel('poll'), 'Poll');
    assert.equal(cloudSyncTransportLabel('offline'), '—');
  });
});

describe('Nube status hero (board «Nube A»)', () => {
  const room = { id: 'r1', sala: 'Sala 1', turnKey: '2026-09', code: 'ABC123' };

  it('says the state in words, names sala and month, and has one sync button', () => {
    const html = statusHeroHtml({ status: 'idle', displaySala: 'Sala 1', room });
    assert.match(html, /cloud-sync-hero-title">Todo al día</);
    assert.match(html, /Sala 1 · septiembre 2026/);
    assert.equal((html.match(/data-cloud-action="sync-now"/g) || []).length, 1);
    assert.match(html, /data-state="ok"/);
  });

  it('turns an error into plain words, never a raw code', () => {
    const html = statusHeroHtml({ status: 'error', detail: '', displaySala: 'Sala 1', room });
    assert.match(html, /cloud-sync-hero-title">Error</);
    assert.match(html, /data-state="error"/);
  });

  it('dashes the link into a step that is not ok', () => {
    const html = pipelineChainHtml([
      { label: 'Internet', state: 'ok', detail: 'Conectado' },
      { label: 'En vivo', state: 'warn', detail: 'Reconectando' },
    ]);
    assert.match(html, /cloud-sync-chain-link is-broken/);
    assert.equal(pipelineChainHtml([]), '');
  });

  it('hero block chain: 4 steps, sala step shows only the sala, live ok reads «Conectado»', () => {
    const html = conexionHeroBlockHtml({
      status: 'idle', transport: 'ws', displaySala: 'Sala 1', room, tokenPresent: true,
    });
    const labels = [...html.matchAll(/cloud-sync-chain-label">([^<]+)</g)].map((m) => m[1]);
    assert.deepEqual(labels, ['Internet', 'Sesión', 'Sala', 'En vivo']);
    const details = [...html.matchAll(/cloud-sync-chain-detail">([^<]+)</g)].map((m) => m[1]);
    assert.equal(details[2], 'Sala 1');
    assert.equal(details[3], 'Conectado');
  });

  it('techSummaryLine reads cola, rev. and local patients', () => {
    assert.equal(techSummaryLine(0, 13516, 50), 'Cola 0 · Rev. 13516 · 50 pacientes locales');
    assert.equal(techSummaryLine('x', 'y', null), 'Cola 0 · Rev. 0 · 0 pacientes locales');
  });
});
