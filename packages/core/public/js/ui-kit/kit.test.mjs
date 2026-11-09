import test from 'node:test';
import assert from 'node:assert/strict';
import { stopEscapeBehindDialog } from './kit.jsx';

const doc = (...open) => ({ querySelectorAll: () => open });
const key = (k) => ({ key: k, stopped: false, stopPropagation() { this.stopped = true; } });

test('Esc on the topmost open dialog is stopped before view handlers', () => {
  const dlg = { open: true };
  const ev = key('Escape');
  assert.equal(stopEscapeBehindDialog(ev, dlg, doc({ open: true }, dlg)), true);
  assert.equal(ev.stopped, true);
});

test('a dialog under another one lets the event pass', () => {
  const dlg = { open: true };
  const ev = key('Escape');
  assert.equal(stopEscapeBehindDialog(ev, dlg, doc(dlg, { open: true })), false);
  assert.equal(ev.stopped, false);
});

test('other keys and closed dialogs are left alone', () => {
  const dlg = { open: true };
  const a = key('Enter');
  assert.equal(stopEscapeBehindDialog(a, dlg, doc(dlg)), false);
  const closed = { open: false };
  const b = key('Escape');
  assert.equal(stopEscapeBehindDialog(b, closed, doc(closed)), false);
  assert.equal(a.stopped || b.stopped, false);
});
