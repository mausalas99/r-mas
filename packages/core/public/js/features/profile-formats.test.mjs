import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setFormatsEditMode, clearFormatsEditMode } from '../profile-formats-editor.mjs';
import { exitFormatsEditor } from './profile-formats.mjs';

describe('exitFormatsEditor global handler wiring', () => {
  const original = globalThis.renderNotaEvolucionPrimaryTab;

  afterEach(() => {
    clearFormatsEditMode();
    if (original) globalThis.renderNotaEvolucionPrimaryTab = original;
    else delete globalThis.renderNotaEvolucionPrimaryTab;
  });

  it('calls the window-published renderNotaEvolucionPrimaryTab handler when leaving nota edit mode', () => {
    setFormatsEditMode('nota');
    const calls = [];
    globalThis.renderNotaEvolucionPrimaryTab = () => calls.push('rendered');
    exitFormatsEditor();
    assert.deepEqual(calls, ['rendered']);
  });

  it('does not throw when no handler is published', () => {
    setFormatsEditMode('nota');
    delete globalThis.renderNotaEvolucionPrimaryTab;
    assert.doesNotThrow(() => exitFormatsEditor());
  });
});
