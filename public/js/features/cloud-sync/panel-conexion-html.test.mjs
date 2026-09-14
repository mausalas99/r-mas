import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCloudStatusChipLabel,
  cloudSyncTransportLabel,
} from './panel-conexion-html.mjs';

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
