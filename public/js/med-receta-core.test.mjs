import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMedicationPaste,
  resolveFechaActualizacion,
  formatMedicationEgresoLine,
  formatMedicationSoapShort,
  buildMedRecetaCopyText,
  buildMedRecetaNameOnlyText,
  extractDiaTratamiento,
  setDiaTratamientoInDosis,
  incrementMedItemsDiaTratamiento,
  classifyMedicationSoapCategory,
  applyMedCatalogOverlay,
  dosisBeforeSlash,
  extractRecetaNameOnlyDose,
} from './med-receta-core.mjs';

beforeEach(() => {
  applyMedCatalogOverlay({ accents: {}, soapTokens: { vasop: [], abx: [], analgesia: [], antihta: [] } });
});

test('dosisBeforeSlash descarta todo tras // para dosis aplicada', () => {
  assert.equal(
    dosisBeforeSlash('2400000 UI // 1ERA DOSIS 12 DE MAYO, 2DA 19 DE MAYO *DIA# 4*'),
    '2400000 UI'
  );
  assert.equal(dosisBeforeSlash('160 MG // SOLUCION STANFORD *DIA# 4*'), '160 MG');
  assert.equal(dosisBeforeSlash('8 MG'), '8 MG');
});

test('parseMedicationPaste extrae nombre, via, dosis, frecuencia y diaTratamiento null sin DIA#', () => {
  var line =
    '02/05/2026 08:31:32 a.m.\tMEDICAMENTOS\tENOXAPARINA 40 MG SOL INY 0.4 ML (+*)\tVIA SUBCUTANEA\t40 MG //\tCADA 24 HORAS\tNW';
  var r = parseMedicationPaste(line);
  assert.equal(r.skipped, 0);
  assert.equal(r.items.length, 1);
  var it = r.items[0];
  assert.equal(it.nombreRaw, 'ENOXAPARINA 40 MG SOL INY 0.4 ML (+*)');
  assert.equal(it.viaRaw, 'VIA SUBCUTANEA');
  assert.equal(it.dosisRaw, '40 MG //');
  assert.equal(it.frecuenciaRaw, 'CADA 24 HORAS');
  assert.equal(it.diaTratamiento, null);
});

test('parseMedicationPaste lee DIA# en dosis', () => {
  var line =
    '02/05/2026 08:31:38 a.m.\tMEDICAMENTOS\tMETRONIDAZOL 500 MG SOL INY 100 ML (*)\tVIA INTRAVENOSA\t500 MG // *DIA# 3*\tCADA 8 HORAS\tNW';
  var r = parseMedicationPaste(line);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].diaTratamiento, 3);
});

test('parseMedicationPaste lee DIA# en ertapenem (1 G // *DIA# 3*)', () => {
  var line =
    '02/05/2026 08:15:29 a.m.\tMEDICAMENTOS\tERTAPENEM 1 G SOL INY (*)\tVIA INTRAVENOSA\t1 G // *DIA# 3*\tCADA 24 HORAS\tNW';
  var r = parseMedicationPaste(line);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].diaTratamiento, 3);
  assert.equal(r.items[0].dosisRaw, '1 G // *DIA# 3*');
});

test('extractDiaTratamiento acepta DIA # con espacio y sin asteriscos', () => {
  assert.equal(extractDiaTratamiento('1 G // DIA # 5'), 5);
});

test('setDiaTratamientoInDosis actualiza marcador DIA#', () => {
  assert.equal(setDiaTratamientoInDosis('500 MG // *DIA# 3*', 4), '500 MG // *DIA# 4*');
});

test('incrementMedItemsDiaTratamiento incrementa solo con DIA# y no suspendidos', () => {
  var items = [
    { id: 'a', suspendido: false, diaTratamiento: 3, dosisRaw: '500 MG // *DIA# 3*' },
    { id: 'b', suspendido: true, diaTratamiento: 2, dosisRaw: '*DIA# 2*' },
    { id: 'c', suspendido: false, diaTratamiento: null, dosisRaw: '40 MG' },
  ];
  var r = incrementMedItemsDiaTratamiento(items);
  assert.equal(r.count, 1);
  assert.equal(r.items[0].diaTratamiento, 4);
  assert.equal(r.items[0].dosisRaw, '500 MG // *DIA# 4*');
  assert.equal(r.items[1].diaTratamiento, 2);
});

test('resolveFechaActualizacion usa moda de fechas dd/mm/yyyy', () => {
  assert.equal(resolveFechaActualizacion(['02/05/2026', '02/05/2026', '03/05/2026'], '09/05/2026'), '02/05/2026');
});

test('resolveFechaActualizacion cae en fallback si vacío', () => {
  assert.equal(resolveFechaActualizacion([], '09/05/2026'), '09/05/2026');
});

test('formatMedicationEgresoLine — ENOXAPARINA programada SC', () => {
  var line = formatMedicationEgresoLine({
    nombreRaw: 'ENOXAPARINA 40 MG SOL INY 0.4 ML (+*)',
    viaRaw: 'VIA SUBCUTANEA',
    dosisRaw: '40 MG //',
    frecuenciaRaw: 'CADA 24 HORAS',
    diaTratamiento: null,
  });
  assert.equal(
    line,
    'ENOXAPARINA 40 MG SOLUCIÓN INYECTABLE || APLICAR 40 MG VÍA SUBCUTÁNEA CADA 24 HORAS, SIN SUSPENDER HASTA NUEVO AVISO.'
  );
});

test('formatMedicationEgresoLine — METRONIDAZOL con día 3', () => {
  var line = formatMedicationEgresoLine({
    nombreRaw: 'METRONIDAZOL 500 MG SOL INY 100 ML (*)',
    viaRaw: 'VIA INTRAVENOSA',
    dosisRaw: '500 MG // *DIA# 3*',
    frecuenciaRaw: 'CADA 8 HORAS',
    diaTratamiento: 3,
  });
  assert.equal(
    line,
    'METRONIDAZOL 500 MG SOLUCIÓN INYECTABLE || ADMINISTRAR 500 MG VÍA INTRAVENOSA CADA 8 HORAS (DÍA 3 DE TRATAMIENTO).'
  );
});

test('formatMedicationEgresoLine — ONDANSETRON PRN', () => {
  var line = formatMedicationEgresoLine({
    nombreRaw: 'ONDANSETRON 8 MG SOL INY 4 ML',
    viaRaw: 'VIA INTRAVENOSA',
    dosisRaw: '8 MG // CRITERIO PRN: EN CASO DE NAUSEAS O VÓMITO, CADA 8 HRS',
    frecuenciaRaw: 'PRN',
    diaTratamiento: null,
  });
  assert.equal(
    line,
    'ONDANSETRÓN 8 MG SOLUCIÓN INYECTABLE || ADMINISTRAR 8 MG VÍA INTRAVENOSA CADA 8 HORAS EN CASO DE NÁUSEA O VÓMITO.'
  );
});

test('formatMedicationEgresoLine — ONDANSETRON PRN con NAUSEA y VOMITO', () => {
  var line = formatMedicationEgresoLine({
    nombreRaw: 'ONDANSETRON 8 MG SOL INY 4 ML',
    viaRaw: 'VIA INTRAVENOSA',
    dosisRaw: '8 MG // CRITERIO PRN: EN CASO DE NAUSEA Y VOMITO, CADA 8 HRS',
    frecuenciaRaw: 'PRN',
    diaTratamiento: null,
  });
  assert.equal(
    line,
    'ONDANSETRÓN 8 MG SOLUCIÓN INYECTABLE || ADMINISTRAR 8 MG VÍA INTRAVENOSA CADA 8 HORAS EN CASO DE NÁUSEA O VÓMITO.'
  );
});

test('buildMedRecetaCopyText une con línea en blanco entre activos y omite suspendidos', () => {
  var items = [
    {
      nombreRaw: 'ENOXAPARINA 40 MG SOL INY 0.4 ML (+*)',
      viaRaw: 'VIA SUBCUTANEA',
      dosisRaw: '40 MG //',
      frecuenciaRaw: 'CADA 24 HORAS',
      diaTratamiento: null,
      suspendido: false,
    },
    {
      nombreRaw: 'LOSARTAN 50 MG COMPRIMIDO (*)',
      viaRaw: 'VIA ORAL',
      dosisRaw: '50 MG //',
      frecuenciaRaw: 'CADA 24 HORAS',
      diaTratamiento: null,
      suspendido: true,
    },
    {
      nombreRaw: 'OMEPRAZOL 40 MG SOL INY 10 ML (*)',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '40 MG //',
      frecuenciaRaw: 'CADA 24 HORAS',
      diaTratamiento: null,
      suspendido: false,
    },
  ];
  var t = buildMedRecetaCopyText(items);
  assert.ok(t.indexOf('ENOXAPARINA') !== -1);
  assert.ok(t.indexOf('LOSARTAN') === -1);
  assert.ok(t.indexOf('OMEPRAZOL') !== -1);
  assert.ok(t.indexOf('\n\n') !== -1);
});

test('buildMedRecetaNameOnlyText incluye nombre, via+dosis, frecuencia y día', () => {
  var items = [
    {
      nombreRaw: 'METRONIDAZOL 500 MG SOL INY 100 ML (*)',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '500 MG // *DIA# 3*',
      frecuenciaRaw: 'CADA 8 HORAS',
      diaTratamiento: 3,
      suspendido: false,
    },
    {
      nombreRaw: 'OMEPRAZOL 40 MG SOL INY 10 ML (*)',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '40 MG //',
      frecuenciaRaw: 'CADA 12 HORAS',
      diaTratamiento: null,
      suspendido: false,
    },
  ];
  var t = buildMedRecetaNameOnlyText(items);
  var lines = t.split('\n');
  assert.equal(lines[0], 'METRONIDAZOL 500MG IV C/8H DIA 3');
  assert.equal(lines[1], 'OMEPRAZOL 40MG IV C/12H');
});

test('buildMedRecetaNameOnlyText agrega día de uso cuando existe', () => {
  var items = [
    {
      nombreRaw: 'OMEPRAZOL 40 MG SOL INY 10 ML (*)',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '40 MG // *DIA# 4*',
      frecuenciaRaw: 'CADA 12 HORAS',
      diaTratamiento: 4,
      suspendido: false,
    },
  ];
  var t = buildMedRecetaNameOnlyText(items);
  assert.equal(t, 'OMEPRAZOL 40MG IV C/12H DIA 4');
});

test('extractRecetaNameOnlyDose — infusión con VEL.INF MCG/MIN (norepinefrina)', () => {
  var d =
    '16 MG // DILUIREN: DILUIREN 125 CC DE GLUCOSADO AL 5% VEL.INF: 5 MCG/MIN';
  assert.equal(extractRecetaNameOnlyDose(d), '5 MCG/MIN');
});

test('extractRecetaNameOnlyDose — vancomicina con infusión 3 h conserva bolus', () => {
  var d =
    '1.5 G // DILUIREN: 200 CC DE SOL. FISIO AL 0.9% VEL.INF: 3 HORAS *DIA# 4*';
  assert.equal(extractRecetaNameOnlyDose(d), '1.5 G');
});

test('extractRecetaNameOnlyDose — buprenorfina CC/HORA → MCG/HORA titulación', () => {
  var d =
    '450 MCG DILUIREN: 100 CC DE SOL FISIO AL 0.9% VEL.INF: 4 CC/HORA';
  assert.equal(extractRecetaNameOnlyDose(d), '4 MCG/HORA');
});

test('buildMedRecetaNameOnlyText — infusión sin dilución en salida simple', () => {
  var items = [
    {
      nombreRaw: 'BUPRENORFINA 900 MCG SOL INY',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '450 MCG DILUIREN: 100 CC DE SOL FISIO AL 0.9% VEL.INF: 4 CC/HORA',
      frecuenciaRaw: 'CADA 24 HORAS',
      diaTratamiento: null,
      suspendido: false,
    },
    {
      nombreRaw: 'VANCOMICINA 1 G SOL INY',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '1.5 G // DILUIREN: 200 CC DE SOL. FISIO AL 0.9% VEL.INF: 3 HORAS *DIA# 4*',
      frecuenciaRaw: 'CADA 12 HORAS',
      diaTratamiento: 4,
      suspendido: false,
    },
    {
      nombreRaw: 'NOREPINEFRINA 4 MG SOL INY',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw:
        '16 MG // DILUIREN: DILUIREN 125 CC DE GLUCOSADO AL 5% VEL.INF: 5 MCG/MIN',
      frecuenciaRaw: 'CADA 24 HORAS',
      diaTratamiento: null,
      suspendido: false,
    },
  ];
  var lines = buildMedRecetaNameOnlyText(items).split('\n');
  assert.equal(lines[0], 'BUPRENORFINA 4 MCG/HORA IV C/24H');
  assert.equal(lines[1], 'VANCOMICINA 1.5 G IV C/12H DIA 4');
  assert.equal(lines[2], 'NOREPINEFRINA 5 MCG/MIN IV C/24H');
});

test('buildMedRecetaNameOnlyText usa formato compacto solicitado en meropenem', () => {
  var items = [
    {
      nombreRaw: 'MEROPENEM 1 G SOL INY 20 ML',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '2 G // *DIA# 2*',
      frecuenciaRaw: 'CADA 8 HORAS',
      diaTratamiento: 2,
      suspendido: false,
    },
  ];
  var t = buildMedRecetaNameOnlyText(items);
  assert.equal(t, 'MEROPENEM 2 G IV C/8H DIA 2');
});

test('bloque dorado — 12 medicamentos del spec', () => {
  var lines = [
    '2/05/2026 08:31:31 a.m.\tMEDICAMENTOS\tDEXTROSA 50 % SOL INY 50 ML\tVIA INTRAVENOSA\t50 ML // CRITERIO PRN: EN CASO DE HIPOGLUCEMIA <70, CADA 6 HRS\tPRN\tNW',
    '02/05/2026 08:31:32 a.m.\tMEDICAMENTOS\tENOXAPARINA 40 MG SOL INY 0.4 ML (+*)\tVIA SUBCUTANEA\t40 MG //\tCADA 24 HORAS\tNW',
    '02/05/2026 08:31:33 a.m.\tMEDICAMENTOS\tLACTULOSA 10 G JARABE 125 ML\tVIA ORAL\t15 ML //\tCADA 8 HORAS\tNW',
    '02/05/2026 08:31:36 a.m.\tMEDICAMENTOS\tLOSARTAN 50 MG COMPRIMIDO (*)\tVIA ORAL\t50 MG //\tCADA 24 HORAS\tNW',
    '02/05/2026 08:31:37 a.m.\tMEDICAMENTOS\tMAGALDRATO/DIMETICONA 800/100 MG GEL 250 ML\tVIA ORAL\t15 ML //\tCADA 8 HORAS\tNW',
    '02/05/2026 08:31:38 a.m.\tMEDICAMENTOS\tMETRONIDAZOL 500 MG SOL INY 100 ML (*)\tVIA INTRAVENOSA\t500 MG // *DIA# 3*\tCADA 8 HORAS\tNW',
    '02/05/2026 08:31:39 a.m.\tMEDICAMENTOS\tOMEPRAZOL 40 MG SOL INY 10 ML (*)\tVIA INTRAVENOSA\t40 MG //\tCADA 24 HORAS\tNW',
    '02/05/2026 08:31:39 a.m.\tMEDICAMENTOS\tONDANSETRON 8 MG SOL INY 4 ML\tVIA INTRAVENOSA\t8 MG // CRITERIO PRN: EN CASO DE NAUSEAS O VÓMITO, CADA 8 HRS\tPRN\tNW',
    '02/05/2026 08:31:41 a.m.\tMEDICAMENTOS\tPARACETAMOL 1 G SOL INY 100 ML (*)\tVIA INTRAVENOSA\t1 G //\tCADA 8 HORAS\tNW',
    '02/05/2026 08:31:43 a.m.\tMEDICAMENTOS\tPOLIETILENGLICOL 3350 POLVO 17 G\tVIA ORAL\t17 G //\tCADA 12 HORAS\tNW',
    '02/05/2026 08:31:44 a.m.\tMEDICAMENTOS\tPREGABALINA 75 MG CAPSULA\tVIA ORAL\t75 MG //\tCADA 12 HORAS\tNW',
    '02/05/2026 08:31:45 a.m.\tMEDICAMENTOS\tSENOSIDOS A-B 8.6 MG TABLETA\tVIA ORAL\t8.6 MG //\tCADA 12 HORAS\tNW',
  ];
  var raw = lines.join('\n');

  var expected = [
    'DEXTROSA 50% SOLUCIÓN INYECTABLE 50 ML || ADMINISTRAR 50 ML VÍA INTRAVENOSA EN CASO DE HIPOGLUCEMIA <70 MG/DL, CADA 6 HORAS SEGÚN REQUERIMIENTO.',
    'ENOXAPARINA 40 MG SOLUCIÓN INYECTABLE || APLICAR 40 MG VÍA SUBCUTÁNEA CADA 24 HORAS, SIN SUSPENDER HASTA NUEVO AVISO.',
    'LACTULOSA 10 G JARABE || TOMAR 15 ML VÍA ORAL CADA 8 HORAS, SIN SUSPENDER HASTA NUEVO AVISO.',
    'LOSARTÁN 50 MG TABLETA || TOMAR 1 TABLETA (50 MG) VÍA ORAL CADA 24 HORAS, SIN SUSPENDER HASTA NUEVO AVISO.',
    'MAGALDRATO/DIMETICONA 800/100 MG GEL || TOMAR 15 ML VÍA ORAL CADA 8 HORAS, SIN SUSPENDER HASTA NUEVO AVISO.',
    'METRONIDAZOL 500 MG SOLUCIÓN INYECTABLE || ADMINISTRAR 500 MG VÍA INTRAVENOSA CADA 8 HORAS (DÍA 3 DE TRATAMIENTO).',
    'OMEPRAZOL 40 MG SOLUCIÓN INYECTABLE || ADMINISTRAR 40 MG VÍA INTRAVENOSA CADA 24 HORAS, SIN SUSPENDER HASTA NUEVO AVISO.',
    'ONDANSETRÓN 8 MG SOLUCIÓN INYECTABLE || ADMINISTRAR 8 MG VÍA INTRAVENOSA CADA 8 HORAS EN CASO DE NÁUSEA O VÓMITO.',
    'PARACETAMOL 1 G SOLUCIÓN INYECTABLE || ADMINISTRAR 1 G VÍA INTRAVENOSA CADA 8 HORAS, SIN SUSPENDER HASTA NUEVO AVISO.',
    'POLIETILENGLICOL 3350 17 G POLVO || TOMAR 17 G VÍA ORAL CADA 12 HORAS, SIN SUSPENDER HASTA NUEVO AVISO.',
    'PREGABALINA 75 MG CÁPSULA || TOMAR 1 CÁPSULA (75 MG) VÍA ORAL CADA 12 HORAS, SIN SUSPENDER HASTA NUEVO AVISO.',
    'SENÓSIDOS A-B 8.6 MG TABLETA || TOMAR 1 TABLETA (8.6 MG) VÍA ORAL CADA 12 HORAS, SIN SUSPENDER HASTA NUEVO AVISO.',
  ];

  var parsed = parseMedicationPaste(raw);
  assert.equal(parsed.items.length, 12);
  for (var i = 0; i < 12; i += 1) {
    var got = formatMedicationEgresoLine(parsed.items[i]);
    assert.equal(got, expected[i], 'fila ' + i);
  }
});

test('classifyMedicationSoapCategory — ejemplos hospitalarios', () => {
  assert.equal(classifyMedicationSoapCategory('ERTAPENEM 1 G'), 'abx');
  assert.equal(classifyMedicationSoapCategory('PARACETAMOL 1 G'), 'analgesia');
  assert.equal(classifyMedicationSoapCategory('LOSARTAN 50 MG'), 'antihta');
  assert.equal(classifyMedicationSoapCategory('NORADRENALINA 4 MG'), 'vasop');
  assert.equal(classifyMedicationSoapCategory('FUROSEMIDA 40 MG'), 'diuretico');
  assert.equal(classifyMedicationSoapCategory('INSULINA GLARGINA'), 'nm');
  assert.equal(classifyMedicationSoapCategory('DINITRATO DE ISOSORBIDE 40 MG'), 'antihta');
  assert.equal(classifyMedicationSoapCategory('ENOXAPARINA 40 MG'), 'otros');
  assert.equal(classifyMedicationSoapCategory('OMEPRAZOL 40 MG'), 'otros');
  assert.equal(classifyMedicationSoapCategory('FÁRMACO SIN LISTA XYZ'), 'otros');
  assert.equal(classifyMedicationSoapCategory('ONDANSETRÓN 8 MG'), 'analgesia');
  assert.equal(classifyMedicationSoapCategory('ONDASETRON 8 MG'), 'analgesia');
});

test('formatMedicationSoapShort — indicación compacta', () => {
  assert.equal(
    formatMedicationSoapShort({
      nombreRaw: 'NIFEDIPINO 60 MG TABLETA',
      viaRaw: 'VIA ORAL',
      dosisRaw: '60 MG',
      frecuenciaRaw: 'CADA 12 HORAS',
      suspendido: false,
    }),
    'NIFEDIPINO 60MG VO C/12H'
  );
  assert.equal(
    formatMedicationSoapShort({
      nombreRaw: 'MEROPENEM 1 G',
      viaRaw: 'VIA INTRAVENOSA',
      dosisRaw: '1 G',
      frecuenciaRaw: 'CADA 8 HORAS',
      diaTratamiento: 13,
      suspendido: false,
    }),
    'MEROPENEM 1 G IV C/8H DIA 13'
  );
});

test('parseMedicationPaste incluye medicamento fuera de catálogo', () => {
  var line =
    '04/05/2026 07:04:24 a.m.\tMEDICAMENTOS\tFARMACO NUEVO XYZ 100 MG SOL INY\tVIA INTRAVENOSA\t100 MG //\tCADA 24 HORAS\tNW';
  var r = parseMedicationPaste(line);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].nombreRaw, 'FARMACO NUEVO XYZ 100 MG SOL INY');
});

test('applyMedCatalogOverlay clasifica tokens personalizados antes que listas internas', () => {
  applyMedCatalogOverlay({
    accents: {},
    soapTokens: { vasop: [], abx: [], analgesia: ['FARMACOX'], antihta: [] },
  });
  assert.equal(classifyMedicationSoapCategory('FARMACOX 500 MG'), 'analgesia');
});
