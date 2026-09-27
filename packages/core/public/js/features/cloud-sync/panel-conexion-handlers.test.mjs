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
