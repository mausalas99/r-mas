import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const orchestratorSrc = fs.readFileSync(new URL('./lan/orchestrator.mjs', import.meta.url), 'utf8');
const roomSrc = fs.readFileSync(new URL('./lan/room.mjs', import.meta.url), 'utf8');
const pushSrc = fs.readFileSync(new URL('./lan/push.mjs', import.meta.url), 'utf8');

test('LAN room advertises delta capability and handles applied deltas', () => {
  assert.match(roomSrc, /deltaSync:\s*1/);
  assert.match(roomSrc, /lastDeltaSeq/);
  assert.match(roomSrc, /livesync:delta:applied/);
});

test('orchestrator applies remote deltas under guard and suppresses own echoes', () => {
  assert.match(orchestratorSrc, /withRemoteDeltaApply/);
  assert.match(orchestratorSrc, /createDeltaEchoTracker/);
  assert.match(orchestratorSrc, /deltaLabelForPath/);
});

test('push flushes delta outbox through HTTP delta endpoint', () => {
  assert.match(pushSrc, /item\.kind === 'delta'/);
  assert.match(pushSrc, /\/delta/);
});
