import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

describe('panel-conexion-handlers remember / leave room', () => {
  const src = readFileSync(new URL('./panel-conexion-handlers.mjs', import.meta.url), 'utf8');

  it('leave room keeps auth token (does not clearCloudSyncSession)', () => {
    const start = src.indexOf('export async function handleLeaveRoom');
    const end = src.indexOf('export async function handleLogout', start);
    assert.ok(start >= 0 && end > start);
    const body = src.slice(start, end);
    assert.doesNotMatch(body, /clearCloudSyncSession/);
    assert.match(body, /setCloudSyncRoomSnapshot/);
  });

  it('register persists Recuérdame via data-cloud-reg-remember', () => {
    assert.match(src, /data-cloud-reg-remember/);
    assert.match(src, /resolveRememberFromSection/);
  });

  it('login/register/recover always re-render after auth (rebuild must not skip)', () => {
    for (const name of ['handleRegister', 'handleLogin', 'handleRecover']) {
      const start = src.indexOf(`export async function ${name}`);
      assert.ok(start >= 0, name);
      const next = src.indexOf('\nexport async function ', start + 1);
      const body = src.slice(start, next > start ? next : undefined);
      assert.match(body, /enterCloudSession\(/, name);
      assert.doesNotMatch(
        body,
        /if\s*\(\s*!rebuildPanelOnAuthChange/,
        `${name} must not skip in-place render when Recuérdame rebuild no-ops`
      );
    }
  });

  it('recover does not touch room DEKs (they are wrapped with the room code, not the login password)', () => {
    const start = src.indexOf('export async function handleRecover');
    const next = src.indexOf('\nexport async function ', start + 1);
    const body = src.slice(start, next > start ? next : undefined);
    assert.doesNotMatch(body, /cacheSessionPassword/);
    assert.doesNotMatch(body, /rewrapCachedRoomDeks/);
    assert.match(body, /enterCloudSession\(/);
  });

  it('create-room persists room DEKs to the durable store; join-room does the same via joinRoomByCode', () => {
    const createStart = src.indexOf('export async function handleCreateRoom');
    const createNext = src.indexOf('\nexport async function ', createStart + 1);
    assert.match(src.slice(createStart, createNext), /persistRoomDeks\(\)/, 'handleCreateRoom');

    const joinStart = src.indexOf('export async function handleJoinRoom');
    const joinNext = src.indexOf('\nexport async function ', joinStart + 1);
    assert.match(src.slice(joinStart, joinNext), /joinRoomByCode\(/, 'handleJoinRoom');

    const helperStart = src.indexOf('export async function joinRoomByCode');
    const helperNext = src.indexOf('\nexport async function ', helperStart + 1);
    assert.match(src.slice(helperStart, helperNext), /persistRoomDeks\(\)/, 'joinRoomByCode');
  });

  it('joinRoomByCode drains the outbox against the OLD room before switching (never lets pending edits ride into the new room)', () => {
    const start = src.indexOf('export async function joinRoomByCode');
    const next = src.indexOf('\nexport async function ', start + 1);
    const body = src.slice(start, next > start ? next : undefined);
    assert.match(body, /await flushOutboxBeforeRoomSwitch\(deps\);/);
    const joinCallIdx = body.indexOf('deps.getApi().joinRoom');
    const flushIdx = body.indexOf('flushOutboxBeforeRoomSwitch');
    assert.ok(flushIdx >= 0 && joinCallIdx > flushIdx, 'flush must happen before the room join call');
  });

  it('flushOutboxBeforeRoomSwitch throws (blocking the switch) instead of letting an undrained outbox through', () => {
    const start = src.indexOf('async function flushOutboxBeforeRoomSwitch');
    const next = src.indexOf('\nexport async function joinRoomByCode', start + 1);
    const body = src.slice(start, next > start ? next : undefined);
    assert.match(body, /outbox\.list\(\)\.length > 0/);
    assert.match(body, /throw err/);
  });

  it('afterAuthSuccess backfills room encryption fire-and-forget (never blocks/throws into login)', () => {
    const start = src.indexOf('export async function afterAuthSuccess');
    const next = src.indexOf('\nexport async function ', start + 1);
    const body = src.slice(start, next > start ? next : undefined);
    assert.match(body, /void ensureRoomEncryptionBackfill\(deps, room\)/);
    assert.doesNotMatch(body, /await ensureRoomEncryptionBackfill/);
  });

  it('ensureRoomEncryptionBackfill runs the backfill and persists DEKs, swallowing rejection', () => {
    const start = src.indexOf('export async function ensureRoomEncryptionBackfill');
    assert.ok(start >= 0);
    const next = src.indexOf('\nexport async function ', start + 1);
    const body = src.slice(start, next > start ? next : undefined);
    assert.match(body, /backfillRoomEncryption\(deps\.getApi\(\), room, getCloudSyncClientId\(\)\)/);
    assert.match(body, /\.catch\(\(\) => null\)/);
    assert.match(body, /persistRoomDeks\(\)/);
    // Must be safe to call on every reconnect: no-ops without a room or the flag.
    assert.match(body, /if\s*\(!room\?\.id \|\| !NUBE_E2EE_ENABLED\) return/);
  });

  it('logout always re-renders disconnected', () => {
    const start = src.indexOf('export async function handleLogout');
    const next = src.indexOf('\nexport async function ', start + 1);
    const body = src.slice(start, next > start ? next : undefined);
    assert.match(body, /deps\.renderDisconnected\(\)/);
    assert.doesNotMatch(body, /if\s*\(\s*!rebuildPanelOnAuthChange/);
  });

  it('login/register/recover enter the account before recovery modal or afterAuthSuccess', () => {
    const helperStart = src.indexOf('function enterCloudSession');
    const finishStart = src.indexOf('async function finishCloudAuthProfile');
    assert.ok(helperStart >= 0 && finishStart > helperStart);
    const enterBody = src.slice(helperStart, finishStart);
    assert.match(enterBody, /deps\.renderAfterAuth\(\)/);
    assert.doesNotMatch(enterBody, /afterAuthSuccess/);
    assert.doesNotMatch(enterBody, /maybeShowRecoveryCodeModal/);
    for (const name of ['handleRegister', 'handleLogin', 'handleRecover']) {
      const start = src.indexOf(`export async function ${name}`);
      const next = src.indexOf('\nexport async function ', start + 1);
      const body = src.slice(start, next > start ? next : undefined);
      const enterAt = body.indexOf('enterCloudSession(');
      const finishAt = body.indexOf('finishCloudAuthProfile(');
      assert.ok(enterAt >= 0 && finishAt > enterAt, name);
    }
  });
});

describe('enterCloudSession', () => {
  it('persists token and renders before any later work', async () => {
    const { enterCloudSession } = await import('./panel-conexion-handlers.mjs');
    let stored = '';
    let rendered = 0;
    enterCloudSession(
      {
        setCloudSyncToken(token) {
          stored = token;
        },
        getCloudSyncToken() {
          return stored;
        },
        renderAfterAuth() {
          rendered += 1;
        },
      },
      'sess-token',
      true,
      ''
    );
    assert.equal(stored, 'sess-token');
    assert.equal(rendered, 1);
  });

  it('throws if the server omitted a token', async () => {
    const { enterCloudSession } = await import('./panel-conexion-handlers.mjs');
    assert.throws(
      () =>
        enterCloudSession(
          {
            setCloudSyncToken() {},
            renderAfterAuth() {},
          },
          '',
          true,
          ''
        ),
      /no devolvió sesión/
    );
  });
});

describe('join errors and sign-out', () => {
  it('a code that matches no sala says it may have been changed', async () => {
    const { joinRoomErrorText } = await import('./panel-conexion-handlers.mjs');
    assert.match(joinRoomErrorText({ data: { error: 'not_found', message: 'Sala no encontrada.' } }), /si un admin lo cambió, pide el nuevo/);
    assert.equal(joinRoomErrorText({ data: { error: 'quota', message: 'Otra cosa.' } }), 'Otra cosa.');
    assert.equal(joinRoomErrorText(null), 'No se pudo unir a la sala.');
  });

  it('logout marks a deliberate sign-out before stopping sync', () => {
    const src = readFileSync(new URL('./panel-conexion-handlers.mjs', import.meta.url), 'utf8');
    const body = src.slice(src.indexOf('export async function handleLogout'));
    assert.ok(body.indexOf('noteNubeSignedOut(prevToken)') >= 0 && body.indexOf('noteNubeSignedOut(prevToken)') < body.indexOf('deps.stopRuntime()'));
  });

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
