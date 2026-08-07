/** Help center articles and quick help modal. */
import { esc } from '../patients-html.mjs';
import { settingsHelpBridge } from './bridges.mjs';
import { closeSettingsDropdown } from './settings-dropdown.mjs';



var HELP_ARTICLES = [
  {
    id: 'modo-guardia',
    title: 'Modo Guardia',
    keywords: 'guardia modo chip tablero turno censo alcance rango solo entregados toggle nube',
    html:
      '<p><strong>Modo Guardia</strong> es una vista de trabajo centrada en el turno: censo, entrega y monitoreo. Se abre desde el botón <strong>Guardia</strong> en la barra superior.</p>' +
      '<ul>' +
      '<li><strong>Chip Guardia</strong> — entra y sale sin bloquear Laboratorio ni Expediente.</li>' +
      '<li><strong>Franja Nube · sala · equipo</strong> — confirma conexión Nube, sala del turno y equipo activo antes de confiar en el censo compartido.</li>' +
      '<li><strong>Alcance</strong> — R1 ve su equipo; R4 ve el censo de la sala (Filtros censo por sala; grilla subdividida por equipo). La barra de contexto resume sala y turno.</li>' +
      '<li><strong>Censo: todos / solo entregados</strong> — filtra la grilla (independiente del flujo Entrega).</li>' +
      '<li>Pulsa de nuevo <strong>Guardia</strong> para volver a la vista Normal.</li>' +
      '</ul>'
  },
  {
    id: 'modo-entrega',
    title: 'Modo Entrega y pendientes',
    keywords: 'entrega handoff roster pendientes v2 fase turno documentar paciente',
    html:
      '<p><strong>Modo Entrega</strong> documenta el handoff entre turnos antes del monitoreo activo.</p>' +
      '<ul>' +
      '<li><strong>Barra de fase</strong> — guía entrega (~16:00), turno activo y cierre.</li>' +
      '<li><strong>Por paciente</strong> — modal de entrega con equipo entrante, handoff y pendientes.</li>' +
      '<li><strong>Roster</strong> — lista quién falta por documentar antes de pasar al turno.</li>' +
      '<li><strong>Pendientes v2</strong> — plantillas por servicio y seguimiento estructurado entre turnos.</li>' +
      '<li><strong>Finalizar turno</strong> — agrupa pendientes abiertos por equipo de origen para enviar handoff diurno; cerrar sin enviar no borra pendientes.</li>' +
      '</ul>'
  },
  {
    id: 'lan-pin-turno',
    title: 'R+ Cloud, equipos y móvil',
    keywords: 'nube cloud conexion livesync sala directorio mi rotacion ipad mobile qr invitacion r+ cloud',
    html:
      '<p>El turno se sincroniza con <strong>R+ Cloud</strong> (Nube). No hace falta un Mac anfitrión en la Wi‑Fi del hospital.</p>' +
      '<ul>' +
      '<li><strong>⇄ Conexión</strong> — cuenta Nube, sala del equipo y estado de sincronización.</li>' +
      '<li><strong>Mi rotación</strong> — @usuario, equipos e integrantes (se publican por clinicalOps a la sala).</li>' +
      '<li><strong>Directorio de usuarios</strong> — quién está en la sala; el admin asigna a equipos.</li>' +
      '<li><strong>iPad / R+ Móvil</strong> — enlace o QR desde ⇄; inicia sesión con la misma cuenta Nube.</li>' +
      '<li><strong>Censo</strong> — R1 por equipo; R4 con divisores por equipo en la grilla; sync discreta en segundo plano.</li>' +
      '</ul>'
  },
  {
    id: 'rotacion-equipos',
    title: 'Rotación mensual y herencia de pacientes',
    keywords: 'rotacion nueva rotacion rejoin heredar pacientes equipo mes sala ciclo mi rotacion unirse archivar',
    html:
      '<p>Cada mes los equipos de guardia rotan. R+ te guía para no perder el hilo del censo compartido.</p>' +
      '<ul>' +
      '<li><strong>Nueva rotación</strong> — si ya estuviste en un equipo, R+ puede pedirte confirmar sala y abrir <strong>Mi rotación</strong> para unirte al equipo del mes.</li>' +
      '<li><strong>Heredar pacientes</strong> — al unirte a un equipo nuevo, el asistente te deja traer pacientes de tu equipo anterior (misma sala/ciclo sugerido) sin reasignar uno por uno.</li>' +
      '<li><strong>R4 / admin</strong> — publica equipos nuevos en Mi rotación para que el resto se una.</li>' +
      '</ul>' +
      '<p style="font-size:13px;color:var(--text-muted);margin:0;">¿Censo vacío tras rotar? Confirma Nube en ⇄, revisa la franja sala/equipo en Guardia y abre Mi rotación.</p>'
  },
  {
    id: 'primer-paciente',
    title: 'Tu primer paciente',
    keywords: 'agregar paciente nuevo registro edad sexo cuarto cama duplicado',
    html:
      '<p>Agrega un paciente desde la barra lateral con <strong>+ Agregar</strong> o directamente desde un reporte de laboratorio procesado (<strong>Agregar paciente del lab</strong>).</p>' +
      '<ul>' +
      '<li>Puedes capturar nombre, registro, edad, sexo, área / servicio, cuarto y cama.</li>' +
      '<li>R+ avisa si detecta un paciente con el mismo nombre o registro para evitar duplicados.</li>' +
      '<li>El paciente queda guardado solo en esta computadora; no se sube a la nube.</li>' +
      '</ul>'
  },
  {
    id: 'lan-vs-respaldo',
    title: 'R+ Cloud vs respaldos entre equipos',
    keywords: 'nube cloud conexion sala equipo respaldo sync paquete sincronizar vivo copia snapshot exportar',
    html:
      '<p>R+ usa dos ideas distintas que no compiten; sirven para cosas diferentes:</p>' +
      '<ul>' +
      '<li><strong>R+ Cloud (⇄ Conexión):</strong> trabajar en <strong>sesión</strong> con el equipo en la <strong>misma sala Nube</strong>. Colaboración en tiempo real; no sustituye un respaldo local de tu historial.</li>' +
      '<li><strong>Respaldos (Ajustes → Respaldos, sync y recuperación):</strong> exportar/importar <strong>JSON</strong>, auto‑respaldos y <strong>paquete sync</strong> para mover o recuperar el contenido clínico entre computadoras o después del turno.</li>' +
      '</ul>' +
      '<p style="font-size:13px;color:var(--text-muted);margin:0;">¿Continuar el mismo caso en otro equipo físico sin Nube? Usa <strong>exportar/importar</strong>. ¿Ver en vivo lo que hace el equipo en sala? Usa <strong>R+ Cloud</strong> en ⇄.</p>'
  },
  {
    id: 'laboratorio',
    title: 'Laboratorio: procesar',
    keywords: 'lab laboratorio procesar reporte diagrama gamble bh quimica copiar',
    html:
      '<p>Pega el reporte del laboratorio en el cuadro de texto de la pestaña <strong>Laboratorio</strong> y pulsa <strong>Procesar</strong>. R+ reconoce biometría, química, electrolitos, gasometría, pruebas hepáticas y más.</p>' +
      '<ul>' +
      '<li>Cada diagrama tiene un botón <strong>Copiar</strong> para pegarlo como texto en otro sistema.</li>' +
      '<li>Los valores fuera de rango se resaltan en rojo.</li>' +
      '<li>En <strong>Historial de labs</strong> ves cada envío guardado; puedes <strong>Ver en Laboratorio</strong> para recuperar diagramas o <strong>Eliminar</strong> un conjunto si fue un error.</li>' +
      '</ul>'
  },
  {
    id: 'nota-evolucion',
    title: 'Nota de evolución',
    keywords: 'nota evolucion docx generar expediente soap vitales diagnosticos plantilla',
    html:
      '<p>En <strong>Expediente → Notas</strong> completa fecha, hora, signos vitales, interrogatorio, evolución, estudios, diagnósticos y tratamiento.</p>' +
      '<ul>' +
      '<li>En modo <strong>Sala</strong>, el párrafo estructurado (N/V/HD/HI/NM) se arma en <strong>Estado actual</strong> y se copia a la nota.</li>' +
      '<li>En <strong>Interconsulta</strong>, desde <strong>Medicamentos</strong> puedes volcar dosis a la plantilla SOAP o al tratamiento.</li>' +
      '<li><strong>Generar Nota (.docx)</strong> crea el documento con membrete (generador nativo en Node); la carpeta de salida está en <strong>Ajustes</strong>.</li>' +
      '<li><strong>Salida rápida</strong> exporta el paciente activo en docx, html o txt según el formato elegido.</li>' +
      '<li>Los datos se guardan por paciente en este equipo.</li>' +
      '</ul>'
  },
  {
    id: 'eventualidades',
    title: 'Eventualidades (Sala)',
    keywords: 'eventualidades bitacora intercurrencia dia clinico sala registro',
    html:
      '<p><strong>Expediente → Clínico → Eventualidades</strong> guarda hechos clínicos del turno con fecha y texto libre (orden cronológico).</p>' +
      '<p style="font-size:13px;color:var(--text-muted);margin:0;">Complementa <strong>Estado actual</strong> (monitoreo estructurado). No sustituye la nota de evolución en Interconsulta.</p>'
  },
  {
    id: 'estado-actual',
    title: 'Estado actual y monitoreo (Sala)',
    keywords: 'estado actual monitoreo vitales glu glucometria insulina balance hidrico entradas salidas io tendencias medicamentos confirmacion sala clinico segmento',
    html:
      '<p>En modo <strong>Sala</strong>, <strong>Expediente → Clínico → Estado actual</strong> concentra el <strong>monitoreo</strong> del turno antes de pasar todo a la nota.</p>' +
      '<ul>' +
      '<li><strong>Signos vitales</strong> estructurados con resaltado si salen del rango esperado.</li>' +
      '<li><strong>Glucometrías / insulina</strong>: registro y lectura rápida en el mismo panel.</li>' +
      '<li><strong>Balance hídrico (I/O)</strong>: entradas y salidas para el párrafo de estado.</li>' +
      '<li><strong>Tendencias</strong>: vista compacta cuando hay historia de laboratorio útil.</li>' +
      '<li><strong>Medicamentos</strong>: propuesta desde la receta hospitalaria para <strong>confirmar</strong> dosis vigentes antes de cerrar texto.</li>' +
      '</ul>' +
      '<p style="font-size:13px;color:var(--text-muted);margin:0;">En <strong>Sala</strong>, copia el texto compilado desde el historial o el botón flotante de copiar hacia la nota. En <strong>Interconsulta</strong>, <strong>Enviar a nota</strong> vuelca el texto a la evolución y abre la pestaña Notas (pide confirmar si ya hay texto).</p>'
  },
  {
    id: 'indicaciones',
    title: 'Indicaciones médicas',
    keywords: 'indicaciones dieta cuidados medicamentos estudios interconsultas otros docx',
    html:
      '<p>En <strong>Expediente → Indicaciones</strong> arma la hoja por secciones (dieta, cuidados, medicamentos, estudios, interconsultas y otros).</p>' +
      '<ul>' +
      '<li>Define <strong>plantillas por defecto</strong> en Mi Perfil para prellenar dieta, cuidados y medicamentos.</li>' +
      '<li><strong>Generar Indicaciones (.docx)</strong> produce la hoja final con el membrete del hospital.</li>' +
      '<li>La <strong>Salida rápida</strong> (Ajustes) exporta el paciente activo en docx, html o txt de un solo clic.</li>' +
      '</ul>'
  },
  {
    id: 'medicamentos-receta',
    title: 'Medicamentos (receta hospitalaria)',
    keywords: 'medicamentos receta tsv hospital soap tratamiento analgesia abx antihta vasopresores copiar',
    html:
      '<p>En la pestaña <strong>Medicamentos</strong> pegas el listado copiado del sistema hospitalario (columnas separadas por tabulador) y pulsas <strong>Receta</strong>.</p>' +
      '<p>En <strong>SOME</strong>, para reutilizar el mismo bloque, copia normalmente <strong>desde la columna Fecha y hora</strong> hasta el <strong>final de la sección</strong> de medicamentos y pégalo en R+.</p>' +
      '<ul>' +
      '<li><strong>Excl.</strong> excluye el fármaco del texto de egreso; <strong>SOAP</strong> marca qué filas se volcarán a la plantilla SOAP o al tratamiento.</li>' +
      '<li>La vista previa inferior agrupa por categoría (analgésicos, antiHTA, antibióticos, vasopresores, otros).</li>' +
      '<li><strong>Añadir a Tratamiento</strong> inserta líneas en la nota; <strong>Abrir plantilla SOAP</strong> rellena los campos del modal según esa clasificación.</li>' +
      '<li><strong>Copiar</strong> en la tarjeta inferior genera texto tipo nota de egreso.</li>' +
      '<li>Atajos: <strong>Ctrl/⌘ + 3</strong> cicla Manejo actual ↔ Perfil histórico; <strong>Ctrl/⌘ + Shift + 3</strong> alterna Completa / Nombre+Día; <strong>Ctrl/⌘ + M</strong> es alias de Medicamentos.</li>' +
      '</ul>'
  },
  {
    id: 'respaldo',
    title: 'Respaldo y portabilidad',
    keywords: 'respaldo backup copia seguridad exportar importar paciente rango sync pasarela equipos auditoria',
    html:
      '<p><strong>¿Nube o respaldo?</strong> Lee primero <strong>R+ Cloud vs respaldos entre equipos</strong> en este centro de ayuda.</p>' +
      '<p>R+ ofrece varias vías para mover o resguardar datos desde <strong>Ajustes</strong>:</p>' +
      '<ul>' +
      '<li><strong>Copia de seguridad</strong>: JSON completo de pacientes, notas, indicaciones y labs.</li>' +
      '<li><strong>Exportar paciente actual</strong>, <strong>varios pacientes</strong> (selección del censo) o por <strong>rango de fechas</strong> para mover casos específicos.</li>' +
      '<li><strong>Copia automática</strong> guarda hasta 14 snapshots locales rotativos.</li>' +
      '<li><strong>Paquete sync</strong> cifrado con passphrase para combinar datos entre equipos sin pisar los del otro lado.</li>' +
      '<li><strong>Registro de auditoría</strong>: descarga un JSON con exportaciones e importaciones relevantes.</li>' +
      '</ul>'
  },
  {
    id: 'actualizacion',
    title: 'Actualizar R+',
    keywords:
      'actualizacion actualizar update instalar reiniciar rollback version downgrade restaurar estable reparacion native binding',
    html:
      '<p>R+ busca nuevas versiones al iniciar. Cuando hay una disponible, la app muestra un modal con el progreso de descarga.</p>' +
      '<ul>' +
      '<li>Puedes buscar manualmente desde <strong>Ajustes → Buscar actualizaciones…</strong> o el menú nativo (Mac: R+; Windows: Aplicación).</li>' +
      '<li><strong>Restaurar versión estable</strong>: en Ajustes → Aplicación, elige una versión anterior curada y confirma. R+ intenta instalarla como una actualización; si falla (p. ej. firma en Mac), abre el instalador correcto en GitHub. Tus datos locales no se borran.</li>' +
      '<li>Si la versión elegida está por debajo del mínimo soportado, R+ bloquea la restauración automática.</li>' +
      '<li>Al detectar una versión nueva instalada, R+ muestra una ventana de <strong>Novedades</strong> con los cambios relevantes.</li>' +
      '</ul>'
  },
  {
    id: 'atajos',
    title: 'Atajos de teclado',
    keywords: 'atajos shortcuts teclado ctrl cmd escape tab',
    html:
      '<p>Ahorra tiempo con estos atajos:</p>' +
      '<ul>' +
      '<li><strong>Ctrl/⌘ + 1</strong> — Laboratorio · <strong>2</strong> — Expediente · <strong>3</strong> — Medicamentos · <strong>4</strong> — Agenda (<strong>Pase</strong>: abre la sección en vista Normal). <strong>Repite el mismo número</strong> para ciclar subvistas: <strong>2</strong> Paciente→Clínico→Resultados→Salida · <strong>3</strong> Manejo↔Perfil · <strong>4</strong> semana actual</li>' +
      '<li><strong>Ctrl/⌘ + Shift + 3</strong> — Completa ↔ Nombre+Día (texto de egreso en Manejo actual)</li>' +
      '<li><strong>Ctrl/⌘ + [</strong> / <strong>]</strong> — Semana anterior / siguiente en Agenda</li>' +
      '<li><strong>Ctrl/⌘ + ,</strong> — Ajustes</li>' +
      '<li><strong>Ctrl/⌘ + N</strong> — Nuevo paciente</li>' +
      '<li><strong>Ctrl/⌘ + G</strong> — Modo Guardia · <strong>I</strong> — Interconsulta · <strong>P</strong> — Pase (repite para volver a Sala/Interconsulta) · <strong>S</strong> — Sala</li>' +
      '<li><strong>Ctrl/⌘ + E</strong> — Estado actual (en EA → Eventualidades en Sala) · <strong>T</strong> — Tendencias (en tendencias → Cultivos) · <strong>D</strong> — Datos del paciente · <strong>M</strong> — Medicamentos (cicla subvistas) · <strong>A</strong> — Agenda (semana actual)</li>' +
      '<li><strong>Ctrl/⌘ + Shift + S</strong> — Guardar estado del paciente activo</li>' +
      '<li><strong>Ctrl/⌘ + K</strong> — Ir a sección o paciente</li>' +
      '<li><strong>Ctrl/⌘ + Shift + P</strong> — Abrir/cerrar Mi Perfil</li>' +
      '<li><strong>Ctrl/⌘ + Shift + ,</strong> — Activa/desactiva <strong>sobrescribir</strong> en conflictos al importar JSON (sin preguntar)</li>' +
      '<li><strong>Esc</strong> o clic fuera — Cerrar ventana modal, menús o el centro de ayuda</li>' +
      '<li>Dentro del centro de ayuda: <strong>↓</strong> desde el buscador enfoca la lista; <strong>↑ / ↓</strong> navegan artículos.</li>' +
      '</ul>' +
      '<p style="font-size:13px;color:var(--text-muted);margin:12px 0 0;">Si cambias mucho de pestaña con el mouse, R+ puede sugerirte estos atajos tras varios clics (sin límite de tiempo); dejan de aparecer cuando empiezas a usarlos.</p>'
  },
  {
    id: 'privacidad',
    title: 'Privacidad de datos',
    keywords: 'privacidad datos locales electron userdata carpeta no subir nube sensibles',
    html:
      '<p>R+ guarda toda la información en el <strong>almacenamiento local</strong> de Electron en esta computadora. No envía pacientes ni notas a ningún servidor externo.</p>' +
      '<ul>' +
      '<li>En Ajustes, <strong>Abrir carpeta…</strong> muestra la ruta exacta del perfil de la app.</li>' +
      '<li>No compartas esa carpeta ni los archivos JSON exportados si contienen información sensible sin cifrado.</li>' +
      '<li>Los paquetes <strong>sync</strong> y las exportaciones pueden cifrarse con una passphrase para intercambio seguro entre equipos.</li>' +
      '</ul>'
  }
];

var helpCurrentArticleId = null;

function openQuickHelp(preselectId) {
  var el = document.getElementById('help-quick-backdrop');
  if (!el) return;
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  closeSettingsDropdown();
  var input = document.getElementById('help-search-input');
  if (input) input.value = '';
  renderHelpArticles('');
  var pickId =
    preselectId && HELP_ARTICLES.some(function (a) { return a.id === preselectId; })
      ? preselectId
      : null;
  if (pickId) selectHelpArticle(pickId);
  else if (!helpCurrentArticleId || !HELP_ARTICLES.some(function(a){ return a.id === helpCurrentArticleId; })) {
    selectHelpArticle(HELP_ARTICLES[0].id);
  } else {
    selectHelpArticle(helpCurrentArticleId);
  }
  settingsHelpBridge.syncLearnHubContinueVisibility();
  setTimeout(function(){ if (input) input.focus(); }, 40);
}

export function closeQuickHelp() {
  var el = document.getElementById('help-quick-backdrop');
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
}

function onHelpSearchInput(value) {
  renderHelpArticles(value);
}

function onHelpSearchKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    var list = document.getElementById('help-articles-list');
    var first = list && list.querySelector('.help-article-item');
    if (first) first.focus();
  } else if (e.key === 'Enter') {
    var list2 = document.getElementById('help-articles-list');
    var first2 = list2 && list2.querySelector('.help-article-item');
    if (first2) {
      e.preventDefault();
      selectHelpArticle(first2.getAttribute('data-article-id'));
      first2.focus();
    }
  }
}

function onHelpListKeydown(e) {
  var target = e.target;
  if (!target || !target.classList || !target.classList.contains('help-article-item')) return;
  var items = Array.prototype.slice.call(document.querySelectorAll('#help-articles-list .help-article-item'));
  var idx = items.indexOf(target);
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    var next = items[Math.min(items.length - 1, idx + 1)];
    if (next) { next.focus(); selectHelpArticle(next.getAttribute('data-article-id')); }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (idx <= 0) {
      var input = document.getElementById('help-search-input');
      if (input) input.focus();
    } else {
      items[idx - 1].focus();
      selectHelpArticle(items[idx - 1].getAttribute('data-article-id'));
    }
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    selectHelpArticle(target.getAttribute('data-article-id'));
  } else if (e.key === 'Home') {
    e.preventDefault();
    if (items[0]) { items[0].focus(); selectHelpArticle(items[0].getAttribute('data-article-id')); }
  } else if (e.key === 'End') {
    e.preventDefault();
    var last = items[items.length - 1];
    if (last) { last.focus(); selectHelpArticle(last.getAttribute('data-article-id')); }
  }
}

function renderHelpArticles(query) {
  var list = document.getElementById('help-articles-list');
  if (!list) return;
  var q = String(query || '').toLowerCase().trim();
  var filtered = HELP_ARTICLES.filter(function(a) {
    if (!q) return true;
    var haystack = (a.title + ' ' + a.keywords + ' ' + a.html.replace(/<[^>]+>/g, ' ')).toLowerCase();
    return haystack.indexOf(q) !== -1;
  });
  list.innerHTML = '';
  if (filtered.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'help-empty';
    empty.textContent = 'Sin resultados para “' + q + '”.';
    list.appendChild(empty);
    return;
  }
  filtered.forEach(function(a) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'help-article-item';
    btn.setAttribute('data-article-id', a.id);
    btn.setAttribute('role', 'option');
    btn.tabIndex = 0;
    btn.textContent = a.title;
    btn.addEventListener('click', function() { selectHelpArticle(a.id); btn.focus(); });
    if (a.id === helpCurrentArticleId) btn.classList.add('active');
    list.appendChild(btn);
  });
  if (helpCurrentArticleId && !filtered.some(function(a){ return a.id === helpCurrentArticleId; })) {
    selectHelpArticle(filtered[0].id);
  }
}

function selectHelpArticle(id) {
  var article = HELP_ARTICLES.find(function(a){ return a.id === id; });
  if (!article) return;
  helpCurrentArticleId = id;
  var contentEl = document.getElementById('help-article-content');
  if (contentEl) {
    contentEl.innerHTML = '<h4>' + esc(article.title) + '</h4>' + article.html;
  }
  var list = document.getElementById('help-articles-list');
  if (list) {
    Array.prototype.forEach.call(list.querySelectorAll('.help-article-item'), function(btn) {
      if (btn.getAttribute('data-article-id') === id) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }
}


export { openQuickHelp, onHelpSearchInput, onHelpSearchKeydown, onHelpListKeydown };
