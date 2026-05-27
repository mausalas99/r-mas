import { test } from 'node:test';
import assert from 'node:assert/strict';
import { protoCategoryCssClass } from './manejo-proto-category-colors.mjs';

test('protoCategoryCssClass ignora ids meta', () => {
  assert.equal(protoCategoryCssClass('all'), '');
  assert.equal(protoCategoryCssClass('favorites'), '');
  assert.equal(protoCategoryCssClass('recent'), '');
});

test('protoCategoryCssClass genera clase por categoría', () => {
  assert.equal(protoCategoryCssClass('vasopresores'), 'manejo-proto-category--vasopresores');
  assert.equal(protoCategoryCssClass('fluidos'), 'manejo-proto-category--fluidos');
});
