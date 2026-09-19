import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { addAuditEntry } from './audit.mjs';
import { AUDIT_LOG_KEY } from './shared.mjs';

describe('platform/audit.mjs addAuditEntry quota handling', () => {
  let origSetItem;

  afterEach(() => {
    if (typeof localStorage === 'undefined') return;
    if (origSetItem) localStorage.setItem = origSetItem;
    localStorage.removeItem(AUDIT_LOG_KEY);
  });

  it('does not throw when localStorage.setItem exceeds quota', () => {
    if (typeof localStorage === 'undefined') return;
    origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    };
    assert.doesNotThrow(() => addAuditEntry('delete-patient', 'ok', 1, 'test'));
  });
});
