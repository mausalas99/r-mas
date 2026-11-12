import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';

const view = await loadJsx(import.meta.url, `import { TodoAddModalBody } from './todos-add-modal-view.jsx';
  export const html = (p) => renderToString(<TodoAddModalBody {...p} />);`);

const norm = (s) => s.replace(/=""/g, '').replace(/&gt;/g, '>').replace(/&quot;/g, '"');

// Exact markup buildTodoAddModalHtml made before the port.
const OLD = { plain: "<div class=\"wb-confirm-body wb-todo-add-body\"><div class=\"wb-todo-add-header\"><span class=\"wb-confirm-title\">Nuevo pendiente</span></div><div class=\"wb-todo-add-field\"><span class=\"wb-todo-add-label\">Qué hay que hacer</span><textarea class=\"wb-todo-add-text\" rows=\"2\" placeholder=\"Describe el pendiente\"></textarea></div><div class=\"wb-todo-add-row\"><div class=\"wb-todo-add-field\"><span class=\"wb-todo-add-label\">Prioridad</span><div class=\"wb-todo-add-prio-slot\" data-wb-todo-add-prio-slot></div></div><div class=\"wb-todo-add-field wb-todo-add-field--due\"><span class=\"wb-todo-add-label\">Vence</span><div class=\"wb-todo-add-due-slot\" data-wb-todo-add-due-slot></div></div></div></div><div class=\"wb-confirm-footer\"><div class=\"wb-confirm-footer-actions\"><button type=\"button\" class=\"wb-btn wb-btn-secondary\" data-wb-todo-add-cancel>Cancelar</button><button type=\"button\" class=\"wb-btn wb-btn-primary\" data-wb-todo-add-ok>Agregar pendiente</button></div></div>", ctx: "<div class=\"wb-confirm-body wb-todo-add-body\"><div class=\"wb-todo-add-header\"><span class=\"wb-confirm-title\">Nuevo pendiente</span><span class=\"wb-todo-add-context\">Cama 3 &lt;A&gt; &amp; &quot;B&quot;</span></div><div class=\"wb-todo-add-field\"><span class=\"wb-todo-add-label\">Qué hay que hacer</span><textarea class=\"wb-todo-add-text\" rows=\"2\" placeholder=\"Describe el pendiente\"></textarea></div><div class=\"wb-todo-add-row\"><div class=\"wb-todo-add-field\"><span class=\"wb-todo-add-label\">Prioridad</span><div class=\"wb-todo-add-prio-slot\" data-wb-todo-add-prio-slot></div></div><div class=\"wb-todo-add-field wb-todo-add-field--due\"><span class=\"wb-todo-add-label\">Vence</span><div class=\"wb-todo-add-due-slot\" data-wb-todo-add-due-slot></div></div></div></div><div class=\"wb-confirm-footer\"><div class=\"wb-confirm-footer-actions\"><button type=\"button\" class=\"wb-btn wb-btn-secondary\" data-wb-todo-add-cancel>Cancelar</button><button type=\"button\" class=\"wb-btn wb-btn-primary\" data-wb-todo-add-ok>Agregar pendiente</button></div></div>" };

test('modal body without context equals the old builder', () => {
  assert.equal(norm(view.html({})), norm(OLD.plain));
});
test('modal body with patient context equals the old builder', () => {
  assert.equal(norm(view.html({ patientContext: 'Cama 3 <A> & "B"' })), norm(OLD.ctx));
});
