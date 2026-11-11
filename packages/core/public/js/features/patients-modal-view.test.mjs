import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { IcServiceButtons } from './patients-modal-view.jsx';
  export const html = (names, selected) => renderToString(<IcServiceButtons names={names} selected={selected} onPick={() => {}} />);`);

const names = ['Cardiología', 'Neumología', 'Ginecología & Obstetricia'];
const buttons = (h) => h.match(/<button[^>]*>[\s\S]*?<\/button>/g) || [];
const label = (b) => b.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&');

test('one button per service name', () => {
  assert.equal(buttons(view.html(names, '')).length, names.length);
});

test('the selected service is the only pressed, primary button', () => {
  const pressed = buttons(view.html(names, names[1])).filter((b) => b.includes('aria-pressed="true"'));
  assert.equal(pressed.length, 1);
  assert.equal(label(pressed[0]), names[1]);
  assert.match(pressed[0], /wb-btn-primary/);
});

test('no selection presses no button', () => {
  assert.equal(buttons(view.html(names, '')).filter((b) => b.includes('aria-pressed="true"')).length, 0);
});

test('an unknown selection presses no button', () => {
  assert.equal(buttons(view.html(names, 'zzz')).filter((b) => b.includes('aria-pressed="true"')).length, 0);
});

test('service names are escaped', () => {
  const html = view.html(names, '');
  assert.ok(buttons(html).some((b) => label(b) === 'Ginecología & Obstetricia'));
  assert.doesNotMatch(html, /Obstetricia &amp;amp;/);
});

test('no names draws nothing', () => {
  assert.equal(view.html([], ''), '');
});
