import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startPresentationMode, stopPresentationMode, registerPresentationRuntime } from './presentation-mode.mjs';

/**
 * Regression test for the teal-workbench Phase 0 rollout-plan bug: #patient-view has
 * no CSS `display` rule of its own — only inline style toggles it between 'none' and
 * 'flex' (see features/patients-select.mjs's showPatientViewShell()). startPresentationMode
 * used to clear the inline style to '' instead of setting it to 'flex', so the browser
 * fell back to the default block layout and the whole #patient-dashboard-mount ancestor
 * chain collapsed to its content-less height (~17px) even though the dashboard HTML was
 * present and populated.
 */

test('startPresentationMode sets #patient-view display to flex, not empty string', () => {
  if (typeof document === 'undefined') return;
  document.body.innerHTML = '<div id="patient-view" style="display:none;flex-direction:column;flex:1;overflow:hidden;"></div><div id="empty-state"></div>';

  registerPresentationRuntime({
    getActiveId: () => null,
    setActiveId: () => {},
    showToast: () => {},
  });

  startPresentationMode();

  const pv = document.getElementById('patient-view');
  assert.equal(pv.style.display, 'flex', '#patient-view must be explicitly display:flex, not cleared to \'\' (which falls back to block)');

  stopPresentationMode();
});
