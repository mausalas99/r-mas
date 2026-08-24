import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

describe('panel-admin-actions rotate code', () => {
  const src = readFileSync(new URL('./panel-admin-actions.mjs', import.meta.url), 'utf8');

  it('rotating the room code re-wraps the room DEK under the new code', () => {
    const start = src.indexOf('async function handleRotateCode');
    const end = src.indexOf('\nasync function ', start + 1);
    const body = src.slice(start, end > start ? end : undefined);
    const rotateAt = body.indexOf('adminRotateCode(roomId)');
    const rewrapAt = body.indexOf('rewrapRoomDekForNewCode(');
    assert.ok(rotateAt >= 0 && rewrapAt > rotateAt, 'rewrap must run after the code rotates server-side');
    assert.match(body, /rewrapRoomDekForNewCode\(deps\.getApi\(\), roomId, data\.code\)/);
  });
});
