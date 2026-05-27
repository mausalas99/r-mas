/**
 * Bloque CAD/EHH (checklist ADA) en patologías de Manejo.
 */
import { parsePatientWeightKg } from '../electrolyte-manejo.mjs';
import {
  CAD_CHECKLIST,
  CAD_LAB_MONITORING,
  CAD_NURSING_MONITORING,
  EHH_CHECKLIST,
  EHH_LAB_MONITORING,
  EHH_NURSING_MONITORING,
  evaluateCadEhh,
  getPotassiumRepletionGuidance,
} from '../manejo-cad-ehh.mjs';
import { openPathologyFocusModal } from '../manejo-pathology-focus.mjs';
import {
  cadEhhFluidSomeOrder,
  cadGlucose250DextrosePlanOrder,
  cadInsulinStartSomeOrder,
  checklistItemToSomeOrder,
  kRepletionToSomeOrder,
  labMonitorToSomeOrder,
  suggestIvFluidCarrier,
} from '../manejo-some-format.mjs';
import { createManejoSomeUi, isManejoSomeCopyUiEnabled } from './manejo-some-ui.mjs';
import { normalizeFechaLabHistory, sortLabHistoryChronological } from '../tend-core.mjs';

/** @type {{ attachCopy?: (btn: HTMLElement, getter: () => string) => void }} */
var cadAdaDeps = {};

/** @type {{ ensureParsedLabHistory(id: string): unknown[] }} */
var rt = {
  ensureParsedLabHistory() {
    return [];
  },
};

export function registerManejoCadAdaRuntime(partial) {
  if (partial && typeof partial === 'object') Object.assign(rt, partial);
}

/**
 * @param {{ attachCopy?: (btn: HTMLElement, getter: () => string) => void }} deps
 */
export function configureManejoCadAda(deps) {
  cadAdaDeps = deps && typeof deps === 'object' ? deps : {};
  refreshCadSomeUi();
}

function refreshCadSomeUi() {
  _cadSomeUi = createManejoSomeUi({
    attachCopy:
      typeof cadAdaDeps.attachCopy === 'function'
        ? cadAdaDeps.attachCopy
        : function () {},
  });
  buildAdaOrderBlock = _cadSomeUi.buildAdaOrderBlock;
}

var _cadSomeUi = createManejoSomeUi({ attachCopy: function () {} });
var buildAdaOrderBlock = _cadSomeUi.buildAdaOrderBlock;

function cadStepDoneKey(pid, stepId) {
  return 'manejoCadStepDone:' + String(pid || 'none') + ':' + stepId;
}

function isCadStepDone(pid, stepId) {
  try {
    return sessionStorage.getItem(cadStepDoneKey(pid, stepId)) === '1';
  } catch (_e) {
    return false;
  }
}

function setCadStepDone(pid, stepId, done) {
  try {
    sessionStorage.setItem(cadStepDoneKey(pid, stepId), done ? '1' : '0');
  } catch (_e2) {}
}


function appendCadAdaChecklistBody(parent, opts) {
  if (opts.alert) {
    var alert = document.createElement('p');
    alert.className = 'manejo-cad-k-alert';
    alert.textContent = opts.alert;
    parent.appendChild(alert);
  }
  if (opts.carrierNote) {
    var note = document.createElement('p');
    note.className = 'manejo-hint manejo-cad-carrier-note';
    note.textContent = opts.carrierNote;
    parent.appendChild(note);
  }
  if (opts.text && !opts.orderGetter) {
    var p = document.createElement('p');
    p.className = 'manejo-cad-checklist-text';
    p.textContent = opts.text;
    parent.appendChild(p);
  }
  if (opts.orderGetter) {
    var orderWrap = document.createElement('div');
    orderWrap.className = 'manejo-cad-some-block';
    orderWrap.appendChild(buildAdaOrderBlock(opts.orderGetter, opts.displayKind));
    parent.appendChild(orderWrap);
  }
  if (opts.extra) parent.appendChild(opts.extra);
}

function buildCadAdaRecommendationButton(opts) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'manejo-pathology-rec-btn';
  if (isCadStepDone(opts.pid, opts.id)) {
    btn.classList.add('manejo-pathology-rec-btn--done');
  }
  var num = document.createElement('span');
  num.className = 'manejo-pathology-rec-num';
  num.textContent = String(opts.index);
  var title = document.createElement('span');
  title.className = 'manejo-pathology-rec-title';
  title.textContent = opts.title;
  btn.appendChild(num);
  btn.appendChild(title);
  btn.addEventListener('click', function () {
    var content = document.createElement('div');
    content.className = 'manejo-cad-check-body';
    appendCadAdaChecklistBody(content, opts);
    openPathologyFocusModal(opts.title, content);
  });
  return btn;
}


function buildAdaPotassiumTableExtra(kGuide) {
  var wrap = document.createElement('details');
  wrap.className = 'manejo-cad-k-details';
  var summary = document.createElement('summary');
  summary.textContent = 'Ver tabla completa de K⁺ (ADA)';
  wrap.appendChild(summary);
  wrap.appendChild(buildAdaPotassiumSection(kGuide, { compact: true }));
  return wrap;
}

function buildAdaFluidsInsulinFlow(ctx, stepBuilder) {
  stepBuilder = stepBuilder || buildCadAdaRecommendationButton;
  var flow = document.createElement('div');
  flow.className = 'manejo-cad-checklist-flow';
  var labs = (ctx.evalOut && ctx.evalOut.labs) || {};
  var wKg = ctx.patient ? parsePatientWeightKg(ctx.patient) : null;
  var kGuide = ctx.kGuide || getPotassiumRepletionGuidance(labs.k);
  var carrier = suggestIvFluidCarrier(labs);
  var carrierNote = carrier.warnings.length ? carrier.warnings.join(' ') : '';
  var protocolMode = ctx.protocolMode;
  var stepIdx = 1;

  flow.appendChild(
    stepBuilder({
      id: protocolMode === 'ehh' ? 'ehh-fluids' : 'cad-fluids',
      pid: ctx.pid,
      index: stepIdx++,
      title: 'Fluidos IV',
      defaultOpen: true,
      carrierNote: carrierNote,
      orderGetter: function () {
        return cadEhhFluidSomeOrder(protocolMode, wKg, labs);
      },
    })
  );

  var kAlert =
    kGuide.active && kGuide.active.holdInsulin
      ? 'K⁺ ' +
        kGuide.kValue +
        ' mEq/L — suspender insulina hasta K⁺ > 3.3 mEq/L y reponer potasio IV.'
      : null;
  flow.appendChild(
    stepBuilder({
      id: protocolMode + '-potassium',
      pid: ctx.pid,
      index: stepIdx++,
      title: 'Cloruro de potasio',
      defaultOpen: !isCadStepDone(ctx.pid, protocolMode === 'ehh' ? 'ehh-fluids' : 'cad-fluids'),
      alert: kAlert,
      carrierNote: carrierNote,
      text: kGuide.active ? null : kGuide.summary,
      orderGetter: kGuide.active
        ? function () {
            return kRepletionToSomeOrder(kGuide.active, labs);
          }
        : null,
      extra: buildAdaPotassiumTableExtra(kGuide),
    })
  );

  filterChecklistByIds(ctx.checklist, ctx.fluidsInsulinIds)
    .filter(function (item) {
      return item.id.indexOf('fluids') === -1;
    })
    .forEach(function (item) {
      flow.appendChild(
        stepBuilder({
          id: item.id,
          pid: ctx.pid,
          index: stepIdx++,
          title: item.phase,
          orderGetter: function () {
            if (item.id === 'cad-insulin' || item.id === 'ehh-insulin') {
              return cadInsulinStartSomeOrder(wKg, item);
            }
            return checklistItemToSomeOrder(item);
          },
        })
      );
      if (protocolMode === 'cad' && item.id === 'cad-insulin') {
        flow.appendChild(
          stepBuilder({
            id: 'cad-glucose-250',
            pid: ctx.pid,
            index: stepIdx++,
            title: 'Glucosa capilar 250 mg/dL',
            orderGetter: function () {
              return cadGlucose250DextrosePlanOrder(wKg, labs);
            },
          })
        );
      }
    });

  return flow;
}

function buildAdaMonitoringFlow(pid, items, idPrefix, stepBuilder) {
  stepBuilder = stepBuilder || buildCadAdaRecommendationButton;
  var flow = document.createElement('div');
  flow.className = 'manejo-cad-checklist-flow';
  (items || []).forEach(function (item, i) {
    flow.appendChild(
      stepBuilder({
        id: idPrefix + item.id,
        pid: pid,
        index: i + 1,
        title: item.study,
        defaultOpen: i === 0,
        displayKind: 'monitor',
        orderGetter: function () {
          return labMonitorToSomeOrder(item);
        },
      })
    );
  });
  return flow;
}

function adaFooterDisplayKind(item) {
  if (!item || !item.id) return 'milestone';
  if (item.id.indexOf('resolution') !== -1 || item.id.indexOf('transition') !== -1) {
    return 'criteria';
  }
  return 'milestone';
}

function buildAdaFooterFlow(pid, items, stepBuilder) {
  stepBuilder = stepBuilder || buildCadAdaRecommendationButton;
  var flow = document.createElement('div');
  flow.className = 'manejo-cad-checklist-flow';
  (items || []).forEach(function (item, i) {
    flow.appendChild(
      stepBuilder({
        id: item.id,
        pid: pid,
        index: i + 1,
        title: item.phase,
        defaultOpen: i === 0,
        displayKind: adaFooterDisplayKind(item),
        orderGetter: function () {
          return checklistItemToSomeOrder(item);
        },
      })
    );
  });
  return flow;
}


function buildAdaPotassiumSection(kGuide, opts) {
  opts = opts || {};
  var section = document.createElement('section');
  section.className = 'manejo-cad-step manejo-cad-step--k';

  if (!opts.compact) {
    var head = document.createElement('div');
    head.className = 'manejo-cad-step-head';
    var title = document.createElement('h3');
    title.className = 'manejo-cad-step-title';
    title.textContent = 'Reposición de potasio (ADA)';
    head.appendChild(title);
    section.appendChild(head);
  }

  if (kGuide && kGuide.summary) {
    var summary = document.createElement('p');
    summary.className = 'manejo-cad-k-summary';
    summary.textContent = kGuide.summary;
    section.appendChild(summary);
  }

  var table = document.createElement('div');
  table.className = 'manejo-cad-k-table';
  var headRow = document.createElement('div');
  headRow.className = 'manejo-cad-k-row manejo-cad-k-row--head';
  ['Rango K⁺', 'Recomendación ADA'].forEach(function (label) {
    var cell = document.createElement('span');
    cell.className = 'manejo-cad-k-cell manejo-cad-k-cell--range';
    cell.textContent = label;
    headRow.appendChild(cell);
  });
  table.appendChild(headRow);

  (kGuide && kGuide.ranges ? kGuide.ranges : []).forEach(function (row) {
    var isActive = kGuide.active && kGuide.active.id === row.id;
    var tr = document.createElement('div');
    tr.className = 'manejo-cad-k-row' + (isActive ? ' manejo-cad-k-row--active' : '');
    var cRange = document.createElement('span');
    cRange.className = 'manejo-cad-k-cell manejo-cad-k-cell--range';
    cRange.textContent = row.rangeLabel;
    var cAct = document.createElement('span');
    cAct.className = 'manejo-cad-k-cell manejo-cad-k-cell--action';
    cAct.textContent = row.detail;
    tr.appendChild(cRange);
    tr.appendChild(cAct);
    table.appendChild(tr);
  });
  section.appendChild(table);
  return section;
}

var CAD_FLUIDS_INSULIN_IDS = ['cad-fluids', 'cad-insulin', 'cad-bicarb'];
var CAD_FOOTER_IDS = ['cad-resolution', 'cad-transition'];
var EHH_FLUIDS_INSULIN_IDS = ['ehh-fluids', 'ehh-insulin'];
var EHH_FOOTER_IDS = ['ehh-precipitant'];

function filterChecklistByIds(checklist, ids) {
  return (ids || [])
    .map(function (id) {
      return (checklist || []).find(function (item) {
        return item.id === id;
      });
    })
    .filter(Boolean);
}


export function buildPathologyCadEhhBlock(entry, pid, patient) {
  var section = document.createElement('section');
  section.className = 'manejo-pathology-section manejo-pathology-cad-ehh';

  var h4 = document.createElement('h4');
  h4.className = 'manejo-pathology-section-title';
  h4.textContent = 'Checklist ADA';
  section.appendChild(h4);

  var ref = document.createElement('p');
  ref.className = 'manejo-hint manejo-cad-ada-ref';
  ref.textContent =
    'Recomendaciones según ADA (adultos). Haz clic en cada paso para ver el detalle y pedido SOME.';
  section.appendChild(ref);

  if (!pid) {
    var emp = document.createElement('p');
    emp.className = 'manejo-hint';
    emp.textContent = 'Selecciona un paciente para personalizar fluidos, potasio e insulina.';
    section.appendChild(emp);
    return section;
  }

  var hist = rt.ensureParsedLabHistory(pid);
  var ordered = sortLabHistoryChronological(hist);
  var latest = ordered[0] || null;
  if (!latest) {
    var emp2 = document.createElement('p');
    emp2.className = 'manejo-hint';
    emp2.textContent = 'Sin laboratorio reciente — envía BH/QS/gasometría para sugerencias ADA.';
    section.appendChild(emp2);
    return section;
  }

  var evalOut = evaluateCadEhh({
    parsed: latest.parsed,
    parsedBySection: latest.parsedBySection,
    patient: patient,
  });
  var mode = entry.cadEhhMode === 'ehh' ? 'ehh' : 'cad';
  var kGuide = evalOut.potassiumGuidance || getPotassiumRepletionGuidance(evalOut.labs && evalOut.labs.k);
  var checklist = mode === 'ehh' ? EHH_CHECKLIST : CAD_CHECKLIST;
  var fluidsInsulinIds = mode === 'ehh' ? EHH_FLUIDS_INSULIN_IDS : CAD_FLUIDS_INSULIN_IDS;
  var footerIds = mode === 'ehh' ? EHH_FOOTER_IDS : CAD_FOOTER_IDS;
  var labItems = mode === 'ehh' ? EHH_LAB_MONITORING : CAD_LAB_MONITORING;
  var nursingItems = mode === 'ehh' ? EHH_NURSING_MONITORING : CAD_NURSING_MONITORING;

  var labGrid = document.createElement('div');
  labGrid.className = 'manejo-cad-lab-grid manejo-pathology-cad-labs';
  var L = evalOut.labs || {};
  [
    ['Glucosa', L.glucoseMgDl != null ? L.glucoseMgDl + ' mg/dL' : '—'],
    ['pH', L.ph != null ? String(L.ph) : '—'],
    ['HCO₃', L.hco3 != null ? L.hco3 + ' mEq/L' : '—'],
    ['K⁺', L.k != null ? L.k + ' mEq/L' : '—'],
  ].forEach(function (pair) {
    var cell = document.createElement('div');
    cell.className = 'manejo-cad-lab-cell';
    var lbl = document.createElement('span');
    lbl.className = 'manejo-cad-lab-label';
    lbl.textContent = pair[0];
    var val = document.createElement('span');
    val.className = 'manejo-cad-lab-val';
    val.textContent = pair[1];
    cell.appendChild(lbl);
    cell.appendChild(val);
    labGrid.appendChild(cell);
  });
  section.appendChild(labGrid);

  var groups = document.createElement('div');
  groups.className = 'manejo-pathology-rec-groups';

  function addGroup(title, flowEl) {
    var grp = document.createElement('div');
    grp.className = 'manejo-pathology-rec-group';
    var gt = document.createElement('h5');
    gt.className = 'manejo-pathology-rec-group-title';
    gt.textContent = title;
    grp.appendChild(gt);
    grp.appendChild(flowEl);
    groups.appendChild(grp);
  }

  addGroup(
    'Fluidos e insulina',
    buildAdaFluidsInsulinFlow(
      {
        protocolMode: mode,
        pid: pid,
        patient: patient,
        evalOut: evalOut,
        checklist: checklist,
        fluidsInsulinIds: fluidsInsulinIds,
        kGuide: kGuide,
      },
      buildCadAdaRecommendationButton
    )
  );
  addGroup('Laboratorio', buildAdaMonitoringFlow(pid, labItems, 'lab-', buildCadAdaRecommendationButton));
  addGroup(
    'Cuidados de enfermería',
    buildAdaMonitoringFlow(pid, nursingItems, 'nur-', buildCadAdaRecommendationButton)
  );

  var footerItems = filterChecklistByIds(checklist, footerIds);
  if (footerItems.length) {
    addGroup('Criterios y transición', buildAdaFooterFlow(pid, footerItems, buildCadAdaRecommendationButton));
  }

  section.appendChild(groups);
  return section;
}