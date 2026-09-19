import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cloudNubeFixModalMarkup,
  getCloudNubeFixGuide,
  resolveCloudErrorFixId,
} from './cloud-nube-fix-guides.mjs';

describe('cloud-nube-fix-guides', () => {
  it('resolveCloudErrorFixId maps cliente nube errors', () => {
    assert.equal(
      resolveCloudErrorFixId({ op: 'cycle', message: 'Cliente Nube no configurado' }),
      'sync_client_not_ready'
    );
    assert.equal(resolveCloudErrorFixId({ code: 'revision_stale' }), 'revision_stale');
  });

  it('getCloudNubeFixGuide returns steps', () => {
    const guide = getCloudNubeFixGuide('sync_not_active');
    assert.ok(guide);
    assert.ok(guide.steps.length >= 3);
  });

  it('cloudNubeFixModalMarkup includes numbered steps', () => {
    const guide = getCloudNubeFixGuide('no_internet');
    const html = cloudNubeFixModalMarkup(guide);
    assert.match(html, /cloud-nube-fix-modal/);
    assert.match(html, /cloud-nube-fix-step/);
    assert.match(html, /<ol class="cloud-nube-fix-steps">/);
    assert.ok(!html.includes('cloud-nube-fix-step-num'));
  });
});
