import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildLanJoinUrls, parseLanJoinQuery, parseLanInviteInput } from './lan-join-link.mjs';

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

  it('parseLanJoinQuery acepta alias token', () => {
    const p = parseLanJoinQuery('?token=abc&room=r2', 'http://10.0.0.3:3738');
    assert.equal(p.teamCode, 'abc');
    assert.equal(p.roomId, 'r2');
  });

  it('parseLanInviteInput lee URL completa /join', () => {
    const p = parseLanInviteInput('http://192.168.0.10:3738/join?code=sec&room=sala1');
    assert.equal(p.hostUrl, 'http://192.168.0.10:3738');
    assert.equal(p.teamCode, 'sec');
    assert.equal(p.roomId, 'sala1');
  });

  it('parseLanInviteInput lee URL /mobile/', () => {
    const p = parseLanInviteInput('http://192.168.0.10:3738/mobile/?code=sec');
    assert.equal(p.hostUrl, 'http://192.168.0.10:3738');
    assert.equal(p.teamCode, 'sec');
  });

  it('parseLanInviteInput extrae enlace de texto con contexto', () => {
    const p = parseLanInviteInput(
      'Hola — abre esto:\nhttp://192.168.0.10:3738/join?code=abc123&room=room_x\nGracias'
    );
    assert.equal(p.teamCode, 'abc123');
    assert.equal(p.roomId, 'room_x');
  });

  it('parseLanInviteInput lee query suelta', () => {
    const p = parseLanInviteInput('code=only&room=r9');
    assert.equal(p.teamCode, 'only');
    assert.equal(p.roomId, 'r9');
  });
});
