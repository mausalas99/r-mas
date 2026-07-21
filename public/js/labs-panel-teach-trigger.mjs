/**
 * Decide whether paste should open the lab-panel teach wizard.
 */
import { findResidualSomeStudies } from './labs-panel-residual.mjs';

/**
 * @param {string} sourceText
 * @param {{ resLabs?: string[] }|null|undefined} result
 * @returns {{ open: boolean, residual: { candidates: object[], coveredCount: number }, empty: boolean }}
 */
export function shouldOpenLabPanelTeach(sourceText, result) {
  var resLabs = (result && result.resLabs) || [];
  var residual = findResidualSomeStudies(sourceText || '', { resLabs: resLabs });
  var empty = !resLabs.length;
  var partial = residual.candidates.length > 0;
  return { open: empty || partial, residual: residual, empty: empty };
}
