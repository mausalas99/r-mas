export {
  isNegatedDriveText,
  parseAppSubsections,
  matchCatalogConditions,
  parseMedicamentosList,
  parseAhfRelativeLines,
} from './hc-structured-patterns.mjs';
export { stripIntegratedAppDescription, stripIntegratedAhfDescription } from './hc-structured-strip.mjs';
export {
  buildHcStructuredSuggestions,
  applyStructuredSuggestionsToHcPatch,
  collectStructuredSuggestionsFromDriveSections,
  enrichHcPatchWithStructuredSuggestions,
} from './hc-structured-suggestions.mjs';
