import { test } from 'node:test';
import assert from 'node:assert/strict';
import { potassiumReposDurationClause } from './potassium-repos-detect.mjs';

function carrierItem(dosisRaw) {
  return {
    nombreRaw: 'CLORURO DE SODIO 0.9 % SOL INY 1000 ML',
    viaRaw: 'VIA INTRAVENOSA',
    dosisRaw: dosisRaw,
    frecuenciaRaw: 'UNICA VEZ',
    suspendido: false,
  };
}

function kReposBlock(dosisRaw) {
  return [
    {
      nombreRaw: 'CLORURO DE POTASIO 20 MEQ SOL INY 5 ML (+)',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '60 MEQ',
      frecuenciaRaw: '-',
      suspendido: false,
    },
    carrierItem(dosisRaw),
  ];
}

test('potassiumReposDurationClause — variantes de tasa CC/hora', () => {
  var cases = [
    '800 ML / VEL.INF: 40 CC/HORA',
    '800ML / VEL.INF: 40cc/hr',
    '800 ML / VEL.INF: 40 CC/HR',
    '800 ML VEL.INF: 40 CC POR HORA',
    '800 ML / VEL.INF:40ML/HR',
  ];
  cases.forEach(function (dosisRaw) {
    assert.equal(potassiumReposDurationClause(kReposBlock(dosisRaw)), 'PARA 20 HORAS', dosisRaw);
  });
});

test('potassiumReposDurationClause — variantes de PARA X horas', () => {
  assert.equal(
    potassiumReposDurationClause(kReposBlock('800 ML / VEL.INF: PARA 20 HORAS')),
    'PARA 20 HORAS'
  );
  assert.equal(
    potassiumReposDurationClause(kReposBlock('800 ML / VEL.INF: para 12 hrs')),
    'PARA 12 HORAS'
  );
  assert.equal(
    potassiumReposDurationClause(kReposBlock('800 ML / VEL.INF: EN 6 HR')),
    'PARA 6 HORAS'
  );
});
