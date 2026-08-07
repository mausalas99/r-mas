import {
  settingsHelpBridge
} from "/mobile/js/chunks/chunk-6IT4VYWH.js";
import {
  closeSettingsDropdown
} from "/mobile/js/chunks/chunk-THLT5GTC.js";
import {
  esc
} from "/mobile/js/chunks/chunk-NIMNG7BY.js";

// public/js/features/settings-help/help-content.mjs
var HELP_ARTICLES = [
  {
    id: "modo-guardia",
    title: "Modo Guardia",
    keywords: "guardia modo chip tablero turno censo alcance rango solo entregados toggle nube",
    html: "<p><strong>Modo Guardia</strong> es una vista de trabajo centrada en el turno: censo, entrega y monitoreo. Se abre desde el bot\xF3n <strong>Guardia</strong> en la barra superior.</p><ul><li><strong>Chip Guardia</strong> \u2014 entra y sale sin bloquear Laboratorio ni Expediente.</li><li><strong>Franja Nube \xB7 sala \xB7 equipo</strong> \u2014 confirma conexi\xF3n Nube, sala del turno y equipo activo antes de confiar en el censo compartido.</li><li><strong>Alcance</strong> \u2014 R1 ve su equipo; R4 ve el censo de la sala (Filtros censo por sala; grilla subdividida por equipo). La barra de contexto resume sala y turno.</li><li><strong>Censo: todos / solo entregados</strong> \u2014 filtra la grilla (independiente del flujo Entrega).</li><li>Pulsa de nuevo <strong>Guardia</strong> para volver a la vista Normal.</li></ul>"
  },
  {
    id: "modo-entrega",
    title: "Modo Entrega y pendientes",
    keywords: "entrega handoff roster pendientes v2 fase turno documentar paciente",
    html: "<p><strong>Modo Entrega</strong> documenta el handoff entre turnos antes del monitoreo activo.</p><ul><li><strong>Barra de fase</strong> \u2014 gu\xEDa entrega (~16:00), turno activo y cierre.</li><li><strong>Por paciente</strong> \u2014 modal de entrega con equipo entrante, handoff y pendientes.</li><li><strong>Roster</strong> \u2014 lista qui\xE9n falta por documentar antes de pasar al turno.</li><li><strong>Pendientes v2</strong> \u2014 plantillas por servicio y seguimiento estructurado entre turnos.</li><li><strong>Finalizar turno</strong> \u2014 agrupa pendientes abiertos por equipo de origen para enviar handoff diurno; cerrar sin enviar no borra pendientes.</li></ul>"
  },
  {
    id: "lan-pin-turno",
    title: "R+ Cloud, equipos y m\xF3vil",
    keywords: "nube cloud conexion livesync sala directorio mi rotacion ipad mobile qr invitacion r+ cloud",
    html: "<p>El turno se sincroniza con <strong>R+ Cloud</strong> (Nube). No hace falta un Mac anfitri\xF3n en la Wi\u2011Fi del hospital.</p><ul><li><strong>\u21C4 Conexi\xF3n</strong> \u2014 cuenta Nube, sala del equipo y estado de sincronizaci\xF3n.</li><li><strong>Mi rotaci\xF3n</strong> \u2014 @usuario, equipos e integrantes (se publican por clinicalOps a la sala).</li><li><strong>Directorio de usuarios</strong> \u2014 qui\xE9n est\xE1 en la sala; el admin asigna a equipos.</li><li><strong>iPad / R+ M\xF3vil</strong> \u2014 enlace o QR desde \u21C4; inicia sesi\xF3n con la misma cuenta Nube.</li><li><strong>Censo</strong> \u2014 R1 por equipo; R4 con divisores por equipo en la grilla; sync discreta en segundo plano.</li></ul>"
  },
  {
    id: "rotacion-equipos",
    title: "Rotaci\xF3n mensual y herencia de pacientes",
    keywords: "rotacion nueva rotacion rejoin heredar pacientes equipo mes sala ciclo mi rotacion unirse archivar",
    html: '<p>Cada mes los equipos de guardia rotan. R+ te gu\xEDa para no perder el hilo del censo compartido.</p><ul><li><strong>Nueva rotaci\xF3n</strong> \u2014 si ya estuviste en un equipo, R+ puede pedirte confirmar sala y abrir <strong>Mi rotaci\xF3n</strong> para unirte al equipo del mes.</li><li><strong>Heredar pacientes</strong> \u2014 al unirte a un equipo nuevo, el asistente te deja traer pacientes de tu equipo anterior (misma sala/ciclo sugerido) sin reasignar uno por uno.</li><li><strong>R4 / admin</strong> \u2014 publica equipos nuevos en Mi rotaci\xF3n para que el resto se una.</li></ul><p style="font-size:13px;color:var(--text-muted);margin:0;">\xBFCenso vac\xEDo tras rotar? Confirma Nube en \u21C4, revisa la franja sala/equipo en Guardia y abre Mi rotaci\xF3n.</p>'
  },
  {
    id: "primer-paciente",
    title: "Tu primer paciente",
    keywords: "agregar paciente nuevo registro edad sexo cuarto cama duplicado",
    html: "<p>Agrega un paciente desde la barra lateral con <strong>+ Agregar</strong> o directamente desde un reporte de laboratorio procesado (<strong>Agregar paciente del lab</strong>).</p><ul><li>Puedes capturar nombre, registro, edad, sexo, \xE1rea / servicio, cuarto y cama.</li><li>R+ avisa si detecta un paciente con el mismo nombre o registro para evitar duplicados.</li><li>El paciente queda guardado solo en esta computadora; no se sube a la nube.</li></ul>"
  },
  {
    id: "lan-vs-respaldo",
    title: "R+ Cloud vs respaldos entre equipos",
    keywords: "nube cloud conexion sala equipo respaldo sync paquete sincronizar vivo copia snapshot exportar",
    html: '<p>R+ usa dos ideas distintas que no compiten; sirven para cosas diferentes:</p><ul><li><strong>R+ Cloud (\u21C4 Conexi\xF3n):</strong> trabajar en <strong>sesi\xF3n</strong> con el equipo en la <strong>misma sala Nube</strong>. Colaboraci\xF3n en tiempo real; no sustituye un respaldo local de tu historial.</li><li><strong>Respaldos (Ajustes \u2192 Respaldos, sync y recuperaci\xF3n):</strong> exportar/importar <strong>JSON</strong>, auto\u2011respaldos y <strong>paquete sync</strong> para mover o recuperar el contenido cl\xEDnico entre computadoras o despu\xE9s del turno.</li></ul><p style="font-size:13px;color:var(--text-muted);margin:0;">\xBFContinuar el mismo caso en otro equipo f\xEDsico sin Nube? Usa <strong>exportar/importar</strong>. \xBFVer en vivo lo que hace el equipo en sala? Usa <strong>R+ Cloud</strong> en \u21C4.</p>'
  },
  {
    id: "laboratorio",
    title: "Laboratorio: procesar",
    keywords: "lab laboratorio procesar reporte diagrama gamble bh quimica copiar",
    html: "<p>Pega el reporte del laboratorio en el cuadro de texto de la pesta\xF1a <strong>Laboratorio</strong> y pulsa <strong>Procesar</strong>. R+ reconoce biometr\xEDa, qu\xEDmica, electrolitos, gasometr\xEDa, pruebas hep\xE1ticas y m\xE1s.</p><ul><li>Cada diagrama tiene un bot\xF3n <strong>Copiar</strong> para pegarlo como texto en otro sistema.</li><li>Los valores fuera de rango se resaltan en rojo.</li><li>En <strong>Historial de labs</strong> ves cada env\xEDo guardado; puedes <strong>Ver en Laboratorio</strong> para recuperar diagramas o <strong>Eliminar</strong> un conjunto si fue un error.</li></ul>"
  },
  {
    id: "nota-evolucion",
    title: "Nota de evoluci\xF3n",
    keywords: "nota evolucion docx generar expediente soap vitales diagnosticos plantilla",
    html: "<p>En <strong>Expediente \u2192 Notas</strong> completa fecha, hora, signos vitales, interrogatorio, evoluci\xF3n, estudios, diagn\xF3sticos y tratamiento.</p><ul><li>En modo <strong>Sala</strong>, el p\xE1rrafo estructurado (N/V/HD/HI/NM) se arma en <strong>Estado actual</strong> y se copia a la nota.</li><li>En <strong>Interconsulta</strong>, desde <strong>Medicamentos</strong> puedes volcar dosis a la plantilla SOAP o al tratamiento.</li><li><strong>Generar Nota (.docx)</strong> crea el documento con membrete (generador nativo en Node); la carpeta de salida est\xE1 en <strong>Ajustes</strong>.</li><li><strong>Salida r\xE1pida</strong> exporta el paciente activo en docx, html o txt seg\xFAn el formato elegido.</li><li>Los datos se guardan por paciente en este equipo.</li></ul>"
  },
  {
    id: "historia-clinica",
    title: "Historia Cl\xEDnica (Sala)",
    keywords: "historia clinica ingreso app ahf apnp ipas lectura narrativa antecedentes padecimiento sala",
    html: "<p>En modo <strong>Sala</strong>, la <strong>Historia Cl\xEDnica</strong> de ingreso (formato institucional) ya no aparece en la barra diaria de Cl\xEDnico. Se abre desde <strong>Importar desde Drive</strong> o el checklist de entrega.</p><ul><li><strong>Captura</strong> \u2014 Tres pasos: identificaci\xF3n y motivo; antecedentes (APP con cat\xE1logo, AHF por familiar, APNP, g\xE9nero/reproducci\xF3n); padecimiento, datos negados e IPAS por sistemas.</li><li><strong>Lectura</strong> \u2014 Vista que compila secciones en prosa; <strong>Copiar texto</strong> al portapapeles.</li><li><strong>Labs de ingreso</strong> \u2014 Ancla creatinina, eTFG y estudios recientes desde el historial del paciente.</li><li><strong>R+ Cloud</strong> \u2014 Se sincroniza por paciente cuando el equipo est\xE1 conectado en \u21C4.</li></ul>"
  },
  {
    id: "eventualidades",
    title: "Eventualidades (Sala)",
    keywords: "eventualidades bitacora intercurrencia dia clinico sala registro",
    html: '<p><strong>Expediente \u2192 Cl\xEDnico \u2192 Eventualidades</strong> guarda hechos cl\xEDnicos del turno con fecha y texto libre (orden cronol\xF3gico).</p><p style="font-size:13px;color:var(--text-muted);margin:0;">Complementa <strong>Estado actual</strong> (monitoreo estructurado). La <strong>Historia Cl\xEDnica</strong> de ingreso se abre desde Drive o entrega, no desde esta barra. No sustituye la nota de evoluci\xF3n en Interconsulta.</p>'
  },
  {
    id: "estado-actual",
    title: "Estado actual y monitoreo (Sala)",
    keywords: "estado actual monitoreo vitales glu glucometria insulina balance hidrico entradas salidas io tendencias medicamentos confirmacion sala clinico segmento",
    html: '<p>En modo <strong>Sala</strong>, <strong>Expediente \u2192 Cl\xEDnico \u2192 Estado actual</strong> concentra el <strong>monitoreo</strong> del turno antes de pasar todo a la nota.</p><ul><li><strong>Signos vitales</strong> estructurados con resaltado si salen del rango esperado.</li><li><strong>Glucometr\xEDas / insulina</strong>: registro y lectura r\xE1pida en el mismo panel.</li><li><strong>Balance h\xEDdrico (I/O)</strong>: entradas y salidas para el p\xE1rrafo de estado.</li><li><strong>Tendencias</strong>: vista compacta cuando hay historia de laboratorio \xFAtil.</li><li><strong>Medicamentos</strong>: propuesta desde la receta hospitalaria para <strong>confirmar</strong> dosis vigentes antes de cerrar texto.</li></ul><p style="font-size:13px;color:var(--text-muted);margin:0;">En <strong>Sala</strong>, copia el texto compilado desde el historial o el bot\xF3n flotante de copiar hacia la nota. En <strong>Interconsulta</strong>, <strong>Enviar a nota</strong> vuelca el texto a la evoluci\xF3n y abre la pesta\xF1a Notas (pide confirmar si ya hay texto).</p>'
  },
  {
    id: "indicaciones",
    title: "Indicaciones m\xE9dicas",
    keywords: "indicaciones dieta cuidados medicamentos estudios interconsultas otros docx",
    html: "<p>En <strong>Expediente \u2192 Indicaciones</strong> arma la hoja por secciones (dieta, cuidados, medicamentos, estudios, interconsultas y otros).</p><ul><li>Define <strong>plantillas por defecto</strong> en Mi Perfil para prellenar dieta, cuidados y medicamentos.</li><li><strong>Generar Indicaciones (.docx)</strong> produce la hoja final con el membrete del hospital.</li><li>La <strong>Salida r\xE1pida</strong> (Ajustes) exporta el paciente activo en docx, html o txt de un solo clic.</li></ul>"
  },
  {
    id: "medicamentos-receta",
    title: "Medicamentos (receta hospitalaria)",
    keywords: "medicamentos receta tsv hospital soap tratamiento analgesia abx antihta vasopresores copiar",
    html: "<p>En la pesta\xF1a <strong>Medicamentos</strong> pegas el listado copiado del sistema hospitalario (columnas separadas por tabulador) y pulsas <strong>Receta</strong>.</p><p>En <strong>SOME</strong>, para reutilizar el mismo bloque, copia normalmente <strong>desde la columna Fecha y hora</strong> hasta el <strong>final de la secci\xF3n</strong> de medicamentos y p\xE9galo en R+.</p><ul><li><strong>Excl.</strong> excluye el f\xE1rmaco del texto de egreso; <strong>SOAP</strong> marca qu\xE9 filas se volcar\xE1n a la plantilla SOAP o al tratamiento.</li><li>La vista previa inferior agrupa por categor\xEDa (analg\xE9sicos, antiHTA, antibi\xF3ticos, vasopresores, otros).</li><li><strong>A\xF1adir a Tratamiento</strong> inserta l\xEDneas en la nota; <strong>Abrir plantilla SOAP</strong> rellena los campos del modal seg\xFAn esa clasificaci\xF3n.</li><li><strong>Copiar</strong> en la tarjeta inferior genera texto tipo nota de egreso.</li><li>Atajos: <strong>Ctrl/\u2318 + 3</strong> cicla Manejo actual \u2194 Perfil hist\xF3rico; <strong>Ctrl/\u2318 + Shift + 3</strong> alterna Completa / Nombre+D\xEDa; <strong>Ctrl/\u2318 + M</strong> es alias de Medicamentos.</li></ul>"
  },
  {
    id: "respaldo",
    title: "Respaldo y portabilidad",
    keywords: "respaldo backup copia seguridad exportar importar paciente rango sync pasarela equipos auditoria",
    html: "<p><strong>\xBFNube o respaldo?</strong> Lee primero <strong>R+ Cloud vs respaldos entre equipos</strong> en este centro de ayuda.</p><p>R+ ofrece varias v\xEDas para mover o resguardar datos desde <strong>Ajustes</strong>:</p><ul><li><strong>Copia de seguridad</strong>: JSON completo de pacientes, notas, indicaciones y labs.</li><li><strong>Exportar paciente actual</strong>, <strong>varios pacientes</strong> (selecci\xF3n del censo) o por <strong>rango de fechas</strong> para mover casos espec\xEDficos.</li><li><strong>Copia autom\xE1tica</strong> guarda hasta 14 snapshots locales rotativos.</li><li><strong>Paquete sync</strong> cifrado con passphrase para combinar datos entre equipos sin pisar los del otro lado.</li><li><strong>Registro de auditor\xEDa</strong>: descarga un JSON con exportaciones e importaciones relevantes.</li></ul>"
  },
  {
    id: "actualizacion",
    title: "Actualizar R+",
    keywords: "actualizacion actualizar update instalar reiniciar rollback version downgrade restaurar estable reparacion native binding",
    html: "<p>R+ busca nuevas versiones al iniciar. Cuando hay una disponible, la app muestra un modal con el progreso de descarga.</p><ul><li>Puedes buscar manualmente desde <strong>Ajustes \u2192 Buscar actualizaciones\u2026</strong> o el men\xFA nativo (Mac: R+; Windows: Aplicaci\xF3n).</li><li><strong>Restaurar versi\xF3n estable</strong>: en Ajustes \u2192 Aplicaci\xF3n, elige una versi\xF3n anterior curada y confirma. R+ intenta instalarla como una actualizaci\xF3n; si falla (p. ej. firma en Mac), abre el instalador correcto en GitHub. Tus datos locales no se borran.</li><li>Si la versi\xF3n elegida est\xE1 por debajo del m\xEDnimo soportado, R+ bloquea la restauraci\xF3n autom\xE1tica.</li><li>Al detectar una versi\xF3n nueva instalada, R+ muestra una ventana de <strong>Novedades</strong> con los cambios relevantes.</li></ul>"
  },
  {
    id: "atajos",
    title: "Atajos de teclado",
    keywords: "atajos shortcuts teclado ctrl cmd escape tab",
    html: '<p>Ahorra tiempo con estos atajos:</p><ul><li><strong>Ctrl/\u2318 + 1</strong> \u2014 Laboratorio \xB7 <strong>2</strong> \u2014 Expediente \xB7 <strong>3</strong> \u2014 Medicamentos \xB7 <strong>4</strong> \u2014 Agenda (<strong>Pase</strong>: abre la secci\xF3n en vista Normal). <strong>Repite el mismo n\xFAmero</strong> para ciclar subvistas: <strong>2</strong> Paciente\u2192Cl\xEDnico\u2192Resultados\u2192Salida \xB7 <strong>3</strong> Manejo\u2194Perfil \xB7 <strong>4</strong> semana actual</li><li><strong>Ctrl/\u2318 + Shift + 3</strong> \u2014 Completa \u2194 Nombre+D\xEDa (texto de egreso en Manejo actual)</li><li><strong>Ctrl/\u2318 + [</strong> / <strong>]</strong> \u2014 Semana anterior / siguiente en Agenda</li><li><strong>Ctrl/\u2318 + ,</strong> \u2014 Ajustes</li><li><strong>Ctrl/\u2318 + N</strong> \u2014 Nuevo paciente</li><li><strong>Ctrl/\u2318 + G</strong> \u2014 Modo Guardia \xB7 <strong>I</strong> \u2014 Interconsulta \xB7 <strong>P</strong> \u2014 Pase (repite para volver a Sala/Interconsulta) \xB7 <strong>S</strong> \u2014 Sala</li><li><strong>Ctrl/\u2318 + E</strong> \u2014 Estado actual (en EA \u2192 Eventualidades en Sala) \xB7 <strong>T</strong> \u2014 Tendencias (en tendencias \u2192 Cultivos) \xB7 <strong>D</strong> \u2014 Datos del paciente \xB7 <strong>M</strong> \u2014 Medicamentos (cicla subvistas) \xB7 <strong>A</strong> \u2014 Agenda (semana actual)</li><li><strong>Ctrl/\u2318 + Shift + S</strong> \u2014 Guardar estado del paciente activo</li><li><strong>Ctrl/\u2318 + K</strong> \u2014 Ir a secci\xF3n o paciente</li><li><strong>Ctrl/\u2318 + Shift + P</strong> \u2014 Abrir/cerrar Mi Perfil</li><li><strong>Ctrl/\u2318 + Shift + ,</strong> \u2014 Activa/desactiva <strong>sobrescribir</strong> en conflictos al importar JSON (sin preguntar)</li><li><strong>Esc</strong> o clic fuera \u2014 Cerrar ventana modal, men\xFAs o el centro de ayuda</li><li>Dentro del centro de ayuda: <strong>\u2193</strong> desde el buscador enfoca la lista; <strong>\u2191 / \u2193</strong> navegan art\xEDculos.</li></ul><p style="font-size:13px;color:var(--text-muted);margin:12px 0 0;">Si cambias mucho de pesta\xF1a con el mouse, R+ puede sugerirte estos atajos tras varios clics (sin l\xEDmite de tiempo); dejan de aparecer cuando empiezas a usarlos.</p>'
  },
  {
    id: "privacidad",
    title: "Privacidad de datos",
    keywords: "privacidad datos locales electron userdata carpeta no subir nube sensibles",
    html: "<p>R+ guarda toda la informaci\xF3n en el <strong>almacenamiento local</strong> de Electron en esta computadora. No env\xEDa pacientes ni notas a ning\xFAn servidor externo.</p><ul><li>En Ajustes, <strong>Abrir carpeta\u2026</strong> muestra la ruta exacta del perfil de la app.</li><li>No compartas esa carpeta ni los archivos JSON exportados si contienen informaci\xF3n sensible sin cifrado.</li><li>Los paquetes <strong>sync</strong> y las exportaciones pueden cifrarse con una passphrase para intercambio seguro entre equipos.</li></ul>"
  }
];
var helpCurrentArticleId = null;
function openQuickHelp(preselectId) {
  var el = document.getElementById("help-quick-backdrop");
  if (!el) return;
  el.classList.add("open");
  el.setAttribute("aria-hidden", "false");
  closeSettingsDropdown();
  var input = document.getElementById("help-search-input");
  if (input) input.value = "";
  renderHelpArticles("");
  var pickId = preselectId && HELP_ARTICLES.some(function(a) {
    return a.id === preselectId;
  }) ? preselectId : null;
  if (pickId) selectHelpArticle(pickId);
  else if (!helpCurrentArticleId || !HELP_ARTICLES.some(function(a) {
    return a.id === helpCurrentArticleId;
  })) {
    selectHelpArticle(HELP_ARTICLES[0].id);
  } else {
    selectHelpArticle(helpCurrentArticleId);
  }
  settingsHelpBridge.syncLearnHubContinueVisibility();
  setTimeout(function() {
    if (input) input.focus();
  }, 40);
}
function closeQuickHelp() {
  var el = document.getElementById("help-quick-backdrop");
  if (!el) return;
  el.classList.remove("open");
  el.setAttribute("aria-hidden", "true");
}
function onHelpSearchInput(value) {
  renderHelpArticles(value);
}
function onHelpSearchKeydown(e) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    var list = document.getElementById("help-articles-list");
    var first = list && list.querySelector(".help-article-item");
    if (first) first.focus();
  } else if (e.key === "Enter") {
    var list2 = document.getElementById("help-articles-list");
    var first2 = list2 && list2.querySelector(".help-article-item");
    if (first2) {
      e.preventDefault();
      selectHelpArticle(first2.getAttribute("data-article-id"));
      first2.focus();
    }
  }
}
function onHelpListKeydown(e) {
  var target = e.target;
  if (!target || !target.classList || !target.classList.contains("help-article-item")) return;
  var items = Array.prototype.slice.call(document.querySelectorAll("#help-articles-list .help-article-item"));
  var idx = items.indexOf(target);
  if (e.key === "ArrowDown") {
    e.preventDefault();
    var next = items[Math.min(items.length - 1, idx + 1)];
    if (next) {
      next.focus();
      selectHelpArticle(next.getAttribute("data-article-id"));
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (idx <= 0) {
      var input = document.getElementById("help-search-input");
      if (input) input.focus();
    } else {
      items[idx - 1].focus();
      selectHelpArticle(items[idx - 1].getAttribute("data-article-id"));
    }
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    selectHelpArticle(target.getAttribute("data-article-id"));
  } else if (e.key === "Home") {
    e.preventDefault();
    if (items[0]) {
      items[0].focus();
      selectHelpArticle(items[0].getAttribute("data-article-id"));
    }
  } else if (e.key === "End") {
    e.preventDefault();
    var last = items[items.length - 1];
    if (last) {
      last.focus();
      selectHelpArticle(last.getAttribute("data-article-id"));
    }
  }
}
function renderHelpArticles(query) {
  var list = document.getElementById("help-articles-list");
  if (!list) return;
  var q = String(query || "").toLowerCase().trim();
  var filtered = HELP_ARTICLES.filter(function(a) {
    if (!q) return true;
    var haystack = (a.title + " " + a.keywords + " " + a.html.replace(/<[^>]+>/g, " ")).toLowerCase();
    return haystack.indexOf(q) !== -1;
  });
  list.innerHTML = "";
  if (filtered.length === 0) {
    var empty = document.createElement("div");
    empty.className = "help-empty";
    empty.textContent = "Sin resultados para \u201C" + q + "\u201D.";
    list.appendChild(empty);
    return;
  }
  filtered.forEach(function(a) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "help-article-item";
    btn.setAttribute("data-article-id", a.id);
    btn.setAttribute("role", "option");
    btn.tabIndex = 0;
    btn.textContent = a.title;
    btn.addEventListener("click", function() {
      selectHelpArticle(a.id);
      btn.focus();
    });
    if (a.id === helpCurrentArticleId) btn.classList.add("active");
    list.appendChild(btn);
  });
  if (helpCurrentArticleId && !filtered.some(function(a) {
    return a.id === helpCurrentArticleId;
  })) {
    selectHelpArticle(filtered[0].id);
  }
}
function selectHelpArticle(id) {
  var article = HELP_ARTICLES.find(function(a) {
    return a.id === id;
  });
  if (!article) return;
  helpCurrentArticleId = id;
  var contentEl = document.getElementById("help-article-content");
  if (contentEl) {
    contentEl.innerHTML = "<h4>" + esc(article.title) + "</h4>" + article.html;
  }
  var list = document.getElementById("help-articles-list");
  if (list) {
    Array.prototype.forEach.call(list.querySelectorAll(".help-article-item"), function(btn) {
      if (btn.getAttribute("data-article-id") === id) btn.classList.add("active");
      else btn.classList.remove("active");
    });
  }
}

export {
  openQuickHelp,
  closeQuickHelp,
  onHelpSearchInput,
  onHelpSearchKeydown,
  onHelpListKeydown
};
//# sourceMappingURL=/js/chunks/chunk-5D2W66Q2.js.map
