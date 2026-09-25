import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTier1Paths } from './changed-files.mjs';

test('filterTier1Paths keeps public/js and lib', () => {
  const paths = ['public/js/features/foo.mjs', 'README.md', 'lib/db/schema.mjs'];
  const out = filterTier1Paths(paths);
  assert.deepEqual(out.sort(), ['lib/db/schema.mjs', 'public/js/features/foo.mjs'].sort());
});

test('filterTier1Paths also keeps the packages/core-prefixed paths git actually reports post-split', () => {
  const paths = [
    'packages/core/public/js/features/foo.mjs',
    'packages/core/lib/db/schema.mjs',
    'packages/hf/public/js/features/foo.mjs',
    'packages/core/docs/foo.md',
  ];
  const out = filterTier1Paths(paths);
  assert.deepEqual(
    out.sort(),
    ['packages/core/lib/db/schema.mjs', 'packages/core/public/js/features/foo.mjs'].sort()
  );
});
