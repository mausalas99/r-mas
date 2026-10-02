import { escHtml } from './dom-escape.mjs';
import { gradoToMedicosLines } from './profile-templates.mjs';
import { DOC_PREVIEW_LOGO, DOC_PREVIEW_SEAL } from './doc-preview-logo.mjs';

var NOM_NOTE =
  'Favor de escribir la nota de acuerdo a la NOM-004-SSA3-2012, numeral 6.2.6. ' +
  '(sin abreviaciones, sin faltar fecha, hora, nombre completo y firma de quien realiza)';

var CSS =
  '@page{size:Letter;margin:.33in}' +
  '*{box-sizing:border-box}' +
  'body{margin:0;padding:18px;background:#e5e7eb;font:10pt/1.5 Arial,Helvetica,sans-serif;color:#000}' +
  '.page{width:8.5in;min-height:10.4in;margin:0 auto;padding:.33in;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.2);display:flex;flex-direction:column}' +
  '.head{display:flex;justify-content:space-between;align-items:stretch}' +
  '.head img{height:1.13in;width:auto}' +
  '.pt{width:3.55in;height:1.13in;border:2px solid #999;border-radius:14px;padding:.12in .15in;font-size:8pt;line-height:1.7}' +
  '.notice{margin:.06in 0 .02in;font-size:6pt}' +
  '.title{background:#999;border:2px solid #434343;border-radius:8px;color:#434343;text-align:center;font-size:14pt;padding:2px 0}' +
  '.tbl{flex:1;display:flex;margin-top:.08in;border:1px solid #000;border-width:1px 2px 2px 2px;min-height:8in}' +
  '.l{width:1.95in;flex:none;padding:.07in .12in;border-right:2px solid #000}' +
  '.r{flex:1;padding:.07in .12in}' +
  '.l div{margin-bottom:.1in}' +
  '.sec{font-weight:700;margin-top:.08in}' +
  '.ln{margin:.03in 0;padding-left:.45in;text-indent:-.3in;line-height:1.9}' +
  '.ln:before{content:"-";display:inline-block;width:.3in;text-indent:0;padding-left:.1in}' +
  '.vit{display:flex;gap:18px;flex-wrap:wrap;padding-left:.25in}.k{font-weight:700}' +
  '.sign{display:flex;justify-content:space-around;margin-top:.5in;text-align:center}' +
  '.sign div{width:42%;border-top:1px solid #000;padding-top:3px}' +
  '.nota{font-family:"Times New Roman",Times,serif;font-size:10pt}' +
  '.nota .frame{flex:1;display:flex;flex-direction:column;border:2px solid #000;border-radius:8px;margin-top:.06in;padding:.04in .08in .1in}' +
  '.nota .hd{display:flex;justify-content:space-between;align-items:center}' +
  '.nota .hd .hosp{display:flex;align-items:center;gap:.12in;font-weight:700}' +
  '.nota .hd img{height:.85in}' +
  '.nota .hosp b{font-size:11pt;display:block}.nota .hosp i{font-size:7pt;display:block;font-weight:700}' +
  '.nota .pt2{width:3in;border:2px solid #000;border-radius:5px;padding:.04in .08in;font-size:7pt;line-height:1.9}' +
  '.nota .pt2 u{display:inline-block;min-width:.5in;font-size:6.5pt}' +
  '.nota .bar{border:2px solid #434343;background:#d9d9d9;border-radius:6px;text-align:center;font-weight:700;font-size:12pt;position:relative;padding:.12in 0 .01in;margin-top:.05in}' +
  '.nota .bar small{position:absolute;top:1px;left:0;right:0;font-size:4.5pt;font-weight:400;letter-spacing:.3px}' +
  '.nota .in{border:2px solid #000;border-radius:6px;margin-top:.03in;padding:.04in .06in;flex:1;display:flex;flex-direction:column}' +
  '.nota label{display:block;margin:.07in 0 .03in}' +
  '.nota .bx{border:1px solid #000;padding:2px 3px;font:6.5pt/1.25 Arial,Helvetica,sans-serif;white-space:pre-wrap;min-height:.5in}' +
  '.nota .cols{display:flex;gap:.08in;margin-top:.07in}.nota .cols>div:nth-child(-n+2){flex:1}.nota .cols>div:last-child{flex:.8}' +
  '.nota .cols .bx{height:1.15in}.nota .dx{font:7.5pt Arial,sans-serif;padding:2px 3px;border:1px solid #000;height:1.15in}.nota .dx li{margin-left:.2in}.nota .dx ul{margin:0;padding:0}' +
  '.nota .tx{columns:2;column-gap:.25in;margin-top:.05in}.nota .tx div{break-inside:avoid;margin:.08in 0;border-bottom:1px solid #000;min-height:.19in;font-size:8pt}' +
  '.nota .fl{margin-top:.08in;font-size:8pt}.nota .fl u{font-size:8pt}' +
  '.nota .foot{margin-top:auto;text-align:right;font-size:7pt}' +
  '@media print{body{background:#fff;padding:0}.page{box-shadow:none;margin:0;width:auto;min-height:0;padding:0}}';

function lines(v) {
  var arr = Array.isArray(v) ? v : String(v || '').split('\n');
  return arr
    .map(function (l) {
      return String(l).trim();
    })
    .filter(Boolean);
}

function bullets(v) {
  return lines(v)
    .map(function (l) {
      return '<div class="ln">' + escHtml(l) + '</div>';
    })
    .join('');
}

function section(title, v) {
  return '<div class="sec">' + escHtml(title) + '</div>' + bullets(v);
}

function patientBox(p) {
  p = p || {};
  var up = function (v) {
    return escHtml(String(v || '').toUpperCase());
  };
  var sexo = { F: 'FEM', M: 'MASC' }[String(p.sexo || '').toUpperCase()] || p.sexo;
  return (
    '<div class="pt">NOMBRE: ' + up(p.nombre) +
    '<br>REGISTRO: ' + escHtml(p.registro || '') +
    '<br>EDAD: ' + escHtml(p.edad || '') + ' AÑOS &nbsp; SEXO: ' + up(sexo) +
    ' &nbsp; CUARTO: ' + escHtml([p.cuarto, p.cama].filter(Boolean).join('-')) +
    '<br>DEPTO. Y/O SERV: ' + up(p.area || p.servicio) +
    '<br>DIAGNÓSTICO: ' + up(Array.isArray(p.diagnosticos) ? p.diagnosticos.join(', ') : p.diagnostico) +
    '</div>'
  );
}

function page(title, patient, titleText, body, notice) {
  return (
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>' + escHtml(title) +
    '</title><style>' + CSS + '</style></head><body><div class="page">' +
    '<div class="head"><img src="' + DOC_PREVIEW_LOGO + '" alt="">' + patientBox(patient) + '</div>' +
    '<div class="notice">' + (notice || NOM_NOTE) + '</div>' +
    '<div class="title">' + titleText + '</div>' + body +
    '</div></body></html>'
  );
}

function leftCol(doc, extra) {
  return (
    '<div class="l"><div>FECHA</div><div>' + escHtml(doc.fecha || '') +
    '<br>' + escHtml(doc.hora || '') + ' HORAS</div>' + (extra || '') + '</div>'
  );
}

/** Mismo formato que el .docx: fecha y médicos a la izquierda, secciones a la derecha. */
export function buildIndicacionesPreviewHtml(patient, ind) {
  ind = ind || {};
  var right = [
    ['DIETA', ind.dieta], ['CUIDADOS', ind.cuidados], ['ESTUDIOS', ind.estudios],
    ['MEDICAMENTOS', ind.medicamentos], ['INTERCONSULTAS', ind.interconsultas],
  ]
    .concat(
      (ind.otros || []).map(function (o) {
        return [String(o.titulo || '').trim().toUpperCase(), o.contenido];
      })
    )
    .filter(function (s) {
      return s[0];
    })
    .map(function (s) {
      return section(s[0], s[1]);
    })
    .join('');
  var medicos = lines(gradoToMedicosLines(ind.medicos)).map(escHtml).join('<br>');
  return page(
    'Indicaciones', patient, 'INDICACIONES MÉDICAS',
    '<div class="tbl">' + leftCol(ind, '<div>' + medicos + '</div>') + '<div class="r">' + right + '</div></div>'
  );
}

/** Nota de evolución: mismo formato que el .docx (formulario del hospital). */
export function buildNotaPreviewHtml(patient, note) {
  note = note || {};
  patient = patient || {};
  var up = function (v) {
    return Array.isArray(v) ? v.map(up) : String(v || '').toUpperCase();
  };
  var u = function (v, w) {
    return '<u style="min-width:' + (w || 0.5) + 'in">' + escHtml(v == null ? '' : v) + '</u>';
  };
  var raw = function (v) {
    return escHtml(lines(v).join('\n'));
  };
  var tx = lines(up(note.tratamiento || []));
  var slots = '';
  for (var i = 0; i < Math.max(10, tx.length); i += 1) {
    slots += '<div>' + (i + 1) + '. ' + escHtml(tx[i] || '') + '</div>';
  }
  var dx = lines(up(note.diagnosticos || []))
    .map(function (d) {
      return '<li>' + escHtml(d) + '</li>';
    })
    .join('');
  var pt =
    '<div class="pt2">NOMBRE: ' + u(up(patient.nombre), 2) +
    '<br>REGISTRO: ' + u(patient.registro, 0.8) + ' EDAD: ' + u(patient.edad, 0.4) + ' SEXO: ' + u(up(patient.sexo), 0.3) +
    '<br>ÁREA: ' + u(up(patient.area), 1.8) +
    '<br>SERVICIO: ' + u(up(patient.servicio), 1.6) +
    '<br>CUARTO: ' + u(patient.cuarto, 0.6) + ' CAMA: ' + u(patient.cama, 0.5) + '</div>';
  var body =
    '<div class="hd"><div class="hosp"><img src="' + DOC_PREVIEW_SEAL + '" alt=""><div>' +
    '<b>HOSPITAL UNIVERSITARIO<br>“Dr. José Eleuterio González”</b>' + // phi-scan: synthetic (public letterhead, not patient data)
    '<i>Francisco I. Madero pte. y Av. Gonzalitos s/n<br>Col. Mitras Centro, C.P. 64460,<br>Monterrey, N.L. Tel: (81) 83-46-78-00</i></div></div>' + pt + '</div>' + // phi-scan: synthetic (public letterhead, not patient data)
    '<div class="bar"><small>Favor de escribir con letra legible, sin abreviaciones, sin faltar fecha, hora, nombre completo y firma de quien realiza la nota NOM-168-SSA1-1998. (6.2, 7.2, 8.3)</small>NOTA DE EVOLUCIÓN</div>' +
    '<div class="in">' +
    '<div>Fecha: ' + u(note.fecha, 0.8) + ' &nbsp; Hora: ' + u(note.hora, 0.5) + ' &nbsp; Resumen del interrogatorio, exploración física y estado mental:</div>' +
    '<div class="bx" style="height:1.5in;margin-top:.05in">' + raw(up(note.interrogatorio)) + '</div>' +
    '<label>Evolución y actualización del cuadro clínico (tabaquismo, alcoholismo y adicciones):</label>' +
    '<div class="bx" style="height:1.5in">' + raw(up(note.evolucion)) + '</div>' +
    '<div class="cols"><div>Resultados de Estudios Auxiliares:<div class="bx">' + raw(note.estudios) + '</div></div>' +
    '<div>Diagnóstico(s):<div class="dx"><ul>' + dx + '</ul></div></div>' +
    '<div>Signos Vitales:<div style="margin-top:.08in;line-height:2">TA ' + u(note.ta, 0.6) + ' FR ' + u(note.fr, 0.3) +
    '<br>FC ' + u(note.fc, 0.3) + ' T. ' + u(note.temp, 0.4) + '<br>Peso (kg.) ' + u(note.peso, 0.4) + '</div></div></div>' +
    '<label>Tratamiento e indicaciones médicas (indicar en caso de medicamentos: dosis, vía y periodicidad):</label>' +
    '<div class="tx">' + slots + '</div>' +
    '<div class="fl">Médico Tratante (Nombre completo, firma): ' + u(note.medico, 3) + '</div>' +
    '<div class="fl">Profesor Responsable: ' + u(note.profesor, 3) + '</div>' +
    '<div class="foot">00-005-R-11/05</div></div>';
  return (
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Nota de evolución</title><style>' + CSS +
    '</style></head><body><div class="page nota"><div class="frame">' + body + '</div></div></body></html>'
  );
}
