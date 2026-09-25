import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGlobalFn } from './resolve-global-fn.mjs';

describe('resolveGlobalFn', () => {
  const original = globalThis.someHandler;

  afterEach(() => {
    if (original) globalThis.someHandler = original;
    else delete globalThis.someHandler;
  });

  it('returns the globalThis function when set', () => {
    const fn = () => 'ran';
    globalThis.someHandler = fn;
    assert.equal(resolveGlobalFn('someHandler'), fn);
  });

  it('returns null when nothing is published', () => {
    delete globalThis.someHandler;
    assert.equal(resolveGlobalFn('someHandler'), null);
  });

  it('returns null when the global is not a function', () => {
    globalThis.someHandler = 'not a function';
    assert.equal(resolveGlobalFn('someHandler'), null);
  });
});
