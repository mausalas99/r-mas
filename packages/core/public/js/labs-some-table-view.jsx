/**
 * SOME report tables (department sections, group tables, tabs bar and export buttons). Preact:
 * same DOM the string builders in labs-some-table-render.mjs made. That file keeps the rules and
 * passes a plain model (buildSomeTablesModel); labs-some-table-wire.mjs wires the buttons and tabs
 * on the drawn DOM. Every draw unmounts and empties the host first, so the DOM is rebuilt from
 * scratch like the old `innerHTML` swap.
 */
import { render } from 'preact';

const COPY_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);
const IMAGE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
  </svg>
);

function Toolbar({ g }) {
  return (
    <div class="lab-some-table-toolbar">
      <button type="button" class="lab-some-export-btn" data-export="tsv" data-dept-index={String(g.deptIndex)}
        data-group-index={String(g.groupIndex)} data-label={g.exportLabel} title="Copiar tabla como texto">{COPY_ICON}TSV</button>
      <button type="button" class="lab-some-export-btn" data-export="png" data-dept-index={String(g.deptIndex)}
        data-group-index={String(g.groupIndex)} data-label={g.exportLabel} title="Copiar tabla como imagen">{IMAGE_ICON}PNG</button>
    </div>
  );
}

function Group({ g }) {
  const cols = g.isCito ? '2' : '3';
  return (
    <div class={'lab-some-group' + (g.isCito ? ' lab-some-group--cito' : '')} data-table-id={g.tableId}
      data-dept-index={String(g.deptIndex)} data-group-index={String(g.groupIndex)} data-variant={g.isCito ? 'cito' : 'standard'}>
      {g.title && <div class="lab-some-group-title">{g.title}</div>}
      {g.fluidSource && (
        <div class="lab-some-fluid-source"><span class="lab-some-fluid-label">Origen del líquido:</span> {g.fluidSource}</div>
      )}
      {g.toolbar && <Toolbar g={g} />}
      <div class="lab-some-table-wrap">
        <table class={'lab-some-table lab-some-table--cols-' + cols}>
          <colgroup>
            <col class="lab-some-col-estudio" />
            <col class="lab-some-col-resultado" />
            {!g.isCito && <col class="lab-some-col-ref" />}
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Estudio</th>
              <th scope="col">Resultado</th>
              {!g.isCito && <th scope="col">Valor de referencia</th>}
            </tr>
          </thead>
          <tbody>
            {g.rows.map((r) => (
              <tr class={r.abnormal ? 'lab-some-row--abnormal' : undefined}>
                <td class="lab-some-estudio">{r.estudio}</td>
                <td class={'lab-some-resultado' + (r.abnormal ? ' lab-some-abnormal' : '')} data-unidades={r.unidades} data-ref={r.ref}>
                  {r.flag && <span class="lab-some-flag" aria-label="Fuera de rango">{r.flag}</span>}
                  <span class="lab-some-resultado-val">{r.display}</span>
                </td>
                {!g.isCito && <td class="lab-some-ref">{r.ref}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabsBar({ tabs }) {
  return (
    <div class="lab-some-tabs">
      <div class="lab-some-tablist" role="tablist" aria-label="Secciones del reporte">
        {tabs.map((t, di) => (
          <button type="button" role="tab" class={'lab-some-tab' + (di === 0 ? ' is-active' : '')}
            aria-selected={di === 0 ? 'true' : 'false'} data-some-tab={String(di)}>
            {t.label}
            {t.abnormal > 0 && <span class="lab-some-tab-count" aria-label={t.abnormal + ' alterados'}>{t.abnormal}</span>}
          </button>
        ))}
      </div>
      <label class="lab-some-only-abn">
        <span>Solo alterados</span>
        <span class="rpc-switch">
          <input type="checkbox" class="rpc-switch-input lab-some-only-abn-input" role="switch" aria-checked="false" />
          <span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb" /></span>
        </span>
      </label>
    </div>
  );
}

function DeptActions({ d }) {
  return (
    <span class="lab-some-dept-summary-actions">
      <button type="button" class="lab-some-export-btn lab-some-dept-export-btn" data-export="tsv"
        data-dept-index={String(d.index)} data-label={d.label} title="Copiar sección como texto">Copiar TSV</button>
      <button type="button" class="lab-some-export-btn lab-some-dept-export-btn" data-export="png"
        data-dept-index={String(d.index)} data-label={d.label} title="Copiar sección como imagen">Copiar PNG</button>
    </span>
  );
}

function Dept({ d, modal }) {
  const groups = d.groups.map((g) => <Group g={g} />);
  return (
    <section class="lab-some-dept" data-dept={d.key} data-dept-index={String(d.index)} hidden={modal && d.index > 0 ? true : undefined}>
      {modal ? (
        <>
          <div class="lab-some-dept-summary">
            <span class="lab-some-dept-summary-label">{d.label + ' · ' + d.total + ' estudio' + (d.total === 1 ? '' : 's')}</span>
            <DeptActions d={d} />
          </div>
          <div class="lab-some-dept-body">{groups}</div>
        </>
      ) : (
        <>
          <header class="lab-some-dept-header">{d.label}</header>
          {groups}
        </>
      )}
    </section>
  );
}

export function SomeReportTables({ model }) {
  return (
    <div class={'lab-some-tables' + (model.modal ? ' lab-some-tables--modal' : '')}>
      {model.modal && <TabsBar tabs={model.tabs} />}
      {model.depts.map((d) => <Dept d={d} modal={model.modal} />)}
    </div>
  );
}

export function drawSomeReportTables(host, model) {
  render(null, host);
  host.textContent = '';
  if (model) render(<SomeReportTables model={model} />, host);
}

export function clearSomeReportTables(host) {
  render(null, host);
  host.textContent = '';
}
