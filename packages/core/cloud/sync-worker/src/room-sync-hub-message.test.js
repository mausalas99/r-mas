import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildRevisionBroadcastMessage } from './room-sync-hub-message.js';

describe('buildRevisionBroadcastMessage', () => {
  it('carries ops verbatim alongside the revision when present', () => {
    const ops = [{ path: 'entries/p1/note', value: { text: 'estable' } }];
    const msg = buildRevisionBroadcastMessage({ revision: 5, ops });
    assert.equal(msg.type, 'revision');
    assert.equal(msg.revision, 5);
    assert.deepEqual(msg.ops, ops);
  });

  it('omits ops from the message when the payload carries none — unchanged bare-revision shape', () => {
    const msg = buildRevisionBroadcastMessage({ revision: 6 });
    assert.equal(msg.revision, 6);
    assert.ok(!('ops' in msg));
  });

  it('omits ops when the payload carries an empty array', () => {
    const msg = buildRevisionBroadcastMessage({ revision: 6, ops: [] });
    assert.ok(!('ops' in msg));
  });

  it('returns null for an invalid revision (0, negative, missing)', () => {
    assert.equal(buildRevisionBroadcastMessage({ revision: 0, ops: [{ path: 'x' }] }), null);
    assert.equal(buildRevisionBroadcastMessage({ revision: -1 }), null);
    assert.equal(buildRevisionBroadcastMessage({}), null);
  });

  it('defaults `at` to now when not given', () => {
    const msg = buildRevisionBroadcastMessage({ revision: 1 });
    assert.ok(msg.at);
  });
});
