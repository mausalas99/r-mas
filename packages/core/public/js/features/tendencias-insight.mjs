/**
 * Tendencias insight helpers: delta callouts + dual-series align (Chart.js).
 * Delta color = clinical tone vs reference range (not raw up/down).
 */

export function formatTendDelta(latest, previous) {
  if (latest == null || previous == null) return null;
  var a = Number(latest);
  var b = Number(previous);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  var d = a - b;
  var abs = Math.abs(d);
  var text = (d > 0 ? '+' : d < 0 ? '−' : '') + (d === 0 ? '0' : String(Number(abs.toPrecision(4))));
  var direction = d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
  var pct = null;
  if (b !== 0) pct = (d / Math.abs(b)) * 100;
  return { delta: d, text: text, direction: direction, pct: pct };
}

export function isTendJump(latest, previous, opts) {
  opts = opts || {};
  var info = formatTendDelta(latest, previous);
  if (!info) return false;
  var absMin = opts.absMin != null ? opts.absMin : null;
  var pctMin = opts.pctMin != null ? opts.pctMin : 15;
  if (absMin != null && Math.abs(info.delta) >= absMin) return true;
  if (info.pct != null && Math.abs(info.pct) >= pctMin) return true;
  return false;
}

export function previousValueFromSetsDesc(setsDesc, sectionKey, fieldKey, getValue) {
  if (!setsDesc || setsDesc.length < 2 || typeof getValue !== 'function') return null;
  return getValue(setsDesc[1], sectionKey, fieldKey);
}

/** How far a value sits outside [lo, hi]; 0 = in range. */
export function distanceOutsideRef(value, ref) {
  if (value == null || !ref || ref.length < 2) return null;
  var v = Number(value);
  var lo = Number(ref[0]);
  var hi = Number(ref[1]);
  if (!Number.isFinite(v) || !Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  if (lo > hi) {
    var swap = lo;
    lo = hi;
    hi = swap;
  }
  if (v < lo) return lo - v;
  if (v > hi) return v - hi;
  return 0;
}

/**
 * Clinical tone of a delta relative to normality.
 * - good: moving toward / into the reference range (e.g. high WBC dropping)
 * - bad: moving away / out of range (e.g. low Hb dropping further)
 * - neutral: stayed in range, or no usable ref
 * @returns {'good'|'bad'|'neutral'}
 */
export function classifyTendDeltaTone(latest, previous, ref) {
  var info = formatTendDelta(latest, previous);
  if (!info || info.delta === 0) return 'neutral';
  var dPrev = distanceOutsideRef(previous, ref);
  var dLatest = distanceOutsideRef(latest, ref);
  if (dPrev == null || dLatest == null) return 'neutral';
  if (dPrev === 0 && dLatest === 0) return 'neutral';
  if (dLatest < dPrev) return 'good';
  if (dLatest > dPrev) return 'bad';
  return 'neutral';
}

/**
 * @param {(s: string) => string} esc
 * @param {unknown} latest
 * @param {unknown} previous
 * @param {boolean} [isAbnormal]
 * @param {[number, number]|null|undefined} [ref]
 */
export function buildTendInsightHtml(esc, latest, previous, isAbnormal, ref) {
  void isAbnormal; // range signal lives on .tend-param-value.tend-abnormal and the status cell
  var info = formatTendDelta(latest, previous);
  if (!info || info.delta === 0) return '';
  if (info.pct == null || !Number.isFinite(info.pct)) return '';
  var pctRounded = Math.round(info.pct);
  if (pctRounded === 0) return '';
  var jump = isTendJump(latest, previous);
  var tone = classifyTendDeltaTone(latest, previous, ref);
  var deltaText =
    (pctRounded > 0 ? '+' : '−') + String(Math.abs(pctRounded)) + '%';
  var cls =
    'tend-insight-delta tend-insight-delta--' +
    info.direction +
    ' tend-insight-delta--' +
    tone +
    (jump ? ' tend-insight-delta--jump' : '');
  return (
    '<div class="tend-insight">' +
    '<span class="' +
    cls +
    '">' +
    esc(deltaText) +
    '</span></div>'
  );
}


/** Status word + arrow vs reference range (never colour alone). */
export function tendStatusInfo(latest, ref) {
  if (latest == null || !ref || ref.length < 2) return { kind: 'none', text: '—' };
  var v = Number(latest);
  if (!Number.isFinite(v)) return { kind: 'none', text: '—' };
  if (v < Number(ref[0])) return { kind: 'low', text: '▼ Bajo' };
  if (v > Number(ref[1])) return { kind: 'high', text: '▲ Alto' };
  return { kind: 'ok', text: 'En rango' };
}

export function buildTendStatusHtml(esc, latest, ref) {
  var st = tendStatusInfo(latest, ref);
  return '<span class="tend-status tend-status--' + st.kind + '">' + esc(st.text) + '</span>';
}

export function tendRangeText(ref) {
  if (!ref || ref.length < 2) return '—';
  return String(ref[0]) + ' – ' + String(ref[1]);
}

/** Cambio cell: % delta with tone class, or a dash. */
export function buildTendChangeHtml(esc, latest, previous, isAbnormal, ref) {
  return (
    buildTendInsightHtml(esc, latest, previous, isAbnormal, ref) ||
    '<span class="tend-none">—</span>'
  );
}

/** Align compare values onto primary chart labels (string equality). */
export function alignSeriesToLabels(primaryLabels, compareLabels, compareValues) {
  var map = Object.create(null);
  for (var i = 0; i < (compareLabels || []).length; i += 1) {
    map[String(compareLabels[i])] = compareValues[i];
  }
  return (primaryLabels || []).map(function (lab) {
    var v = map[String(lab)];
    return v == null ? null : v;
  });
}

export function formatTendTooltipDelta(values, dataIndex) {
  if (!values || dataIndex == null || dataIndex < 1) return null;
  var cur = values[dataIndex];
  var prev = values[dataIndex - 1];
  var info = formatTendDelta(cur, prev);
  if (!info) return null;
  return 'Δ ' + info.text;
}

/**
 * Readings table rows for the analyte pane, newest first.
 * Change = absolute delta vs the previous reading; tone as in the list.
 * @returns {{label: string, value: number|string|null, change: string, tone: string}[]}
 */
export function tendReadingsRows(labels, values, ref) {
  var rows = [];
  for (var i = (values || []).length - 1; i >= 0; i -= 1) {
    var prev = i > 0 ? values[i - 1] : null;
    var info = formatTendDelta(values[i], prev);
    rows.push({
      label: String(labels[i] == null ? '' : labels[i]),
      value: values[i] == null ? null : values[i],
      change: info ? info.text : '',
      tone: classifyTendDeltaTone(values[i], prev, ref),
    });
  }
  return rows;
}

/** Plain-text copy of the readings (tab separated, newest first). */
export function tendReadingsText(title, unit, rows) {
  var head = title + (unit ? ' (' + unit + ')' : '');
  return [head]
    .concat(
      rows.map(function (r) {
        return r.label + '\t' + (r.value == null ? '—' : r.value) + (r.change ? '\t' + r.change : '');
      })
    )
    .join('\n');
}

/** Big-number change line: «+6%» plus a tone word, vs the previous reading. */
export function tendHeroChange(latest, previous, ref) {
  var info = formatTendDelta(latest, previous);
  if (!info || info.delta === 0) return null;
  var pct = info.pct != null && Number.isFinite(info.pct) ? Math.round(info.pct) : null;
  var tone = classifyTendDeltaTone(latest, previous, ref);
  return {
    arrow: info.direction === 'up' ? '▲' : '▼',
    text: pct ? (pct > 0 ? '+' : '−') + Math.abs(pct) + '%' : info.text,
    tone: tone,
    note:
      tone === 'good'
        ? ref && latest >= ref[0] && latest <= ref[1]
          ? 'volvió al rango'
          : 'se acerca al rango'
        : tone === 'bad'
          ? 'se aleja del rango'
          : '',
  };
}
