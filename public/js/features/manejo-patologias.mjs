/**
 * Pestaña Patologías — wiki clínica por rama, enlazada a infusiones.
 */
import {
  MANEJO_PATHOLOGIES,
  MANEJO_PATHOLOGY_BRANCHES,
  findPathologyById,
  getRelatedPathologies,
  pathologyBranchLabelFor,
  pathologyMatchesSearch,
  pathologyStepCount,
} from '../manejo-pathology-catalog.mjs';
import {
  protocolIdsInPathologySections,
  protocolsLinkedToPathology,
  useCategoryLabelFor,
} from '../manejo-protocol-links.mjs';
import { openPathologyFocusModal, tierLabel } from '../manejo-pathology-focus.mjs';
import { pathologyBranchCssClass } from '../manejo-pathology-branch-colors.mjs';
import { resolveClinicalDrugLink } from '../manejo-clinical-drug-link.mjs';
import {
  buildClinicalKvBlock,
  buildClinicalPreviewElement,
  buildClinicalTextElement,
  recommendationCardTitle,
} from '../manejo-clinical-text.mjs';

var BRANCH_FILTER_KEY = 'manejoPathologyBranch';
var SELECTED_KEY = 'manejoPathologySelected';

export function getPathologyBranchFilter() {
  try {
    var v = sessionStorage.getItem(BRANCH_FILTER_KEY);
    if (v === 'all') return 'all';
    if (MANEJO_PATHOLOGY_BRANCHES.some(function (b) { return b.id === v; })) return v;
  } catch (_e) {}
  return 'all';
}

export function setPathologyBranchFilter(id) {
  try {
    sessionStorage.setItem(BRANCH_FILTER_KEY, id || 'all');
  } catch (_e2) {}
}

export function getPathologySelectedId() {
  try {
    return sessionStorage.getItem(SELECTED_KEY) || '';
  } catch (_e3) {
    return '';
  }
}

export function setPathologySelectedId(id) {
  try {
    if (id) sessionStorage.setItem(SELECTED_KEY, id);
    else sessionStorage.removeItem(SELECTED_KEY);
  } catch (_e4) {}
}

/**
 * @param {HTMLElement} panel
 * @param {string|null} pid
 * @param {object|null} patient
 * @param {object} ui
 */
export function renderManejoPatologias(panel, pid, patient, ui) {
  var allProtocols = ui.getAllProtocols();
  var root = document.createElement('div');
  root.className = 'manejo-root manejo-root--pathology';

  var toolbar = document.createElement('div');
  toolbar.className = 'manejo-proto-toolbar-v2 manejo-proto-toolbar-card manejo-pathology-toolbar';

  var searchRow = document.createElement('div');
  searchRow.className = 'manejo-proto-search-row';
  var search = ui.buildManejoSearchInput('Patología, síntoma o rama…', 'Buscar patologías');
  var searchInp = search.input;
  searchRow.appendChild(search.field);

  var countBadge = document.createElement('span');
  countBadge.className = 'manejo-proto-count';
  countBadge.setAttribute('aria-live', 'polite');
  searchRow.appendChild(countBadge);

  var activeBranch = getPathologyBranchFilter();
  var filterWrap = document.createElement('div');
  filterWrap.className = 'manejo-pathology-branch-filter';

  var filterLbl = document.createElement('span');
  filterLbl.className = 'manejo-pathology-branch-filter-label';
  filterLbl.textContent = 'Rama';

  var branchMenu = buildPathologyBranchMenu(activeBranch, function (next) {
    setPathologyBranchFilter(next);
    branchMenu.syncBranch(next);
    renderList();
  });

  filterWrap.appendChild(filterLbl);
  filterWrap.appendChild(branchMenu);
  searchRow.insertBefore(filterWrap, countBadge);
  toolbar.appendChild(searchRow);

  var hint = document.createElement('p');
  hint.className = 'manejo-hint manejo-pathology-toolbar-hint';
  hint.textContent =
    'Wiki clínica por rama. Cada infusión se abre en ventana enfocada; el catálogo completo sigue en Infusiones.';
  toolbar.appendChild(hint);
  root.appendChild(toolbar);

  if (!pid) {
    var emp = document.createElement('p');
    emp.className = 'manejo-empty';
    emp.textContent = 'Selecciona un paciente para calculadoras en infusiones vinculadas.';
    root.appendChild(emp);
  }

  var split = document.createElement('div');
  split.className = 'manejo-proto-split';

  var listCol = document.createElement('div');
  listCol.className = 'manejo-proto-list-col';
  var listHost = document.createElement('div');
  listHost.className = 'manejo-proto-list manejo-pathology-list';
  listCol.appendChild(listHost);

  var detailBackdrop = document.createElement('div');
  detailBackdrop.className = 'manejo-proto-detail-backdrop';
  detailBackdrop.hidden = true;
  detailBackdrop.addEventListener('click', function () {
    setPathologySelectedId('');
    renderDetail();
    syncSheet();
    renderList();
  });

  var detailCol = document.createElement('div');
  detailCol.className = 'manejo-proto-detail-col manejo-pathology-detail-col';

  var detailClose = document.createElement('button');
  detailClose.type = 'button';
  detailClose.className = 'manejo-proto-detail-close';
  detailClose.setAttribute('aria-label', 'Cerrar detalle');
  detailClose.innerHTML = '&times;';
  detailClose.addEventListener('click', function () {
    setPathologySelectedId('');
    renderDetail();
    syncSheet();
    renderList();
  });
  detailCol.appendChild(detailClose);

  var detailHost = document.createElement('div');
  detailHost.className = 'manejo-proto-detail-host';
  detailCol.appendChild(detailHost);

  split.appendChild(listCol);
  split.appendChild(detailBackdrop);
  split.appendChild(detailCol);
  root.appendChild(split);

  function syncSheet() {
    var narrow =
      typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 899px)').matches;
    var open = narrow && !!getPathologySelectedId();
    detailCol.classList.toggle('manejo-proto-detail-col--open', open);
    detailBackdrop.hidden = !open;
  }

  function renderDetail() {
    while (detailHost.firstChild) detailHost.removeChild(detailHost.firstChild);
    var sid = getPathologySelectedId();
    var entry = findPathologyById(sid);
    if (!entry) {
      detailHost.appendChild(buildPathologyDetailEmpty());
      syncSheet();
      return;
    }
    detailHost.appendChild(
      buildPathologyDetailPanel(entry, pid, patient, allProtocols, ui).root
    );
    syncSheet();
  }

  function renderList() {
    while (listHost.firstChild) listHost.removeChild(listHost.firstChild);
    var q = String(searchInp.value || '').trim();
    var branch = getPathologyBranchFilter();

    var filtered = MANEJO_PATHOLOGIES.filter(function (entry) {
      if (branch !== 'all' && entry.branch !== branch) return false;
      return pathologyMatchesSearch(entry, q);
    });

    countBadge.textContent =
      filtered.length === 1 ? '1 patología' : filtered.length + ' patologías';

    if (!filtered.length) {
      var nz = document.createElement('div');
      nz.className = 'manejo-proto-empty';
      var nzTitle = document.createElement('p');
      nzTitle.className = 'manejo-proto-empty-title';
      nzTitle.textContent = q ? 'Sin coincidencias' : 'Sin patologías con estos filtros';
      nz.appendChild(nzTitle);
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
          secHead.className =
            'manejo-pathology-section-title ' + pathologyBranchCssClass(branchId);
          secHead.textContent = pathologyBranchLabelFor(branchId);
          listHost.appendChild(secHead);
        }
        var cards = document.createElement('div');
        cards.className = 'manejo-cards manejo-cards--pathology';
        byBranch[branchId]
          .slice()
          .sort(function (a, b) {
            return a.title.localeCompare(b.title, 'es');
          })
          .forEach(function (entry) {
            cards.appendChild(
              buildPathologyListRow(entry, allProtocols, {
                selected: getPathologySelectedId() === entry.id,
                onSelect: function (id) {
                  setPathologySelectedId(id);
                  renderDetail();
                  renderList();
                },
              })
            );
          });
        listHost.appendChild(cards);
      });
  }

  searchInp.addEventListener('input', function () {
    renderList();
  });

  renderDetail();
  renderList();
  panel.appendChild(root);
}

function buildPathologyDetailEmpty() {
  var empty = document.createElement('div');
  empty.className = 'manejo-proto-detail-empty';
  var t = document.createElement('p');
  t.className = 'manejo-proto-detail-empty-title';
  t.textContent = 'Selecciona una patología';
  empty.appendChild(t);
  var h = document.createElement('p');
  h.className = 'manejo-hint';
  h.textContent = 'Explora machotes por rama clínica y abre infusiones en ventana enfocada.';
  empty.appendChild(h);
  return empty;
}

function buildPathologyListRow(entry, allProtocols, opts) {
  opts = opts || {};
  var steps = pathologyStepCount(entry);

  var card = document.createElement('article');
  card.className =
    'manejo-card manejo-card--proto manejo-proto-row manejo-pathology-row ' +
    pathologyBranchCssClass(entry.branch) +
    (opts.selected ? ' manejo-proto-row--selected' : '');
  card.setAttribute('data-pathology-id', entry.id);
  card.setAttribute('role', 'button');
  card.tabIndex = opts.selected ? 0 : -1;
  card.setAttribute('aria-pressed', opts.selected ? 'true' : 'false');

  var shell = document.createElement('div');
  shell.className = 'manejo-proto-row-shell';

  var main = document.createElement('div');
  main.className = 'manejo-proto-row-main';

  var meta = document.createElement('div');
  meta.className = 'manejo-proto-row-meta';
  var titleEl = document.createElement('span');
  titleEl.className = 'manejo-proto-row-title';
  titleEl.textContent = entry.title;
  meta.appendChild(titleEl);
  var catSub = document.createElement('span');
  catSub.className = 'manejo-proto-row-cat';
  catSub.textContent = pathologyBranchLabelFor(entry.branch);
  meta.appendChild(catSub);
  main.appendChild(meta);

  var snippet = document.createElement('p');
  snippet.className = 'manejo-proto-row-snippet';
  snippet.textContent = entry.summary;
  main.appendChild(snippet);

  if (steps) {
    var linkBadge = document.createElement('span');
    linkBadge.className = 'manejo-pathology-link-badge';
    linkBadge.textContent = steps + (steps === 1 ? ' ítem' : ' ítems');
    main.appendChild(linkBadge);
  }

  shell.appendChild(main);
  card.appendChild(shell);

  card.addEventListener('click', function () {
    if (typeof opts.onSelect === 'function') opts.onSelect(entry.id);
  });
  card.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (typeof opts.onSelect === 'function') opts.onSelect(entry.id);
    }
  });

  return card;
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
    var panel = ui.buildProtocolDetailPanel(link.entry, patient, { embed: true });
    openPathologyFocusModal(link.entry.title, panel.root, {
      footerActions: [
        {
          label: 'Ver en Infusiones',
          onClick: function () {
            ui.navigateGuia({
              mode: 'infusion',
              view: 'lectura',
              entityId: link.entry.id,
              fromPathologyId: ui.getPathologyId ? ui.getPathologyId() : '',
            });
            ui.renderManejo();
          },
        },
      ],
    });
    return;
  }
  if (link.kind === 'atb' && link.id) {
    var backdrop = document.querySelector('.manejo-pathology-focus-backdrop');
    if (backdrop) backdrop.remove();
    ui.openAtbDrug(link.id);
  }
}

function buildPathologyDetailPanel(entry, pid, patient, allProtocols, ui) {
  var linkOpts = buildClinicalLinkOpts(allProtocols, patient, ui);
  var wrap = document.createElement('div');
  wrap.className =
    'manejo-proto-detail manejo-pathology-detail ' + pathologyBranchCssClass(entry.branch);

  var head = document.createElement('header');
  head.className = 'manejo-proto-detail-head manejo-pathology-detail-head';
  var title = document.createElement('h3');
  title.className = 'manejo-proto-detail-title';
  title.textContent = entry.title;
  head.appendChild(title);

  var meta = document.createElement('p');
  meta.className = 'manejo-pathology-detail-meta';
  var branch = document.createElement('span');
  branch.className = 'manejo-pathology-detail-branch';
  branch.textContent = pathologyBranchLabelFor(entry.branch);
  meta.appendChild(branch);
  if ((entry.tags || []).length) {
    var tags = document.createElement('span');
    tags.className = 'manejo-pathology-detail-tags';
    tags.textContent = entry.tags
      .map(function (tag) {
        return tag.charAt(0).toUpperCase() + tag.slice(1);
      })
      .join(' · ');
    meta.appendChild(tags);
  }
  head.appendChild(meta);
  wrap.appendChild(head);

  wrap.appendChild(
    buildClinicalKvBlock('Resumen', entry.summary, Object.assign({ wide: true }, linkOpts))
  );
  if (entry.definition) {
    wrap.appendChild(
      buildClinicalKvBlock('Definición', entry.definition, Object.assign({ wide: true }, linkOpts))
    );
  }

  if (entry.cadEhhMode && typeof ui.buildPathologyCadEhhBlock === 'function') {
    wrap.appendChild(ui.buildPathologyCadEhhBlock(entry, pid, patient));
  }

  var embeddedProtoIds = {};
  protocolIdsInPathologySections(entry).forEach(function (id) {
    embeddedProtoIds[id] = true;
  });

  (entry.sections || []).forEach(function (section) {
    var sec = document.createElement('section');
    sec.className = 'manejo-pathology-section';
    var h4 = document.createElement('h4');
    h4.className = 'manejo-pathology-section-title';
    h4.textContent = section.title;
    sec.appendChild(h4);

    var grid = document.createElement('div');
    grid.className = 'manejo-pathology-item-grid';
    (section.items || []).forEach(function (item) {
      if (item.type === 'protocol' && item.protocolId) {
        var proto = ui.findProtocolEntryById(item.protocolId, allProtocols);
        if (proto) {
          grid.appendChild(buildPathologyProtocolButton(proto, patient, item, ui));
        } else {
          grid.appendChild(
            buildPathologyRecommendationButton(item, section.title, linkOpts, {
              missing: item.label || item.protocolId,
            })
          );
        }
      } else if (item.type === 'text' || item.type === 'recommendation') {
        grid.appendChild(buildPathologyRecommendationButton(item, section.title, linkOpts));
      }
    });
    sec.appendChild(grid);
    wrap.appendChild(sec);
  });

  var linked = protocolsLinkedToPathology(allProtocols, entry.id).filter(function (proto) {
    return !embeddedProtoIds[proto.id];
  });
  if (linked.length) {
    var infSec = document.createElement('section');
    infSec.className = 'manejo-pathology-section manejo-pathology-infusions';
    var infH = document.createElement('h4');
    infH.className = 'manejo-pathology-section-title';
    infH.textContent = 'Otras infusiones vinculadas';
    infSec.appendChild(infH);
    var infGrid = document.createElement('div');
    infGrid.className = 'manejo-pathology-inf-grid';
    linked.forEach(function (proto) {
      infGrid.appendChild(
        buildPathologyProtocolButton(proto, patient, { label: proto.title }, ui)
      );
    });
    infSec.appendChild(infGrid);
    wrap.appendChild(infSec);
  }

  var related = getRelatedPathologies(entry.id, MANEJO_PATHOLOGIES);
  if (related.length) {
    var relSec = document.createElement('section');
    relSec.className = 'manejo-pathology-section manejo-pathology-related';
    var relH = document.createElement('h4');
    relH.className = 'manejo-pathology-section-title';
    relH.textContent = 'Patologías relacionadas';
    relSec.appendChild(relH);
    var relRow = document.createElement('div');
    relRow.className = 'manejo-pathology-related-row';
    related.forEach(function (rel) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'manejo-pathology-related-link';
      btn.textContent = rel.title;
      btn.addEventListener('click', function () {
        setPathologySelectedId(rel.id);
        ui.renderManejo();
      });
      relRow.appendChild(btn);
    });
    relSec.appendChild(relRow);
    wrap.appendChild(relSec);
  }

  if ((entry.monitoring || []).length) {
    wrap.appendChild(
      buildClinicalKvBlock('Monitoreo', entry.monitoring, Object.assign({ wide: true }, linkOpts))
    );
  }

  if ((entry.notes || []).length) {
    var notes = document.createElement('div');
    notes.className = 'manejo-card-notes manejo-pathology-notes';
    notes.appendChild(
      buildClinicalTextElement(entry.notes, Object.assign({ compact: true }, linkOpts))
    );
    wrap.appendChild(notes);
  }

  return { root: wrap };
}

function buildPathologyProtocolButton(proto, patient, item, ui) {
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'manejo-pathology-proto-btn';
  if (item.tier === 'first-line') btn.classList.add('manejo-pathology-proto-btn--first');
  if (item.tier === 'alternative') btn.classList.add('manejo-pathology-proto-btn--alt');

  var titleRow = document.createElement('span');
  titleRow.className = 'manejo-pathology-proto-btn-main';

  var sumTitle = document.createElement('span');
  sumTitle.className = 'manejo-pathology-proto-title';
  sumTitle.textContent = item.label || proto.title;
  titleRow.appendChild(sumTitle);

  if (item.tier) {
    var tier = document.createElement('span');
    tier.className =
      'manejo-pathology-tier' +
      (item.tier === 'first-line' ? ' manejo-pathology-tier--first' : ' manejo-pathology-tier--alt');
    tier.textContent = tierLabel(item.tier);
    titleRow.appendChild(tier);
  }

  btn.appendChild(titleRow);

  if ((proto.useCategories || []).length) {
    var cats = document.createElement('span');
    cats.className = 'manejo-pathology-proto-cats';
    cats.textContent = proto.useCategories.map(useCategoryLabelFor).join(' · ');
    btn.appendChild(cats);
  }

  if (item.criteria) {
    var crit = document.createElement('span');
    crit.className = 'manejo-pathology-proto-criteria';
    crit.textContent = item.criteria;
    btn.appendChild(crit);
  }

  btn.addEventListener('click', function () {
    var panel = ui.buildProtocolDetailPanel(proto, patient, { embed: true });
    var modalRef = openPathologyFocusModal(item.label || proto.title, panel.root, {
      footerActions: [
        {
          label: 'Ver en Infusiones',
          onClick: function () {
            modalRef.close();
            ui.navigateGuia({
              mode: 'infusion',
              view: 'lectura',
              entityId: proto.id,
              fromPathologyId: entry.id,
            });
            ui.renderManejo();
          },
        },
      ],
    });
  });

  return btn;
}

function buildPathologyRecommendationButton(item, sectionTitle, linkOpts, opts) {
  opts = opts || {};
  linkOpts = linkOpts || {};
  var title = recommendationCardTitle(item, sectionTitle, opts);
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'manejo-pathology-proto-btn manejo-pathology-indication-btn';
  if (item.tier === 'first-line') btn.classList.add('manejo-pathology-proto-btn--first');
  if (item.tier === 'alternative') btn.classList.add('manejo-pathology-proto-btn--alt');

  var titleRow = document.createElement('span');
  titleRow.className = 'manejo-pathology-proto-btn-main';

  var sumTitle = document.createElement('span');
  sumTitle.className = 'manejo-pathology-proto-title';
  sumTitle.textContent = title;
  titleRow.appendChild(sumTitle);

  if (item.tier) {
    var tier = document.createElement('span');
    tier.className =
      'manejo-pathology-tier' +
      (item.tier === 'first-line' ? ' manejo-pathology-tier--first' : ' manejo-pathology-tier--alt');
    tier.textContent = tierLabel(item.tier);
    titleRow.appendChild(tier);
  }

  btn.appendChild(titleRow);

  if (item.text && !opts.missing) {
    var preview = buildClinicalPreviewElement(item.text, 120, sectionTitle);
    if (preview) btn.appendChild(preview);
  }

  if (item.criteria) {
    var crit = document.createElement('span');
    crit.className = 'manejo-pathology-proto-criteria';
    crit.textContent = item.criteria;
    btn.appendChild(crit);
  }

  btn.addEventListener('click', function () {
    var content = document.createElement('div');
    content.className = 'manejo-pathology-indication-body';
    if (item.criteria) {
      var critLine = document.createElement('p');
      critLine.className = 'manejo-pathology-indication-criteria';
      critLine.textContent = item.criteria;
      content.appendChild(critLine);
    }
    content.appendChild(
      buildClinicalTextElement(
        item.text || '',
        Object.assign({ sectionTitle: sectionTitle, itemLabel: item.label }, linkOpts)
      )
    );
    openPathologyFocusModal(title, content);
  });

  return btn;
}

function branchFilterLabel(id) {
  if (id === 'all') return 'Todas las ramas';
  return pathologyBranchLabelFor(id);
}

export function buildPathologyBranchMenu(activeBranch, onSelect) {
  var selectedBranch = activeBranch;
  var wrap = document.createElement('div');
  wrap.className = 'manejo-pathology-branch-menu';
  if (activeBranch !== 'all') wrap.className += ' ' + pathologyBranchCssClass(activeBranch);

  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'manejo-pathology-branch-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', 'Filtrar por rama clínica');

  var triggerDot = document.createElement('span');
  triggerDot.className = 'manejo-pathology-branch-trigger-dot';
  triggerDot.hidden = activeBranch === 'all';

  var triggerText = document.createElement('span');
  triggerText.className = 'manejo-pathology-branch-trigger-text';
  triggerText.textContent = branchFilterLabel(activeBranch);

  var triggerChevron = document.createElement('span');
  triggerChevron.className = 'manejo-pathology-branch-trigger-chevron';
  triggerChevron.setAttribute('aria-hidden', 'true');
  triggerChevron.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';

  trigger.appendChild(triggerDot);
  trigger.appendChild(triggerText);
  trigger.appendChild(triggerChevron);

  var panel = document.createElement('div');
  panel.className = 'manejo-pathology-branch-panel';
  panel.setAttribute('role', 'listbox');
  panel.setAttribute('aria-label', 'Ramas clínicas');
  panel.setAttribute('aria-hidden', 'true');

  var outsideHandler = null;
  var keyHandler = null;

  function setOpen(open) {
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    wrap.classList.toggle('manejo-pathology-branch-menu--open', open);
    if (!open) {
      if (outsideHandler) {
        document.removeEventListener('click', outsideHandler);
        outsideHandler = null;
      }
      if (keyHandler) {
        document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
      }
    }
  }

  function makeOption(id, label) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'manejo-pathology-branch-option';
    if (id !== 'all') btn.className += ' ' + pathologyBranchCssClass(id);
    if (activeBranch === id) btn.className += ' manejo-pathology-branch-option--active';
    btn.setAttribute('role', 'option');
    btn.setAttribute('data-branch-id', id);
    btn.setAttribute('aria-selected', activeBranch === id ? 'true' : 'false');

    var dot = document.createElement('span');
    dot.className =
      'manejo-pathology-branch-option-dot' +
      (id === 'all' ? ' manejo-pathology-branch-option-dot--all' : '');
    btn.appendChild(dot);

    var txt = document.createElement('span');
    txt.className = 'manejo-pathology-branch-option-label';
    txt.textContent = label;
    btn.appendChild(txt);

    if (activeBranch === id) {
      var check = document.createElement('span');
      check.className = 'manejo-pathology-branch-option-check';
      check.textContent = '✓';
      btn.appendChild(check);
    }

    btn.addEventListener('click', function () {
      setOpen(false);
      if (id !== selectedBranch && typeof onSelect === 'function') onSelect(id);
    });
    panel.appendChild(btn);
  }

  makeOption('all', 'Todas las ramas');
  MANEJO_PATHOLOGY_BRANCHES.forEach(function (b) {
    makeOption(b.id, b.label);
  });

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    var willOpen = !wrap.classList.contains('manejo-pathology-branch-menu--open');
    setOpen(willOpen);
    if (willOpen) {
      outsideHandler = function (ev) {
        if (!wrap.contains(ev.target)) setOpen(false);
      };
      keyHandler = function (ev) {
        if (ev.key === 'Escape') setOpen(false);
      };
      setTimeout(function () {
        document.addEventListener('click', outsideHandler);
        document.addEventListener('keydown', keyHandler);
      }, 0);
    }
  });

  wrap.appendChild(trigger);
  wrap.appendChild(panel);

  wrap.syncBranch = function (id) {
    selectedBranch = id;
    wrap.className = 'manejo-pathology-branch-menu';
    if (id !== 'all') wrap.className += ' ' + pathologyBranchCssClass(id);
    triggerText.textContent = branchFilterLabel(id);
    triggerDot.hidden = id === 'all';
    panel.querySelectorAll('.manejo-pathology-branch-option').forEach(function (btn) {
      var optId = btn.getAttribute('data-branch-id');
      var isActive = optId === id;
      btn.classList.toggle('manejo-pathology-branch-option--active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      var check = btn.querySelector('.manejo-pathology-branch-option-check');
      if (isActive && !check) {
        check = document.createElement('span');
        check.className = 'manejo-pathology-branch-option-check';
        check.textContent = '✓';
        btn.appendChild(check);
      } else if (!isActive && check) {
        check.remove();
      }
    });
  };

  return wrap;
}
