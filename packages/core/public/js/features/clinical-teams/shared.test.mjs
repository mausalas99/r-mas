import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderClinicalTeamsCollapsible } from './shared.mjs';

describe('renderClinicalTeamsCollapsible', () => {
  it('keeps summaryActionsHtml as a sibling of <summary>, not nested inside it', () => {
    const html = renderClinicalTeamsCollapsible({
      collapseKey: 'test.key',
      summaryHtml: '<h4>Título</h4>',
      summaryActionsHtml: '<div class="clinical-teams-collapse-summary-actions"><select id="x"></select></div>',
      bodyHtml: '<p>Body</p>',
    });
    const summaryMatch = html.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
    assert.ok(summaryMatch, 'expected a <summary> element');
    assert.doesNotMatch(summaryMatch[1], /<select/, 'a form control must never render inside <summary>');
    assert.match(html, /<\/summary>\s*<div class="clinical-teams-collapse-summary-actions">/);
  });

  it('renders no actions sibling when summaryActionsHtml is omitted', () => {
    const html = renderClinicalTeamsCollapsible({
      collapseKey: 'test.key2',
      summaryHtml: '<h4>Título</h4>',
      bodyHtml: '<p>Body</p>',
    });
    assert.doesNotMatch(html, /clinical-teams-collapse-summary-actions/);
  });
});
