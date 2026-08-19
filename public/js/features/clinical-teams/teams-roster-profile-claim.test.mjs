import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import { claimClinicalUsernameIfNeeded } from './teams-roster-profile-claim.mjs';

describe('claimClinicalUsernameIfNeeded confirm gating', () => {
  const prevWindow = globalThis.window;
  const prevUser = clinicalSessionContext.user;

  beforeEach(() => {
    clinicalSessionContext.user = { user_id: 'u1', username: 'rold', rank: 'R2' };
  });

  afterEach(() => {
    globalThis.window = prevWindow;
    clinicalSessionContext.user = prevUser;
  });

  it('asks a consequence confirm before changing an existing username, and blocks on cancel', async () => {
    const confirmFn = mock.fn(async () => 'cancel');
    const dbClinicalUsernameClaim = mock.fn(async () => ({ ok: true }));
    globalThis.window = { rplusDb: { dbClinicalUsernameClaim } };

    const result = await claimClinicalUsernameIfNeeded('rnew', 'sala-1', { confirm: confirmFn });

    assert.equal(result, false);
    assert.equal(confirmFn.mock.callCount(), 1);
    const opts = confirmFn.mock.calls[0].arguments[0];
    assert.equal(opts.weight, 'consequence');
    assert.match(opts.title, /Cambiar tu usuario de @rold a @rnew/);
    assert.match(opts.consequenceText, /verán el nuevo nombre/);
    assert.equal(dbClinicalUsernameClaim.mock.callCount(), 0);
  });

  it('only claims the new username when the change is confirmed', async () => {
    const confirmFn = mock.fn(async () => 'confirm');
    const dbClinicalUsernameClaim = mock.fn(async () => ({ ok: true }));
    globalThis.window = { rplusDb: { dbClinicalUsernameClaim } };

    const result = await claimClinicalUsernameIfNeeded('rnew', 'sala-1', { confirm: confirmFn });

    assert.equal(result, true);
    assert.equal(confirmFn.mock.callCount(), 1);
    assert.equal(dbClinicalUsernameClaim.mock.callCount(), 1);
    assert.equal(clinicalSessionContext.user.username, 'rnew');
  });

  it('offers a consequence confirm to resume an existing username, and blocks on cancel', async () => {
    let calls = 0;
    const confirmFn = mock.fn(async (opts) => {
      calls += 1;
      // 1st call: confirm the username change itself. 2nd call: resume-existing offer.
      return calls === 1 ? 'confirm' : 'cancel';
    });
    const dbClinicalUsernameClaim = mock.fn(async () => ({
      ok: false,
      error: 'El usuario ya está en uso.',
    }));
    globalThis.window = { rplusDb: { dbClinicalUsernameClaim } };

    // Declining the resume offer falls through to a toast(), which needs a real
    // DOM the headless test runner doesn't have — assert the rejection instead
    // of the toast side effect (see teams-roster-manage.test.mjs for the same
    // pattern).
    await assert.rejects(
      claimClinicalUsernameIfNeeded('rnew', 'sala-1', { confirm: confirmFn }),
      /document is not defined/
    );
    assert.equal(confirmFn.mock.callCount(), 2);
    const resumeOpts = confirmFn.mock.calls[1].arguments[0];
    assert.equal(resumeOpts.weight, 'consequence');
    assert.match(resumeOpts.title, /El usuario @rnew ya existe/);
    assert.match(resumeOpts.consequenceText, /Recuperar tu cuenta/);
  });
});
