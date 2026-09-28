import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { humanizeCloudSyncErrorMessage } from './cloud-sync-error-text.mjs';

describe('Chromium net::ERR_* codes', () => {
  it('no internet reads as «sin red hacia Nube»', () => {
    assert.match(humanizeCloudSyncErrorMessage('net::ERR_INTERNET_DISCONNECTED'), /^Sin red hacia Nube/);
    assert.match(humanizeCloudSyncErrorMessage('net::ERR_NAME_NOT_RESOLVED'), /^Sin red hacia Nube/);
  });
});
