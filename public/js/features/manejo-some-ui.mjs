/**
 * DOM helpers for SOME order copy UI in Manejo (kv blocks, indication chips, order articles).
 */
import { formatSomeBlock, toSomeUpper } from '../electrolyte-manejo.mjs';

/** UI de copiar/pegar pedidos SOME en Manejo (oculto temporalmente). */
export const MANEJO_SOME_COPY_UI = false;

export function isManejoSomeCopyUiEnabled() {
  return MANEJO_SOME_COPY_UI;
}

export function buildKvBlock(label, value, opts) {
  opts = opts || {};
  var kv = document.createElement('div');
  kv.className = 'manejo-kv' + (opts.wide ? ' manejo-kv--wide' : '');
  var lbl = document.createElement('span');
  lbl.className = 'manejo-kv-label';
  lbl.textContent = label;
  var val = document.createElement('div');
  val.className = 'manejo-kv-val' + (opts.mono ? ' manejo-kv-val--mono' : '');
  val.textContent = value || '—';
  kv.appendChild(lbl);
  kv.appendChild(val);
  return kv;
}

export function formatIndicationChipLabel(text) {
  var s = String(text || '').trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function normalizeAtbHintToken(text) {
  return String(text || '')
    .trim()
    .toLowerCase();
}

export function splitIndicationTokens(source) {
  if (!source) return [];
  var raw = Array.isArray(source) ? source : [source];
  var out = [];
  raw.forEach(function (item) {
    String(item || '')
      .split(/\s*[;,·]\s*/g)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean)
      .forEach(function (token) {
        out.push(token);
      });
  });
  return out;
}

export function buildIndicationChips(items, familyId, opts) {
  opts = opts || {};
  var tokens = splitIndicationTokens(items);
  var row = document.createElement('div');
  row.className = 'manejo-indication-chips';
  if (opts.sectionChips) {
    row.classList.add('manejo-indication-chips--section');
  } else if (familyId) {
    row.className += ' manejo-indication-chips--' + familyId;
  }
  if (opts.clickable) {
    row.classList.add('manejo-indication-chips--clickable');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Filtrar por indicación');
  }
  if (!tokens.length) {
    row.textContent = '—';
    row.className += ' manejo-indication-chips--empty';
    return row;
  }
  tokens.forEach(function (text, idx) {
    var label = formatIndicationChipLabel(text);
    var norm = normalizeAtbHintToken(text);
    var isActive =
      opts.activeHint &&
      opts.activeHint.token === norm &&
      (!opts.activeHint.familyId || opts.activeHint.familyId === familyId);
    var toneClass = opts.sectionChips ? '' : ' manejo-indication-chip--tone-' + (idx % 3);
    var activeClass = isActive ? ' manejo-indication-chip--active' : '';

    if (opts.clickable && typeof opts.onHintClick === 'function') {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'manejo-indication-chip manejo-indication-chip--clickable' + toneClass + activeClass;
      btn.textContent = label;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.addEventListener('click', function () {
        opts.onHintClick(text, familyId);
      });
      row.appendChild(btn);
    } else {
      var chip = document.createElement('span');
      chip.className = 'manejo-indication-chip' + toneClass + activeClass;
      chip.textContent = label;
      row.appendChild(chip);
    }
  });
  return row;
}

/**
 * @param {{ attachCopy: (btn: HTMLElement, getter: () => string) => void }} deps
 */
export function createManejoSomeUi(deps) {
  var attachCopy = deps.attachCopy;

  function buildSomeField(label, text, copyText, fieldOpts) {
    var allowCopy = fieldOpts && fieldOpts.forceCopy ? true : isManejoSomeCopyUiEnabled();
    if (!allowCopy) copyText = null;
    var field = document.createElement('div');
    field.className =
      'manejo-some-field' +
      (label === 'Medicamento' ||
      label === 'Estudio' ||
      label === 'Recomendación' ||
      label === 'Criterios' ||
      label === 'Indicación'
        ? ' manejo-some-field--wide'
        : '');
    var lbl = document.createElement('span');
    lbl.className = 'manejo-some-field-label';
    lbl.textContent = label;
    field.appendChild(lbl);
    var row = document.createElement('div');
    row.className = 'manejo-some-field-row';
    var val = document.createElement('div');
    val.className = 'manejo-some-field-val';
    val.textContent = text ? toSomeUpper(text) : '—';
    row.appendChild(val);
    if (copyText) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'manejo-copy-btn';
      btn.textContent = 'Copiar';
      attachCopy(btn, function () {
        var raw = typeof copyText === 'function' ? copyText() : copyText;
        return toSomeUpper(raw);
      });
      row.appendChild(btn);
    }
    field.appendChild(row);
    return field;
  }

  function buildOrderBlockArticle(orderOrGetter, oi, blockOpts) {
    blockOpts = blockOpts || {};
    var forceCopy = !!blockOpts.forceCopy;
    var fieldOpts = forceCopy ? { forceCopy: true } : null;

    function resolveOrder() {
      return typeof orderOrGetter === 'function' ? orderOrGetter() : orderOrGetter;
    }
    var order = resolveOrder();
    var art = document.createElement('article');
    art.className = 'manejo-some-order';

    if (blockOpts.orderTitle) {
      var head = document.createElement('div');
      head.className = 'manejo-some-order-head';
      var title = document.createElement('span');
      title.className = 'manejo-some-order-title';
      title.textContent = blockOpts.orderTitle;
      head.appendChild(title);
      if (order.requiresDilution) {
        var wn = document.createElement('span');
        wn.className = 'manejo-dilution-warn';
        wn.title = 'Confirmar volumen diluyente institucional';
        wn.textContent = 'Dilución';
        head.appendChild(wn);
      }
      art.appendChild(head);
    }

    var grid = document.createElement('div');
    grid.className = 'manejo-some-grid';
    var adaKind = blockOpts.adaDisplayKind || 'treatment';

    function appendField(label, getVal) {
      var val = getVal(order);
      if (val == null || val === '') return;
      grid.appendChild(
        buildSomeField(
          label,
          toSomeUpper(val),
          function () {
            return toSomeUpper(getVal(resolveOrder()) || '');
          },
          fieldOpts
        )
      );
    }

    if (adaKind === 'criteria' || adaKind === 'milestone') {
      var primaryLabel = adaKind === 'criteria' ? 'Criterios' : 'Indicación';
      appendField(primaryLabel, function (o) {
        return (
          o.comments ||
          String(o.doseValue ?? '').trim() ||
          String(o.doseUnit ?? '').trim() ||
          String(o.medication ?? '').trim()
        );
      });
      art.appendChild(grid);
      if (blockOpts.copyAllLabel) {
        var actionsMs = document.createElement('div');
        actionsMs.className = 'manejo-some-order-actions';
        var bAllMs = document.createElement('button');
        bAllMs.type = 'button';
        bAllMs.className = 'manejo-copy-btn primary';
        bAllMs.textContent = blockOpts.copyAllLabel;
        attachCopy(bAllMs, function () {
          return formatSomeBlock(resolveOrder());
        });
        actionsMs.appendChild(bAllMs);
        art.appendChild(actionsMs);
      }
      return art;
    }

    if (adaKind === 'monitor') {
      appendField('Estudio', function (o) {
        return o.medication;
      });
      appendField('Frecuencia', function (o) {
        return o.frequency;
      });
      appendField('Comentarios adicionales', function (o) {
        return o.comments;
      });
      art.appendChild(grid);
      if (blockOpts.copyAllLabel) {
        var actionsMon = document.createElement('div');
        actionsMon.className = 'manejo-some-order-actions';
        var bAllMon = document.createElement('button');
        bAllMon.type = 'button';
        bAllMon.className = 'manejo-copy-btn primary';
        bAllMon.textContent = blockOpts.copyAllLabel;
        attachCopy(bAllMon, function () {
          return formatSomeBlock(resolveOrder());
        });
        actionsMon.appendChild(bAllMon);
        art.appendChild(actionsMon);
      }
      return art;
    }

    appendField('Medicamento', function (o) {
      return o.medication;
    });

    var doseStr =
      String(order.doseValue ?? '').trim() +
      (order.doseUnit ? ' ' + toSomeUpper(order.doseUnit) : '').trim();
    if (doseStr) {
      grid.appendChild(
        buildSomeField(
          'Dosis',
          doseStr,
          function () {
            var o = resolveOrder();
            return (
              String(o.doseValue ?? '').trim() +
              (o.doseUnit ? ' ' + toSomeUpper(o.doseUnit) : '')
            ).trim();
          },
          fieldOpts
        )
      );
    }

    appendField('Vía', function (o) {
      return o.route;
    });
    appendField('Dilución', function (o) {
      return o.dilution;
    });
    appendField('Frecuencia', function (o) {
      return o.frequency;
    });

    if (
      order.infusionRateMlHr != null &&
      order.infusionRateMlHr !== '' &&
      !(
        typeof order.infusionRateMlHr === 'number' && !Number.isFinite(order.infusionRateMlHr)
      )
    ) {
      var rateRaw = String(order.infusionRateMlHr).trim();
      var rateTxt = /mcg\/min|mg\/min|u\/min|u\/kg\/h/i.test(rateRaw)
        ? toSomeUpper(rateRaw)
        : toSomeUpper(rateRaw + ' CC/HR');
      grid.appendChild(
        buildSomeField(
          'Velocidad de infusión',
          rateTxt,
          function () {
            var r = String(resolveOrder().infusionRateMlHr || '').trim();
            return /mcg\/min|mg\/min|u\/min|u\/kg\/h/i.test(r)
              ? toSomeUpper(r)
              : toSomeUpper(r + ' CC/HR');
          },
          fieldOpts
        )
      );
    }

    appendField('Comentarios adicionales', function (o) {
      return o.comments;
    });

    art.appendChild(grid);

    if (blockOpts.copyAllLabel) {
      var actions = document.createElement('div');
      actions.className = 'manejo-some-order-actions';
      var bAll = document.createElement('button');
      bAll.type = 'button';
      bAll.className = 'manejo-copy-btn primary';
      bAll.textContent = blockOpts.copyAllLabel;
      attachCopy(bAll, function () {
        return formatSomeBlock(resolveOrder());
      });
      actions.appendChild(bAll);
      art.appendChild(actions);
    }

    return art;
  }

  function buildAdaOrderBlock(orderOrGetter, displayKind) {
    return buildOrderBlockArticle(orderOrGetter, 0, {
      adaDisplayKind: displayKind || 'treatment',
    });
  }

  function buildSomeOrderArticle(orderOrGetter, oi) {
    if (!isManejoSomeCopyUiEnabled()) {
      return document.createDocumentFragment();
    }
    return buildOrderBlockArticle(orderOrGetter, oi, {
      orderTitle: 'Pedido SOME #' + String(oi + 1),
      copyAllLabel: 'Copiar bloque SOME',
    });
  }

  return {
    buildSomeField: buildSomeField,
    buildOrderBlockArticle: buildOrderBlockArticle,
    buildAdaOrderBlock: buildAdaOrderBlock,
    buildSomeOrderArticle: buildSomeOrderArticle,
  };
}
