import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  noteServerDate,
  cloudSyncNowIso,
  getCloudSyncClockOffsetMs,
  clearCloudSyncClockOffset,
} from './cloud-sync-clock.mjs';

describe('cloud-sync-clock', () => {
  beforeEach(() => {
    clearCloudSyncClockOffset();
  });

  it('has no offset before any server Date header is seen', () => {
    assert.equal(getCloudSyncClockOffsetMs(), 0);
  });

  it('learns a positive offset when the local clock is behind the server', () => {
    const serverNow = Date.now() + 5 * 60_000;
    noteServerDate(new Date(serverNow).toUTCString());
    const offset = getCloudSyncClockOffsetMs();
    assert.ok(offset > 4 * 60_000 && offset < 6 * 60_000, `offset was ${offset}`);
    const stamped = Date.parse(cloudSyncNowIso());
    assert.ok(Math.abs(stamped - serverNow) < 2000);
  });

  it('learns a negative offset when the local clock is ahead of the server', () => {
    const serverNow = Date.now() - 5 * 60_000;
    noteServerDate(new Date(serverNow).toUTCString());
    assert.ok(getCloudSyncClockOffsetMs() < 0);
  });

  it('ignores an unparseable header and keeps the prior offset', () => {
    noteServerDate(new Date(Date.now() + 60_000).toUTCString());
    const offset = getCloudSyncClockOffsetMs();
    noteServerDate('not-a-date');
    assert.equal(getCloudSyncClockOffsetMs(), offset);
  });

  it('ignores a missing header', () => {
    noteServerDate(null);
    assert.equal(getCloudSyncClockOffsetMs(), 0);
  });
});
