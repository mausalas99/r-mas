/**
 * Guía clínica — modo Antibiótico (índice compacto + lectura ancho completo).
 */
import { findPathologyById } from '../manejo-pathology-catalog.mjs';
import {
  getGuiaEntityId,
  getGuiaFromPathologyId,
  navigateGuia,
} from './manejo-guia-state.mjs';

/**
 * @param {HTMLElement} host
 * @param {{ pid: string|null, patient: object|null, ui: object, rerender: function }} ctx
 */
export function renderGuiaAtbIndex(host, ctx) {
  var ui = ctx.ui;
  var atbCtx = ui.getAtbPatientContext(ctx.pid, ctx.patient);
  var activeIso = atbCtx.activeIso;
  var cultureCtx = atbCtx.cultureCtx;
  var renalCtx = atbCtx.renalCtx;

  var root = document.createElement('div');
  root.className = 'manejo-guia-atb-index manejo-root--atb';

  if (cultureCtx.isolates.length) {
    var banner = ui.buildGuiaAtbCultureBanner(cultureCtx, atbCtx.activeIdx, ctx.pid, ctx.rerender);
    if (banner) root.appendChild(banner);
  }

  var toolbar = document.createElement('div');
  toolbar.className = 'manejo-guia-index-toolbar manejo-atb-toolbar-v2';

  var searchRow = document.createElement('div');
  searchRow.className = 'manejo-guia-index-search-row manejo-proto-search-row';
  var search = ui.buildManejoSearchInput(
    'Buscar fármaco, familia o indicación…',
    'Buscar antibióticos'
  );
  searchRow.appendChild(search.field);

  var countBadge = document.createElement('span');
  countBadge.className = 'manejo-proto-count';
  countBadge.setAttribute('aria-live', 'polite');
  searchRow.appendChild(countBadge);

  if (renalCtx && renalCtx.egfr != null) {
    var renalChip = document.createElement('span');
    renalChip.className = 'manejo-proto-count manejo-atb-renal-chip';
    var renalParts = ['eTFG ' + renalCtx.egfr];
    if (renalCtx.creatinineMgDl != null) renalParts.push('Cr ' + renalCtx.creatinineMgDl);
    renalChip.textContent = renalParts.join(' · ');
    renalChip.title =
      'Laboratorio' +
      (renalCtx.fecha ? ' ' + renalCtx.fecha : '') +
      (renalCtx.source === 'computed' ? ' · eTFG calculada CKD-EPI' : '') +
      '. Se usa para sugerir ajuste renal.';
    searchRow.appendChild(renalChip);
  }
  toolbar.appendChild(searchRow);

  var activeFam = ui.getAtbFamilyFilter();
  var risFilter = ui.getAtbRisFilter();
  var hintFilter = ui.getAtbHintFilter();

  var filtersRow = document.createElement('div');
  filtersRow.className = 'manejo-proto-filters-row';

  var viewsSeg = ui.buildManejoProtoSegmentGroup('Vista de antibióticos');
  viewsSeg.appendChild(
    ui.buildManejoProtoSegmentChip('Todos', !risFilter, function () {
      ui.clearAtbRisFilter();
      ui.syncManejoAtbRisChipFilterUi(root);
      paintList();
    })
  );
  if (activeIso) {
    ['s', 'r', 'i'].forEach(function (key) {
      var meta = ui.atbRisFilterMeta[key];
      viewsSeg.appendChild(
        ui.buildManejoProtoSegmentChip(
          meta.label,
          risFilter === key,
          function () {
            ui.toggleAtbRisFilter(key);
            ui.syncManejoAtbRisChipFilterUi(root);
            paintList();
          },
          {
            extraClass: 'manejo-atb-ris-filter-pill manejo-atb-ris-filter-pill--' + key,
            title: meta.title,
          }
        )
      );
    });
  }
  filtersRow.appendChild(viewsSeg);

  filtersRow.appendChild(
    ui.buildManejoProtoFilterMenu({
      fieldLabel: 'Familia',
      wrapClass: 'manejo-proto-filter--atb-family',
      activeId: activeFam,
      activeAccentClass: activeFam !== 'all' ? ui.atbFamilyCssClass(activeFam) : '',
      defaultOptionLabel: 'Todas las familias',
      ariaLabel: 'Filtrar por familia de antibiótico',
      options: [{ id: 'all', label: 'Todas las familias' }].concat(
        ui.getAtbFamilies().map(function (f) {
          var count = ui.getAtbDrugs().filter(function (d) {
            return d.family === f.id;
          }).length;
          if (!count) return null;
          return {
            id: f.id,
            label: f.label,
            hint: count + ' ATB',
            accentClass: ui.atbFamilyCssClass(f.id),
          };
        }).filter(Boolean)
      ),
      onSelect: function (id) {
        ui.applyAtbFamilyFilter(id, ctx.rerender);
      },
    })
  );
  toolbar.appendChild(filtersRow);

  var discInline = document.createElement('p');
  discInline.className = 'manejo-hint manejo-atb-toolbar-hint';
  discInline.textContent =
    'Sugerencia orientativa; confirmar clínicamente.' +
    (cultureCtx.isolates.length ? '' : ' Sin cultivos positivos recientes.');
  toolbar.appendChild(discInline);
  root.appendChild(toolbar);

  var listHost = document.createElement('div');
  listHost.className = 'manejo-guia-index-list';
  root.appendChild(listHost);
  host.appendChild(root);

  if (!activeIso) ui.clearAtbRisFilter();

  function drugMatchesSearch(drug, q) {
    if (!q) return true;
    var hay =
      drug.name +
      ' ' +
      drug.adultDose +
      ' ' +
      (drug.indications || []).join(' ') +
      ' ' +
      ui.familyLabelForAtb(drug.family);
    return hay.toLowerCase().indexOf(q) !== -1;
  }

  function onHintChipClick(token, familyId) {
    var cur = ui.getAtbHintFilter();
    var norm = String(token || '')
      .trim()
      .toLowerCase();
    if (cur && cur.token === norm && cur.familyId === familyId) {
      ui.clearAtbHintFilter();
      ui.applyAtbFamilyFilter('all', ctx.rerender);
    } else {
      ui.setAtbHintFilter(token, familyId);
      ui.applyAtbFamilyFilter(familyId, ctx.rerender);
    }
  }

  function appendFamilyHints(famId) {
    var hint = ui.familyHintForAtb(famId);
    if (!hint) return;
    var hintWrap = document.createElement('div');
    hintWrap.className = 'manejo-atb-family-hints ' + ui.atbFamilyCssClass(famId);
    hintWrap.appendChild(
      ui.buildIndicationChips(hint, famId, {
        clickable: true,
        sectionChips: true,
        activeHint: hintFilter,
        onHintClick: onHintChipClick,
      })
    );
    listHost.appendChild(hintWrap);
  }

  function buildIndexRow(drug, classification) {
    var row = document.createElement('button');
    row.type = 'button';
    row.className =
      'manejo-guia-index-row ' +
      ui.atbFamilyCssClass(drug.family) +
      ' manejo-guia-index-row--atb manejo-atb--' +
      (classification.status || 'neutral');

    var title = document.createElement('span');
    title.className = 'manejo-guia-index-row-title';
    title.textContent = drug.name;
    row.appendChild(title);

    var meta = document.createElement('span');
    meta.className = 'manejo-guia-index-row-meta';
    meta.textContent = ui.familyLabelForAtb(drug.family);
    row.appendChild(meta);

    var st = classification.status || 'neutral';
    if (st === 'compatible' || st === 'caution') {
      var badge = document.createElement('span');
      badge.className =
        'manejo-via-chip manejo-atb-status-chip manejo-atb-status-chip--' +
        st +
        ' manejo-guia-index-row-badge';
      badge.textContent =
        st === 'compatible' ? 'S antibiograma' : st === 'caution' ? 'Precaución' : '';
      row.appendChild(badge);
    } else if (drug.adultDose) {
      var doseBadge = document.createElement('span');
      doseBadge.className = 'manejo-guia-index-row-badge';
      doseBadge.textContent =
        drug.adultDose.length > 28 ? drug.adultDose.slice(0, 28) + '…' : drug.adultDose;
      doseBadge.title = drug.adultDose;
      row.appendChild(doseBadge);
    }

    row.addEventListener('click', function () {
      navigateGuia({ mode: 'atb', view: 'lectura', entityId: drug.id });
      ctx.rerender();
    });

    return row;
  }

  function paintList() {
    while (listHost.firstChild) listHost.removeChild(listHost.firstChild);
    var q = String(search.input.value || '')
      .trim()
      .toLowerCase();
    var famFilter = ui.getAtbFamilyFilter();
    var currentRisFilter = ui.getAtbRisFilter();
    var currentHintFilter = ui.getAtbHintFilter();

    var filtered = ui.getAtbDrugs().filter(function (drug) {
      if (famFilter !== 'all' && drug.family !== famFilter) return false;
      if (
        currentHintFilter &&
        currentHintFilter.token &&
        !ui.drugMatchesAtbHint(drug, currentHintFilter.token)
      ) {
        return false;
      }
      if (currentHintFilter && currentHintFilter.familyId && drug.family !== currentHintFilter.familyId) {
        return false;
      }
      if (!ui.drugMatchesAtbRisFilter(drug, activeIso, currentRisFilter)) return false;
      return drugMatchesSearch(drug, q);
    });

    countBadge.textContent = filtered.length === 1 ? '1 ATB' : filtered.length + ' ATB';

    if (!filtered.length) {
      var nz = document.createElement('p');
      nz.className = 'manejo-guia-placeholder';
      nz.textContent =
        currentRisFilter === 's'
          ? 'Sin antibióticos del catálogo con S en este antibiograma.'
          : currentRisFilter === 'r'
            ? 'Sin antibióticos del catálogo con R en este antibiograma.'
            : currentRisFilter === 'i'
              ? 'Sin antibióticos del catálogo con I en este antibiograma.'
              : q
                ? 'Sin coincidencias'
                : 'Sin antibióticos con estos filtros';
      listHost.appendChild(nz);
      return;
    }

    if (famFilter !== 'all') appendFamilyHints(famFilter);

    filtered.sort(function (a, b) {
      var ca = ui.classifyAtbForIsolate(a, activeIso || {});
      var cb = ui.classifyAtbForIsolate(b, activeIso || {});
      var rank = { compatible: 0, caution: 1, neutral: 2 };
      var dr = (rank[ca.status] || 2) - (rank[cb.status] || 2);
      if (dr !== 0) return dr;
      return String(a.name).localeCompare(String(b.name), 'es');
    });

    filtered.forEach(function (drug) {
      var cls = ui.classifyAtbForIsolate(drug, activeIso || {});
      listHost.appendChild(buildIndexRow(drug, cls));
    });
  }

  search.input.addEventListener('input', paintList);
  paintList();

  ui.wireManejoAtbRisChipFilters(root, paintList);
}

/**
 * @param {HTMLElement} host
 * @param {{ pid: string|null, patient: object|null, ui: object, rerender: function }} ctx
 */
export function renderGuiaAtbReading(host, ctx) {
  var ui = ctx.ui;
  var drug = ui.findAtbDrugById(getGuiaEntityId());
  var atbCtx = ui.getAtbPatientContext(ctx.pid, ctx.patient);
  var activeIso = atbCtx.activeIso;

  var wrap = document.createElement('div');
  wrap.className =
    'manejo-guia-reading manejo-guia-atb-reading' +
    (drug ? ' ' + ui.atbFamilyCssClass(drug.family) : '');

  wrap.appendChild(buildReadingBar(ctx, drug));

  if (!drug) {
    var miss = document.createElement('p');
    miss.className = 'manejo-guia-placeholder';
    miss.textContent = 'Antibiótico no encontrado.';
    wrap.appendChild(miss);
    host.appendChild(wrap);
    return;
  }

  var classification = ui.classifyAtbForIsolate(drug, activeIso || {});
  var panel = ui.buildAtbReadingPanel(
    drug,
    classification,
    ctx.patient,
    atbCtx.renalCtx,
    activeIso
  );
  wrap.appendChild(panel.root);
  host.appendChild(wrap);
}

function buildReadingBar(ctx, drug) {
  var ui = ctx.ui;
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

  var fromPathId = getGuiaFromPathologyId();
  var fromPath = fromPathId ? findPathologyById(fromPathId) : null;
  if (fromPath && drug) {
    var crumb = document.createElement('nav');
    crumb.className = 'manejo-guia-breadcrumb';
    crumb.setAttribute('aria-label', 'Origen');
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
    crumb.appendChild(pathLink);
    crumb.appendChild(document.createTextNode(' › ' + drug.name));
    bar.appendChild(crumb);
  }

  if (drug) {
    var chip = document.createElement('span');
    chip.className =
      'manejo-guia-branch-chip manejo-proto-detail-cat ' + ui.atbFamilyCssClass(drug.family);
    chip.textContent = ui.familyLabelForAtb(drug.family);
    bar.appendChild(chip);

    var h1 = document.createElement('h1');
    h1.className = 'manejo-guia-reading-title';
    h1.textContent = drug.name;
    bar.appendChild(h1);
  } else {
    var h1miss = document.createElement('h1');
    h1miss.className = 'manejo-guia-reading-title';
    h1miss.textContent = 'Antibiótico';
    bar.appendChild(h1miss);
  }

  return bar;
}
