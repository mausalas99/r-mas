import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cloudSyncErrorMessage,
  humanizeCloudSyncErrorMessage,
  humanizeTechnicalSyncMessage,
  isCloudSyncNetworkErrorMessage,
} from './cloud-sync-error-text.mjs';

describe('cloud-sync-error-text', () => {
  it('humanizeTechnicalSyncMessage hides undefined pull errors', () => {
    const text = humanizeTechnicalSyncMessage("Cannot read properties of undefined (reading 'pull')");
    assert.match(text, /no está listo para descargar/i);
    assert.ok(!text.includes('undefined'));
  });

  it('humanizeTechnicalSyncMessage explains cliente nube no configurado', () => {
    const text = humanizeTechnicalSyncMessage('Cliente Nube no configurado');
    assert.match(text, /enlace con Nube/i);
    assert.ok(!text.includes('configurado'));
  });

  it('humanizeCloudSyncErrorMessage maps failed to fetch', () => {
    assert.match(humanizeCloudSyncErrorMessage('Failed to fetch'), /Sin red/i);
  });

  it('isCloudSyncNetworkErrorMessage recognizes transport failures', () => {
    assert.equal(isCloudSyncNetworkErrorMessage('Failed to fetch'), true);
    assert.equal(isCloudSyncNetworkErrorMessage('Sin red hacia Nube'), true);
    assert.equal(isCloudSyncNetworkErrorMessage('revision_stale'), false);
  });

  it('cloudSyncErrorMessage uses worker message when present', () => {
    assert.match(
      cloudSyncErrorMessage({ data: { message: 'revision_stale' }, message: 'stale' }, 'fallback'),
      /revision_stale|desactualizada/i
    );
  });
});

describe('Chromium net::ERR_* codes', () => {
  it('a refused or reset connection reads as «no hubo respuesta de Nube»', () => {
    assert.equal(isCloudSyncNetworkErrorMessage('net::ERR_CONNECTION_REFUSED'), true);
    assert.match(humanizeCloudSyncErrorMessage('net::ERR_CONNECTION_REFUSED'), /^No hubo respuesta de Nube/);
    assert.match(humanizeCloudSyncErrorMessage('net::ERR_TIMED_OUT'), /^No hubo respuesta de Nube/);
  });

  it('no internet reads as «sin red hacia Nube»', () => {
    assert.match(humanizeCloudSyncErrorMessage('net::ERR_INTERNET_DISCONNECTED'), /^Sin red hacia Nube/);
    assert.match(humanizeCloudSyncErrorMessage('net::ERR_NAME_NOT_RESOLVED'), /^Sin red hacia Nube/);
  });
});
