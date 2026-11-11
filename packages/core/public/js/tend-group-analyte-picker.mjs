import { crossSectionEligibleSpecs } from './tend-group-modal-open.mjs';
import { writeGroupExtraFields, seriesColorKey } from './tend-prefs.mjs';
import { drawAnalytePicker } from './tend-group-analyte-picker-view.jsx';

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

export function renderAnalytePickerBar(ctx) {
  var slot = ctx.slot;
  if (!slot) return;
  drawAnalytePicker(slot, {
    chips: ctx.state.tableExtraSpecs.map(function (sp) {
      return {
        key: seriesColorKey(sp.sectionKey, sp.fieldKey),
        name: sp.cardTitle || sp.fieldKey,
        secLabel: ctx.deps.getSectionLabel(sp.sectionKey) || sp.sectionKey,
      };
    }),
    getGroups: function () {
      return groupOptionsBySection(ctx.deps, crossSectionEligibleSpecs(ctx.deps, ctx.state)).map(function (g) {
        return {
          sectionKey: g.sectionKey,
          label: g.label,
          specs: g.specs.map(function (sp) {
            return { fieldKey: sp.fieldKey, title: sp.cardTitle || sp.fieldKey };
          }),
        };
      });
    },
    onPickField: function (sectionKey, fieldKey) {
      var spec = crossSectionEligibleSpecs(ctx.deps, ctx.state).filter(function (sp) {
        return sp.sectionKey === sectionKey && sp.fieldKey === fieldKey;
      })[0];
      if (spec) addExtraSpec(ctx, spec);
    },
    onRemove: function (key) {
      removeExtraSpec(ctx, key);
    },
  });
}
