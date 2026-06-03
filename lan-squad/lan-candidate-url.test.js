'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { pickLanCandidateBaseUrl, isLoopbackLanHost } = require('./lan-candidate-url.js');

describe('lan-candidate-url', () => {
  it('pickLanCandidateBaseUrl returns http URL or empty', () => {
    const url = pickLanCandidateBaseUrl(3738);
    if (url) {
      assert.match(url, /^http:\/\/\d+\.\d+\.\d+\.\d+:3738$/);
    }
  });

  it('isLoopbackLanHost detects localhost', () => {
    assert.equal(isLoopbackLanHost('localhost'), true);
    assert.equal(isLoopbackLanHost('127.0.0.1'), true);
    assert.equal(isLoopbackLanHost('10.0.0.5'), false);
  });
});
