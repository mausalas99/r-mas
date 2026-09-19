import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// See drive-import-modal-step.test.mjs for why this asserts on source: no
// `document` under `npm run test:one`. Both guards used to fall through to
// the generic 'Confirmar' button; each now names what confirming does.
const src = readFileSync(fileURLToPath(new URL('./drive-import-run.mjs', import.meta.url)), 'utf8');

describe('drive import confirm guards name their consequence', () => {
  it('registro mismatch confirm label says what continuing does', () => {
    const start = src.indexOf('async function confirmRegistroMismatch');
    const nextFn = src.indexOf('\nasync function ', start + 1);
    const body = src.slice(start, nextFn === -1 ? src.length : nextFn);
    assert.match(body, /'Continuar de todos modos'/);
  });

  it('create-without-name confirm label says what confirming does', () => {
    const start = src.indexOf('async function confirmCreateWithoutName');
    const nextFn = src.indexOf('\nasync function ', start + 1);
    const body = src.slice(start, nextFn === -1 ? src.length : nextFn);
    assert.match(body, /'Crear paciente'/);
  });
});
