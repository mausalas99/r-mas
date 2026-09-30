import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('join errors and sign-out', () => {
  it('after «Cerrar sesión», the old token’s 403 does not show «Tu sesión expiró»; a new login clears it', async () => {
    const els = { 'nube-session-banner': { hidden: true }, 'profile-nube-session': { hidden: true } };
    const prev = globalThis.document;
    globalThis.document = { getElementById: (id) => els[id] || null };
    try {
      const m = await import('./session-expired-prompt.mjs');
      m.noteNubeAuthResponse(403, { error: 'auth_required' }, 'tok-old');
      assert.equal(els['nube-session-banner'].hidden, false, 'a real expiry shows the banner');
      m.noteNubeSignedOut('tok-old');
      assert.equal(els['nube-session-banner'].hidden, true);
      // The logout call itself answers 200, then in-flight requests get 403.
      m.noteNubeAuthResponse(200, {}, 'tok-old');
      m.noteNubeAuthResponse(403, { error: 'auth_required' }, 'tok-old');
      assert.equal(els['nube-session-banner'].hidden, true, 'signed out on purpose: stays hidden');
      m.noteNubeAuthResponse(200, {}, 'tok-new');
      m.noteNubeAuthResponse(403, { error: 'auth_required' }, 'tok-new');
      assert.equal(els['nube-session-banner'].hidden, false, 'a new session that expires shows it again');
    } finally {
      globalThis.document = prev;
    }
  });
});

describe('handleLeaveRoom', () => {
  const makeDeps = (leaveRoom) => {
    const calls = { stop: 0, toasts: [], cleared: 0, disconnected: 0 };
    return {
      calls,
      deps: {
        getCloudSyncRoomId: () => 'room-1',
        getApi: () => ({ leaveRoom }),
        stopRuntime: () => { calls.stop += 1; },
        toast: (msg, kind) => calls.toasts.push([msg, kind]),
        setCloudSyncRoomSnapshot: () => { calls.cleared += 1; },
        renderDisconnected: () => { calls.disconnected += 1; },
      },
    };
  };

  it('keeps the room and shows an error when the server refuses the leave', async () => {
    const { handleLeaveRoom } = await import('./panel-conexion-handlers.mjs');
    const { deps, calls } = makeDeps(async () => { throw Object.assign(new Error('x'), { data: {} }); });
    await handleLeaveRoom(deps);
    assert.equal(calls.cleared, 0);
    assert.equal(calls.stop, 0);
    assert.equal(calls.toasts[0][1], 'error');
  });

  it('leaves locally when the server already says not_member', async () => {
    const { handleLeaveRoom } = await import('./panel-conexion-handlers.mjs');
    const { deps, calls } = makeDeps(async () => { throw Object.assign(new Error('x'), { data: { error: 'not_member' } }); });
    await handleLeaveRoom(deps);
    assert.equal(calls.cleared, 1);
    assert.equal(calls.disconnected, 1);
  });
});

describe('drainOutboxWithRetry', () => {
  it('succeeds when a later flush empties the queue, and gives up after the last attempt', async () => {
    const { drainOutboxWithRetry } = await import('./panel-conexion-handlers.mjs');
    let queue = [1];
    let calls = 0;
    const flaky = async () => { calls += 1; if (calls === 2) queue = []; else throw new Error('overloaded'); };
    assert.equal(await drainOutboxWithRetry({ list: () => queue }, flaky, { waitMs: 1 }), true);
    assert.equal(calls, 2);
    calls = 0;
    queue = [1];
    assert.equal(await drainOutboxWithRetry({ list: () => queue }, async () => { calls += 1; }, { attempts: 3, waitMs: 1 }), false);
    assert.equal(calls, 3);
  });
});
