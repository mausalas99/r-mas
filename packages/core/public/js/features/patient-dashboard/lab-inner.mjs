/**
 * Laboratorio inner: Labs | Tendencias | Cultivos.
 */
import { LAB_INNER_SECTIONS } from '../../expediente-group-row.mjs';

var rt = {
  getActiveAppTab() {
    return 'nota';
  },
  getActiveInner() {
    return 'resumen';
  },
  setActiveInner() {},
  switchAppTab() {},
  switchInnerTab() {},
};

export function registerLabInnerRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

export function labInnerFromGranular(inner) {
  if (inner === 'tend' || inner === 'cult') return inner;
  return 'labs';
}

export function innerAfterLeavingLab(inner) {
  if (inner === 'tend' || inner === 'cult') return 'resumen';
  return inner;
}

export function currentLabInner() {
  return labInnerFromGranular(rt.getActiveInner());
}

export function syncLabInnerVisibility() {
  var section = currentLabInner();
  var labs = document.getElementById('lab-inner-labs');
  var tend = document.getElementById('lab-inner-tend-mount');
  var cult = document.getElementById('lab-inner-cult-mount');
  if (labs) labs.hidden = section !== 'labs';
  if (tend) tend.hidden = section !== 'tend';
  if (cult) cult.hidden = section !== 'cult';
  document.querySelectorAll('[data-lab-inner]').forEach(function (btn) {
    var on = btn.getAttribute('data-lab-inner') === section;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

export function switchLabInner(section) {
  var next = LAB_INNER_SECTIONS.indexOf(section) >= 0 ? section : 'labs';
  if (next === 'tend' || next === 'cult') {
    rt.switchInnerTab(next);
    syncLabInnerVisibility();
    return;
  }
  rt.switchAppTab('lab');
  var inner = rt.getActiveInner();
  if (inner === 'tend' || inner === 'cult') {
    rt.setActiveInner('resumen');
  }
  syncLabInnerVisibility();
}

export const windowHandlers = {
  switchLabInner: switchLabInner,
};
