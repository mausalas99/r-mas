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
