/**
 * Cultivos table (toolbar + one card per site + the "Negativos" strip). Preact: same DOM, classes and
 * data-* hooks the string builders in expediente-cultivos-table.mjs made. It draws a plain model
 * (buildCultivosModel); the data rules, the collapsed list, the pending marks and every click /
 * hover handler stay in expediente-cultivos-table.mjs. The antibiogram cell is still an HTML string
 * from expediente-cultivos-atb-ui.mjs: this view leaves each `td.cultivos-cell-atb` empty and the
 * .mjs fills them in draw order (cultivoRowsInDrawOrder). Every draw unmounts first, so the DOM is
 * rebuilt from scratch like the old `innerHTML` swap (the handlers toggle classes on that DOM).
 */
import { render } from 'preact';

function OrgCell({ o }) {
  return (
    <>
      {o.iso ? (
        <button
          type="button"
          aria-expanded={o.collapsed ? 'false' : 'true'}
          data-cult-ckey={o.ckey}
          class="cult-org-name cult-org-name--isolate cult-org-toggle"
        >{o.name}</button>
      ) : (
        <span class="cult-org-name">{o.name}</span>
      )}
      {o.tags.map((t) => (
        <>{' '}<span class={t.alert ? 'cult-org-tag cult-org-tag--alert' : 'cult-org-tag'}>{t.text}</span></>
      ))}
      {o.ampc && <>{' '}<span class="cult-org-tag">AmpC</span></>}
      {o.nMuestras > 0 && <>{' '}<span class="cult-org-n">{'· ' + o.nMuestras + ' muestras'}</span></>}
      {o.pendTag && <>{' '}<span class="cult-org-tag cult-org-tag--new">{o.pendTag}</span></>}
      {o.sub && <div class="cultivos-cuenta">{o.sub}</div>}
    </>
  );
}

function Row({ r }) {
  return (
    <tr class={r.trClass} data-fecha={r.fecha} data-fechas={r.fechas}>
      <td class="cultivos-cell-fecha">{r.fechaCell}</td>
      <td class="cultivos-cell-org"><OrgCell o={r.org} /></td>
      <td class="cultivos-cell-atb"></td>
      <td class="cultivos-cell-remove">
        {r.seenKeys && <button type="button" class="cultivo-row-seen-btn" data-cult-keys={r.seenKeys}>Visto</button>}
        {r.removeId && (
          <button
            type="button"
            class="cultivos-row-remove-btn"
            data-cult-set-id={r.removeId}
            title="Eliminar este cultivo del historial"
            aria-label="Eliminar este cultivo del historial"
          >×</button>
        )}
      </td>
    </tr>
  );
}

function Dots({ d }) {
  return (
    <div class="cult-site-dots" aria-label="Historia de muestras">
      {d.dots.map((dot, i) => (
        <>
          {i > 0 && <span class="cult-dot-line"></span>}
          <span class={'cult-dot cult-dot--' + (dot.pos ? 'pos' : 'neg') + (dot.isNew ? ' cult-dot--new' : '')}></span>
        </>
      ))}
      <span class="cult-dots-text">
        {d.texts.map((t, i) => (
          <>
            {i > 0 && ' · '}
            {t.neg ? (
              t.short + ' neg'
            ) : t.fecha ? (
              <button type="button" class="cult-date-btn" aria-expanded="false" data-cult-fecha={t.fecha}>{t.short}</button>
            ) : (
              t.short
            )}
          </>
        ))}
      </span>
    </div>
  );
}

function Site({ s }) {
  return (
    <details class={'cult-site' + (s.solo ? ' cult-site--solo' : '') + (s.positive ? ' cult-site--pos' : '')} open={s.positive}>
      <summary class="cult-site-head">
        <span class="rp-dot" aria-hidden="true"></span>
        <span class={'cult-status-dot' + (s.statusPos ? ' cult-status-dot--pos' : '')} aria-hidden="true"></span>
        <span class="cult-site-headtext">
          <span class="cult-site-title">
            {s.title}
            {s.tipo && <>{' · '}<span class="cult-site-tipo">{s.tipo}</span></>}
            {s.detail && <span class="cult-site-detail">{s.detail}</span>}
          </span>
          <span class="cult-site-ultimo">{s.ultimo}</span>
        </span>
        {s.newTag && <span class="cult-org-tag cult-org-tag--new">{s.newTag}</span>}
        <span class="cult-site-last">{s.last}</span>
      </summary>
      {s.dots && <Dots d={s.dots} />}
      <table class="cultivos-table">
        <tbody>{s.rows.map((r) => <Row r={r} />)}</tbody>
      </table>
    </details>
  );
}

function Toolbar({ t }) {
  return (
    <div class="cultivos-toolbar">
      <h2 class="cultivos-title">Cultivos</h2>
      <span class="cultivos-summary">{t.summary}</span>
      {t.seenAll && (
        <button type="button" class="cultivo-seen-btn" title="Marcar todos los cultivos nuevos como vistos">Marcar todo como visto</button>
      )}
      <button
        type="button"
        class={t.btnClass}
        disabled={t.busy}
        aria-busy={t.busy ? 'true' : undefined}
        title={t.title}
      >Actualizar</button>
    </div>
  );
}

/** `{ message }` = one empty-state line; `{ model }` = the table. */
export function CultivosTable({ model, message }) {
  if (message) return <p class="tend-empty">{message}</p>;
  const neg = model.neg;
  return (
    <>
      <Toolbar t={model.toolbar} />
      <div class="cult-sites-grid">
        {model.pos.map((s) => <Site s={s} />)}
        {neg && (
          <details class="cultivos-neg-fold" open={neg.open}>
            <summary class="cultivos-neg-head">
              <b>Negativos</b>
              <span class="cultivos-neg-count">{neg.count}</span>
              <span class="cultivos-neg-list">
                {neg.names.map((n) => <span class="cultivos-neg-names">{n}</span>)}
              </span>
            </summary>
            <div class="cult-sites-grid">{neg.sites.map((s) => <Site s={s} />)}</div>
          </details>
        )}
      </div>
    </>
  );
}

/** Draw into `host`, replacing whatever was there (same effect as the old `host.innerHTML = html`). */
export function drawCultivosTable(host, props) {
  render(null, host);
  host.textContent = '';
  render(<CultivosTable {...props} />, host);
}
