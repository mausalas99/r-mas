'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCscName, applyCscName, prepareMacSigning } = require('./mac-signing-prep');

test('normalizeCscName strips Developer ID Application prefix', () => {
  assert.equal(
    normalizeCscName('Developer ID Application: Mauricio Salas Garza (N78U9QC783)'),
    'Mauricio Salas Garza (N78U9QC783)'
  );
});

test('normalizeCscName leaves a bare identity unchanged', () => {
  assert.equal(
    normalizeCscName('Mauricio Salas Garza (N78U9QC783)'),
    'Mauricio Salas Garza (N78U9QC783)'
  );
});

test('normalizeCscName trims empty input', () => {
  assert.equal(normalizeCscName(''), '');
  assert.equal(normalizeCscName(null), '');
});

test('applyCscName mutates env so electron-builder does not see the prefix', () => {
  const env = {
    CSC_NAME: 'Developer ID Application: Mauricio Salas Garza (N78U9QC783)',
  };
  applyCscName(env);
  assert.equal(env.CSC_NAME, 'Mauricio Salas Garza (N78U9QC783)');
});

test('prepareMacSigning strips CSC_NAME on the env object', () => {
  const env = {
    CSC_NAME: 'Developer ID Application: Mauricio Salas Garza (N78U9QC783)',
  };
  prepareMacSigning(env);
  assert.equal(env.CSC_NAME, 'Mauricio Salas Garza (N78U9QC783)');
});
