/**
 * Manejo medication list (groups of rows with Nota chip, destino picker, exclude button). Preact: same
 * DOM, classes and data-* hooks the string builders in medications-panel-rows.mjs made. That file
 * keeps the rules and passes a plain model (buildMedRecetaListModel); every draw unmounts first, so
 * the DOM is rebuilt from scratch like the old `innerHTML` swap.
 */
import { render } from 'preact';
import { SOAP_DESTINATION_GROUPS, SOAP_DESTINATION_LABELS } from '../med-receta-soap.mjs';

const NOTA_TITLE = 'Incluir en Estado Actual (nota)';
const EXCL_TITLE = 'Excluir de Estado actual y egreso';

function NotaChip({ nota }) {
  return (
    <button type="button" class={'med-nota-chip' + (nota.on ? ' is-on' : '')} data-med-soap-chk="1"
      aria-pressed={nota.on ? 'true' : 'false'} title={NOTA_TITLE}
      data-onclick={nota.fn} data-onclick-args={JSON.stringify(nota.args)}>Nota</button>
  );
}

function ExclButtons({ excl }) {
  if (excl.excluded) {
    return (
      <button type="button" class="wb-btn wb-btn-ghost wb-btn-sm med-restore-btn"
        data-onclick={excl.fn} data-onclick-args={JSON.stringify(excl.args)}>Restaurar</button>
    );
  }
  return (
    <button type="button" class="wb-btn wb-btn-ghost wb-btn-icon med-excl-btn" aria-label={EXCL_TITLE} title={EXCL_TITLE}
      data-onclick={excl.fn} data-onclick-args={JSON.stringify(excl.args)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" />
      </svg>
    </button>
  );
}

/** «Cambiar destino»: an icon over the existing native destino select. */
function DestPicker({ dest }) {
  const { sid, current } = dest;
  return (
    <label class="med-receta-dest-picker wb-btn wb-btn-ghost wb-btn-icon" title="Cambiar destino">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
      </svg>
      <span class="visually-hidden med-receta-dest-label">{current ? SOAP_DESTINATION_LABELS[current] || current : 'Elegir destino…'}</span>
      <select class="med-receta-dest" aria-label="Cambiar destino" data-onchange="setMedRecetaSoapCategory"
        data-onchange-args={JSON.stringify([sid])} data-onchange-pass="value">
        <option value="">Elegir destino…</option>
        {SOAP_DESTINATION_GROUPS.map((g) => (
          <optgroup label={g.label}>
            {g.keys.map((k) => <option value={k} selected={current === k}>{SOAP_DESTINATION_LABELS[k] || k}</option>)}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function RowName({ name }) {
  if ('pill' in name) {
    return <span class="med-row-name">{name.pill ? <>BOMBA DE INSULINA <span class="med-insulin-pump-alg-pill">{name.pill}</span></> : 'BOMBA DE INSULINA'}</span>;
  }
  return (
    <>
      <span class="med-row-name" {...(name.title != null ? { title: name.title } : {})}>{name.text}</span>
      {name.dia != null && (
        <button type="button" class="med-receta-dia" title="Cambiar día de antibiótico"
          data-onclick="editMedRecetaAbxDia" data-onclick-args={JSON.stringify(name.diaArgs)}>Día {String(name.dia)}</button>
      )}
      {name.prn && <span class="med-prn-tag">PRN</span>}
      {name.dose && <div class="med-row-dose">{name.dose}</div>}
    </>
  );
}

function Row({ row }) {
  return (
    <div class={'med-receta-row' + (row.cls ? ' ' + row.cls : '')} data-med-item-id={row.id}>
      <div class="med-receta-name"><RowName name={row.name} /></div>
      <div class="med-receta-actions">
        {row.nota && <NotaChip nota={row.nota} />}
        {row.dest && <DestPicker dest={row.dest} />}
        <ExclButtons excl={row.excl} />
      </div>
    </div>
  );
}

/** @param {{ model: NonNullable<ReturnType<typeof import('./medications-panel-rows.mjs').buildMedRecetaListModel>> }} p */
export function MedRecetaList({ model }) {
  return (
    <div class={'med-receta-wrap med-groups' + (model.dense ? ' med-groups--dense' : '')}>
      {model.groups.map((g) => (
        <section class={'med-group' + (g.cls ? ' ' + g.cls : '')} data-med-group={g.key}>
          <div class="med-group-head">
            <span class="med-group-label">{g.label} <span class="med-group-count">· {g.rows.length}</span></span>
            {g.hint && <span class="med-group-hint">{g.hint}</span>}
          </div>
          <div class="med-group-card">{g.rows.map((r) => <Row row={r} />)}</div>
        </section>
      ))}
    </div>
  );
}

/** Repaint `host` with the list, or empty it when the model is null. */
export function drawMedRecetaList(host, model) {
  render(null, host);
  host.replaceChildren();
  if (model) render(<MedRecetaList model={model} />, host);
}
