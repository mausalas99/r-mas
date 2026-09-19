import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getRoomMembership,
  setRoomMembership,
  clearRoomMembership,
  migrateLastRoomToMembership,
  MEMBERSHIP_KEY,
  LAST_ROOM_KEY,
  LEGACY_MEMBERSHIP_KEY,
  LEGACY_LAST_ROOM_KEY,
} from './cloud-room-membership.mjs';

function mockLocalStorage(initial) {
  global.localStorage = {
    _d: { ...initial },
    getItem(k) {
      return this._d[k] ?? null;
    },
    setItem(k, v) {
      this._d[k] = String(v);
    },
    removeItem(k) {
      delete this._d[k];
    },
  };
}

test('canonical keys drop lan prefix', () => {
  assert.equal(MEMBERSHIP_KEY, 'rpc-room-membership');
  assert.equal(LAST_ROOM_KEY, 'rpc-last-room');
  assert.equal(LEGACY_MEMBERSHIP_KEY, 'rpc-lan-room-membership');
  assert.equal(LEGACY_LAST_ROOM_KEY, 'rpc-lan-last-room');
});

test('set/get/clear membership uses new keys', () => {
  mockLocalStorage({});
  setRoomMembership({ roomId: 'r1', label: 'Turno A' });
  const m = getRoomMembership();
  assert.equal(m.roomId, 'r1');
  assert.equal(m.label, 'Turno A');
  assert.ok(m.joinedAt);
  assert.ok(localStorage.getItem(MEMBERSHIP_KEY));
  assert.equal(localStorage.getItem(LAST_ROOM_KEY), 'r1');
  assert.equal(localStorage.getItem(LEGACY_MEMBERSHIP_KEY), null);
  clearRoomMembership();
  assert.equal(getRoomMembership(), null);
});

test('getRoomMembership migrates legacy membership key', () => {
  mockLocalStorage({
    [LEGACY_MEMBERSHIP_KEY]: JSON.stringify({
      roomId: 'legacy-room',
      label: 'Legacy',
      joinedAt: '2026-01-01T00:00:00.000Z',
    }),
  });
  const m = getRoomMembership();
  assert.equal(m.roomId, 'legacy-room');
  assert.equal(m.label, 'Legacy');
  assert.ok(localStorage.getItem(MEMBERSHIP_KEY));
  assert.equal(localStorage.getItem(LEGACY_MEMBERSHIP_KEY), null);
});

test('migrateLastRoomToMembership copies legacy last-room once', () => {
  mockLocalStorage({ [LEGACY_LAST_ROOM_KEY]: 'old-room' });
  migrateLastRoomToMembership();
  assert.equal(getRoomMembership().roomId, 'old-room');
  assert.equal(getRoomMembership().label, 'old-room');
  assert.equal(localStorage.getItem(LAST_ROOM_KEY), 'old-room');
});

test('migrateLastRoomToMembership is no-op when membership exists', () => {
  mockLocalStorage({ [LEGACY_LAST_ROOM_KEY]: 'other' });
  setRoomMembership({ roomId: 'kept', label: 'Kept' });
  migrateLastRoomToMembership();
  assert.equal(getRoomMembership().roomId, 'kept');
});
