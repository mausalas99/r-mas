import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const mutationsSrc = readFileSync(join(dir, 'todos-mutations.mjs'), 'utf8');
const emitSrc = readFileSync(join(dir, 'lan/live-sync-emit.mjs'), 'utf8');

describe('deleteTodo cloud clock', () => {
  it('passes a fresh delAt into emitLiveSyncTodoDelete (not only when victim missing)', () => {
    const fn = mutationsSrc.slice(
      mutationsSrc.indexOf('export function deleteTodo'),
      mutationsSrc.indexOf('export function setTodoPriority')
    );
    assert.match(fn, /emitLiveSyncTodoDelete\(aid\(\), victim \|\| \{ id: id \}, delAt\)/);
    assert.doesNotMatch(fn, /if \(victim\) emitLiveSyncTodoDelete/);
  });

  it('emitLiveSyncTodoDelete prefers delete clock over todo.updatedAt for Nube', () => {
    const fn = emitSrc.slice(
      emitSrc.indexOf('export function emitLiveSyncTodoDelete'),
      emitSrc.indexOf('export function emitLiveSyncPatientDelete')
    );
    assert.match(fn, /var deleteAt = String\(updatedAt \|\| new Date\(\)\.toISOString\(\)\)/);
    assert.match(fn, /cloudEmit\('todo-delete', \[patientId, todoRef, deleteAt\]\)/);
    assert.doesNotMatch(fn, /todo && todo\.updatedAt\) \|\| updatedAt/);
  });
});
