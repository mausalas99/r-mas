// labs.js — lab parsing barrel (god-file split into labs-*.mjs modules)

export { escTxt, renderToken, renderEntry, isLabSectionHeaderHtml } from './labs-display.mjs';
export { parseEGO_ } from './labs-ego-parse.mjs';

export {
  extraer,
  extraerConRango,
  extraerConRangoSuero,
  extraerConRangoBH,
  marcarSegunRango,
  fmt,
  toNum_,
} from './labs-extract.mjs';

export {
  BH_EXTRA_DISPLAY_LABELS,
  BH_DIFF_DISPLAY_ORDER,
  BH_SCALAR_EXT_ORDER,
  BH_SOME_TREND_ORDER,
  QS_SOME_TREND_ORDER,
  sortTrendSpecsBySomeOrder,
  bhExtraDisplayLabel,
  BH_TREND_TITLES,
  bhTrendDisplayTitle,
  parseBhTrendValuesFromResLab,
  formatBhExtrasDisplayParts,
  formatBhExtrasDisplayLine,
  parseBH_,
  mergeBhResLabRows_,
} from './labs-bh.mjs';

export {
  formatCultivoCondensedForCopy,
  findCultivoGermenRuns,
  parseSensCrudasAntibiogramaSlice,
  parseCuentaFromCultivoChunkLines,
  formatSensCrudasBlockForCopy,
  classifyAtbInterp,
  buildAtbChipsHtml,
  extractMicSortKey,
  buildAtbRisSummaryHtml,
  extractSensCrudasForGermFromSource,
  isParsedCultivoHeaderLine,
  parseCultivo_,
} from './labs-cultivo.mjs';

export {
  extraerProcalcitonina_,
  parseQS_,
  parseESC_,
  parsePFH_,
  parseLipasa_,
} from './labs-chemistry.mjs';

export { ageYearsFromLabDemographics, computeEgfrCkdEpi2021Creatinine } from './labs-egfr.mjs';

export {
  parseGaso_,
  buildGasoInterpretacion_,
  reprocessLabResultLines_,
  computeAnionGapValue_,
  computeAnionGap_,
  parsePIE_,
  parsearLCR,
  dedupeSingletonSections_,
} from './labs-gaso-section.mjs';

export {
  bloqueCitoquimicoLiquidosFull,
  normalizarProteinasFluidoGdl_,
  esLiquidoPleural_,
  esLiquidoAscitico_,
  computeGasaValue_,
  evaluarGasa_,
  isAscitisInterpretacionResLabChunk,
  formatAscitisInterpretacionLine_,
  ASCITIS_INTERPRETACION_HEADER,
  extractSerumAlbuminGdlFromResLabs_,
  resolveSerumAlbuminForGasa_,
  resLabsHasAsciticFluid_,
  refreshAscitisInterpretacionInResLabs_,
  evaluarAscitisNoPortal_,
  buildAscitisLabAlerts_,
  evaluarCriteriosLight_,
  parsearCitoquimicoLiquidos,
  parseFisicoquimicoHeces_,
  parseFrotisSangre_,
  parsePlaquetasCitrato_,
  parseSerologiaBancoSangre_,
  parseCuantOrina_,
} from './labs-fluidos.mjs';

export {
  extractLabReportFechaDMY,
  looksLikeSomeLabReport,
  extractLabReportHora,
  buildRefsBySectionFromReport,
} from './labs-report-refs.mjs';

import { createProcesarLabs } from './labs-procesar.mjs';
import { bloqueCitoquimicoLiquidosFull, formatAscitisInterpretacionLine_, buildAscitisLabAlerts_, parsearCitoquimicoLiquidos, parseFisicoquimicoHeces_, parseFrotisSangre_, parsePlaquetasCitrato_, parseSerologiaBancoSangre_, parseCuantOrina_ } from './labs-fluidos.mjs';
import { dedupeSingletonSections_, parseGaso_, parsePIE_, parsearLCR } from './labs-gaso-section.mjs';
import { parseBH_ } from './labs-bh.mjs';
import { parseQS_, parseESC_, parsePFH_, parseLipasa_ } from './labs-chemistry.mjs';
import { parseCultivo_ } from './labs-cultivo.mjs';
import { parseEGO_ } from './labs-ego-parse.mjs';
import { extractLabReportFechaDMY, extractLabReportHora, buildRefsBySectionFromReport } from './labs-report-refs.mjs';

export const procesarLabs = createProcesarLabs({
  bloqueCitoquimicoLiquidosFull,
  dedupeSingletonSections_,
  buildRefsBySectionFromReport,
  extractLabReportFechaDMY,
  extractLabReportHora,
  parseBH_,
  parseQS_,
  parseESC_,
  parsePFH_,
  parseLipasa_,
  parsePlaquetasCitrato_,
  parseGaso_,
  parsePIE_,
  parsearLCR,
  parsearCitoquimicoLiquidos,
  formatAscitisInterpretacionLine_,
  buildAscitisLabAlerts_,
  parseFisicoquimicoHeces_,
  parseFrotisSangre_,
  parseEGO_,
  parseCuantOrina_,
  parseCultivo_,
  parseSerologiaBancoSangre_,
});
