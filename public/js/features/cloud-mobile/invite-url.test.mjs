import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCloudMobileJoinUrl,
  buildCloudMobileBookmarkUrl,
  parseCloudMobileInviteSearch,
} from './invite-url.mjs';

describe('buildCloudMobileJoinUrl', () => {
  it('builds permanent user URL without room', () => {
    const u = buildCloudMobileJoinUrl({
      baseUrl: 'https://rplus-sync.example.workers.dev',
      auth: 'tokensecret',
      user: '@drmendoza',
    });
    assert.match(u, /^https:\/\/rplus-sync\.example\.workers\.dev\/mobile\/\?/);
    assert.match(u, /auth=tokensecret/);
    assert.match(u, /user=drmendoza/);
    assert.doesNotMatch(u, /room=/);
    assert.doesNotMatch(u, /user=%40/);
  });

  it('still accepts legacy room hints', () => {
    const u = buildCloudMobileJoinUrl({
      baseUrl: 'https://rplus-sync.example.workers.dev',
      auth: 'tok',
      user: 'ana',
      roomCode: 'AB12CD',
      sala: 'Sala 1',
    });
    assert.match(u, /room=AB12CD/);
    assert.match(u, /sala=Sala/);
  });

  it('returns empty when missing identity', () => {
    assert.equal(buildCloudMobileJoinUrl({ baseUrl: 'https://x.dev' }), '');
  });
});

describe('parseCloudMobileInviteSearch', () => {
  it('reads room auth user sala', () => {
    const p = parseCloudMobileInviteSearch('?room=AB12&auth=tok&user=ana&sala=Sala%201');
    assert.equal(p.room, 'AB12');
    assert.equal(p.auth, 'tok');
    assert.equal(p.user, 'ana');
    assert.equal(p.sala, 'Sala 1');
  });

  it('reads user-only permanent invite', () => {
    const p = parseCloudMobileInviteSearch('?auth=tok&user=ana');
    assert.equal(p.user, 'ana');
    assert.equal(p.room, '');
  });
});

describe('buildCloudMobileBookmarkUrl', () => {
  it('keeps auth and user without room', () => {
    const u = buildCloudMobileBookmarkUrl({
      baseUrl: 'https://x.dev',
      user: 'ana',
      auth: 'permanent-token',
    });
    assert.match(u, /user=ana/);
    assert.match(u, /auth=permanent-token/);
    assert.doesNotMatch(u, /room=/);
  });
});
