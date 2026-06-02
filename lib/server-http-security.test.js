'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  getRequestClientIp,
  isLoopbackClientIp,
  createDocumentExportAuthMiddleware,
} = require('./server-http-security.js');

describe('server-http-security', () => {
  it('isLoopbackClientIp accepts localhost variants', () => {
    assert.equal(isLoopbackClientIp('127.0.0.1'), true);
    assert.equal(isLoopbackClientIp('::1'), true);
    assert.equal(isLoopbackClientIp('192.168.1.10'), false);
  });

  it('getRequestClientIp normalizes IPv4-mapped loopback', () => {
    const req = { socket: { remoteAddress: '::ffff:127.0.0.1' } };
    assert.equal(getRequestClientIp(req), '127.0.0.1');
  });

  it('document export middleware allows loopback', () => {
    const mw = createDocumentExportAuthMiddleware(() => ({ teamCodeHash: 'x' }));
    const req = { socket: { remoteAddress: '127.0.0.1' }, get: () => '' };
    let called = false;
    const res = {
      status() {
        return this;
      },
      json() {},
    };
    mw(req, res, () => {
      called = true;
    });
    assert.equal(called, true);
  });

  it('document export middleware rejects remote without bearer', () => {
    const mw = createDocumentExportAuthMiddleware(() => ({ teamCodeHash: 'x' }));
    const req = { socket: { remoteAddress: '10.0.0.5' }, get: () => '' };
    let statusCode = 0;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json() {},
    };
    mw(req, res, () => {});
    assert.equal(statusCode, 403);
  });
});
