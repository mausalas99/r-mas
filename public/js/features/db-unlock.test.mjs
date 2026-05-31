import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { needsPassphraseConfirm } from './db-unlock.mjs';

describe('db-unlock', () => {
  it('requires confirm when migration is pending', () => {
    assert.equal(needsPassphraseConfirm({ migrationPending: true, dbFileExists: true }), true);
  });

  it('requires confirm when db file does not exist', () => {
    assert.equal(needsPassphraseConfirm({ migrationPending: false, dbFileExists: false }), true);
  });

  it('does not require confirm for existing encrypted db', () => {
    assert.equal(needsPassphraseConfirm({ migrationPending: false, dbFileExists: true }), false);
  });
});
