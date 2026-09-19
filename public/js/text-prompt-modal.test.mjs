import { test } from 'node:test';
import assert from 'node:assert/strict';
import { askTextPrompt } from './text-prompt-modal.mjs';

test('askTextPrompt resolves with the typed value on confirm', async () => {
  if (typeof document === 'undefined') return;
  var pending = askTextPrompt({ title: 'Título', message: 'Mensaje', defaultValue: 'inicial' });
  var input = document.querySelector('[data-text-prompt-input]');
  assert.equal(input.value, 'inicial');
  input.value = 'Nefrología';
  document.querySelector('[data-text-prompt-confirm]').click();
  assert.equal(await pending, 'Nefrología');
  assert.equal(document.querySelector('.modal-backdrop'), null, 'modal removed after confirm');
});

test('askTextPrompt resolves null on cancel, backdrop click, or Escape', async () => {
  if (typeof document === 'undefined') return;
  var p1 = askTextPrompt();
  document.querySelector('[data-text-prompt-cancel]').click();
  assert.equal(await p1, null);

  var p2 = askTextPrompt();
  document.querySelector('.modal-backdrop').dispatchEvent(new Event('click', { bubbles: true }));
  assert.equal(await p2, null);

  var p3 = askTextPrompt();
  document.querySelector('[data-text-prompt-input]').dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  );
  assert.equal(await p3, null);
});

test('askTextPrompt Enter key confirms with the current input value', async () => {
  if (typeof document === 'undefined') return;
  var pending = askTextPrompt();
  var input = document.querySelector('[data-text-prompt-input]');
  input.value = 'Cardiología';
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(await pending, 'Cardiología');
});
