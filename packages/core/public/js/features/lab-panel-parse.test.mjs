import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { labOutputSettleEl } from './lab-panel-parse.mjs';

describe('labOutputSettleEl', () => {
  const section = { id: 'section' };
  const box = { id: 'box' };

  it('settles the section the first time output appears', () => {
    assert.equal(labOutputSettleEl(true, {}, section, box), section);
  });

  it('settles the box when replaying a history day', () => {
    assert.equal(labOutputSettleEl(false, { fromHistory: true }, section, box), box);
  });

  it('does not settle on an already-visible live parse', () => {
    assert.equal(labOutputSettleEl(false, {}, section, box), null);
  });
});
