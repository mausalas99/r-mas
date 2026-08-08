import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const mutationsSrc = readFileSync(join(dir, 'todos-mutations.mjs'), 'utf8');
const bridgeSrc = readFileSync(join(dir, 'cloud-sync/mutate-bridge.mjs'), 'utf8');

describe('deleteTodo cloud clock', () => {
  it('passes a fresh delAt into enqueueCloudTodoDelete (not only when victim missing)', () => {
    const fn = mutationsSrc.slice(
      mutationsSrc.indexOf('export function deleteTodo'),
      mutationsSrc.indexOf('export function setTodoPriority')
    );
    assert.match(fn, /enqueueCloudTodoDelete\(aid\(\), victim \|\| \{ id: id \}, delAt\)/);
    assert.doesNotMatch(fn, /if \(victim\) enqueueCloudTodoDelete/);
  });

  it('enqueueCloudTodoDelete uses a fresh delete clock for Nube tombstones', () => {
    const fn = bridgeSrc.slice(
      bridgeSrc.indexOf('export function enqueueCloudTodoDelete'),
      bridgeSrc.indexOf('export function enqueueCloudAgendaUpsert')
    );
    assert.match(fn, /updatedAt: String\(updatedAt \|\| new Date\(\)\.toISOString\(\)\)/);
    assert.match(fn, /_deleted: true/);
  });
});
