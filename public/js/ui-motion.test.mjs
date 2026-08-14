import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePatientFieldIds,
  getReleaseVelocity,
  springTo,
  prefersReducedMotion,
  settlePasteSurface,
} from './ui-motion.mjs';

test('resolvePatientFieldIds — nombre desde lab', () => {
  assert.deepEqual(
    resolvePatientFieldIds('Falta el nombre del paciente.', true),
    ['m-nombre']
  );
});

test('resolvePatientFieldIds — nombre manual', () => {
  assert.deepEqual(
    resolvePatientFieldIds('Falta el nombre del paciente.', false),
    ['m-nombre-manual']
  );
});

test('resolvePatientFieldIds — edad', () => {
  assert.deepEqual(
    resolvePatientFieldIds('Edad inválida', false),
    ['m-edad-num-manual']
  );
});

test('resolvePatientFieldIds — cuarto y cama', () => {
  assert.deepEqual(
    resolvePatientFieldIds('Ingresa cuarto y cama', false),
    ['m-cuarto', 'm-cama']
  );
});

test('resolvePatientFieldIds — servicio en sala', () => {
  assert.deepEqual(
    resolvePatientFieldIds('Ingresa Área / Servicio', true),
    ['m-servicio']
  );
});

test('resolvePatientFieldIds — área en interconsulta', () => {
  assert.deepEqual(
    resolvePatientFieldIds('Ingresa área / departamento', false),
    ['m-servicio', 'm-area']
  );
});

test('getReleaseVelocity — empty / single sample → 0', () => {
  assert.equal(getReleaseVelocity([]), 0);
  assert.equal(getReleaseVelocity([{ t: 100, y: 10 }]), 0);
});

test('getReleaseVelocity — y axis over window', () => {
  const history = [
    { t: 900, y: 0 },
    { t: 950, y: 20 },
    { t: 1000, y: 50 },
  ];
  assert.equal(getReleaseVelocity(history, { axis: 'y', windowMs: 100, now: 1000 }), 0.5);
});

test('getReleaseVelocity — ignores samples outside window', () => {
  const history = [
    { t: 0, y: 0 },
    { t: 950, y: 10 },
    { t: 1000, y: 20 },
  ];
  assert.equal(getReleaseVelocity(history, { axis: 'y', windowMs: 100, now: 1000 }), 0.2);
});

test('getReleaseVelocity — x axis', () => {
  const history = [
    { t: 0, x: 0 },
    { t: 100, x: -40 },
  ];
  assert.equal(getReleaseVelocity(history, { axis: 'x', windowMs: 200, now: 100 }), -0.4);
});

test('springTo — invalid el returns null', () => {
  assert.equal(springTo(null, { opacity: 0 }), null);
  assert.equal(springTo({}, { opacity: 0 }), null);
});

test('prefersReducedMotion is true when html.motion-sobrio', () => {
  const prevDoc = globalThis.document;
  globalThis.document = {
    documentElement: { classList: { contains: (c) => c === 'motion-sobrio' } },
  };
  try {
    assert.equal(prefersReducedMotion(), true);
  } finally {
    globalThis.document = prevDoc;
  }
});

test('springTo — reduced motion snaps opacity on HTMLElement', async () => {
  const prev = globalThis.matchMedia;
  globalThis.matchMedia = (q) => ({
    matches: String(q).includes('prefers-reduced-motion'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  });
  try {
    assert.equal(prefersReducedMotion(), true);
    if (typeof document === 'undefined') {
      assert.equal(springTo(null, { opacity: 0 }), null);
      return;
    }
    const el = document.createElement('div');
    el.style.opacity = '1';
    const ctrl = springTo(el, { opacity: 0.2 }, { bounce: 0.5 });
    assert.ok(ctrl);
    assert.equal(typeof ctrl.stop, 'function');
    await ctrl.finished;
    assert.equal(el.style.opacity, '0.2');
  } finally {
    globalThis.matchMedia = prev;
  }
});

test('settlePasteSurface reduced motion snaps opacity', async () => {
  const prev = globalThis.matchMedia;
  globalThis.matchMedia = (q) => ({
    matches: String(q).includes('prefers-reduced-motion'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  });
  try {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.style.opacity = '0';
    const ctrl = settlePasteSurface(el);
    assert.ok(ctrl);
    await ctrl.finished;
    assert.equal(el.style.opacity, '1');
  } finally {
    globalThis.matchMedia = prev;
  }
});

test('settlePasteSurface reduced motion snaps opacity on fake el', async () => {
  const prev = globalThis.matchMedia;
  globalThis.matchMedia = (q) => ({
    matches: String(q).includes('prefers-reduced-motion'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  });
  try {
    const el = { style: { opacity: '0', transform: 'x' } };
    const ctrl = settlePasteSurface(el);
    await ctrl.finished;
    assert.equal(el.style.opacity, '1');
    assert.equal(el.style.transform, '');
  } finally {
    globalThis.matchMedia = prev;
  }
});
