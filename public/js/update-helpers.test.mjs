import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBytes,
  formatSpeed,
  formatProgressLine,
  sanitizeUpdaterUserMessage,
} from './update-helpers.mjs';

test('formatBytes redondea MB legibles', () => {
  assert.match(formatBytes(39258624), /37\.\d+ MB/);
  assert.match(formatBytes(62075776), /59\.\d+ MB/);
});

test('formatBytes usa B/KB bajo 1 MB', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(15360), '15 KB');
});

test('formatSpeed devuelve — sin tasa', () => {
  assert.equal(formatSpeed(0), '—');
  assert.equal(formatSpeed(-1), '—');
});

test('formatProgressLine concatena partes', () => {
  const s = formatProgressLine({
    transferred: 10 * 1024 * 1024,
    total: 20 * 1024 * 1024,
    bytesPerSecond: 1024 * 1024,
  });
  assert.ok(s.includes('Descargando'));
  assert.ok(s.includes('/'));
});

test('sanitizeUpdaterUserMessage collapses HTML release dumps', () => {
  const dump =
    '<div>R+ 7.9.4 (Hybrid H)</div>\n' +
    'https://github.com/mausalas99/r-mas/releases/tag/v7.9.4\n' +
    'https://rplus-sync.rmas-workersdev.workers.dev/mobile/\n' +
    'npm run build:mac\n' +
    'x'.repeat(500);
  const out = sanitizeUpdaterUserMessage(dump);
  assert.ok(out.length < 280);
  assert.ok(!out.includes('<div'));
  assert.ok(!/npm run build/i.test(out));
  assert.match(out, /GitHub|actualización|versión/i);
});

test('sanitizeUpdaterUserMessage keeps short real errors', () => {
  assert.equal(
    sanitizeUpdaterUserMessage('sha512 checksum mismatch'),
    'sha512 checksum mismatch'
  );
});
