import {
  closeSettingsDropdown
} from "/js/chunks/chunk-IIW43MFH.js";

// public/js/features/settings-help/help-content.mjs
var HELP_ARTICLES = [
  {
    id: "modo-guardia",
    title: "Modo Guardia (7.x)",
    keywords: "guardia modo chip tablero turno censo alcance rango solo mis entregas toggle",
    html: "<p><strong>Modo Guardia</strong> es una vista de trabajo centrada en el turno: censo, entrega y monitoreo. Se abre desde el bot\xF3n <strong>Guardia</strong> en la barra superior.</p><ul><li><strong>Chip Guardia</strong> \u2014 entra y sale sin bloquear Laboratorio ni Expediente.</li><li><strong>Alcance</strong> \u2014 R1 ve su equipo; R4 puede ver toda la sala. La barra de contexto resume sala y turno.</li><li><strong>Solo mis entregas</strong> \u2014 filtra la grilla a pacientes que te entregaron en este turno (independiente del flujo Entrega).</li><li>Pulsa de nuevo <strong>Guardia</strong> para volver a la vista Normal.</li></ul>"
  },
  {
    id: "modo-entrega",
    title: "Modo Entrega y pendientes",
    keywords: "entrega handoff roster pendientes v2 fase turno documentar paciente",
    html: "<p><strong>Modo Entrega</strong> documenta el handoff entre turnos antes del monitoreo activo.</p><ul><li><strong>Barra de fase</strong> \u2014 gu\xEDa entrega (~16:00), turno activo y cierre.</li><li><strong>Por paciente</strong> \u2014 modal de entrega con equipo entrante, handoff y pendientes.</li><li><strong>Roster</strong> \u2014 lista qui\xE9n falta por documentar antes de pasar al turno.</li><li><strong>Pendientes v2</strong> \u2014 plantillas por servicio y seguimiento estructurado entre turnos.</li></ul>"
  },
  {
    id: "lan-pin-turno",
    title: "LAN, PIN del turno y m\xF3vil",
    keywords: "lan livesync pin turno directorio mi rotacion ipad mobile token invitacion",
    html: "<p>La red del turno en R+ 7.x combina LiveSync, directorio y acceso m\xF3vil.</p><ul><li><strong>\u21C4 LiveSync</strong> \u2014 estado de red, sala y sincronizaci\xF3n en la Wi\u2011Fi del hospital.</li><li><strong>PIN del turno</strong> (~12 h) \u2014 reconecta otras Mac en otra subred sin reconfigurar la sala.</li><li><strong>Directorio LAN</strong> \u2014 qui\xE9n est\xE1 en la sala; el anfitri\xF3n conserva el roster.</li><li><strong>Mi rotaci\xF3n</strong> \u2014 @usuario, equipos persistentes y sala (distinto del censo lateral).</li><li><strong>iPad/m\xF3vil</strong> \u2014 enlace permanente para Safari desde \u21C4; invitaci\xF3n distinta a otra Mac/sala.</li><li><strong>Censo</strong> \u2014 R1 por equipo; R4 con divisores colapsables; sync LAN m\xE1s silenciosa en 7.x.</li></ul>"
  },
  {
    id: "primer-paciente",
    title: "Tu primer paciente",
    keywords: "agregar paciente nuevo registro edad sexo cuarto cama duplicado",
    html: "<p>Agrega un paciente desde la barra lateral con <strong>+ Agregar</strong> o directamente desde un reporte de laboratorio procesado (<strong>Agregar paciente del lab</strong>).</p><ul><li>Puedes capturar nombre, registro, edad, sexo, \xE1rea / servicio, cuarto y cama.</li><li>R+ avisa si detecta un paciente con el mismo nombre o registro para evitar duplicados.</li><li>El paciente queda guardado solo en esta computadora; no se sube a la nube.</li></ul>"
  },
  {
    id: "lan-vs-respaldo",
    title: "LAN en vivo vs respaldos entre equipos",
    keywords: "lan wifi sala equipo respaldo sync paquete red wifi sincronizar vivo copia snapshot exportar",
    html: '<p>R+ usa dos ideas distintas que no compiten; sirven para cosas diferentes:</p><ul><li><strong>Sala en vivo (LAN / \u21C4):</strong> trabajar en <strong>sesi\xF3n</strong> con colegas en la <strong>misma red local</strong>. Es colaboraci\xF3n en tiempo real sobre la misma sala; no es una copia permanente de tu historial para llevar a otro equipo. Si el anfitri\xF3n cierra R+, otra <strong>Mac o Windows</strong> con R+ de escritorio (unida con invitaci\xF3n) puede ser <strong>anfitri\xF3n suplente</strong> hasta que vuelva el equipo original.</li><li><strong>Respaldos y sync (Ajustes \u2192 Respaldos, sync y recuperaci\xF3n):</strong> exportar/importar <strong>JSON</strong>, auto\u2011respaldos y <strong>paquete sync</strong> para mover o recuperar el contenido cl\xEDnico entre computadoras o despu\xE9s del turno.</li></ul><p style="font-size:13px;color:var(--text-muted);margin:0;">\xBFContinuar el mismo caso en otro equipo f\xEDsico? Usa <strong>exportar/importar</strong> o el paquete sync. \xBFVer en vivo lo que hace el equipo en sala? Usa <strong>LAN</strong>.</p>'
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
    html: "<p>En <strong>Expediente \u2192 Notas</strong> completa fecha, hora, signos vitales, interrogatorio, evoluci\xF3n, estudios, diagn\xF3sticos y tratamiento.</p><ul><li>La <strong>plantilla SOAP</strong> (modal) concentra subjetivo/objetivo breve, GCS, analgesia, antibi\xF3ticos, antiHTA, vasopresores, temperatura, dieta, balance h\xEDdrico y glucometr\xEDas. <strong>Insertar en evoluci\xF3n</strong> pega el p\xE1rrafo en el cuadro de texto.</li><li>Desde <strong>Medicamentos</strong> puedes marcar f\xE1rmacos para SOAP y abrir el modal ya relleno en analgesia / ABX / antiHTA / vasopresores.</li><li><strong>Generar Nota (.docx)</strong> crea el documento con membrete (generador nativo en Node); la carpeta de salida est\xE1 en <strong>Ajustes</strong>.</li><li><strong>Salida r\xE1pida</strong> exporta el paciente activo en docx, html o txt seg\xFAn el formato elegido.</li><li>Los datos se guardan por paciente en este equipo.</li></ul>"
  },
  {
    id: "historia-clinica",
    title: "Historia Cl\xEDnica (Sala)",
    keywords: "historia clinica ingreso app ahf apnp ipas lectura narrativa antecedentes padecimiento sala",
    html: "<p>En modo <strong>Sala</strong>, <strong>Expediente \u2192 Cl\xEDnico \u2192 Historia Cl\xEDnica</strong> captura el ingreso con formato institucional.</p><ul><li><strong>Captura</strong> \u2014 Tres pasos: identificaci\xF3n y motivo; antecedentes (APP con cat\xE1logo, AHF por familiar, APNP, g\xE9nero/reproducci\xF3n); padecimiento, datos negados e IPAS por sistemas.</li><li><strong>Lectura</strong> \u2014 Vista que compila secciones en prosa; <strong>Copiar texto</strong> al portapapeles.</li><li><strong>Labs de ingreso</strong> \u2014 Ancla creatinina, eTFG y estudios recientes desde el historial del paciente.</li><li><strong>Sala en vivo</strong> \u2014 Se sincroniza por paciente cuando el equipo usa \u21C4.</li></ul>"
  },
  {
    id: "eventualidades",
    title: "Eventualidades (Sala)",
    keywords: "eventualidades bitacora intercurrencia dia clinico sala registro",
    html: '<p><strong>Expediente \u2192 Cl\xEDnico \u2192 Eventualidades</strong> guarda hechos cl\xEDnicos del turno con fecha y texto libre (orden cronol\xF3gico).</p><p style="font-size:13px;color:var(--text-muted);margin:0;">Complementa <strong>Estado actual</strong> (monitoreo estructurado) y <strong>Historia Cl\xEDnica</strong> (ingreso). No sustituye la nota de evoluci\xF3n en Interconsulta.</p>'
  },
  {
    id: "estado-actual",
    title: "Estado actual y monitoreo (Sala)",
    keywords: "estado actual monitoreo vitales glu glucometria insulina balance hidrico entradas salidas io tendencias medicamentos confirmacion sala clinico segmento",
    html: '<p>En modo <strong>Sala</strong>, <strong>Expediente \u2192 Cl\xEDnico \u2192 Estado actual</strong> concentra el <strong>monitoreo</strong> del turno antes de pasar todo a la nota.</p><ul><li><strong>Signos vitales</strong> estructurados con resaltado si salen del rango esperado.</li><li><strong>Glucometr\xEDas / insulina</strong>: registro y lectura r\xE1pida en el mismo panel.</li><li><strong>Balance h\xEDdrico (I/O)</strong>: entradas y salidas para el p\xE1rrafo de estado.</li><li><strong>Tendencias</strong>: vista compacta cuando hay historia de laboratorio \xFAtil.</li><li><strong>Medicamentos</strong>: propuesta desde la receta hospitalaria para <strong>confirmar</strong> dosis vigentes antes de cerrar texto.</li></ul><p style="font-size:13px;color:var(--text-muted);margin:0;"><strong>Guardar</strong> conserva el texto por paciente; <strong>Guardar y copiar</strong> adem\xE1s lo lleva al portapapeles. El bot\xF3n verde del encabezado abre tambi\xE9n la plantilla SOAP <em>solo objetivo/plan</em>.</p>'
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
    html: "<p>En la pesta\xF1a <strong>Medicamentos</strong> pegas el listado copiado del sistema hospitalario (columnas separadas por tabulador) y pulsas <strong>Receta</strong>.</p><p>En <strong>SOME</strong>, para reutilizar el mismo bloque, copia normalmente <strong>desde la columna Fecha y hora</strong> hasta el <strong>final de la secci\xF3n</strong> de medicamentos y p\xE9galo en R+.</p><ul><li><strong>Excl.</strong> excluye el f\xE1rmaco del texto de egreso; <strong>SOAP</strong> marca qu\xE9 filas se volcar\xE1n a la plantilla SOAP o al tratamiento.</li><li>La vista previa inferior agrupa por categor\xEDa (analg\xE9sicos, antiHTA, antibi\xF3ticos, vasopresores, otros).</li><li><strong>A\xF1adir a Tratamiento</strong> inserta l\xEDneas en la nota; <strong>Abrir plantilla SOAP</strong> rellena los campos del modal seg\xFAn esa clasificaci\xF3n.</li><li><strong>Copiar</strong> en la tarjeta inferior genera texto tipo nota de egreso.</li></ul>"
  },
  {
    id: "respaldo",
    title: "Respaldo y portabilidad",
    keywords: "respaldo backup copia seguridad exportar importar paciente rango sync pasarela equipos auditoria",
    html: "<p><strong>\xBFLAN o respaldo?</strong> Lee primero <strong>LAN en vivo vs respaldos entre equipos</strong> en este centro de ayuda.</p><p>R+ ofrece varias v\xEDas para mover o resguardar datos desde <strong>Ajustes</strong>:</p><ul><li><strong>Copia de seguridad</strong>: JSON completo de pacientes, notas, indicaciones y labs.</li><li><strong>Exportar paciente actual</strong> o por <strong>rango de fechas</strong> para mover casos espec\xEDficos.</li><li><strong>Copia autom\xE1tica</strong> guarda hasta 14 snapshots locales rotativos.</li><li><strong>Paquete sync</strong> cifrado con passphrase para combinar datos entre equipos sin pisar los del otro lado.</li><li><strong>Registro de auditor\xEDa</strong>: descarga un JSON con exportaciones e importaciones relevantes.</li></ul>"
  },
  {
    id: "actualizacion",
    title: "Actualizar R+",
    keywords: "actualizacion actualizar update instalar reiniciar rollback version downgrade restaurar estable reparacion 6.5.5 native binding",
    html: "<p>R+ busca nuevas versiones al iniciar. Cuando hay una disponible, la app muestra un modal con el progreso de descarga.</p><ul><li>Puedes buscar manualmente desde <strong>Ajustes \u2192 Buscar actualizaciones\u2026</strong> o el men\xFA nativo (Mac: R+; Windows: Aplicaci\xF3n).</li><li><strong>Reinstalar actualizaci\xF3n de reparaci\xF3n (6.5.5)</strong>: si quedaste en <strong>6.5.4</strong> con errores nativos, usa este bot\xF3n (canal Estable). Instala el parche lateral sin borrar datos.</li><li><strong>Restaurar versi\xF3n estable</strong>: en Ajustes \u2192 Aplicaci\xF3n, elige una versi\xF3n anterior curada y confirma. R+ intenta instalarla como una actualizaci\xF3n; si falla (p. ej. firma en Mac), abre el instalador correcto en GitHub. Tus datos locales no se borran.</li><li>Si la versi\xF3n elegida est\xE1 por debajo del m\xEDnimo soportado, R+ bloquea la restauraci\xF3n autom\xE1tica.</li><li>Al detectar una versi\xF3n nueva instalada, R+ muestra una ventana de <strong>Novedades</strong> con los cambios relevantes.</li></ul>"
  },
  {
    id: "atajos",
    title: "Atajos de teclado",
    keywords: "atajos shortcuts teclado ctrl cmd escape tab",
    html: "<p>Ahorra tiempo con estos atajos:</p><ul><li><strong>Ctrl/\u2318 + 1</strong> \u2014 Laboratorio \xB7 <strong>2</strong> \u2014 Expediente \xB7 <strong>3</strong> \u2014 Medicamentos \xB7 <strong>4</strong> \u2014 Agenda (<strong>Pase</strong>: abre la secci\xF3n en vista Normal)</li><li><strong>Ctrl/\u2318 + ,</strong> \u2014 Ajustes</li><li><strong>Ctrl/\u2318 + N</strong> \u2014 Nuevo paciente</li><li><strong>Ctrl/\u2318 + S</strong> \u2014 Guardar estado del paciente activo</li><li><strong>Ctrl/\u2318 + K</strong> \u2014 Ir a secci\xF3n o paciente</li><li><strong>Ctrl/\u2318 + P</strong> \u2014 Alternar vista Normal \u2194 Pase</li><li><strong>Ctrl/\u2318 + Shift + P</strong> \u2014 Abrir/cerrar Mi Perfil</li><li><strong>Ctrl/\u2318 + Shift + ,</strong> \u2014 Activa/desactiva <strong>sobrescribir</strong> en conflictos al importar JSON (sin preguntar)</li><li><strong>Esc</strong> o clic fuera \u2014 Cerrar ventana modal, men\xFAs o el centro de ayuda</li><li>Dentro del centro de ayuda: <strong>\u2193</strong> desde el buscador enfoca la lista; <strong>\u2191 / \u2193</strong> navegan art\xEDculos.</li></ul>"
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
  syncLearnHubContinueVisibility();
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
//# sourceMappingURL=/js/chunks/chunk-A36HPF57.js.map
