import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  EQUIPOS_CLOUD_BOOT_FLAG,
  EQUIPOS_CLOUD_DEFAULT_URL,
  getEquiposCloudConfig,
  runEquiposCloudBootIfNeeded,
  setEquiposCloudConfig,
} from './equipos-cloud-config.mjs';

describe('equipos-cloud-config', () => {
  /** @type {Map<string, string>} */
  let memory;

  beforeEach(() => {
    memory = new Map();
    global.localStorage = {
      getItem(k) {
        return memory.has(k) ? memory.get(k) : null;
      },
      setItem(k, v) {
        memory.set(k, String(v));
      },
      removeItem(k) {
        memory.delete(k);
      },
    };
  });

  afterEach(() => {
    delete global.localStorage;
  });

  it('returns cloud enabled with default URL when unset', () => {
    const cfg = getEquiposCloudConfig();
    assert.equal(cfg.enabled, true);
    assert.equal(cfg.url, EQUIPOS_CLOUD_DEFAULT_URL);
    assert.equal(cfg.adminKey, '');
  });

  it('seeds default URL on 8.0.5 boot when empty and runs once', () => {
    const result = runEquiposCloudBootIfNeeded({
      storage: global.localStorage,
      now: () => 1_700_000_000_000,
    });

    assert.equal(result.didRun, true);
    assert.equal(memory.get(EQUIPOS_CLOUD_BOOT_FLAG), '1700000000000');
    assert.equal(memory.get('rpc-equipos-cloud-url'), EQUIPOS_CLOUD_DEFAULT_URL);
    const settings = JSON.parse(memory.get('rpc-settings') || '{}');
    assert.equal(settings.equiposCloudUrl, EQUIPOS_CLOUD_DEFAULT_URL);

    const second = runEquiposCloudBootIfNeeded({ storage: global.localStorage });
    assert.equal(second.didRun, false);
  });

  it('does not overwrite a configured URL on boot', () => {
    setEquiposCloudConfig({
      url: 'https://custom.example.com',
      adminKey: 'secret',
    });

    const result = runEquiposCloudBootIfNeeded({ storage: global.localStorage });
    assert.equal(result.didRun, true);
    const cfg = getEquiposCloudConfig();
    assert.equal(cfg.url, 'https://custom.example.com');
    assert.equal(cfg.adminKey, 'secret');
  });
});
