/**
 * Medication grid of the Estado clínico card (header, add panel, one row per category, «+ Categoría»
 * select). Preact: same markup the string builders in estado-actual-med-ui.mjs made. The model comes from
 * medGridModel(); clicks and changes stay delegated on `.ea-clinico-med-grid` (estado-actual-med-ui.mjs),
 * so every draw starts from an empty grid, as the old innerHTML write did (add panel closed, receta slot empty).
 * Lazy-loaded.
 */
import { render } from 'preact';

function ItemText({ c }) {
  if (c.dose == null) return c.item;
  return (
    <>
      <span class="ea-med-item-name">{c.name}</span>{' '}<span class="ea-med-item-dose">{c.dose}</span>
    </>
  );
}

function RateBox({ rate, idx }) {
  if (!rate) return null;
  return (
    <label class="ea-vasop-rate">
      <input type="text" inputmode="decimal" class="ea-input ea-vasop-rate-input" data-ea-vasop-src={rate.src} data-ea-vasop-rate={String(idx)} value={rate.value} placeholder="0" aria-label="Velocidad de norepinefrina en mcg/min" />
      <span class="ea-muted">mcg/min</span>
    </label>
  );
}

function Chip({ c }) {
  if (!c.pending) {
    return (
      <span class="ea-med-chip ea-med-chip--confirmed">
        <button type="button" class="ea-med-chip-text" data-ea-med-remove={c.key} data-ea-med-idx={String(c.idx)} aria-label={'Quitar ' + c.item} title="Quitar"><ItemText c={c} /></button>
        <RateBox rate={c.rate} idx={c.idx} />
      </span>
    );
  }
  const args = JSON.stringify([c.key, c.idx]);
  return (
    <span class="ea-med-chip ea-med-chip--pending">
      <span class="ea-med-chip-text" title={c.item}><ItemText c={c} /></span>
      <RateBox rate={c.rate} idx={c.idx} />
      <span class="ea-med-chip-tag">de receta</span>
      <button type="button" class="ea-med-chip-btn ea-med-chip-btn--ok" data-onclick="confirmEaMedProposalItem" data-onclick-args={args} aria-label={'Confirmar ' + c.item}>✓</button>
      <button type="button" class="ea-med-chip-btn" data-onclick="discardEaMedProposalItem" data-onclick-args={args} aria-label={'Descartar ' + c.item}>×</button>
    </span>
  );
}

function Row({ row }) {
  return (
    <div class="ea-med-row" data-ea-med-cat={row.key}>
      <div class="ea-med-row-label">{row.label}</div>
      <div class="ea-med-chips">
        {row.chips.length ? row.chips.map((c) => <Chip c={c} />) : <span class="ea-muted">Sin medicamentos</span>}
      </div>
    </div>
  );
}

function AddPanel({ cats }) {
  return (
    <div class="ea-med-add-panel" hidden data-ea-med-add-panel="">
      <label for="ea-med-add-text">Fármaco y dosis</label>
      <input type="text" id="ea-med-add-text" class="ea-input" data-ea-med-add-text="" placeholder="Ondansetrón 8 mg IV c/8h" />
      <label for="ea-med-add-cat">Categoría</label>
      <select id="ea-med-add-cat" class="ea-input" data-ea-med-add-cat="">
        {cats.map((c) => <option value={c.value} selected={c.selected}>{c.label}</option>)}
      </select>
      <button type="button" class="ea-btn ea-btn--success" data-ea-med-add-save="">Agregar</button>
      <button type="button" class="ea-btn ea-btn--ghost" data-ea-med-from-receta="">Desde receta</button>
      <span data-ea-med-receta-slot=""></span>
    </div>
  );
}

export function MedGrid({ model: m }) {
  return (
    <>
      <div class="ea-med-head">
        <h3 class="ea-med-title">Medicamentos</h3>
        <span class="ea-muted">{m.active + m.pendingTotal + ' activos'}</span>
        {m.pendingTotal ? <span class="ea-med-pending-count">{m.pendingTotal + ' por confirmar'}</span> : null}
        <span class="ea-med-head-spacer"></span>
        {m.pendingTotal ? <button type="button" class="ea-btn ea-btn--ghost" data-onclick="confirmAllEaMedProposals">Aceptar todas</button> : null}
        <button type="button" class="ea-btn ea-btn--success" data-ea-med-add-toggle="">+ Agregar</button>
      </div>
      <AddPanel cats={m.cats} />
      {m.rows.map((row) => <Row row={row} />)}
      <div class="ea-med-add-category-row" hidden={!m.hiddenCount}>
        <select class="ea-io-link ea-med-pick-category" data-ea-med-pick-category="" aria-label="Añadir categoría de medicamento">
          {m.hiddenCount ? <option value="">+ Categoría</option> : <option value="">Todas las categorías visibles</option>}
          {m.pickGroups.map((g) => (
            <optgroup label={g.label}>
              {g.options.map((o) => <option value={o.value}>{o.label}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
    </>
  );
}

/** Empty the grid first (as innerHTML did) so a stale add panel / receta slot never survives a repaint. */
export function drawMedGrid(grid, model) {
  render(null, grid);
  render(<MedGrid model={model} />, grid);
}

/** «Desde receta» select (or the empty hint) for one category, into the add panel's slot. */
export function MedRecetaSelect({ catKey, options }) {
  if (!options.length) return <span class="ea-muted">La receta no tiene fármacos para esta categoría</span>;
  return (
    <select class="ea-input" data-ea-med-add-select={catKey} aria-label="Elegir de la receta">
      <option value="">Elegir de la receta…</option>
      {options.map((o) => <option value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function drawMedRecetaSelect(slot, catKey, options) {
  render(null, slot);
  render(<MedRecetaSelect catKey={catKey} options={options} />, slot);
}
