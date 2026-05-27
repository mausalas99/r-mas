/**
 * Guía clínica — modo Infusión (índice compacto + lectura ancho completo).
 */
import { MANEJO_PROTOCOL_CATEGORIES } from '../manejo-protocols-catalog.mjs';
import { MANEJO_PROTOCOL_USE_CATEGORIES, pathologiesLinkedToProtocol } from '../manejo-protocol-links.mjs';
import { protoCategoryCssClass } from '../manejo-proto-category-colors.mjs';
import { findPathologyById, MANEJO_PATHOLOGIES } from '../manejo-pathology-catalog.mjs';
import { isProtoFavorite, toggleProtoFavorite } from '../manejo-protocol-favorites.mjs';
import { deleteCustomProtocol } from '../manejo-custom-protocols.mjs';
import {
  getGuiaEntityId,
  getGuiaFromPathologyId,
  navigateGuia,
} from './manejo-guia-state.mjs';

var CALC_ICON_HTML =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<rect x="5" y="3" width="14" height="18" rx="2"/>' +
  '<path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15h0M8 19h8"/>' +
  '</svg>';

/**
 * @param {HTMLElement} host
 * @param {{ pid: string|null, patient: object|null, ui: object, rerender: function }} ctx
 */
export function renderGuiaInfusionIndex(host, ctx) {
  var ui = ctx.ui;
  var activeCat = ui.getProtoCategoryFilter();
  var extraFilters = ui.getProtoExtraFilters();
  var allProtocols = ui.getAllProtocols();

  var toolbar = document.createElement('div');
  toolbar.className = 'manejo-guia-index-toolbar';

  var searchRow = document.createElement('div');
  searchRow.className = 'manejo-guia-index-search-row manejo-proto-search-row';
  var search = ui.buildManejoSearchInput('Buscar fármaco o indicación…', 'Buscar infusiones');
  searchRow.appendChild(search.field);

  var countBadge = document.createElement('span');
  countBadge.className = 'manejo-proto-count';
  countBadge.setAttribute('aria-live', 'polite');
  searchRow.appendChild(countBadge);

  var addProtoBtn = document.createElement('button');
  addProtoBtn.type = 'button';
  addProtoBtn.className = 'manejo-proto-add-btn';
  addProtoBtn.textContent = '+ Infusión';
  addProtoBtn.title = 'Agregar infusión SOME personalizada';
  addProtoBtn.addEventListener('click', function () {
    ui.openManejoProtocolEditorModal({ mode: 'add' });
  });
  searchRow.appendChild(addProtoBtn);
  toolbar.appendChild(searchRow);

  var filtersRow = document.createElement('div');
  filtersRow.className = 'manejo-proto-filters-row';

  var viewsSeg = ui.buildManejoProtoSegmentGroup('Vista de infusiones');
  viewsSeg.appendChild(
    ui.buildManejoProtoSegmentChip('★ Favoritos', activeCat === 'favorites', function () {
      ui.setProtoCategoryFilter('favorites');
      ctx.rerender();
    })
  );
  viewsSeg.appendChild(
    ui.buildManejoProtoSegmentChip('Recientes', activeCat === 'recent', function () {
      ui.setProtoCategoryFilter('recent');
      ctx.rerender();
    })
  );
  viewsSeg.appendChild(
    ui.buildManejoProtoSegmentChip('Todos', activeCat === 'all', function () {
      ui.setProtoCategoryFilter('all');
      ctx.rerender();
    })
  );
  filtersRow.appendChild(viewsSeg);
  filtersRow.appendChild(
    ui.buildManejoProtoToggleChip('Con calculadora', extraFilters.calcOnly, function () {
      var extraNow = ui.getProtoExtraFilters();
      ui.setProtoExtraFilters({ calcOnly: !extraNow.calcOnly });
      ctx.rerender();
    })
  );

  var isCatDropdown =
    activeCat !== 'all' && activeCat !== 'favorites' && activeCat !== 'recent';
  filtersRow.appendChild(
    ui.buildManejoProtoFilterMenu({
      fieldLabel: 'Categoría',
      wrapClass: 'manejo-proto-filter--category',
      activeId: isCatDropdown ? activeCat : 'all',
      activeAccentClass: isCatDropdown ? protoCategoryCssClass(activeCat) : '',
      defaultOptionLabel: 'Todas las categorías',
      ariaLabel: 'Filtrar por categoría de infusión',
      options: [{ id: 'all', label: 'Todas las categorías' }].concat(
        MANEJO_PROTOCOL_CATEGORIES.map(function (c) {
          var count = allProtocols.filter(function (p) {
            return p.category === c.id;
          }).length;
          if (!count) return null;
          return {
            id: c.id,
            label: c.label,
            hint: count + (count === 1 ? ' infusión' : ' infusiones'),
            accentClass: protoCategoryCssClass(c.id),
          };
        }).filter(Boolean)
      ),
      onSelect: function (id) {
        ui.setProtoCategoryFilter(id);
        ctx.rerender();
      },
    })
  );

  var activeUseCat = extraFilters.useCategory || 'all';
  filtersRow.appendChild(
    ui.buildManejoProtoFilterMenu({
      fieldLabel: 'Uso',
      wrapClass: 'manejo-proto-filter--use',
      activeId: activeUseCat,
      defaultOptionLabel: 'Todos los usos',
      ariaLabel: 'Filtrar por categoría de uso',
      options: [{ id: 'all', label: 'Todos los usos' }].concat(
        MANEJO_PROTOCOL_USE_CATEGORIES.map(function (c) {
          var count = allProtocols.filter(function (p) {
            return (p.useCategories || []).indexOf(c.id) >= 0;
          }).length;
          if (!count) return null;
          return {
            id: c.id,
            label: c.label,
            hint: count + (count === 1 ? ' infusión' : ' infusiones'),
          };
        }).filter(Boolean)
      ),
      onSelect: function (id) {
        ui.setProtoExtraFilters({ useCategory: id });
        ctx.rerender();
      },
    })
  );
  toolbar.appendChild(filtersRow);
  host.appendChild(toolbar);

  if (typeof ui.buildInsulinPumpReferencePanel === 'function') {
    host.appendChild(ui.buildInsulinPumpReferencePanel());
  }

  if (!ctx.pid) {
    var emp = document.createElement('p');
    emp.className = 'manejo-guia-placeholder';
    emp.textContent = 'Selecciona un paciente para usar calculadoras y pendientes.';
    host.appendChild(emp);
  }

  var listHost = document.createElement('div');
  listHost.className = 'manejo-guia-index-list';
  host.appendChild(listHost);

  function paintList() {
    while (listHost.firstChild) listHost.removeChild(listHost.firstChild);
    var q = String(search.input.value || '').trim();
    var catNow = ui.getProtoCategoryFilter();
    var extraNow = ui.getProtoExtraFilters();
    var filtered = ui.filterProtocolEntries(allProtocols, {
      category: catNow,
      query: q,
      extra: extraNow,
    });

    countBadge.textContent =
      filtered.length === 1 ? '1 infusión' : filtered.length + ' infusiones';

    if (!filtered.length) {
      var nz = document.createElement('p');
      nz.className = 'manejo-guia-placeholder';
      nz.textContent = q ? 'Sin coincidencias' : 'Sin infusiones con estos filtros';
      listHost.appendChild(nz);
      return;
    }

    filtered.forEach(function (entry) {
      listHost.appendChild(buildIndexRow(entry, ui, ctx));
    });
  }

  listHost.addEventListener('click', function (e) {
    var favEl = e.target.closest('[data-proto-fav]');
    if (!favEl) return;
    e.preventDefault();
    e.stopPropagation();
    toggleProtoFavorite(favEl.getAttribute('data-proto-fav'));
    paintList();
  });

  search.input.addEventListener('input', paintList);
  paintList();
}

/**
 * @param {HTMLElement} host
 * @param {{ pid: string|null, patient: object|null, ui: object, rerender: function }} ctx
 */
export function renderGuiaInfusionReading(host, ctx) {
  var ui = ctx.ui;
  var patient = ctx.patient;
  var allProtocols = ui.getAllProtocols();
  var entry = ui.findProtocolEntryById(getGuiaEntityId(), allProtocols);

  var wrap = document.createElement('div');
  wrap.className =
    'manejo-guia-reading' + (entry ? ' ' + protoCategoryCssClass(entry.category) : '');

  if (!entry) {
    wrap.appendChild(buildReadingBar(ctx, 'Infusión'));
    var miss = document.createElement('p');
    miss.className = 'manejo-guia-placeholder';
    miss.textContent = 'Infusión no encontrada.';
    wrap.appendChild(miss);
    host.appendChild(wrap);
    return;
  }

  wrap.appendChild(buildReadingBar(ctx, entry));
  var panel = ui.buildProtocolDetailPanel(entry, patient, {
    embed: true,
    hidePathologyLinks: true,
  });
  wrap.appendChild(panel.root);
  wrap.appendChild(buildReadingFoot(entry, ui, ctx));
  host.appendChild(wrap);
}

function buildIndexRow(entry, ui, ctx) {
  var row = document.createElement('div');
  row.className = 'manejo-guia-index-row ' + protoCategoryCssClass(entry.category);
  row.setAttribute('role', 'button');
  row.tabIndex = 0;

  var title = document.createElement('span');
  title.className = 'manejo-guia-index-row-title';
  title.textContent = entry.title;
  row.appendChild(title);

  var meta = document.createElement('span');
  meta.className = 'manejo-guia-index-row-meta';
  meta.textContent = ui.categoryLabelFor(entry.category);
  row.appendChild(meta);

  if (entry.calculatorId) {
    var calcBadge = document.createElement('span');
    calcBadge.className = 'manejo-proto-row-calc-badge';
    calcBadge.title = 'Incluye calculadora';
    calcBadge.innerHTML = CALC_ICON_HTML;
    calcBadge.setAttribute('aria-hidden', 'true');
    row.appendChild(calcBadge);
  }

  var favBtn = document.createElement('button');
  favBtn.type = 'button';
  favBtn.className =
    'manejo-card-fav-btn' + (isProtoFavorite(entry.id) ? ' manejo-card-fav-btn--active' : '');
  favBtn.setAttribute('data-proto-fav', entry.id);
  favBtn.setAttribute(
    'aria-label',
    isProtoFavorite(entry.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'
  );
  favBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
  row.appendChild(favBtn);

  row.addEventListener('click', function (e) {
    if (e.target.closest('[data-proto-fav]')) return;
    navigateGuia({ mode: 'infusion', view: 'lectura', entityId: entry.id });
    ctx.rerender();
  });
  row.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target.closest('[data-proto-fav]')) return;
      e.preventDefault();
      navigateGuia({ mode: 'infusion', view: 'lectura', entityId: entry.id });
      ctx.rerender();
    }
  });

  return row;
}

function buildReadingBar(ctx, entryOrTitle) {
  var bar = document.createElement('div');
  bar.className = 'manejo-guia-reading-bar';

  var back = document.createElement('button');
  back.type = 'button';
  back.className = 'manejo-guia-back';
  back.textContent = '← Índice';
  back.addEventListener('click', function () {
    navigateGuia({ view: 'indice', entityId: '' });
    ctx.rerender();
  });
  bar.appendChild(back);

  var entry = typeof entryOrTitle === 'string' ? null : entryOrTitle;
  var titleText = entry ? entry.title : entryOrTitle;

  var fromPathId = getGuiaFromPathologyId();
  var fromPath = fromPathId ? findPathologyById(fromPathId) : null;
  if (fromPath && entry) {
    var crumb = document.createElement('nav');
    crumb.className = 'manejo-guia-breadcrumb';
    crumb.setAttribute('aria-label', 'Origen');
    var parts = document.createDocumentFragment();
    var pathLink = document.createElement('button');
    pathLink.type = 'button';
    pathLink.className = 'manejo-guia-breadcrumb-link';
    pathLink.textContent = fromPath.title;
    pathLink.addEventListener('click', function () {
      navigateGuia({
        mode: 'patologia',
        view: 'lectura',
        entityId: fromPath.id,
        fromPathologyId: '',
      });
      ctx.rerender();
    });
    parts.appendChild(pathLink);
    parts.appendChild(document.createTextNode(' › '));
    parts.appendChild(document.createTextNode(entry.title));
    crumb.appendChild(parts);
    bar.appendChild(crumb);
  }

  if (entry) {
    var chip = document.createElement('span');
    chip.className = 'manejo-guia-branch-chip manejo-proto-detail-cat ' + protoCategoryCssClass(entry.category);
    chip.textContent = ctx.ui.categoryLabelFor(entry.category);
    bar.appendChild(chip);
  }

  var h1 = document.createElement('h1');
  h1.className = 'manejo-guia-reading-title';
  h1.textContent = titleText;
  bar.appendChild(h1);

  return bar;
}

function buildReadingFoot(entry, ui, ctx) {
  var foot = document.createElement('footer');
  foot.className = 'manejo-guia-reading-foot';

  var actions = document.createElement('div');
  actions.className = 'manejo-guia-reading-actions';

  var favBtn = document.createElement('button');
  favBtn.type = 'button';
  favBtn.className =
    'manejo-card-fav-btn' + (isProtoFavorite(entry.id) ? ' manejo-card-fav-btn--active' : '');
  favBtn.setAttribute('aria-label', isProtoFavorite(entry.id) ? 'Quitar de favoritos' : 'Agregar a favoritos');
  favBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
  favBtn.addEventListener('click', function () {
    toggleProtoFavorite(entry.id);
    ctx.rerender();
  });
  actions.appendChild(favBtn);

  var editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'manejo-card-edit-btn';
  editBtn.setAttribute('aria-label', 'Editar plantilla SOME');
  editBtn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  editBtn.addEventListener('click', function () {
    ui.openManejoProtocolEditorModal({ mode: 'edit', entry: entry });
  });
  actions.appendChild(editBtn);

  if (entry.isCustom) {
    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'manejo-card-edit-btn';
    delBtn.setAttribute('aria-label', 'Eliminar infusión');
    delBtn.title = 'Eliminar';
    delBtn.textContent = '×';
    delBtn.addEventListener('click', function () {
      deleteCustomProtocol(entry.id);
      navigateGuia({ view: 'indice', entityId: '' });
      ctx.rerender();
    });
    actions.appendChild(delBtn);
  }

  foot.appendChild(actions);

  var linked = pathologiesLinkedToProtocol(MANEJO_PATHOLOGIES, entry);
  if (linked.length) {
    var pathSec = document.createElement('section');
    pathSec.className = 'manejo-guia-related';
    var pathLbl = document.createElement('span');
    pathLbl.className = 'manejo-proto-pathology-links-label';
    pathLbl.textContent = 'Patologías vinculadas';
    pathSec.appendChild(pathLbl);
    linked.forEach(function (p) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'manejo-guia-related-chip';
      btn.textContent = p.title;
      btn.addEventListener('click', function () {
        navigateGuia({
          mode: 'patologia',
          view: 'lectura',
          entityId: p.id,
          fromPathologyId: '',
        });
        ctx.rerender();
      });
      pathSec.appendChild(btn);
    });
    foot.appendChild(pathSec);
  }

  return foot;
}
