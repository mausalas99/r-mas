import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildLanJoinUrls, parseLanJoinQuery, parseLanInviteInput } from './lan-join-link.mjs';

describe('lan-join-link', () => {
  it('buildLanJoinUrls usa ruta /join/req_ sin code en query', () => {
    const ticketId = 'req_a1b2c3d4e5f6';
    const u = buildLanJoinUrls('http://192.168.1.5:3738/', ticketId);
    assert.equal(u.joinUrl, 'http://192.168.1.5:3738/join/req_a1b2c3d4e5f6');
    assert.equal(u.mobileUrl, 'http://192.168.1.5:3738/join/req_a1b2c3d4e5f6');
    assert.ok(!u.joinUrl.includes('code='));
  });

  it('parseLanJoinQuery lee code y room (legacy query helper)', () => {
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

  it('parseLanInviteInput lee URL /join/req_', () => {
    const p = parseLanInviteInput('http://192.168.0.10:3738/join/req_deadbeefcafe');
    assert.equal(p.hostUrl, 'http://192.168.0.10:3738');
    assert.equal(p.ticketId, 'req_deadbeefcafe');
    assert.equal(p.teamCode, '');
    assert.equal(p.legacyInvite, false);
  });

  it('parseLanInviteInput marca legacy ?code= sin devolver token', () => {
    const p = parseLanInviteInput('http://192.168.0.10:3738/join?code=sec&room=sala1');
    assert.equal(p.hostUrl, 'http://192.168.0.10:3738');
    assert.equal(p.teamCode, '');
    assert.equal(p.roomId, 'sala1');
    assert.equal(p.legacyInvite, true);
    assert.equal(p.ticketId, '');
  });

  it('parseLanInviteInput marca legacy /mobile/?code=', () => {
    const p = parseLanInviteInput('http://192.168.0.10:3738/mobile/?code=sec');
    assert.equal(p.hostUrl, 'http://192.168.0.10:3738');
    assert.equal(p.teamCode, '');
    assert.equal(p.legacyInvite, true);
  });

  it('parseLanInviteInput extrae ticket de texto con contexto', () => {
    const p = parseLanInviteInput(
      'Hola — abre esto:\nhttp://192.168.0.10:3738/join/req_cafebabef00d\nGracias'
    );
    assert.equal(p.ticketId, 'req_cafebabef00d');
    assert.equal(p.legacyInvite, false);
  });

  it('parseLanInviteInput marca query suelta legacy', () => {
    const p = parseLanInviteInput('code=only&room=r9');
    assert.equal(p.teamCode, '');
    assert.equal(p.roomId, 'r9');
    assert.equal(p.legacyInvite, true);
  });
});
