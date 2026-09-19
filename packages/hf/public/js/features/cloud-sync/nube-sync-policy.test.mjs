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

  it('shows Nube for the R+ HF sala', () => {
    assert.equal(shouldShowNubePanel('Unidad IC'), true);
  });

  it('shows Nube panel before profile sala is chosen', () => {
    assert.equal(shouldShowNubePanel(''), true);
    assert.equal(shouldShowNubePanel(null), true);
  });

  it('hides Nube panel for unknown sala labels', () => {
    assert.equal(shouldShowNubePanel('Laboratorio'), false);
  });

  it('uses Nube not LAN when cloud room connected for the cloud sala', () => {
    assert.equal(shouldUseNubeNotLan('Unidad IC', true), true);
    assert.equal(shouldUseNubeNotLan('Unidad IC', false), false);
    setCloudRoomConnected(true);
    assert.equal(shouldUseNubeNotLan('Unidad IC'), true);
  });

  it('isCloudSyncActive reflects connection flag', () => {
    assert.equal(isCloudSyncActive(), false);
    setCloudRoomConnected(true);
    assert.equal(isCloudSyncActive(), true);
  });
});
