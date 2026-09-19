import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const ss = new Map();
Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    getItem: (k) => (ss.has(k) ? ss.get(k) : null),
    setItem: (k, v) => {
      ss.set(String(k), String(v));
    },
    removeItem: (k) => {
      ss.delete(k);
    },
  },
  configurable: true,
  writable: true,
});

describe('clinical-read-model-demo', () => {
  beforeEach(async () => {
    ss.clear();
    const { markPitchTourSessionActive, setPitchPatientIsolation } = await import(
      './tour-pitch-sandbox.mjs'
    );
    markPitchTourSessionActive(false);
    setPitchPatientIsolation(false);
    const mod = await import('./clinical-read-model-demo.mjs');
    if (typeof mod.setDemoPatientsForTests === 'function') {
      mod.setDemoPatientsForTests([]);
    }
  });

  it('getPatientsForDisplay returns base list when pitch tour inactive', async () => {
    const { getPatientsForDisplay } = await import('./clinical-read-model-demo.mjs');
    const base = [{ id: 'real1', nombre: 'Ana' }];
    assert.deepEqual(getPatientsForDisplay(() => base), base);
  });

  it('getPatientsForDisplay overlays demos and filters isDemo from base when tour active', async () => {
    const { markPitchTourSessionActive, setPitchPatientIsolation } = await import(
      './tour-pitch-sandbox.mjs'
    );
    markPitchTourSessionActive(true);
    setPitchPatientIsolation(false);
    const { getPatientsForDisplay, setDemoPatientsForTests } = await import(
      './clinical-read-model-demo.mjs'
    );
    setDemoPatientsForTests([{ id: 'demo-pitch', nombre: 'DEMO', isDemo: true }]);
    const base = [
      { id: 'demo-stale', nombre: 'OldDemo', isDemo: true },
      { id: 'real1', nombre: 'Ana' },
    ];
    const shown = getPatientsForDisplay(() => base);
    assert.equal(shown[0].id, 'demo-pitch');
    assert.ok(shown.some((p) => p.id === 'real1'));
    assert.equal(
      shown.some((p) => p.id === 'demo-stale'),
      false
    );
  });

  it('getPatientsForDisplay with isolation active returns only registered demos', async () => {
    const { markPitchTourSessionActive, setPitchPatientIsolation } = await import(
      './tour-pitch-sandbox.mjs'
    );
    markPitchTourSessionActive(true);
    setPitchPatientIsolation(true);
    const { getPatientsForDisplay, setDemoPatientsForTests } = await import(
      './clinical-read-model-demo.mjs'
    );
    setDemoPatientsForTests([{ id: 'demo-pitch', nombre: 'DEMO', isDemo: true }]);
    const base = [
      { id: 'demo-pitch', nombre: 'DEMO', isDemo: true },
      { id: 'real1', nombre: 'Ana' },
    ];
    const shown = getPatientsForDisplay(() => base);
    assert.equal(shown.length, 1);
    assert.equal(shown[0].id, 'demo-pitch');
  });
});
