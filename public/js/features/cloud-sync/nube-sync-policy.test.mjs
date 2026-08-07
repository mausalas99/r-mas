import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldShowNubePanel,
  shouldUseNubeNotLan,
  setCloudRoomConnected,
  isCloudSyncActive,
} from './nube-sync-policy.mjs';

describe('nube-sync-policy', () => {
  beforeEach(() => {
    setCloudRoomConnected(false);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('rpc-cloud-sync-room-id');
    }
  });

  it('shows Nube for all clinical wards', () => {
    assert.equal(shouldShowNubePanel('Sala 1'), true);
    assert.equal(shouldShowNubePanel('UX'), true);
    assert.equal(shouldShowNubePanel('Interconsultas'), true);
    assert.equal(shouldShowNubePanel('Eme'), true);
  });

  it('uses Nube not LAN when cloud room connected for any cloud sala', () => {
    assert.equal(shouldUseNubeNotLan('UX', true), true);
    assert.equal(shouldUseNubeNotLan('Sala 1', false), false);
    assert.equal(shouldUseNubeNotLan('Sala 1', true), true);
    setCloudRoomConnected(true);
    assert.equal(shouldUseNubeNotLan('Torre HU'), true);
    assert.equal(shouldUseNubeNotLan('Interconsultas'), true);
  });

  it('isCloudSyncActive reflects connection flag', () => {
    assert.equal(isCloudSyncActive(), false);
    setCloudRoomConnected(true);
    assert.equal(isCloudSyncActive(), true);
  });
});
