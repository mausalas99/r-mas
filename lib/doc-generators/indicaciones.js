'use strict';

const { esc, replaceT, loadDocxTemplate, packDocxBuffer } = require('./shared.js');

const SZ = '<w:sz w:val="16"/><w:szCs w:val="16"/>';
const LIST_NUMID = '52';

const ORIG_NOMBRE = ' MA BEATRIZ LOREDO RODRÍGUEZ';
const ORIG_REGISTRO = '2141273-5';
const ORIG_EDAD = '68';
const ORIG_SEXO = 'F';
const ORIG_AREA = 'TRAUMATOLOGIA';
const ORIG_SERVICIO = 'MEDICINA INTERNA';
const ORIG_CUARTO = '419';
const ORIG_CAMA = ' 1';

function mkR(text, { bold = false } = {}) {
  const b = bold ? '<w:b/><w:bCs/>' : '';
  return (
    `<w:r><w:rPr>${b}${SZ}</w:rPr>` +
    `<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`
  );
}

function mkP(contentXml, { centered = false } = {}) {
  const jc = centered ? '<w:jc w:val="center"/>' : '';
  return `<w:p><w:pPr>${jc}<w:rPr>${SZ}</w:rPr></w:pPr>${contentXml}</w:p>`;
}

function mkListP(text) {
  return (
    '<w:p>' +
    '<w:pPr><w:pStyle w:val="ListParagraph"/>' +
    `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${LIST_NUMID}"/></w:numPr>` +
    `<w:rPr>${SZ}</w:rPr></w:pPr>` +
    `<w:r><w:rPr>${SZ}</w:rPr>` +
    `<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`
  );
}

function sectionXml(title, content) {
  let xml = mkP(mkR(title, { bold: true }));
  if (content && String(content).trim()) {
    for (const line of String(content).trim().split('\n')) {
      const stripped = line.trim();
      if (stripped) {
        xml += mkListP(stripped);
      }
    }
  }
  return xml;
}

function cellR0c0(fecha, hora) {
  return (
    '<w:tc><w:tcPr><w:tcW w:w="1980" w:type="dxa"/></w:tcPr>' +
    `${mkP(mkR(fecha))}` +
    `${mkP(mkR(`${hora} HORAS`))}` +
    '</w:tc>'
  );
}

function cellR0c1(servicio) {
  const title = `INDICACIONES POR ${servicio}`;
  return (
    '<w:tc><w:tcPr><w:tcW w:w="8916" w:type="dxa"/></w:tcPr>' +
    `${mkP(mkR(title), { centered: true })}` +
    '</w:tc>'
  );
}

function cellR1c0(medicos) {
  const lines = String(medicos || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  let content = mkP('');
  for (const line of lines) {
    content += mkP(mkR(line));
  }
  return (
    '<w:tc><w:tcPr><w:tcW w:w="1980" w:type="dxa"/></w:tcPr>' +
    `${content}</w:tc>`
  );
}

function cellR1c1(ind, servicio, otros) {
  let desc = (ind.descripcion || '').trim();
  if (!desc) {
    desc = `INDICACIONES POR SERVICIO DE ${servicio}`;
  }

  let content = mkP(mkR(desc));

  for (const [title, key] of [
    ['DIETA', 'dieta'],
    ['CUIDADOS', 'cuidados'],
    ['ESTUDIOS', 'estudios'],
    ['MEDICAMENTOS', 'medicamentos'],
    ['INTERCONSULTAS', 'interconsultas'],
  ]) {
    content += sectionXml(title, ind[key] || '');
  }

  for (const item of otros || []) {
    const titulo = (item.titulo || '').trim().toUpperCase();
    const contenido = (item.contenido || '').trim();
    if (titulo) {
      content += sectionXml(titulo, contenido);
    }
  }

  return (
    '<w:tc><w:tcPr><w:tcW w:w="8916" w:type="dxa"/></w:tcPr>' +
    `${content}</w:tc>`
  );
}

function findFirstTable(xml) {
  const start = xml.indexOf('<w:tbl>');
  if (start === -1) return null;
  const end = xml.indexOf('</w:tbl>', start);
  if (end === -1) return null;
  return { start, end: end + '</w:tbl>'.length, tblXml: xml.slice(start, end + '</w:tbl>'.length) };
}

function findRows(tblXml) {
  const rows = [];
  const re = /<w:tr[ >][\s\S]*?<\/w:tr>/g;
  let m;
  while ((m = re.exec(tblXml)) !== null) {
    rows.push(m[0]);
  }
  return rows;
}

function findCells(rowXml) {
  const cells = [];
  const re = /<w:tc>[\s\S]*?<\/w:tc>/g;
  let m;
  while ((m = re.exec(rowXml)) !== null) {
    cells.push(m[0]);
  }
  return cells;
}

async function generateIndicacionesBuffer({ patient, indicaciones }) {
  patient = patient || {};
  indicaciones = indicaciones || {};

  const { names, files } = await loadDocxTemplate('template_indicaciones.docx');

  let xml = files['word/document.xml'].toString('utf-8');

  const nombre = (patient.nombre || '').toUpperCase();
  const registro = patient.registro || '';
  const edad = String(patient.edad || '');
  const sexo = (patient.sexo || '').toUpperCase();
  const area = (patient.area || '').toUpperCase();
  const servicio = (patient.servicio || 'MEDICINA INTERNA').toUpperCase();
  const cuarto = patient.cuarto || '';
  const cama = patient.cama || '';

  const fecha = (indicaciones.fecha || '').replace(/\//g, '-');
  const hora = indicaciones.hora || '';
  const medicos = indicaciones.medicos || '';
  const otros = indicaciones.otros || [];

  const tbl = findFirstTable(xml);
  if (!tbl) {
    throw new Error('template_indicaciones.docx: tabla principal no encontrada');
  }

  const rows = findRows(tbl.tblXml);
  if (rows.length < 2) {
    throw new Error('template_indicaciones.docx: se esperaban al menos 2 filas');
  }

  const cellsR0 = findCells(rows[0]);
  const cellsR1 = findCells(rows[1]);
  if (cellsR0.length < 2 || cellsR1.length < 2) {
    throw new Error('template_indicaciones.docx: celdas incompletas');
  }

  const origR0c0 = cellsR0[0];
  const origR0c1 = cellsR0[1];
  const origR1c0 = cellsR1[0];
  const origR1c1 = cellsR1[1];

  xml = xml.replace(origR0c0, cellR0c0(fecha, hora));
  xml = xml.replace(origR0c1, cellR0c1(servicio));
  xml = xml.replace(origR1c0, cellR1c0(medicos));
  xml = xml.replace(origR1c1, cellR1c1(indicaciones, servicio, otros));

  xml = replaceT(xml, ORIG_NOMBRE, ` ${nombre}`);
  xml = replaceT(xml, ORIG_REGISTRO, registro);
  xml = replaceT(xml, ORIG_EDAD, edad);
  xml = replaceT(xml, ORIG_SEXO, sexo);
  xml = replaceT(xml, ORIG_AREA, area);
  xml = replaceT(xml, ORIG_SERVICIO, servicio);
  xml = replaceT(xml, ORIG_CUARTO, cuarto);
  xml = replaceT(xml, ORIG_CAMA, ` ${cama}`);

  files['word/document.xml'] = Buffer.from(xml, 'utf-8');
  return packDocxBuffer(files, names);
}

module.exports = {
  generateIndicacionesBuffer,
  cellR0c0,
  cellR0c1,
  sectionXml,
  ORIG_NOMBRE,
};
