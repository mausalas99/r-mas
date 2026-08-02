import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { connectStepHtml, connectedStepsHtml } from './panel-steps-html.mjs';

describe('connectStepHtml', () => {
  it('includes recover tab and recover action', () => {
    const html = connectStepHtml('https://example.workers.dev');
    assert.match(html, /data-cloud-tab="recover"/);
    assert.match(html, /Recuperar/);
    assert.match(html, /data-cloud-action="recover"/);
    assert.match(html, /data-cloud-recover-user/);
    assert.match(html, /data-cloud-recover-code/);
  });

  it('defaults login tab panel visible', () => {
    const html = connectStepHtml('');
    assert.match(html, /data-cloud-tab-panel="login"[^>]*role="tabpanel"/);
    assert.match(html, /data-cloud-tab-panel="recover"[^>]*hidden/);
  });
});

describe('connectedStepsHtml', () => {
  it('renders Más details collapsed by default', () => {
    const html = connectedStepsHtml({
      cloudUser: { username: 'doc', displayName: 'Dr. Test' },
      roomHtml: '<div data-test-room></div>',
      equipoHtml: '<button data-cloud-action="open-rotation">Ir a Mi rotación</button>',
      masBodyHtml: '<div data-test-mas></div>',
    });
    assert.match(html, /<details class="cloud-sync-mas">/);
    assert.doesNotMatch(html, /<details class="cloud-sync-mas"[^>]*\bopen\b/);
    assert.match(html, /data-cloud-action="regenerate-recovery"/);
    assert.match(html, /data-cloud-step="2"/);
    assert.match(html, /data-cloud-step="3"/);
  });
});
