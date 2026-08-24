import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ocrLabPhoto } from './lab-photo-ocr.mjs';

function fakeCreateWorker(text, confidence) {
  return async function () {
    return {
      recognize: async function () {
        return { data: { text: text, confidence: confidence } };
      },
      terminate: async function () {},
    };
  };
}

test('ocrLabPhoto returns text and confidence from the worker', async () => {
  const result = await ocrLabPhoto(Buffer.from('fake-image'), {
    createWorker: fakeCreateWorker('GLUCOSA 95 mg/dL', 87),
  });
  assert.equal(result.text, 'GLUCOSA 95 mg/dL');
  assert.equal(result.confidence, 87);
});

test('ocrLabPhoto defaults confidence to 0 when missing', async () => {
  const createWorkerFn = async function () {
    return {
      recognize: async function () {
        return { data: { text: 'x' } };
      },
      terminate: async function () {},
    };
  };
  const result = await ocrLabPhoto(Buffer.from('fake-image'), { createWorker: createWorkerFn });
  assert.equal(result.confidence, 0);
});

test('ocrLabPhoto terminates the worker even if recognize throws', async () => {
  let terminated = false;
  const createWorkerFn = async function () {
    return {
      recognize: async function () {
        throw new Error('boom');
      },
      terminate: async function () {
        terminated = true;
      },
    };
  };
  await assert.rejects(
    ocrLabPhoto(Buffer.from('fake-image'), { createWorker: createWorkerFn }),
    /boom/
  );
  assert.equal(terminated, true);
});
