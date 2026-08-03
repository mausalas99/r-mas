import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatCloudRoomLabel } from './room-label.mjs';
import { mutationsRoomOptionsHtml } from './panel-admin-html.mjs';
import { connectStepHtml } from './panel-steps-html.mjs';

describe('formatCloudRoomLabel', () => {
  it('includes sala, turn date, code and members', () => {
    assert.equal(
      formatCloudRoomLabel({
        sala: 'Sala',
        turnKey: '2026-08-03',
        code: 'W8N6CW',
        memberCount: 3,
      }),
      'Sala · 2026-08-03 · W8N6CW · 3 miembros'
    );
  });
});

describe('mutationsRoomOptionsHtml', () => {
  it('labels rooms with turn key for disambiguation', () => {
    const html = mutationsRoomOptionsHtml([
      { id: '1', sala: 'Sala', code: 'RC65RH', turnKey: '2026-08-02', memberCount: 2 },
      { id: '2', sala: 'Sala', code: 'W8N6CW', turnKey: '2026-08-03', memberCount: 1 },
    ]);
    assert.match(html, /Sala · 2026-08-02 · RC65RH · 2 miembros/);
    assert.match(html, /Sala · 2026-08-03 · W8N6CW · 1 miembro/);
  });
});

describe('connectStepHtml remember me', () => {
  it('includes Recuérdame checkbox on login', () => {
    const html = connectStepHtml('https://example.workers.dev');
    assert.match(html, /data-cloud-login-remember/);
    assert.match(html, /Recuérdame en este dispositivo/);
  });
});
