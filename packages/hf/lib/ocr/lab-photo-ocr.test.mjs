import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ocrLabPhoto } from './lab-photo-ocr.mjs';

var fakePreprocess = async function (buffer) {
  return buffer;
};

function fakeCreateWorker(text, confidence) {
  return async function () {
    return {
      setParameters: async function () {},
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
    preprocessImageBuffer: fakePreprocess,
  });
  assert.equal(result.text, 'GLUCOSA 95 mg/dL');
  assert.equal(result.confidence, 87);
});

test('ocrLabPhoto defaults confidence to 0 when missing', async () => {
  const createWorkerFn = async function () {
    return {
      setParameters: async function () {},
      recognize: async function () {
        return { data: { text: 'x' } };
      },
      terminate: async function () {},
    };
  };
  const result = await ocrLabPhoto(Buffer.from('fake-image'), {
    createWorker: createWorkerFn,
    preprocessImageBuffer: fakePreprocess,
  });
  assert.equal(result.confidence, 0);
});

test('ocrLabPhoto terminates the worker even if recognize throws', async () => {
  let terminated = false;
  const createWorkerFn = async function () {
    return {
      setParameters: async function () {},
      recognize: async function () {
        throw new Error('boom');
      },
      terminate: async function () {
        terminated = true;
      },
    };
  };
  await assert.rejects(
    ocrLabPhoto(Buffer.from('fake-image'), {
      createWorker: createWorkerFn,
      preprocessImageBuffer: fakePreprocess,
    }),
    /boom/
  );
  assert.equal(terminated, true);
});

test('ocrLabPhoto sets PSM and char whitelist before recognizing', async () => {
  let capturedParams = null;
  const createWorkerFn = async function () {
    return {
      setParameters: async function (params) {
        capturedParams = params;
      },
      recognize: async function () {
        return { data: { text: 'x', confidence: 90 } };
      },
      terminate: async function () {},
    };
  };
  await ocrLabPhoto(Buffer.from('fake-image'), {
    createWorker: createWorkerFn,
    preprocessImageBuffer: fakePreprocess,
  });
  assert.equal(capturedParams.tessedit_pageseg_mode, '6');
  assert.match(capturedParams.tessedit_char_whitelist, /Á/);
  assert.match(capturedParams.tessedit_char_whitelist, /0123456789/);
});

test('ocrLabPhoto preprocesses the buffer before recognize', async () => {
  let preprocessCalledWith = null;
  let recognizedWith = null;
  const preprocessFn = async function (buffer) {
    preprocessCalledWith = buffer;
    return Buffer.from('cleaned');
  };
  const createWorkerFn = async function () {
    return {
      setParameters: async function () {},
      recognize: async function (buffer) {
        recognizedWith = buffer;
        return { data: { text: 'x', confidence: 90 } };
      },
      terminate: async function () {},
    };
  };
  const original = Buffer.from('fake-image');
  await ocrLabPhoto(original, {
    createWorker: createWorkerFn,
    preprocessImageBuffer: preprocessFn,
  });
  assert.equal(preprocessCalledWith, original);
  assert.equal(recognizedWith.toString(), 'cleaned');
});

test('ocrLabPhoto passes langPath and gzip:false to createWorker when langPath is given', async () => {
  let capturedOptions = null;
  const createWorkerFn = async function (langs, oem, options) {
    capturedOptions = options;
    return {
      setParameters: async function () {},
      recognize: async function () {
        return { data: { text: 'x', confidence: 90 } };
      },
      terminate: async function () {},
    };
  };
  await ocrLabPhoto(Buffer.from('fake-image'), {
    createWorker: createWorkerFn,
    preprocessImageBuffer: fakePreprocess,
    langPath: '/resources/tessdata',
  });
  assert.equal(capturedOptions.langPath, '/resources/tessdata');
  assert.equal(capturedOptions.gzip, false);
});
