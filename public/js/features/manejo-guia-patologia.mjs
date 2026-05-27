/**
 * Guía clínica — modo Patología (índice compacto + lectura timeline).
 */
import {
  MANEJO_PATHOLOGIES,
  findPathologyById,
  getRelatedPathologies,
  pathologyBranchLabelFor,
  pathologyMatchesSearch,
  pathologyStepCount,
} from '../manejo-pathology-catalog.mjs';
import {
  protocolIdsInPathologySections,
  protocolsLinkedToPathology,
} from '../manejo-protocol-links.mjs';
import { pathologyBranchCssClass } from '../manejo-pathology-branch-colors.mjs';
import { resolveClinicalDrugLink } from '../manejo-clinical-drug-link.mjs';
import {
  buildClinicalKvBlock,
  buildClinicalTextElement,
  recommendationCardTitle,
} from '../manejo-clinical-text.mjs';
import { tierLabel } from '../manejo-pathology-focus.mjs';
import {
  getPathologyBranchFilter,
  setPathologyBranchFilter,
  buildPathologyBranchMenu,
} from './manejo-patologias.mjs';
import { flattenPathologySteps, tierChipLabel } from './manejo-guia-steps.mjs';
import {
  getGuiaEntityId,
  navigateGuia,
  setGuiaEntityId,
} from './manejo-guia-state.mjs';

/**
 * @param {HTMLElement} host
 * @param {{ pid: string|null, patient: object|null, ui: object }} ctx
 */
export function renderGuiaPatologiaIndex(host, ctx) {
  var ui = ctx.ui;
  var toolbar = document.createElement('div');
  toolbar.className = 'manejo-guia-index-toolbar';

  var searchRow = document.createElement('div');
  searchRow.className = 'manejo-guia-index-search-row manejo-proto-search-row';
  var search = ui.buildManejoSearchInput('Patología, síntoma o rama…', 'Buscar patologías');
  searchRow.appendChild(search.field);

  var countBadge = document.createElement('span');
  countBadge.className = 'manejo-proto-count';
  countBadge.setAttribute('aria-live', 'polite');

  var activeBranch = getPathologyBranchFilter();
  var branchMenu = buildPathologyBranchMenu(activeBranch, function (next) {
    setPathologyBranchFilter(next);
    branchMenu.syncBranch(next);
    paintList();
  });
  searchRow.appendChild(branchMenu);
  searchRow.appendChild(countBadge);
  toolbar.appendChild(searchRow);
  host.appendChild(toolbar);

  var listHost = document.createElement('div');
  listHost.className = 'manejo-guia-index-list';
  host.appendChild(listHost);

  function paintList() {
    while (listHost.firstChild) listHost.removeChild(listHost.firstChild);
    var q = String(search.input.value || '').trim();
    var branch = getPathologyBranchFilter();
    var filtered = MANEJO_PATHOLOGIES.filter(function (entry) {
      if (branch !== 'all' && entry.branch !== branch) return false;
      return pathologyMatchesSearch(entry, q);
    });

    countBadge.textContent =
      filtered.length === 1 ? '1 patología' : filtered.length + ' patologías';

    if (!filtered.length) {
      var nz = document.createElement('p');
      nz.className = 'manejo-guia-placeholder';
      nz.textContent = q ? 'Sin coincidencias' : 'Sin patologías con estos filtros';
      listHost.appendChild(nz);
      return;
    }

    var byBranch = {};
    filtered.forEach(function (entry) {
      if (!byBranch[entry.branch]) byBranch[entry.branch] = [];
      byBranch[entry.branch].push(entry);
    });

    Object.keys(byBranch)
      .sort(function (a, b) {
        return pathologyBranchLabelFor(a).localeCompare(pathologyBranchLabelFor(b), 'es');
      })
      .forEach(function (branchId) {
        if (branch === 'all') {
          var secHead = document.createElement('h3');
          secHead.className = 'manejo-guia-index-section-title';
          secHead.textContent = pathologyBranchLabelFor(branchId);
          listHost.appendChild(secHead);
        }
        byBranch[branchId]
          .slice()
          .sort(function (a, b) {
            return a.title.localeCompare(b.title, 'es');
          })
          .forEach(function (entry) {
            listHost.appendChild(buildIndexRow(entry));
          });
      });
  }

  function buildIndexRow(entry) {
    var steps = pathologyStepCount(entry);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'manejo-guia-index-row';
    var title = document.createElement('span');
    title.className = 'manejo-guia-index-row-title';
    title.textContent = entry.title;
    btn.appendChild(title);
    if (getPathologyBranchFilter() === 'all') {
      var meta = document.createElement('span');
      meta.className = 'manejo-guia-index-row-meta';
      meta.textContent = pathologyBranchLabelFor(entry.branch);
      btn.appendChild(meta);
    }
    if (steps) {
      var badge = document.createElement('span');
      badge.className = 'manejo-guia-index-row-badge';
      badge.textContent = steps + (steps === 1 ? ' paso' : ' pasos');
      btn.appendChild(badge);
    }
    btn.addEventListener('click', function () {
      navigateGuia({ mode: 'patologia', view: 'lectura', entityId: entry.id });
      ctx.rerender();
    });
    return btn;
  }

  search.input.addEventListener('input', paintList);
  paintList();
}

/**
 * @param {HTMLElement} host
 * @param {{ pid: string|null, patient: object|null, ui: object }} ctx
 */
export function renderGuiaPatologiaReading(host, ctx) {
  var ui = ctx.ui;
  var pid = ctx.pid;
  var patient = ctx.patient;
  var entry = findPathologyById(getGuiaEntityId());
  var wrap = document.createElement('div');
  wrap.className = 'manejo-guia-reading ' + (entry ? pathologyBranchCssClass(entry.branch) : '');

  if (!entry) {
    var miss = document.createElement('p');
    miss.className = 'manejo-guia-placeholder';
    miss.textContent = 'Patología no encontrada.';
    wrap.appendChild(buildReadingBar(ctx, 'Patología'));
    wrap.appendChild(miss);
    host.appendChild(wrap);
    return;
  }

  wrap.appendChild(buildReadingBar(ctx, entry.title, entry));

  if (entry.definition) {
    var def = document.createElement('details');
    def.className = 'manejo-guia-details';
    var sum = document.createElement('summary');
    sum.textContent = 'Definición clínica';
    def.appendChild(sum);
    var defBody = document.createElement('p');
    defBody.className = 'manejo-guia-step-text';
    defBody.textContent = entry.definition;
    def.appendChild(defBody);
    wrap.appendChild(def);
  }

  if (entry.cadEhhMode && typeof ui.buildPathologyCadEhhBlock === 'function') {
    wrap.appendChild(ui.buildPathologyCadEhhBlock(entry, pid, patient));
  }

  var allProtocols = ui.getAllProtocols();
  var linkOpts = buildClinicalLinkOpts(allProtocols, patient, ui);
  var steps = flattenPathologySteps(entry);
  var lastSection = '';

  steps.forEach(function (step) {
    if (step.item.type === 'text' && !String(step.item.text || '').trim()) return;
    if (step.sectionTitle !== lastSection) {
      lastSection = step.sectionTitle;
      var sec = document.createElement('section');
      sec.className = 'manejo-guia-timeline-section';
      var h2 = document.createElement('h2');
      h2.textContent = step.sectionTitle;
      sec.appendChild(h2);
      sec.setAttribute('data-section-id', step.sectionId);
      wrap.appendChild(sec);
    }
    var sectionEl = wrap.querySelector('[data-section-id="' + step.sectionId + '"]');
    if (!sectionEl) return;
    sectionEl.appendChild(buildTimelineStep(step, entry, patient, allProtocols, linkOpts, ui, ctx));
  });

  appendLinkedInfusions(wrap, entry, allProtocols, patient, ui, ctx);
  appendMonitoring(wrap, entry, linkOpts);
  appendNotes(wrap, entry, linkOpts);
  appendRelated(wrap, entry, ctx);

  host.appendChild(wrap);
}

function buildReadingBar(ctx, title, entry) {
  var bar = document.createElement('div');
  bar.className = 'manejo-guia-reading-bar';

  var top = document.createElement('div');
  top.className = 'manejo-guia-reading-bar-top';
  var back = document.createElement('button');
  back.type = 'button';
  back.className = 'manejo-guia-back';
  back.textContent = '← Índice';
  back.addEventListener('click', function () {
    navigateGuia({ view: 'indice', entityId: '' });
    ctx.rerender();
  });
  top.appendChild(back);
  bar.appendChild(top);

  var main = document.createElement('div');
  main.className = 'manejo-guia-reading-bar-main';
  if (entry) {
    var chip = document.createElement('span');
    chip.className = 'manejo-guia-branch-chip';
    chip.textContent = pathologyBranchLabelFor(entry.branch);
    main.appendChild(chip);
  }
  var h1 = document.createElement('h1');
  h1.className = 'manejo-guia-reading-title';
  h1.textContent = title;
  main.appendChild(h1);
  if (entry && entry.summary) {
    var summary = document.createElement('p');
    summary.className = 'manejo-guia-reading-summary';
    summary.textContent = entry.summary;
    main.appendChild(summary);
  }
  bar.appendChild(main);
  return bar;
}

function buildClinicalLinkOpts(allProtocols, patient, ui) {
  return {
    linkDrugs: true,
    allProtocols: allProtocols,
    resolveDrugLink: function (name) {
      return resolveClinicalDrugLink(name, allProtocols);
    },
    onDrugLink: function (link) {
      handleClinicalDrugLink(link, patient, ui);
    },
  };
}

function handleClinicalDrugLink(link, patient, ui) {
  if (!link) return;
  if (link.kind === 'protocol' && link.entry) {
    navigateGuia({
      mode: 'infusion',
      view: 'lectura',
      entityId: link.entry.id,
      fromPathologyId: getGuiaEntityId(),
    });
    ui.renderManejo();
    return;
  }
  if (link.kind === 'atb' && link.id) {
    navigateGuia({
      mode: 'atb',
      view: 'lectura',
      entityId: link.id,
      fromPathologyId: getGuiaEntityId(),
    });
    ui.renderManejo();
  }
}

function buildTimelineStep(step, entry, patient, allProtocols, linkOpts, ui, ctx) {
  var row = document.createElement('div');
  row.className = 'manejo-guia-step';
  var num = document.createElement('span');
  num.className = 'manejo-guia-step-num';
  num.textContent = String(step.number);
  row.appendChild(num);

  var body = document.createElement('div');
  body.className = 'manejo-guia-step-body';
  var item = step.item;

  if (item.type === 'text') {
    var card = document.createElement('div');
    card.className = 'manejo-guia-step-card';
    var p = document.createElement('div');
    p.className = 'manejo-guia-step-text';
    p.appendChild(
      buildClinicalTextElement(
        item.text || '',
        Object.assign({ mode: 'prose', proseBlock: true, sectionTitle: step.sectionTitle }, linkOpts)
      )
    );
    card.appendChild(p);
    body.appendChild(card);
  } else if (item.type === 'protocol' && item.protocolId) {
    var actionCard = document.createElement('div');
    actionCard.className = 'manejo-guia-step-card manejo-guia-step-card--action';
    actionCard.appendChild(
      buildActionStep(item, step, entry, patient, allProtocols, linkOpts, ui, ctx, function () {
        return ui.findProtocolEntryById(item.protocolId, allProtocols);
      })
    );
    body.appendChild(actionCard);
  } else if (item.type === 'recommendation') {
    var recCard = document.createElement('div');
    recCard.className = 'manejo-guia-step-card';
    recCard.appendChild(buildRecommendationStep(item, step.sectionTitle, linkOpts));
    body.appendChild(recCard);
  }

  row.appendChild(body);
  return row;
}

function buildActionStep(item, step, entry, patient, allProtocols, linkOpts, ui, ctx, getProto) {
  var frag = document.createDocumentFragment();
  var row = document.createElement('div');
  row.className = 'manejo-guia-step-action-head';
  var title = document.createElement('span');
  title.className = 'manejo-guia-step-action-title';
  title.textContent = item.label || (getProto() && getProto().title) || 'Protocolo';
  row.appendChild(title);
  if (item.tier) {
    var tier = document.createElement('span');
    tier.className =
      'manejo-guia-step-tier' + (item.tier === 'alternative' ? ' manejo-guia-step-tier--alt' : '');
    tier.textContent = tierChipLabel(item.tier) || tierLabel(item.tier);
    row.appendChild(tier);
  }
  frag.appendChild(row);
  if (item.criteria) {
    var crit = document.createElement('span');
    crit.className = 'manejo-guia-step-criteria';
    crit.textContent = item.criteria;
    frag.appendChild(crit);
  }

  var expand = document.createElement('div');
  expand.className = 'manejo-guia-step-expand';
  expand.hidden = true;

  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'manejo-guia-step-toggle btn-med-secondary';
  toggle.textContent = 'Ver indicaciones';
  toggle.addEventListener('click', function () {
    var open = expand.hidden;
    if (open) {
      while (expand.firstChild) expand.removeChild(expand.firstChild);
      var proto = getProto();
      if (proto) {
        var panel = ui.buildProtocolDetailPanel(proto, patient, {
          embed: true,
          hideSomeOrder: true,
        });
        expand.appendChild(panel.root);
        var foot = document.createElement('div');
        foot.className = 'manejo-guia-step-expand-foot';
        var linkInf = document.createElement('button');
        linkInf.type = 'button';
        linkInf.className = 'manejo-guia-link-tertiary';
        linkInf.textContent = 'Abrir en modo Infusión';
        linkInf.addEventListener('click', function () {
          navigateGuia({
            mode: 'infusion',
            view: 'lectura',
            entityId: proto.id,
            fromPathologyId: entry.id,
          });
          ctx.rerender();
        });
        foot.appendChild(linkInf);
        expand.appendChild(foot);
      } else {
        expand.textContent = 'Protocolo no encontrado en catálogo.';
      }
    }
    expand.hidden = !open;
    toggle.textContent = open ? 'Ocultar indicaciones' : 'Ver indicaciones';
  });
  frag.appendChild(toggle);
  frag.appendChild(expand);
  return frag;
}

function buildRecommendationStep(item, sectionTitle, linkOpts) {
  var frag = document.createDocumentFragment();
  var row = document.createElement('div');
  row.className = 'manejo-guia-step-action-row';
  var title = document.createElement('span');
  title.className = 'manejo-guia-step-action-title';
  title.textContent = recommendationCardTitle(item, sectionTitle, {});
  row.appendChild(title);
  if (item.tier) {
    var tier = document.createElement('span');
    tier.className =
      'manejo-guia-step-tier' + (item.tier === 'alternative' ? ' manejo-guia-step-tier--alt' : '');
    tier.textContent = tierChipLabel(item.tier) || tierLabel(item.tier);
    row.appendChild(tier);
  }
  frag.appendChild(row);

  var expand = document.createElement('div');
  expand.className = 'manejo-guia-step-expand';
  if (item.criteria) {
    var crit = document.createElement('p');
    crit.className = 'manejo-guia-step-criteria';
    crit.textContent = item.criteria;
    expand.appendChild(crit);
  }
  expand.appendChild(
    buildClinicalTextElement(item.text || '', Object.assign({ sectionTitle: sectionTitle }, linkOpts))
  );
  expand.hidden = false;

  if (!(item.text && String(item.text).length > 200)) {
    frag.appendChild(expand);
  } else {
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'manejo-guia-step-toggle';
    toggle.textContent = 'Ver detalle';
    expand.hidden = true;
    toggle.addEventListener('click', function () {
      expand.hidden = !expand.hidden;
      toggle.textContent = expand.hidden ? 'Ver detalle' : 'Ocultar detalle';
    });
    frag.appendChild(toggle);
    frag.appendChild(expand);
  }
  return frag;
}

function appendLinkedInfusions(wrap, entry, allProtocols, patient, ui, ctx) {
  var embeddedProtoIds = {};
  protocolIdsInPathologySections(entry).forEach(function (id) {
    embeddedProtoIds[id] = true;
  });
  var linked = protocolsLinkedToPathology(allProtocols, entry.id).filter(function (proto) {
    return !embeddedProtoIds[proto.id];
  });
  if (!linked.length) return;
  var det = document.createElement('details');
  det.className = 'manejo-guia-details';
  var sum = document.createElement('summary');
  sum.textContent = 'Infusiones vinculadas (' + linked.length + ')';
  det.appendChild(sum);
  linked.forEach(function (proto) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'manejo-guia-index-row';
    btn.style.marginTop = '6px';
    var t = document.createElement('span');
    t.className = 'manejo-guia-index-row-title';
    t.textContent = proto.title;
    btn.appendChild(t);
    btn.addEventListener('click', function () {
      navigateGuia({
        mode: 'infusion',
        view: 'lectura',
        entityId: proto.id,
        fromPathologyId: entry.id,
      });
      ctx.rerender();
    });
    det.appendChild(btn);
  });
  wrap.appendChild(det);
}

function appendMonitoring(wrap, entry, linkOpts) {
  if (!(entry.monitoring || []).length) return;
  wrap.appendChild(
    buildClinicalKvBlock('Monitoreo', entry.monitoring, Object.assign({ wide: true }, linkOpts))
  );
}

function appendNotes(wrap, entry, linkOpts) {
  if (!(entry.notes || []).length) return;
  var notes = document.createElement('div');
  notes.className = 'manejo-card-notes manejo-pathology-notes';
  notes.appendChild(
    buildClinicalTextElement(entry.notes, Object.assign({ compact: true }, linkOpts))
  );
  wrap.appendChild(notes);
}

function appendRelated(wrap, entry, ctx) {
  var related = getRelatedPathologies(entry.id, MANEJO_PATHOLOGIES);
  if (!related.length) return;
  var row = document.createElement('div');
  row.className = 'manejo-guia-related';
  related.forEach(function (rel) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'manejo-guia-related-chip';
    btn.textContent = rel.title;
    btn.addEventListener('click', function () {
      setGuiaEntityId(rel.id);
      navigateGuia({ view: 'lectura', entityId: rel.id });
      ctx.rerender();
    });
    row.appendChild(btn);
  });
  wrap.appendChild(row);
}
