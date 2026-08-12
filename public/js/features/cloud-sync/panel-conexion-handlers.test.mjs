import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

describe('panel-conexion-handlers remember / leave room', () => {
  const src = readFileSync(new URL('./panel-conexion-handlers.mjs', import.meta.url), 'utf8');

  it('leave room keeps auth token (does not clearCloudSyncSession)', () => {
    const start = src.indexOf('export async function handleLeaveRoom');
    const end = src.indexOf('export async function handleLogout', start);
    assert.ok(start >= 0 && end > start);
    const body = src.slice(start, end);
    assert.doesNotMatch(body, /clearCloudSyncSession/);
    assert.match(body, /setCloudSyncRoomSnapshot/);
  });

  it('register persists Recuérdame via data-cloud-reg-remember', () => {
    assert.match(src, /data-cloud-reg-remember/);
    assert.match(src, /resolveRememberFromSection/);
  });
});
