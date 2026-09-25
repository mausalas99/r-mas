import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isClinicalLocalOnlyMode,
  setClinicalSyncModeLocalOnly,
} from '../clinical-settings.mjs';

const settingsSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'clinical-sync-mode-settings.mjs'),
  'utf8'
);

describe('clinical-sync-mode-settings', () => {
  it('setClinicalSyncModeLocalOnly(false) clears local-only flag', () => {
    const store = { 'rpc-settings': JSON.stringify({ clinicalLocalOnly: true }) };
    const prev = globalThis.localStorage;
    globalThis.localStorage = {
      getItem(k) {
        return store[k];
      },
      setItem(k, v) {
        store[k] = v;
      },
    };
    try {
      setClinicalSyncModeLocalOnly(false);
      assert.equal(isClinicalLocalOnlyMode(JSON.parse(store['rpc-settings'])), false);
    } finally {
      if (prev === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prev;
    }
  });

  it('cloud salas exit local-only via Nube message without starting LAN runtime', () => {
    assert.match(settingsSrc, /shouldShowNubePanel/);
    assert.match(settingsSrc, /Sincronización por Nube/);
    const nubeBlock = settingsSrc.match(
      /if \(shouldShowNubePanel\(settingsSala\(\)\)\) \{[\s\S]*?return;\n {2}\}/
    );
    assert.ok(nubeBlock, 'expected cloud-sala early return in enableClinicalLanFromSettings');
    assert.doesNotMatch(nubeBlock[0], /ensureLanSyncRuntimeStarted/);
  });
});
