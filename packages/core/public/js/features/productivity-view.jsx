/**
 * Unified search results and extra-templates list. Preact: same DOM, classes and data-onclick hooks
 * the string builders in productivity.mjs made. UI only: productivity.mjs still owns the search,
 * the template data and the click handlers (delegated by data-onclick).
 */
import { render } from 'preact';

function escapeRegExp(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Snippet text with every match of `q` (case-insensitive) wrapped in <mark>. */
function Highlighted({ text, q }) {
  const s = String(text || '');
  if (!q) return <>{s}</>;
  const parts = s.split(new RegExp('(' + escapeRegExp(q) + ')', 'i'));
  return <>{parts.map((p, i) => (i % 2 ? <mark>{p}</mark> : p))}</>;
}

function Empty({ title, lead }) {
  return (
    <div class="unified-search-empty empty-state empty-state--compact" role="status">
      <span class="empty-state-title">{title}</span>
      <span class="empty-state-lead">{lead}</span>
    </div>
  );
}

export function UnifiedSearchResults({ results, q }) {
  if (!q) return <Empty title="Buscar en el censo" lead="Escribe nombre, registro, cuarto o texto de notas." />;
  if (!results.length) return <Empty title="Sin coincidencias" lead="Prueba otro término o abre una pestaña desde el encabezado." />;
  return (
    <>
      {results.map((r, idx) => (
        <div class="unified-search-result" data-onclick="selectUnifiedSearchResult" data-onclick-args={'[' + idx + ']'}>
          <div class="usr-title"><span>{r.title}</span><span class="usr-tag">{r.tag}</span></div>
          <div class="usr-meta">{r.meta}</div>
          {r.snippet ? <div class="usr-snippet"><Highlighted text={r.snippet} q={q} /></div> : null}
        </div>
      ))}
    </>
  );
}

export function ExtraTemplatesList({ templates }) {
  if (!templates.length) return <Empty title="Sin plantillas guardadas" lead="Las plantillas que guardes aparecerán aquí." />;
  return (
    <>
      {templates.map((t) => {
        const args = JSON.stringify([String(t.id || '')]);
        return (
          <div class="extra-tmpl-row">
            <span class="etr-label" title={t.label || ''}>{t.label || '(sin nombre)'}</span>
            <div class="etr-actions">
              <button type="button" data-onclick="editExtraTemplate" data-onclick-args={args}>Editar</button>
              <button type="button" class="etr-del" data-onclick="deleteExtraTemplate" data-onclick-args={args}>Eliminar</button>
            </div>
          </div>
        );
      })}
    </>
  );
}

function draw(host, vnode) {
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export const drawUnifiedSearchResults = (host, props) => draw(host, <UnifiedSearchResults {...props} />);
export const drawExtraTemplatesList = (host, props) => draw(host, <ExtraTemplatesList {...props} />);
