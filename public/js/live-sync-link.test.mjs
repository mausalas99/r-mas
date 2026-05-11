import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLiveSyncInviteLink, parseLiveSyncInviteLink } from './live-sync-link.mjs';

test('buildLiveSyncInviteLink serializes rplus join link', () => {
  const link = buildLiveSyncInviteLink({
    sessionId: 's1',
    token: 'tok',
    lanUrl: 'ws://192.168.1.10:3741',
    relayUrl: 'wss://relay.example/sync',
    expiresAt: '2026-05-11T20:00:00.000Z',
    hostDeviceName: 'MacBook',
  });

  assert.equal(link.startsWith('rplus://sync/join?'), true);
  const parsed = parseLiveSyncInviteLink(link, { now: '2026-05-11T19:00:00.000Z' });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.invite.sessionId, 's1');
  assert.equal(parsed.invite.lanUrl, 'ws://192.168.1.10:3741');
});

test('parseLiveSyncInviteLink rejects expired links', () => {
  const link = buildLiveSyncInviteLink({
    sessionId: 's1',
    token: 'tok',
    lanUrl: 'ws://192.168.1.10:3741',
    relayUrl: '',
    expiresAt: '2026-05-11T18:00:00.000Z',
    hostDeviceName: 'MacBook',
  });

  const parsed = parseLiveSyncInviteLink(link, { now: '2026-05-11T19:00:00.000Z' });
  assert.deepEqual(parsed, { ok: false, error: 'expired' });
});

test('parseLiveSyncInviteLink rejects missing token', () => {
  const parsed = parseLiveSyncInviteLink('rplus://sync/join?sessionId=s1', {
    now: '2026-05-11T19:00:00.000Z',
  });
  assert.deepEqual(parsed, { ok: false, error: 'missing-token' });
});

test('parseLiveSyncInviteLink rejects wrong scheme', () => {
  const parsed = parseLiveSyncInviteLink('https://example.com', {
    now: '2026-05-11T19:00:00.000Z',
  });
  assert.deepEqual(parsed, { ok: false, error: 'invalid-link' });
});

test('parseLiveSyncInviteLink rejects whitespace token', () => {
  const parsed = parseLiveSyncInviteLink(
    'rplus://sync/join?sessionId=s1&token=%20%20&lanUrl=ws%3A%2F%2F192.168.1.10%3A3741&expiresAt=2026-05-11T20%3A00%3A00.000Z',
    { now: '2026-05-11T19:00:00.000Z' },
  );
  assert.deepEqual(parsed, { ok: false, error: 'missing-token' });
});

test('parseLiveSyncInviteLink rejects missing sessionId', () => {
  const parsed = parseLiveSyncInviteLink(
    'rplus://sync/join?token=tok&lanUrl=ws%3A%2F%2F192.168.1.10%3A3741&expiresAt=2026-05-11T20%3A00%3A00.000Z',
    { now: '2026-05-11T19:00:00.000Z' },
  );
  assert.deepEqual(parsed, { ok: false, error: 'missing-session' });
});

test('parseLiveSyncInviteLink rejects missing endpoints', () => {
  const parsed = parseLiveSyncInviteLink(
    'rplus://sync/join?sessionId=s1&token=tok&lanUrl=&relayUrl=&expiresAt=2026-05-11T20%3A00%3A00.000Z',
    { now: '2026-05-11T19:00:00.000Z' },
  );
  assert.deepEqual(parsed, { ok: false, error: 'missing-endpoint' });
});

test('parseLiveSyncInviteLink rejects malformed lanUrl', () => {
  const parsed = parseLiveSyncInviteLink(
    'rplus://sync/join?sessionId=s1&token=tok&lanUrl=not-a-url&expiresAt=2026-05-11T20%3A00%3A00.000Z',
    { now: '2026-05-11T19:00:00.000Z' },
  );
  assert.deepEqual(parsed, { ok: false, error: 'invalid-endpoint' });
});

test('parseLiveSyncInviteLink accepts uppercase host', () => {
  const parsed = parseLiveSyncInviteLink(
    'rplus://SYNC/join?sessionId=s1&token=tok&lanUrl=ws%3A%2F%2F192.168.1.10%3A3741&expiresAt=2026-05-11T20%3A00%3A00.000Z',
    { now: '2026-05-11T19:00:00.000Z' },
  );

  assert.equal(parsed.ok, true);
  assert.equal(parsed.invite.sessionId, 's1');
});

test('parseLiveSyncInviteLink rejects authority port', () => {
  const parsed = parseLiveSyncInviteLink(
    'rplus://sync:123/join?sessionId=s1&token=tok&lanUrl=ws%3A%2F%2F192.168.1.10%3A3741&expiresAt=2026-05-11T20%3A00%3A00.000Z',
    { now: '2026-05-11T19:00:00.000Z' },
  );
  assert.deepEqual(parsed, { ok: false, error: 'invalid-link' });
});
