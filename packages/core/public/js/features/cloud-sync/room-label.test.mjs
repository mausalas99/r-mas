import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatCloudRoomLabel } from './room-label.mjs';
import { mutationsRoomOptionsHtml } from './panel-admin-html.mjs';
import { connectStepHtml } from './panel-steps-html.mjs';

describe('formatCloudRoomLabel', () => {
  it('includes sala, month key, code and members', () => {
    assert.equal(
      formatCloudRoomLabel({
        sala: 'Sala 1',
        turnKey: '2026-08',
        code: 'W8N6CW',
        memberCount: 3,
      }),
      'Sala 1 · 2026-08 · W8N6CW · 3 miembros'
    );
  });
});

describe('mutationsRoomOptionsHtml', () => {
  it('labels rooms with month key for disambiguation', () => {
    const html = mutationsRoomOptionsHtml([
      { id: '1', sala: 'Sala 1', code: 'RC65RH', turnKey: '2026-07', memberCount: 2 },
      { id: '2', sala: 'Sala 2', code: 'W8N6CW', turnKey: '2026-08', memberCount: 1 },
    ]);
    assert.match(html, /Sala 1 · 2026-07 · RC65RH · 2 miembros/);
    assert.match(html, /Sala 2 · 2026-08 · W8N6CW · 1 miembro/);
  });
});

describe('connectStepHtml remember me', () => {
  it('includes Recuérdame checkbox on login', () => {
    const html = connectStepHtml('https://example.workers.dev');
    assert.match(html, /data-cloud-login-remember/);
    assert.match(html, /Recuérdame en este dispositivo/);
  });
});

describe('connectStepHtml register remember me', () => {
  it('includes Recuérdame checkbox on register', () => {
    const html = connectStepHtml('https://example.workers.dev');
    assert.match(html, /data-cloud-reg-remember/);
  });
});
