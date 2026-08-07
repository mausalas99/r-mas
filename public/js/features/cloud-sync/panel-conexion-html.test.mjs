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
});

describe('cloudSyncTransportLabel', () => {
  it('maps transport modes', () => {
    assert.equal(cloudSyncTransportLabel('ws'), 'WS');
    assert.equal(cloudSyncTransportLabel('poll'), 'Poll');
    assert.equal(cloudSyncTransportLabel('offline'), '—');
  });
});
