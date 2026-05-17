import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildLanJoinUrls, parseLanJoinQuery } from './lan-join-link.mjs';

describe('lan-join-link', () => {
  it('buildLanJoinUrls incluye code y room', () => {
    const u = buildLanJoinUrls('http://192.168.1.5:3738', '1234', 'room-abc');
    assert.equal(u.joinUrl, 'http://192.168.1.5:3738/join?code=1234&room=room-abc');
    assert.equal(u.mobileUrl, 'http://192.168.1.5:3738/mobile/?code=1234&room=room-abc');
  });

  it('parseLanJoinQuery lee code y room', () => {
    const p = parseLanJoinQuery('?code=xyz&room=r1', 'http://10.0.0.2:3738');
    assert.equal(p.teamCode, 'xyz');
    assert.equal(p.roomId, 'r1');
    assert.equal(p.hostUrl, 'http://10.0.0.2:3738');
  });
});
