import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { adminPromptModalMarkup } from './admin-prompt-modal.mjs';

const here = dirname(fileURLToPath(import.meta.url));

describe('adminPromptModalMarkup', () => {
  it('renders title, message, and actions', () => {
    const html = adminPromptModalMarkup({
      title: 'Confirmar eliminación',
      message: 'Escribe @demo',
      placeholder: '@demo',
      confirmLabel: 'Eliminar',
      inputType: 'text',
    });
    assert.match(html, /data-admin-prompt-modal/);
    assert.match(html, /Confirmar eliminación/);
    assert.match(html, /Escribe @demo/);
    assert.match(html, /data-admin-prompt-input/);
    assert.match(html, /data-admin-prompt-ok/);
    assert.match(html, /data-admin-prompt-cancel/);
  });
});

describe('panel-admin-actions prompt usage', () => {
  it('does not call window.prompt (broken in Electron)', () => {
    const src = readFileSync(join(here, 'panel-admin-actions.mjs'), 'utf8');
    assert.equal(src.includes('window.prompt('), false);
    assert.match(src, /showAdminPromptModal/);
  });
});
