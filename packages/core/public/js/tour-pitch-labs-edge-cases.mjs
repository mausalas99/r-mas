/**
 * Reportes SOME sintéticos para casos límite de UI del pitch (DEMO PÉREZ).
 * Ningún dato clínico real — valores inventados para ejercitar layout, no diagnóstico.
 *
 * Cubre, per docs/superpowers/plans/2026-08-19-teal-workbench-full-rollout.md Phase 0:
 *   - dos tomas el mismo día (encabezado de hora dividido, sin duplicar)
 *   - 17+ valores alterados en una sola toma (cap/wrap de "RESULTADOS · N ALTERADOS DE M")
 */

/** Toma de la mañana, mismo día que DEMO_SAME_DAY_PM_SOME. */
export const DEMO_SAME_DAY_AM_SOME =
  'Expediente:\t0008421-7\tSolicitud:\t2608190601\n' +
  'Nombre:\tDEMO PÉREZ JUAN\tFecha Registro:\tAug 19 2026 6:30AM\n' +
  'Sexo:\tMASCULINO\tUbicación:\tSERVICIO DEMO\n' +
  'Edad:\t67\tMedico:\tSERVICIO DEMO\n' +
  '\n' +
  'QUIMICA CLINICA\n' +
  'GLUCOSA EN SANGRE\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'GLUCOSA EN SANGRE\t\tA\t142\tmg/dL\t60 - 100\n' +
  'POTASIO\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'POTASIO\t\tA\t3.1\tmmol/L\t3.6 - 5.0\n' +
  'SODIO\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'SODIO\t\t*\t138\tmmol/L\t135.0 - 145.0\n';

/** Toma de la tarde, mismo día que DEMO_SAME_DAY_AM_SOME — debe abrir un segundo grupo de hora. */
export const DEMO_SAME_DAY_PM_SOME =
  'Expediente:\t0008421-7\tSolicitud:\t2608190644\n' +
  'Nombre:\tDEMO PÉREZ JUAN\tFecha Registro:\tAug 19 2026 4:15PM\n' +
  'Sexo:\tMASCULINO\tUbicación:\tSERVICIO DEMO\n' +
  'Edad:\t67\tMedico:\tSERVICIO DEMO\n' +
  '\n' +
  'QUIMICA CLINICA\n' +
  'GLUCOSA EN SANGRE\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'GLUCOSA EN SANGRE\t\tA\t118\tmg/dL\t60 - 100\n' +
  'POTASIO\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'POTASIO\t\t*\t3.8\tmmol/L\t3.6 - 5.0\n' +
  'CREATININA EN SANGRE\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'CREATININA EN SANGRE\t\tA\t1.9\tmg/dL\t0.6 - 1.4\n';

/**
 * Una sola toma con 18 valores alterados (BH + QS + ESC completos, casi todo fuera de rango)
 * para ejercitar el cap/wrap de "RESULTADOS · N ALTERADOS DE M" con N > 17.
 */
export const DEMO_HEAVILY_ALTERED_SOME =
  'Expediente:\t0008421-7\tSolicitud:\t2608180501\n' +
  'Nombre:\tDEMO PÉREZ JUAN\tFecha Registro:\tAug 18 2026 5:50AM\n' +
  'Sexo:\tMASCULINO\tUbicación:\tSERVICIO DEMO\n' +
  'Edad:\t67\tMedico:\tSERVICIO DEMO\n' +
  '\n' +
  'HEMATOLOGIA\n' +
  'BIOMETRIA HEMATICA COMPLETA\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'RBC\t\tA\t3.10\tM/uL\t4.04 - 6.13\n' +
  'HGB\t\tA\t7.90\tg/dL\t12.20 - 18.10\n' +
  'HCT\t\tA\t24.6\t%\t37.7 - 53.7\n' +
  'MCV\t\tA\t72\tfL\t80 - 97\n' +
  'WBC\t\tA\t18.90\tK/uL\t4.00 - 11.00\n' +
  'NEU\t\tA\t15.40\tK/uL\t2.00 - 6.90\n' +
  'LYM\t\tA\t0.42\tK/uL\t0.60 - 3.40\n' +
  'PLT\t\tA\t68\tK/uL\t142.00 - 424.00\n' +
  '\n' +
  'QUIMICA CLINICA\n' +
  'GLUCOSA EN SANGRE\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'GLUCOSA EN SANGRE\t\tA\t312\tmg/dL\t60 - 100\n' +
  'NITROGENO DE LA UREA EN SANGRE\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'NITROGENO DE LA UREA EN SANGRE\t\tA\t58\tmg/dL\t7 - 20\n' +
  'CREATININA EN SANGRE\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'CREATININA EN SANGRE\t\tA\t3.20\tmg/dL\t0.6 - 1.4\n' +
  'ACIDO URICO EN SANGRE\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'ACIDO URICO EN SANGRE\t\tA\t9.8\tmg/dL\t4.8 - 8.7\n' +
  'AST(ASPARTATO AMINOTRANSFERASA)\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'AST(ASPARTATO AMINOTRANSFERASA)\t\tA\t96\tUI/L\t10 - 42\n' +
  'ALT ALANIN AMINO TRANSFERASA\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'ALT ALANIN AMINO TRANSFERASA\t\tA\t88\tUI/L\t10 - 42\n' +
  'BILIRRUBINA\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'BILIRRUBINA TOTAL\t\tA\t3.1\tmg/dL\t0.2 - 1.0\n' +
  'LDH DESHIDROGENASA LACTICA\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'LDH DESHIDROGENASA LACTICA\t\tA\t410\tUI/L\t91 - 180\n' +
  'CLORO\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'CLORO\t\tA\t92\tmmol/L\t101.0 - 110.0\n' +
  'SODIO\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'SODIO\t\tA\t122\tmmol/L\t135.0 - 145.0\n' +
  'POTASIO\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'POTASIO\t\tA\t6.4\tmmol/L\t3.6 - 5.0\n' +
  'CALCIO\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'CALCIO EN SUERO\t\tA\t6.9\tmg/dL\t8.4 - 10.2\n' +
  'FOSFORO EN SANGRE\n' +
  'Estudio\t\tResultado\tUnidades\tValor de Referencia\n' +
  'FOSFORO\t\tA\t6.8\tmg/dL\t2.5 - 4.6\n';
