import test from 'node:test';
import assert from 'node:assert/strict';
import { renderComponent } from './preact-view-test-helpers.mjs';

const render = () => renderComponent(import.meta.url, 'SettingsTemplates', './settings-templates-view.jsx');

test('Plantillas keeps the four cards and their data-onclick hooks', async () => {
  const html = await render();
  for (const action of ['openExtraTemplatesManager', 'openNoteFormatsFromProfile', 'openIndicaFormatsFromProfile', 'resetProfileTemplates']) {
    assert.ok(html.includes(`data-onclick="${action}"`), action);
  }
  assert.equal((html.match(/class="settings-card"/g) || []).length, 4);
  assert.ok(html.includes('class="wb-btn wb-btn-ghost wb-btn-sm"'));
});
