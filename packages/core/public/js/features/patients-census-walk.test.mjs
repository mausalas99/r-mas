import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextCensusPatientId,
  censusWalkDeltaForKey,
  isCensusWalkTypingContext,
  isCensusWalkWidgetContext,
  isCensusWalkOverlayOpen,
  shouldHandleCensusWalkKeydown,
  handleCensusWalkKeydown,
} from './patients-census-walk.mjs';

const IDS = ['a', 'b', 'c'];
const BODY = { tagName: 'BODY', isContentEditable: false };

describe('nextCensusPatientId', () => {
  it('walks forward and wraps', () => {
    assert.equal(nextCensusPatientId(IDS, 'a', 1), 'b');
    assert.equal(nextCensusPatientId(IDS, 'c', 1), 'a');
  });

  it('walks backward and wraps', () => {
    assert.equal(nextCensusPatientId(IDS, 'b', -1), 'a');
    assert.equal(nextCensusPatientId(IDS, 'a', -1), 'c');
  });

  it('starts at the matching end when current is missing', () => {
    assert.equal(nextCensusPatientId(IDS, 'z', 1), 'a');
    assert.equal(nextCensusPatientId(IDS, '', -1), 'c');
  });

  it('returns null on empty list or zero delta', () => {
    assert.equal(nextCensusPatientId([], 'a', 1), null);
    assert.equal(nextCensusPatientId(IDS, 'a', 0), null);
  });
});

describe('census walk ↑/↓ policy', () => {
  it('ArrowDown is next, ArrowUp is previous; J/K do not walk', () => {
    assert.equal(censusWalkDeltaForKey('ArrowDown'), 1);
    assert.equal(censusWalkDeltaForKey('ArrowUp'), -1);
    assert.equal(censusWalkDeltaForKey('j'), 0);
    assert.equal(censusWalkDeltaForKey('k'), 0);
    assert.equal(censusWalkDeltaForKey('ArrowLeft'), 0);
  });

  it('does not fire in input, textarea, select, or contenteditable', () => {
    assert.equal(isCensusWalkTypingContext({ tagName: 'INPUT' }), true);
    assert.equal(isCensusWalkTypingContext({ tagName: 'TEXTAREA' }), true);
    assert.equal(isCensusWalkTypingContext({ tagName: 'SELECT' }), true);
    assert.equal(isCensusWalkTypingContext({ tagName: 'DIV', isContentEditable: true }), true);
    assert.equal(isCensusWalkTypingContext(BODY), false);
  });

  it('skips when a child sits inside a text field', () => {
    if (typeof document === 'undefined') return;
    var wrap = document.createElement('textarea');
    assert.equal(shouldHandleCensusWalkKeydown({ key: 'ArrowDown', target: wrap }), false);
  });

  it('skips the app tab strip and dialogs', () => {
    if (typeof document === 'undefined') return;
    var list = document.createElement('div');
    list.setAttribute('role', 'tablist');
    var tab = document.createElement('button');
    list.appendChild(tab);
    assert.equal(isCensusWalkWidgetContext(tab), true);
    var dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    var btn = document.createElement('button');
    dialog.appendChild(btn);
    assert.equal(isCensusWalkWidgetContext(btn), true);
    assert.equal(isCensusWalkWidgetContext(BODY), false);
  });

  it('skips while a modal or command palette is open', () => {
    if (typeof document === 'undefined') return;
    var root = document.createElement('div');
    var bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    root.appendChild(bd);
    assert.equal(isCensusWalkOverlayOpen(root), false);
    bd.classList.add('open');
    assert.equal(isCensusWalkOverlayOpen(root), true);
    bd.classList.remove('open');
    var cmdk = document.createElement('div');
    cmdk.className = 'cmdk-backdrop';
    cmdk.hidden = true;
    root.appendChild(cmdk);
    assert.equal(isCensusWalkOverlayOpen(root), false);
    cmdk.hidden = false;
    assert.equal(isCensusWalkOverlayOpen(root), true);
  });

  it('fires on the document body without modifiers', () => {
    assert.equal(shouldHandleCensusWalkKeydown({ key: 'ArrowDown', target: BODY }), true);
  });

  it('does not fire with ⌘/Ctrl/Alt/Shift or while composing', () => {
    assert.equal(shouldHandleCensusWalkKeydown({ key: 'ArrowDown', metaKey: true, target: BODY }), false);
    assert.equal(shouldHandleCensusWalkKeydown({ key: 'ArrowDown', ctrlKey: true, target: BODY }), false);
    assert.equal(shouldHandleCensusWalkKeydown({ key: 'ArrowDown', altKey: true, target: BODY }), false);
    assert.equal(shouldHandleCensusWalkKeydown({ key: 'ArrowDown', shiftKey: true, target: BODY }), false);
    assert.equal(shouldHandleCensusWalkKeydown({ key: 'ArrowDown', isComposing: true, target: BODY }), false);
  });

  it('does not fire in focus mode', () => {
    assert.equal(
      shouldHandleCensusWalkKeydown({ key: 'ArrowUp', target: BODY }, { focusMode: true }),
      false
    );
  });

  it('handleCensusWalkKeydown advances and preventDefault', () => {
    var got = 0;
    var prevented = false;
    var ok = handleCensusWalkKeydown(
      {
        key: 'ArrowDown',
        target: { tagName: 'DIV', isContentEditable: false },
        preventDefault() {
          prevented = true;
        },
      },
      function (delta) {
        got = delta;
      }
    );
    assert.equal(ok, true);
    assert.equal(got, 1);
    assert.equal(prevented, true);
  });

  it('handleCensusWalkKeydown is a no-op in a textbox', () => {
    var called = false;
    var ok = handleCensusWalkKeydown(
      {
        key: 'ArrowUp',
        target: { tagName: 'TEXTAREA', isContentEditable: false },
        preventDefault() {},
      },
      function () {
        called = true;
      }
    );
    assert.equal(ok, false);
    assert.equal(called, false);
  });
});
