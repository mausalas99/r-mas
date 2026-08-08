import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cloudSyncErrorMessage,
  humanizeCloudSyncErrorMessage,
  humanizeTechnicalSyncMessage,
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

  it('cloudSyncErrorMessage uses worker message when present', () => {
    assert.match(
      cloudSyncErrorMessage({ data: { message: 'revision_stale' }, message: 'stale' }, 'fallback'),
      /revision_stale|desactualizada/i
    );
  });
});
