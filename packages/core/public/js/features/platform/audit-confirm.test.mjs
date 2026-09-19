import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  lockClinicalDatabaseNow,
  exportClinicalDbBackupJson,
  exportClinicalDbBackupDb,
} from './audit.mjs';

function stubElectronApi(overrides) {
  return {
    dbClinicalLoadAll: () => {},
    dbLock: async () => ({ ok: true }),
    dbBackupExportJson: async () => ({ ok: true, envelope: {} }),
    dbBackupExportDb: async () => ({ ok: true, path: '/tmp/x.db' }),
    ...overrides,
  };
}

describe('platform/audit.mjs consequence confirms', () => {
  let prevWindow;

  beforeEach(() => {
    prevWindow = typeof window === 'undefined' ? undefined : window;
  });

  afterEach(() => {
    if (typeof window !== 'undefined') window.electronAPI = prevWindow?.electronAPI;
  });

  it('lockClinicalDatabaseNow: consequence confirm gates the dbLock IPC call', async () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let lockCalls = 0;
    window.electronAPI = stubElectronApi({
      dbLock: async () => {
        lockCalls += 1;
        return { ok: true };
      },
    });

    const p = lockClinicalDatabaseNow();
    const backdrop = document.querySelector('[data-wb-confirm-backdrop]');
    assert.ok(backdrop, 'consequence modal should be open');
    assert.match(backdrop.innerHTML, /wb-confirm-modal--consequence/);
    assert.match(backdrop.innerHTML, /¿Bloquear la base de datos ahora\?/);
    assert.match(
      backdrop.innerHTML,
      /R\+ la volverá a abrir automáticamente en este equipo al reiniciar o recargar\./
    );

    document.querySelector('[data-wb-confirm-cancel]').click();
    await p;
    assert.equal(lockCalls, 0, 'canceling must not lock the database');
  });

  it('exportClinicalDbBackupJson: consequence confirm gates the JSON export', async () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let exportCalls = 0;
    window.electronAPI = stubElectronApi({
      dbBackupExportJson: async () => {
        exportCalls += 1;
        return { ok: true, envelope: {} };
      },
    });

    const p = exportClinicalDbBackupJson();
    const backdrop = document.querySelector('[data-wb-confirm-backdrop]');
    assert.ok(backdrop, 'consequence modal should be open');
    assert.match(backdrop.innerHTML, /wb-confirm-modal--consequence/);
    assert.match(backdrop.innerHTML, /¿Continuar y guardar en un lugar seguro\?/);
    assert.match(
      backdrop.innerHTML,
      /El respaldo JSON incluye información clínica identificable en texto plano\./
    );

    document.querySelector('[data-wb-confirm-cancel]').click();
    await p;
    assert.equal(exportCalls, 0, 'canceling must not export the JSON backup');
  });

  it('exportClinicalDbBackupDb: consequence confirm; confirming triggers the .db export', async () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    let exportCalls = 0;
    window.electronAPI = stubElectronApi({
      dbBackupExportDb: async () => {
        exportCalls += 1;
        return { ok: true, path: '/tmp/x.db' };
      },
    });

    const p = exportClinicalDbBackupDb();
    const backdrop = document.querySelector('[data-wb-confirm-backdrop]');
    assert.ok(backdrop, 'consequence modal should be open');
    assert.match(backdrop.innerHTML, /¿Continuar\?/);
    assert.match(
      backdrop.innerHTML,
      /Se copiará el archivo \.db cifrado\. Protégelo como datos clínicos sensibles\./
    );

    document.querySelector('[data-wb-confirm-ok]').click();
    await p;
    assert.equal(exportCalls, 1, 'confirm must trigger the .db export exactly once');
  });
});
