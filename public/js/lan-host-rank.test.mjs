import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  lanHostPriority,
  prefersLanHosting,
  resolveHostElection,
  shouldAutoJoinPeerAsClient,
  shouldDeferToPeerHost,
} from './lan-host-rank.mjs';

describe('lan-host-rank', () => {
  it('prefers R4 and program admin for hosting', () => {
    assert.equal(prefersLanHosting({ rank: 'R4', isProgramAdmin: false }), true);
    assert.equal(prefersLanHosting({ rank: 'R2', isProgramAdmin: true }), true);
    assert.equal(prefersLanHosting({ rank: 'R3', isProgramAdmin: false }), false);
    assert.equal(prefersLanHosting({ rank: 'R1', isProgramAdmin: false }), false);
  });

  it('shouldAutoJoinPeerAsClient defers lower ranks to R4', () => {
    const self = { rank: 'R2', isProgramAdmin: false };
    const peer = { rank: 'R4', isProgramAdmin: false };
    assert.equal(shouldAutoJoinPeerAsClient(peer, self), true);
    assert.equal(shouldAutoJoinPeerAsClient(self, peer), false);
  });

  it('does not auto-join between equal non-host-eligible ranks', () => {
    const a = { rank: 'R2', isProgramAdmin: false };
    const b = { rank: 'R2', isProgramAdmin: false };
    assert.equal(shouldAutoJoinPeerAsClient(a, b), false);
    assert.equal(shouldDeferToPeerHost(a, b), false);
  });

  it('program admin outranks R4', () => {
    const admin = { rank: 'R1', isProgramAdmin: true };
    const r4 = { rank: 'R4', isProgramAdmin: false };
    assert.ok(lanHostPriority(admin) > lanHostPriority(r4));
    assert.equal(shouldAutoJoinPeerAsClient(admin, r4), true);
  });

  it('resolveHostElection: higher rank wins', () => {
    const urls = { selfUrl: 'http://10.0.0.2:3738', peerUrl: 'http://10.0.0.3:3738' };
    assert.equal(
      resolveHostElection(
        { rank: 'R2', isProgramAdmin: false, startedAt: 1 },
        { rank: 'R4', isProgramAdmin: false, startedAt: 2 },
        urls
      ),
      'peer'
    );
  });

  it('resolveHostElection: admin outranks R4', () => {
    const urls = { selfUrl: 'http://10.0.0.2:3738', peerUrl: 'http://10.0.0.3:3738' };
    assert.equal(
      resolveHostElection(
        { rank: 'R4', isProgramAdmin: false, startedAt: 1 },
        { rank: 'R1', isProgramAdmin: true, startedAt: 9 },
        urls
      ),
      'peer'
    );
  });

  it('resolveHostElection: equal priority earlier startedAt wins', () => {
    const self = { rank: 'R4', isProgramAdmin: false, startedAt: 200 };
    const peer = { rank: 'R4', isProgramAdmin: false, startedAt: 100 };
    const urls = { selfUrl: 'http://10.0.0.2:3738', peerUrl: 'http://10.0.0.3:3738' };
    assert.equal(resolveHostElection(self, peer, urls), 'peer');
    assert.equal(resolveHostElection(peer, self, urls), 'self');
  });

  it('resolveHostElection: missing startedAt treated as later', () => {
    const urls = { selfUrl: 'http://10.0.0.2:3738', peerUrl: 'http://10.0.0.3:3738' };
    assert.equal(
      resolveHostElection(
        { rank: 'R4', isProgramAdmin: false, startedAt: 0 },
        { rank: 'R4', isProgramAdmin: false, startedAt: 50 },
        urls
      ),
      'peer'
    );
  });

  it('resolveHostElection: URL lexicographic tiebreak', () => {
    const meta = { rank: 'R4', isProgramAdmin: false, startedAt: 1 };
    assert.equal(
      resolveHostElection(meta, meta, {
        selfUrl: 'http://10.0.0.3:3738',
        peerUrl: 'http://10.0.0.2:3738',
      }),
      'tie-peer'
    );
  });
});
