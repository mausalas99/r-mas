/** Resuelve nombres de fármacos en texto clínico → infusión o ATB. */

import { MANEJO_ATB_DRUGS } from './manejo-atb-catalog.mjs';

var DRUG_ALIASES = {
  'pip/tazo': 'piperacilina-tazobactam',
  'pip-tazo': 'piperacilina-tazobactam',
  'pip tazo': 'piperacilina-tazobactam',
  tzp: 'piperacilina-tazobactam',
  'amox/clav': 'amoxicilina-clavulanato',
  'amox clav': 'amoxicilina-clavulanato',
  vanco: 'vancomicina-carga',
  vancomicina: 'vancomicina-carga',
  meropenem: 'meropenem',
  cefepime: 'cefepime',
  ciprofloxacino: 'ciprofloxacino',
  levofloxacino: 'levofloxacino',
  nore: 'nore-standard',
  noradrenalina: 'nore-standard',
};

function stripDiacritics(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeClinicalDrugName(name) {
  return stripDiacritics(String(name || ''))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function protocolTitleStem(title) {
  return normalizeClinicalDrugName(String(title || '').split(/[—(]/)[0]);
}

/**
 * @param {string} name
 * @param {Array<{ id: string, title: string }>} [allProtocols]
 */
export function findProtocolByClinicalDrugName(name, allProtocols) {
  var needle = normalizeClinicalDrugName(name);
  if (!needle) return null;

  var aliasId = DRUG_ALIASES[needle];
  if (aliasId) {
    var byAlias = (allProtocols || []).find(function (p) {
      return p.id === aliasId;
    });
    if (byAlias) return byAlias;
  }

  var exact = null;
  var prefix = null;
  (allProtocols || []).forEach(function (p) {
    var stem = protocolTitleStem(p.title);
    if (stem === needle) exact = p;
    else if (!exact && (stem.startsWith(needle + ' ') || needle.startsWith(stem + ' '))) {
      if (!prefix || p.title.length < prefix.title.length) prefix = p;
    }
  });
  return exact || prefix;
}

/**
 * @param {string} name
 */
export function findAtbDrugByClinicalName(name) {
  var needle = normalizeClinicalDrugName(name);
  if (!needle) return null;

  var aliasId = DRUG_ALIASES[needle];
  if (aliasId) {
    var byAlias = MANEJO_ATB_DRUGS.find(function (d) {
      return d.id === aliasId;
    });
    if (byAlias) return byAlias;
  }

  var exact = null;
  var partial = null;
  MANEJO_ATB_DRUGS.forEach(function (drug) {
    var drugNorm = normalizeClinicalDrugName(drug.name);
    if (drugNorm === needle || normalizeClinicalDrugName(drug.id) === needle) {
      exact = drug;
      return;
    }
    (drug.someAbbrev || []).forEach(function (abbr) {
      if (normalizeClinicalDrugName(abbr) === needle) exact = drug;
    });
    if (!exact && (drugNorm.startsWith(needle) || needle.startsWith(drugNorm.split(' ')[0]))) {
      if (!partial || drug.name.length < partial.name.length) partial = drug;
    }
  });
  return exact || partial;
}

/**
 * Infusión tiene prioridad sobre ATB.
 * @param {string} name
 * @param {Array<{ id: string, title: string }>} [allProtocols]
 * @returns {{ kind: 'protocol'|'atb', id: string, entry: object }|null}
 */
export function resolveClinicalDrugLink(name, allProtocols) {
  var proto = findProtocolByClinicalDrugName(name, allProtocols);
  if (proto) return { kind: 'protocol', id: proto.id, entry: proto };

  var atb = findAtbDrugByClinicalName(name);
  if (atb) return { kind: 'atb', id: atb.id, entry: atb };

  return null;
}
