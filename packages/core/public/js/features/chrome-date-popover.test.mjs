import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerChromeRuntime, openHeaderDatePopoverFromChrome } from './chrome.mjs';
import { getLabHistory } from '../app-state.mjs';
import { closeDatePopover } from './workbench/date-popover.mjs';

describe('openHeaderDatePopoverFromChrome', () => {
  it('does nothing without a #today-date anchor in the DOM', () => {
    if (typeof document === 'undefined') return;
    registerChromeRuntime({
      getActiveId: () => null,
      switchAppTab: () => {},
    });
    assert.doesNotThrow(() => openHeaderDatePopoverFromChrome());
    assert.equal(document.querySelector('.wb-date-popover'), null);
  });

  it('opens the 286px popover anchored to #today-date with no patient active (no lab days)', () => {
    if (typeof document === 'undefined') return;
    const anchor = document.createElement('span');
    anchor.id = 'today-date';
    anchor.getBoundingClientRect = () => ({ top: 10, bottom: 30, left: 40, right: 100 });
    document.body.appendChild(anchor);

    registerChromeRuntime({
      getActiveId: () => null,
      switchAppTab: () => {},
    });

    openHeaderDatePopoverFromChrome();
    const popover = document.querySelector('.wb-date-popover');
    assert.ok(popover, 'popover should open even with no active patient');
    assert.doesNotMatch(popover.outerHTML, /wb-date-popover-labdays/);

    closeDatePopover();
    anchor.remove();
  });

  it('includes a "Días con labs" row for the active patient\'s lab history', () => {
    if (typeof document === 'undefined') return;
    const anchor = document.createElement('span');
    anchor.id = 'today-date';
    anchor.getBoundingClientRect = () => ({ top: 10, bottom: 30, left: 40, right: 100 });
    document.body.appendChild(anchor);

    const pid = 'test-patient-date-popover';
    getLabHistory()[pid] = [{ id: 's1', fecha: '17/08/2026', hora: '07:00', resLabs: ['BH\tHb 8.2*'] }];
    registerChromeRuntime({
      getActiveId: () => pid,
      switchAppTab: () => {},
    });

    openHeaderDatePopoverFromChrome();
    const popover = document.querySelector('.wb-date-popover');
    assert.ok(popover);
    assert.match(popover.outerHTML, /Días con labs/);
    assert.match(popover.outerHTML, /wb-date-popover-labday/);

    closeDatePopover();
    anchor.remove();
    delete getLabHistory()[pid];
  });
});
