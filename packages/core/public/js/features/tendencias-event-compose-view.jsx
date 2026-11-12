/**
 * «Nueva / Editar eventualidad» modal markup (Preact). Same DOM, ids, classes and data-* hooks
 * the string builder in tendencias-event-compose.mjs made; wiring stays there.
 */
import { render } from 'preact';
// The eventualidades-store module namespace comes in as `store`: importing it here would split it into an extra eager boot chunk.

function KindFields({ entry, store }) {
  const kind = entry ? store.normalizeEventualidadKind(entry.kind) || 'otro' : null;
  const detail = entry ? store.deriveEventualidadDetail(entry) : '';
  const activeProduct = entry ? store.normalizeTransfusionProduct(entry.transfusionProduct) : null;
  return (
    <>
      <div class="tend-event-compose-kind-fields" data-kind-fields="transfusion">
        <span class="tend-event-compose-label">Producto</span>
        <div class="tend-event-kind-pills tend-event-transfusion-pills" role="group" aria-label="Producto transfundido">
          {store.TRANSFUSION_PRODUCTS.map((product, idx) => {
            const active = entry ? product === activeProduct : idx === 0;
            return (
              <button
                type="button"
                class={'tend-event-kind-pill tend-event-product-pill' + (active ? ' is-active' : '')}
                data-product={product}
                aria-pressed={active ? 'true' : 'false'}
              >
                {store.TRANSFUSION_PRODUCT_LABELS[product]}
              </button>
            );
          })}
        </div>
        <label class="tend-event-compose-label" for="tend-event-compose-transfusion-detail">Detalle (opcional)</label>
        <input
          type="text"
          id="tend-event-compose-transfusion-detail"
          class="tend-event-compose-input"
          value={kind === 'transfusion' ? detail : ''}
          placeholder="Ej. 2 U, pool…"
        />
      </div>
      <div class="tend-event-compose-kind-fields is-hidden" data-kind-fields="biopsia" hidden>
        <label class="tend-event-compose-label" for="tend-event-compose-biopsia-site">De dónde</label>
        <input
          type="text"
          id="tend-event-compose-biopsia-site"
          class="tend-event-compose-input"
          value={kind === 'biopsia' ? detail : ''}
          placeholder="Ej. Riñón, médula ósea, piel…"
        />
      </div>
      <div class="tend-event-compose-kind-fields is-hidden" data-kind-fields="procedimiento" hidden>
        <label class="tend-event-compose-label" for="tend-event-compose-procedimiento-text">Procedimiento</label>
        <textarea
          id="tend-event-compose-procedimiento-text"
          class="tend-event-compose-text"
          rows={3}
          placeholder="Describe el procedimiento…"
          value={kind === 'procedimiento' ? detail : ''}
        ></textarea>
      </div>
      <div class="tend-event-compose-kind-fields is-hidden" data-kind-fields="otro" hidden>
        <label class="tend-event-compose-label" for="tend-event-compose-otro-text">Detalle (opcional)</label>
        <textarea
          id="tend-event-compose-otro-text"
          class="tend-event-compose-text"
          rows={3}
          placeholder="Describe lo ocurrido…"
          value={kind === 'otro' ? detail : ''}
        ></textarea>
      </div>
    </>
  );
}

/** @param {{ defaultDate: string, entry: object|null }} props defaultDate is already resolved (YYYY-MM-DD) */
export function TendEventCompose({ defaultDate, entry, store }) {
  const entryKind = entry ? store.normalizeEventualidadKind(entry.kind) || 'otro' : null;
  return (
    <div id="tend-event-compose-backdrop" class="tend-event-compose-backdrop" aria-hidden="false">
      <div
        id="tend-event-compose-modal"
        class="tend-event-compose-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tend-event-compose-title"
      >
        <h3 id="tend-event-compose-title" class="tend-event-compose-title">
          {entry ? 'Editar eventualidad' : 'Nueva eventualidad'}
        </h3>
        <p class="tend-event-compose-hint">Se mostrará como contexto en las gráficas de tendencia del mismo día.</p>
        <div class="tend-event-compose-field">
          <span class="tend-event-compose-label">Categoría</span>
          <div class="tend-event-kind-pills" role="group" aria-label="Categoría">
            {store.EVENTUALIDAD_KINDS.map((kind, idx) => {
              const active = entry ? kind === entryKind : idx === 0;
              return (
                <button
                  type="button"
                  class={'tend-event-kind-pill' + (active ? ' is-active' : '')}
                  data-kind={kind}
                  aria-pressed={active ? 'true' : 'false'}
                >
                  {store.EVENTUALIDAD_KIND_LABELS[kind]}
                </button>
              );
            })}
          </div>
        </div>
        <div class="tend-event-compose-field">
          <label class="tend-event-compose-label" for="tend-event-compose-date">Fecha</label>
          <input
            type="date"
            id="tend-event-compose-date"
            class="rpc-date-input tend-event-compose-date"
            value={defaultDate}
            aria-label="Fecha de la eventualidad"
          />
        </div>
        <div id="tend-event-compose-kind-fields-wrap">
          <KindFields entry={entry} store={store} />
        </div>
        <div class="tend-event-compose-actions">
          <button type="button" class="ea-btn ea-btn--ghost" id="tend-event-compose-cancel">Cancelar</button>
          <button type="button" class="ea-btn ea-btn--primary" id="tend-event-compose-save">Guardar</button>
        </div>
      </div>
    </div>
  );
}

/** Draw the modal into `host` (an empty detached div); the backdrop becomes host.firstElementChild. */
export function drawTendEventCompose(host, props) {
  render(<TendEventCompose {...props} />, host);
}
