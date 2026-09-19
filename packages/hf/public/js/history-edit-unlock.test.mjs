import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesHistoryEditCode, promptHistoryEditUnlock, HISTORY_EDIT_UNLOCK_PHRASE } from './history-edit-unlock.mjs';

test('matchesHistoryEditCode accepts the phrase ignoring case/accents/whitespace', () => {
  assert.equal(matchesHistoryEditCode(HISTORY_EDIT_UNLOCK_PHRASE), true);
  assert.equal(matchesHistoryEditCode('  ENTIENDO,   esto MODIFICA un registro pasado  '), true);
  assert.equal(matchesHistoryEditCode('entiendo, esto modifica un registro pasado'.replace('o', 'ó')), true);
});

test('matchesHistoryEditCode rejects anything else', () => {
  assert.equal(matchesHistoryEditCode(''), false);
  assert.equal(matchesHistoryEditCode('entiendo'), false);
  assert.equal(matchesHistoryEditCode(null), false);
});

test('promptHistoryEditUnlock shows a DOM modal (not window.prompt, which Electron never renders), confirm with the right code resolves true', async () => {
  if (typeof document === 'undefined') return;
  var pending = promptHistoryEditUnlock();
  var input = document.querySelector('[data-text-prompt-input]');
  assert.ok(input, 'modal input should be in the DOM');
  input.value = HISTORY_EDIT_UNLOCK_PHRASE;
  document.querySelector('[data-text-prompt-confirm]').click();
  assert.equal(await pending, true);
  assert.equal(document.querySelector('.modal-backdrop'), null, 'modal removed after confirm');
});

test('promptHistoryEditUnlock resolves false on the wrong code or Cancelar', async () => {
  if (typeof document === 'undefined') return;
  var pending = promptHistoryEditUnlock();
  document.querySelector('[data-text-prompt-input]').value = 'wrong';
  document.querySelector('[data-text-prompt-confirm]').click();
  assert.equal(await pending, false);

  var pending2 = promptHistoryEditUnlock();
  document.querySelector('[data-text-prompt-cancel]').click();
  assert.equal(await pending2, false);
});
