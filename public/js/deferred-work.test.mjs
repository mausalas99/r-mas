import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scheduleAfterPaint,
  scheduleAfterPaintThenIdle,
  scheduleIdle,
  scheduleTrailing,
  cancelDeferredIdleWork,
} from './deferred-work.mjs';

test('scheduleAfterPaint runs callback', async () => {
  let ran = false;
  scheduleAfterPaint(function () {
    ran = true;
  });
  await new Promise(function (resolve) {
    setTimeout(resolve, 30);
  });
  assert.equal(ran, true);
});

test('cancelDeferredIdleWork drops pending scheduleAfterPaint', async () => {
  let ran = false;
  scheduleAfterPaint(function () {
    ran = true;
  });
  cancelDeferredIdleWork();
  await new Promise(function (resolve) {
    setTimeout(resolve, 30);
  });
  assert.equal(ran, false);
});

test('scheduleIdle runs callback', async () => {
  let ran = false;
  scheduleIdle(function () {
    ran = true;
  });
  await new Promise(function (resolve) {
    setTimeout(resolve, 30);
  });
  assert.equal(ran, true);
});

test('cancelDeferredIdleWork drops pending scheduleIdle', async () => {
  let ran = false;
  scheduleIdle(function () {
    ran = true;
  }, 20);
  cancelDeferredIdleWork();
  await new Promise(function (resolve) {
    setTimeout(resolve, 50);
  });
  assert.equal(ran, false);
});

test('scheduleAfterPaintThenIdle runs callback after paint', async () => {
  let ran = false;
  scheduleAfterPaintThenIdle(function () {
    ran = true;
  }, 20);
  await new Promise(function (resolve) {
    setTimeout(resolve, 80);
  });
  assert.equal(ran, true);
});

test('cancelDeferredIdleWork drops pending scheduleAfterPaintThenIdle', async () => {
  let ran = false;
  scheduleAfterPaintThenIdle(function () {
    ran = true;
  }, 20);
  cancelDeferredIdleWork();
  await new Promise(function (resolve) {
    setTimeout(resolve, 80);
  });
  assert.equal(ran, false);
});

test('scheduleTrailing coalesces and runs after the delay', async () => {
  let n = 0;
  scheduleTrailing(function () {
    n += 1;
  }, 40);
  scheduleTrailing(function () {
    n += 10;
  }, 40);
  await new Promise(function (resolve) {
    setTimeout(resolve, 80);
  });
  assert.equal(n, 10);
});

test('cancelDeferredIdleWork drops pending scheduleTrailing', async () => {
  let ran = false;
  scheduleTrailing(function () {
    ran = true;
  }, 40);
  cancelDeferredIdleWork();
  await new Promise(function (resolve) {
    setTimeout(resolve, 80);
  });
  assert.equal(ran, false);
});
