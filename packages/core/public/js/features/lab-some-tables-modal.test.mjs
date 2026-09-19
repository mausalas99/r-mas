import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  registerLabSomeTablesModalRuntime,
  openLabSomeTablesModal,
  closeLabSomeTablesModal,
} from './lab-some-tables-modal.mjs';

function mountBackdrop() {
  document.body.innerHTML =
    '<div id="lab-some-tables-backdrop"><div id="lab-some-tables-modal-body"></div></div>' +
    '<button id="lab-some-tables-btn"></button>';
}

describe('closeLabSomeTablesModal (reentrancy guard)', () => {
  beforeEach(() => {
    if (typeof document === 'undefined') return;
    mountBackdrop();
  });

  it('does not call syncLabOutputChrome when the modal was already closed', () => {
    if (typeof document === 'undefined') return;
    var calls = 0;
    registerLabSomeTablesModalRuntime({
      syncLabOutputChrome: function () {
        calls++;
      },
    });
    closeLabSomeTablesModal();
    assert.equal(calls, 0);
  });

  it(
    'closing an open modal terminates instead of recursing forever ' +
      '(syncLabOutputChrome calling back into closeLabSomeTablesModal is expected once, not infinitely)',
    () => {
      if (typeof document === 'undefined') return;
      var closeCalls = 0;
      var runtime = {
        showToast: function () {},
        getParsed: function () {
          return { departments: [{ groups: [] }] };
        },
        syncLabCopyFab: function () {},
        syncLabOutputChrome: function () {
          // Mirrors the real lab-panel.mjs syncLabOutputChrome: it closes this
          // modal again as part of its own chrome sync.
          closeCalls++;
          if (closeCalls > 5) throw new Error('recursion did not terminate');
          closeLabSomeTablesModal();
        },
      };
      registerLabSomeTablesModalRuntime(runtime);
      var backdrop = document.getElementById('lab-some-tables-backdrop');
      backdrop.classList.add('open');
      closeLabSomeTablesModal();
      assert.equal(closeCalls, 1);
      assert.equal(backdrop.classList.contains('open'), false);
    }
  );
});
