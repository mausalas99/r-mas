import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  cloudMedRecetaFingerprint,
  noteCloudMedRecetaFromPullResult,
  noteCloudMedRecetaOpsSent,
  readMedRecetaFingerprintIndex,
  shouldSkipCloudMedRecetaPush,
} from './cloud-med-receta-index.mjs';

describe('cloud-med-receta-index', () => {
  const prev = globalThis.localStorage;

  beforeEach(() => {
    const store = {};
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => {
        delete store[k];
      },
    };
  });

  afterEach(() => {
    if (prev) globalThis.localStorage = prev;
    else delete globalThis.localStorage;
  });

  it('does not skip a patient never seen before', () => {
    assert.equal(shouldSkipCloudMedRecetaPush('p1', { items: [{ id: 'm1' }] }), false);
  });

  it('skips a re-push whose content matches what was already sent', () => {
    const medReceta = { fechaActualizacion: '06/09/2026', items: [{ id: 'm1' }] };
    noteCloudMedRecetaOpsSent([{ path: 'entries/p1/medReceta', value: medReceta }]);
    assert.equal(shouldSkipCloudMedRecetaPush('p1', medReceta), true);
    assert.equal(shouldSkipCloudMedRecetaPush('p1', { ...medReceta, items: [] }), false);
  });

  it('the exact bug: another actor pushing their stale/empty medReceta after ours must not silently win once we resend unchanged content', () => {
    const mine = { fechaActualizacion: '06/09/2026', items: [{ id: 'm1', texto: 'ENOXAPARINA' }] };
    noteCloudMedRecetaOpsSent([{ path: 'entries/p1/medReceta', value: mine }]);
    // An unrelated local edit (e.g. saving notas) re-triggers the debounced bundle,
    // which would have re-pushed this same stale/unchanged `mine` with a fresh "now"
    // clock (the actual wipe bug) — the dedupe must stop that re-send.
    assert.equal(shouldSkipCloudMedRecetaPush('p1', mine), true);
  });

  it('seeds the index from a full-state pull result so we do not bounce it right back', () => {
    const pulled = { fechaActualizacion: '07/09/2026', items: [{ id: 'm2' }] };
    noteCloudMedRecetaFromPullResult({ state: { entries: [{ id: 'p1', medReceta: pulled }] } });
    assert.equal(shouldSkipCloudMedRecetaPush('p1', pulled), true);
  });

  it('seeds the index from an incremental ops pull result', () => {
    const pulled = { fechaActualizacion: '07/09/2026', items: [{ id: 'm3' }] };
    noteCloudMedRecetaFromPullResult({
      ops: [{ path: 'entries/p1/medReceta', value: pulled }],
    });
    assert.equal(shouldSkipCloudMedRecetaPush('p1', pulled), true);
  });

  it('ignores ops for other paths and patients', () => {
    noteCloudMedRecetaOpsSent([
      { path: 'entries/p1/note', value: { texto: 'x' } },
      { path: 'entries/p2/medReceta', value: { items: [] } },
    ]);
    const idx = readMedRecetaFingerprintIndex();
    assert.equal(Object.keys(idx).length, 1);
    assert.ok('entries/p2/medReceta' in idx);
  });

  it('fingerprint ignores key order', () => {
    const a = cloudMedRecetaFingerprint({ fechaActualizacion: '06/09/2026', items: [] });
    const b = cloudMedRecetaFingerprint({ items: [], fechaActualizacion: '06/09/2026' });
    assert.equal(a, b);
  });

  it('missing localStorage fails open (never skips) instead of throwing', () => {
    delete globalThis.localStorage;
    assert.equal(shouldSkipCloudMedRecetaPush('p1', { items: [] }), false);
  });
});
