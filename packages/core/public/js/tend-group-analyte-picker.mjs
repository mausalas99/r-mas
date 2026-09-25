import { crossSectionEligibleSpecs } from './tend-group-modal-open.mjs';
import { writeGroupExtraFields, seriesColorKey } from './tend-prefs.mjs';

function persistExtras(state) {
  writeGroupExtraFields(
    state.patientId,
    state.sectionKey,
    state.tableExtraSpecs.map(function (sp) {
      return { sectionKey: sp.sectionKey, fieldKey: sp.fieldKey };
    })
  );
}

function addExtraSpec(ctx, spec) {
  ctx.state.tableExtraSpecs.push(spec);
  persistExtras(ctx.state);
  ctx.renderTable(ctx.sectionKey);
}

function removeExtraSpec(ctx, rowKeyStr) {
  ctx.state.tableExtraSpecs = ctx.state.tableExtraSpecs.filter(function (sp) {
    return seriesColorKey(sp.sectionKey, sp.fieldKey) !== rowKeyStr;
  });
  persistExtras(ctx.state);
  ctx.renderTable(ctx.sectionKey);
}

function closeDropdown(slot) {
  var dd = slot.querySelector('.tend-analyte-picker-dropdown');
  if (dd) dd.remove();
}

/** Agrupa los analitos elegibles por estudio, en el orden en que aparecen en la historia. */
function groupOptionsBySection(deps, options) {
  var order = [];
  var bySection = Object.create(null);
  options.forEach(function (sp) {
    if (!bySection[sp.sectionKey]) {
      bySection[sp.sectionKey] = {
        sectionKey: sp.sectionKey,
        label: deps.getSectionLabel(sp.sectionKey) || sp.sectionKey,
        specs: [],
      };
      order.push(sp.sectionKey);
    }
    bySection[sp.sectionKey].specs.push(sp);
  });
  return order.map(function (sk) {
    return bySection[sk];
  });
}

function openDropdown(ctx) {
  var slot = ctx.slot;
  closeDropdown(slot);
  var esc = ctx.deps.esc;
  var groups = groupOptionsBySection(ctx.deps, crossSectionEligibleSpecs(ctx.deps, ctx.state));
  var activeGroup = null;
  var dd = document.createElement('div');
  dd.className = 'tend-analyte-picker-dropdown';
  dd.innerHTML =
    '<input type="text" class="tend-analyte-picker-input" placeholder="Buscar estudio…" autocomplete="off">' +
    '<div class="tend-analyte-picker-list"></div>';
  var bar = slot.querySelector('.tend-analyte-picker-bar') || slot;
  bar.appendChild(dd);
  var input = dd.querySelector('.tend-analyte-picker-input');
  var list = dd.querySelector('.tend-analyte-picker-list');

  function renderSectionList(filter) {
    input.placeholder = 'Buscar estudio…';
    var q = String(filter || '').trim().toLowerCase();
    var filtered = !q
      ? groups
      : groups.filter(function (g) {
          return g.label.toLowerCase().indexOf(q) >= 0;
        });
    if (!filtered.length) {
      list.innerHTML = '<p class="tend-analyte-picker-empty">Sin estudios que coincidan.</p>';
      return;
    }
    list.innerHTML = filtered
      .map(function (g) {
        return (
          '<button type="button" class="tend-analyte-picker-option" data-section-key="' +
          esc(g.sectionKey) +
          '">' +
          esc(g.label) +
          '</button>'
        );
      })
      .join('');
    list.querySelectorAll('[data-section-key]').forEach(function (btn) {
      btn.onclick = function (ev) {
        ev.stopPropagation();
        var sk = btn.getAttribute('data-section-key');
        activeGroup = filtered.filter(function (g) {
          return g.sectionKey === sk;
        })[0];
        if (!activeGroup) return;
        input.value = '';
        renderFieldList('');
        input.focus();
      };
    });
  }

  function renderFieldList(filter) {
    input.placeholder = 'Buscar analito…';
    var q = String(filter || '').trim().toLowerCase();
    var specs = activeGroup.specs;
    var filtered = !q
      ? specs
      : specs.filter(function (sp) {
          return (sp.cardTitle || sp.fieldKey).toLowerCase().indexOf(q) >= 0;
        });
    var backHtml =
      '<button type="button" class="tend-analyte-picker-back">‹ ' + esc(activeGroup.label) + '</button>';
    list.innerHTML =
      backHtml +
      (filtered.length
        ? filtered
            .map(function (sp) {
              return (
                '<button type="button" class="tend-analyte-picker-option" data-field-key="' +
                esc(sp.fieldKey) +
                '">' +
                esc(sp.cardTitle || sp.fieldKey) +
                '</button>'
              );
            })
            .join('')
        : '<p class="tend-analyte-picker-empty">Sin analitos que coincidan.</p>');
    list.querySelector('.tend-analyte-picker-back').onclick = function (ev) {
      ev.stopPropagation();
      activeGroup = null;
      input.value = '';
      renderSectionList('');
      input.focus();
    };
    list.querySelectorAll('[data-field-key]').forEach(function (btn) {
      btn.onclick = function (ev) {
        ev.stopPropagation();
        var fk = btn.getAttribute('data-field-key');
        var spec = activeGroup.specs.filter(function (sp) {
          return sp.fieldKey === fk;
        })[0];
        if (spec) addExtraSpec(ctx, spec);
      };
    });
  }

  renderSectionList('');
  input.addEventListener('input', function () {
    if (activeGroup) renderFieldList(input.value);
    else renderSectionList(input.value);
  });
  input.focus();

  function onOutsideClick(ev) {
    if (dd.contains(ev.target) || ev.target === ctx.addBtn) return;
    closeDropdown(slot);
    document.removeEventListener('mousedown', onOutsideClick);
  }
  document.addEventListener('mousedown', onOutsideClick);
}

function buildExtraChipsHtml(ctx) {
  var esc = ctx.deps.esc;
  if (!ctx.state.tableExtraSpecs.length) return '';
  var chips = ctx.state.tableExtraSpecs
    .map(function (sp) {
      var rk = seriesColorKey(sp.sectionKey, sp.fieldKey);
      var secLabel = ctx.deps.getSectionLabel(sp.sectionKey) || sp.sectionKey;
      return (
        '<button type="button" class="tend-hidden-chip tend-group-extra-chip" data-remove-extra="' +
        esc(rk) +
        '">' +
        esc((sp.cardTitle || sp.fieldKey) + ' · ' + secLabel) +
        ' <span aria-hidden="true">×</span></button>'
      );
    })
    .join('');
  return (
    '<div class="tend-group-extra-chips">' +
    '<span class="tend-group-hidden-label">Analitos agregados:</span>' +
    chips +
    '</div>'
  );
}

export function renderAnalytePickerBar(ctx) {
  var slot = ctx.slot;
  if (!slot) return;
  slot.innerHTML =
    '<div class="tend-analyte-picker-bar">' +
    '<button type="button" class="tend-toolbar-btn tend-analyte-picker-add-btn">+ Agregar analito</button>' +
    '</div>' +
    buildExtraChipsHtml(ctx);

  var addBtn = slot.querySelector('.tend-analyte-picker-add-btn');
  ctx.addBtn = addBtn;
  addBtn.onclick = function (ev) {
    ev.stopPropagation();
    if (slot.querySelector('.tend-analyte-picker-dropdown')) {
      closeDropdown(slot);
      return;
    }
    openDropdown(ctx);
  };
  slot.querySelectorAll('[data-remove-extra]').forEach(function (btn) {
    btn.onclick = function (ev) {
      ev.stopPropagation();
      removeExtraSpec(ctx, btn.getAttribute('data-remove-extra'));
    };
  });
}
