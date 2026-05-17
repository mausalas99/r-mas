import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateLabSuggestions,
  shouldAddLabSuggestionTodo,
  filterNewLabSuggestions,
} from './lab-clinical-suggestions.mjs';

test('evaluateLabSuggestions dispara Hb y electrolitos bajo umbral moderado', () => {
  var parsedBySection = {
    BH: { Hb: 6.2 },
    ESC: { Na: 132, K: 3.2, Mg: 1.4, Ca: 8.1 },
  };
  var r = evaluateLabSuggestions(null, parsedBySection, '17/05/2026');
  assert.equal(r.length, 5);
  assert.ok(r.some(function (x) { return x.ruleId === 'hb-transfusion'; }));
  assert.ok(r.some(function (x) { return x.ruleId === 'k-repletion'; }));
});

test('evaluateLabSuggestions no dispara valores normales', () => {
  var parsedBySection = {
    BH: { Hb: 12 },
    ESC: { Na: 140, K: 4.0, Mg: 2.0, Ca: 9.0 },
  };
  var r = evaluateLabSuggestions(null, parsedBySection, '17/05/2026');
  assert.equal(r.length, 0);
});

test('shouldAddLabSuggestionTodo evita duplicado mismo día y regla', () => {
  var todos = [
    { id: '1', completed: false, labRuleId: 'hb-transfusion', labFecha: '17/05/2026', text: 'x' },
  ];
  assert.equal(shouldAddLabSuggestionTodo(todos, 'hb-transfusion', '17/05/2026'), false);
  assert.equal(shouldAddLabSuggestionTodo(todos, 'hb-transfusion', '18/05/2026'), true);
  assert.equal(shouldAddLabSuggestionTodo(todos, 'k-repletion', '17/05/2026'), true);
});

test('filterNewLabSuggestions respeta pendientes abiertos', () => {
  var suggestions = evaluateLabSuggestions(
    null,
    { BH: { Hb: 6 } },
    '17/05/2026'
  );
  var todos = [
    { completed: false, labRuleId: 'hb-transfusion', labFecha: '17/05/2026' },
  ];
  var filtered = filterNewLabSuggestions(suggestions, todos);
  assert.equal(filtered.length, 0);
});
