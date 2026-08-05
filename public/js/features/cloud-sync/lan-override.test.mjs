import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldShowNubePanel,
  shouldUseNubeNotLan,
  setCloudRoomConnected,
  isCloudSyncActive,
} from './lan-override.mjs';

describe('lan-override', () => {
  beforeEach(() => {
    setCloudRoomConnected(false);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('rpc-cloud-sync-room-id');
    }
  });

  it('shows Nube only for Sala/Torre', () => {
    assert.equal(shouldShowNubePanel('Sala 1'), true);
    assert.equal(shouldShowNubePanel('UX'), false);
  });

  it('uses Nube not LAN when cloud room connected for cloud sala', () => {
    assert.equal(shouldUseNubeNotLan('UX', true), false);
    assert.equal(shouldUseNubeNotLan('Sala 1', false), false);
    assert.equal(shouldUseNubeNotLan('Sala 1', true), true);
    setCloudRoomConnected(true);
    assert.equal(shouldUseNubeNotLan('Torre HU'), true);
  });

  it('isCloudSyncActive reflects connection flag', () => {
    assert.equal(isCloudSyncActive(), false);
    setCloudRoomConnected(true);
    assert.equal(isCloudSyncActive(), true);
  });
});
