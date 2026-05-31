import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConflictDiffHtml,
  buildConflictContextHtml,
  buildConflictModalTitle,
  pickDiffKeys,
  formatFieldLabel,
} from './clinical-conflict-viewer.mjs';

test('highlights conflicting keys in both columns', () => {
  const html = buildConflictDiffHtml({
    conflictingKeys: ['cuarto'],
    localData: { cuarto: '101', cama: 'A' },
    serverData: { cuarto: '201', cama: 'A' },
  });
  assert.ok(html.includes('Cuarto'));
  assert.ok(html.includes('conflict-field'));
  assert.ok(html.includes('101'));
  assert.ok(html.includes('201'));
});

test('shows only conflicting keys when listed', () => {
  const html = buildConflictDiffHtml({
    conflictingKeys: ['cuarto'],
    localData: { cuarto: '101', cama: 'A' },
    serverData: { cuarto: '201', cama: 'A' },
  });
  assert.ok(!html.includes('cama'));
});

test('omits internal metadata when server has no value', () => {
  const keys = pickDiffKeys(
    ['id', 'version', 'cuarto'],
    { id: 'a', version: 1, cuarto: '101' },
    { cuarto: '201' }
  );
  assert.deepEqual(keys, ['cuarto']);
});

test('escapes HTML in field values', () => {
  const html = buildConflictDiffHtml({
    conflictingKeys: ['nombre'],
    localData: { nombre: '<script>' },
    serverData: { nombre: 'Ana' },
  });
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test('context explains transport and versions', () => {
  const html = buildConflictContextHtml({
    entityType: 'historiaClinica',
    transport: 'http',
    localVersion: 2,
    serverVersion: 4,
    patientId: 'patient-abc-123',
  });
  assert.ok(html.includes('Historia clínica'));
  assert.ok(html.includes('host'));
  assert.ok(html.includes('v2'));
  assert.ok(html.includes('v4'));
});

test('todo delete shows pendiente label not english Todo', () => {
  const html = buildConflictContextHtml({
    entityType: 'todo',
    intent: 'todo-delete',
    itemPreview: 'VIGILAR POTASIO',
    patientDisplayName: 'MIGUEL ANGEL VELAZQUEZ GARCIA',
    transport: 'ws',
  });
  assert.ok(html.includes('Pendiente'));
  assert.ok(html.includes('VIGILAR POTASIO'));
  assert.ok(html.includes('MIGUEL ANGEL'));
  assert.ok(!html.match(/\bTodo\b/));
});

test('formatFieldLabel maps known keys', () => {
  assert.equal(formatFieldLabel('motivoConsulta'), 'Motivo de consulta');
});

test('modal title for todo is plain spanish', () => {
  assert.equal(buildConflictModalTitle({ entityType: 'todo' }), 'Pendiente en la sala');
});
