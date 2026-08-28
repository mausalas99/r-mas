// data/release-notes-highlights.mjs
var RELEASE_NOTES_663 = [
  {
    title: "Arranque m\xE1s r\xE1pido",
    body: "El primer paint carga menos c\xF3digo: <strong>Ajustes</strong>, plataforma y varios m\xF3dulos cl\xEDnicos entran con <strong>import()</strong> y <strong>chunks</strong> de esbuild."
  },
  {
    title: "Chart.js fiable",
    body: "Tendencias y gr\xE1ficas del expediente vuelven a abrir con <strong>Chart UMD</strong> en el HTML, sin depender de rutas ESM que fallaban al arrancar."
  },
  {
    title: "Windows \u2014 Configura tu rotaci\xF3n",
    body: "Corrige el cartel atascado en \xABDesbloquea la base\u2026\xBB cuando la base ya estaba abierta: reintento de sesi\xF3n cl\xEDnica tras el unlock, mensajes seg\xFAn SQLCipher/argon2 y arranque m\xE1s robusto."
  },
  {
    title: "Sobre 6.6.2 (LAN ward-ready)",
    body: "Incluye la l\xEDnea <strong>6.6.2</strong>: clinical-ops separado del bundle, cola offline con avisos, host con HC desde censo y menos 409 al sincronizar equipos."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>6.6.3 en todas</strong> las Macs y PCs del turno el mismo d\xEDa. En Windows, permite R+ en el firewall (puerto <strong>3738</strong>) la primera vez en sala \u21C4."
  }
];
var RELEASE_NOTES_668 = [
  {
    title: "LiveSync en el header",
    body: "El bot\xF3n <strong>\u21C4</strong> es ahora un icono <strong>Wi\u2011Fi</strong> del mismo tama\xF1o que Perfil y Ajustes. Un toque abre el panel de conexi\xF3n LAN."
  },
  {
    title: "Estado a simple vista",
    body: "<strong>Verde</strong> = sync en vivo; <strong>\xE1mbar</strong> = conectando o sincronizando; <strong>naranja</strong> = reconectando; <strong>acento</strong> = en sala sin sync en vivo; <strong>gris</strong> = sin sala."
  },
  {
    title: "Directorio LAN",
    body: "Los residentes aparecen al registrar <strong>@usuario</strong> y <strong>Unirse</strong> en tu sala \u21C4; t\xFA los asignas al equipo desde el directorio (no necesitan equipo antes)."
  },
  {
    title: "Sin texto en el bot\xF3n",
    body: "El detalle (sala, fase) est\xE1 en el <strong>tooltip</strong> y en <strong>aria-label</strong> para lectores de pantalla."
  },
  {
    title: "Sobre 6.6.7",
    body: "Incluye <strong>iPad/m\xF3vil</strong>, <strong>onboarding local</strong> y <strong>censo</strong> alineado de la versi\xF3n anterior."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>6.6.8 en todas</strong> las Macs, PCs e iPads el mismo d\xEDa. En Windows, permite R+ en el firewall (puerto <strong>3738</strong>) la primera vez en sala LiveSync."
  }
];
var RELEASE_NOTES_667 = [
  {
    title: "iPad y enlace m\xF3vil",
    body: "En \u21C4: <strong>Copiar enlace m\xF3vil</strong> (<code>/mobile/?token=\u2026</code>, permanente para Safari) vs <strong>Copiar enlace de sala</strong> para otra Mac. El anfitri\xF3n debe <strong>Unirse</strong> antes de compartir."
  },
  {
    title: "Onboarding sin \u21C4",
    body: "Al abrir R+ eliges <strong>sala LAN</strong> o <strong>solo mi equipo</strong> y desbloqueas la base local. Reintentos claros en Windows si la sesi\xF3n cl\xEDnica falla."
  },
  {
    title: "\u21C4 m\xE1s fluido",
    body: "<strong>Mi rotaci\xF3n</strong> ya no congela el barrido LAN; ping m\xE1s r\xE1pido y menos saturaci\xF3n al descubrir anfitriones. El iPad puede unirse solo y avisar si el censo del host tarda."
  },
  {
    title: "Censo PDF/HTML",
    body: "Mismas columnas en exportaci\xF3n y vista previa: <strong>Signos</strong>, <strong>I / E / B</strong> y labs con paneles en l\xEDneas separadas."
  },
  {
    title: "Sobre 6.6.6",
    body: "Incluye <strong>perfil @usuario</strong>, escalada de anfitri\xF3n sin R4 y <strong>un anfitri\xF3n por turno</strong>."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>6.6.7 en todas</strong> las Macs, PCs e iPads el mismo d\xEDa. En Windows, permite R+ en el firewall (puerto <strong>3738</strong>) la primera vez en sala \u21C4."
  }
];
var RELEASE_NOTES_666 = [
  {
    title: "Perfil @usuario (6.6.6)",
    body: "Tras actualizar, cada Mac/PC debe volver a confirmar <strong>@usuario LAN</strong> (identificador \xFAnico) y <strong>nombre en guardia</strong> por separado. No copies el nombre visible en el campo de usuario."
  },
  {
    title: "Anfitri\xF3n sin R4",
    body: "Solo <strong>R4/admin</strong> mientras est\xE9n en la red. Si nadie responde: cada <strong>10 min</strong> puede anfitrionar R3, luego R2, luego R1. Al detectar R4, el temporizador se reinicia."
  },
  {
    title: "Rango antes de \u21C4",
    body: "Sin rango cl\xEDnico configurado (y puerta cumplida), esta Mac no entra en elecci\xF3n LAN ni abre servidor \xABfantasma\xBB."
  },
  {
    title: "Sobre 6.6.5",
    body: "Incluye <strong>un anfitri\xF3n por turno</strong>, consolidaci\xF3n sin p\xE9rdida, plug and play y enlaces de invitaci\xF3n en \u21C4."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>6.6.6 en todas</strong> las Macs y PCs el mismo d\xEDa. En Windows, permite R+ en el firewall (puerto <strong>3738</strong>) la primera vez en sala \u21C4."
  }
];
var RELEASE_NOTES_665 = [
  {
    title: "Un anfitri\xF3n por turno",
    body: "En la misma Wi\u2011Fi, R+ elige un solo servidor por <strong>rango</strong> (R4/admin) y antig\xFCedad. Si dos Macs eran anfitri\xF3n, la de menor rango puede <strong>combinar</strong> datos y clientes con el ganador."
  },
  {
    title: "Plug and play + enlace",
    body: "<strong>R1\u2013R3</strong> suelen unirse solos al R4 sin pegar nada. En \u21C4: <strong>Copiar enlace de invitaci\xF3n</strong> para iPad u otra PC, o <strong>Unirme con enlace</strong> en escritorio si el barrido no alcanz\xF3."
  },
  {
    title: "Sin p\xE9rdida al ceder",
    body: "Al combinar servidores, primero sube el bundle al anfitri\xF3n ganador; solo despu\xE9s redirige al equipo. Si falla la subida, sigues como servidor en esta Mac."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>6.6.5 en todas</strong> las Macs y PCs el mismo d\xEDa. En Windows, permite R+ en el firewall (puerto <strong>3738</strong>) la primera vez en sala \u21C4."
  }
];
var RELEASE_NOTES_728 = [
  {
    title: "Interno por frecuencia de signos",
    body: "La lista MIP ordena pacientes con SV programados de <strong>m\xE1s frecuente a menos</strong> (q1h \u2192 q2h \u2192 q4h \u2192 por turno). Vencidos primero dentro de la misma frecuencia; empate por cama; solo estudios al final."
  },
  {
    title: "Glu rescate en Estado actual",
    body: "Cada <strong>glucometr\xEDa</strong> puede marcarse alterada y registrar <strong>unidades de rescate</strong> + <strong>DXT post-rescate</strong>; la nota SOME refleja rescates aplicados o disponibles."
  },
  {
    title: "Enlace iPad desde cliente LAN",
    body: "Una Mac <strong>unida al turno</strong> (no solo el anfitri\xF3n) puede copiar el enlace permanente para iPad desde \u21C4."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.2.8 en todas</strong> las estaciones el mismo d\xEDa. Parche sobre <strong>7.2.7</strong>; esquema SQLCipher sigue en <strong>v15</strong>. El iPad solo recarga internos."
  }
];
var RELEASE_NOTES_727 = [
  {
    title: "Interno por frecuencia de signos",
    body: "La lista MIP ordena pacientes con SV programados de <strong>m\xE1s frecuente a menos</strong> (q1h \u2192 q2h \u2192 q4h \u2192 por turno). Vencidos primero dentro de la misma frecuencia; solo estudios al final."
  },
  {
    title: "Glucometr\xEDas en tema oscuro",
    body: "En el modal de signos del iPad, los campos de <strong>glucometr\xEDa</strong> usan el mismo fondo oscuro que el resto (TA, FC, etc.)."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.2.7 en todas</strong> las estaciones el mismo d\xEDa. Parche sobre <strong>7.2.6</strong>; esquema SQLCipher sigue en <strong>v15</strong>. El iPad solo recarga internos."
  }
];
var RELEASE_NOTES_726 = [
  {
    title: "Entrega con equipo del censo",
    body: "El modal toma el <strong>equipo del censo</strong>; Admin ve todos los equipos. Opci\xF3n <strong>Sin signos</strong> para excluir del interno salvo estudios activos."
  },
  {
    title: "Orden por cama en guardia",
    body: "Grid, listado de <strong>Entrega</strong> e <strong>interno</strong>: <strong>cr\xEDticos e inestables</strong> arriba; el resto por <strong>cama</strong> (cuarto/cama)."
  },
  {
    title: "Interno alinea al censo",
    body: "El MIP lista solo pacientes del censo de la sala; los signos capturados en iPad llegan al <strong>host/desktop</strong> sin depender solo del WebSocket."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.2.6 en todas</strong> las estaciones el mismo d\xEDa. Parche sobre <strong>7.2.5</strong>; esquema SQLCipher sigue en <strong>v15</strong>."
  }
];
var RELEASE_NOTES_725 = [
  {
    title: "Anfitri\xF3n m\xE1s liviano",
    body: "El servidor LAN ya no reescribe un JSON gigante en cada guardado: commits <strong>coalescidos</strong> y escritura por <strong>sala</strong>."
  },
  {
    title: "Labs fuera del bundle",
    body: "El historial de laboratorio vive en <strong>sidecars</strong> por paciente; pegar o sincronizar labs deja de inflar todo el turno."
  },
  {
    title: "SQL v15 en anfitri\xF3n",
    body: "Con SQLCipher desbloqueado, el host usa tablas normalizadas (<strong>v15</strong>) en lugar de un solo blob JSON en la DB."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.2.5 en todas</strong> las estaciones el mismo d\xEDa. Parche sobre <strong>7.2.4</strong>; anfitri\xF3n primero. Esquema SQLCipher <strong>v15</strong>."
  }
];
var RELEASE_NOTES_724 = [
  {
    title: "R4 conecta primero",
    body: "Al registrarse como <strong>R4</strong>, R+ ya no se vuelve anfitri\xF3n del turno de inmediato. Usa <strong>PIN</strong>, anfitri\xF3n fijado o barrido LAN como cualquier estaci\xF3n."
  },
  {
    title: "Encuentra el host del turno",
    body: "R4 participa en el <strong>escaneo de subred</strong> (beacon) y prueba el host ward empaquetado (<code>10.0.57.52:3738</code>) aunque esta Mac nunca haya sido servidor."
  },
  {
    title: "Sin equipo obligatorio",
    body: "<strong>R4</strong> y <strong>Admin</strong> supervisan todas las rotaciones: Mi rotaci\xF3n ya no muestra \xABsin equipo\xBB ni exige unirse a uno."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.2.4 en todas</strong> las estaciones el mismo d\xEDa. Parche sobre <strong>7.2.3</strong>; esquema SQLCipher sigue en <strong>v14</strong>."
  }
];
var RELEASE_NOTES_723 = [
  {
    title: "Anfitri\xF3n ward empaquetado",
    body: "Los clientes nuevos traen <code>http://10.0.57.52:3738</code> preconfigurado. En \u21C4, <strong>PIN del turno</strong> ya muestra la direcci\xF3n del anfitri\xF3n del hospital."
  },
  {
    title: "Conectar sin configurar",
    body: "La URL empaquetada se prueba primero en descubrimiento por PIN, escaneo \u21C4 y reconexi\xF3n \u2014 aunque nunca hayas conectado en esa Mac."
  },
  {
    title: "Subred del hospital",
    body: "Incluye el prefijo <strong>10.0.57</strong> en barridos beacon cross-VLAN junto a tu Wi\u2011Fi local y direcciones guardadas."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.2.3 en todas</strong> las estaciones el mismo d\xEDa. Parche sobre <strong>7.2.2</strong>; esquema SQLCipher sigue en <strong>v14</strong>."
  }
];
var RELEASE_NOTES_722 = [
  {
    title: "Clientes LAN corregidos",
    body: "El token del anfitri\xF3n remoto ya no sobrescribe el c\xF3digo del servidor en esta Mac (<strong>lan-guest-bearer.txt</strong>). Repara instalaciones afectadas por <strong>7.2.0</strong>."
  },
  {
    title: "Pegar direcci\xF3n + PIN",
    body: "En \u21C4, <strong>Unirse con enlace</strong> reconoce <code>http://\u2026:3738</code> copiado del R4. Opcional: PIN de 6 d\xEDgitos en la misma l\xEDnea."
  },
  {
    title: "Reconexi\xF3n sin di\xE1logo",
    body: "Al volver al anfitri\xF3n (Wi\u2011Fi, handoff o failover) ya no aparece \xAB\xBFReconectar\u2026?\xBB. Solo un toast si tienes anfitri\xF3n fijado distinto."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.2.2 en todas</strong> las estaciones el mismo d\xEDa. Parche sobre <strong>7.2.1</strong>; esquema SQLCipher sigue en <strong>v14</strong>."
  }
];
var RELEASE_NOTES_721 = [
  {
    title: "Cross-VLAN en el hospital",
    body: "R+ recuerda <strong>URLs de anfitri\xF3n</strong> y <strong>subredes /24</strong> del turno. Al conectar con PIN, prueba direcciones guardadas y hasta <strong>3 VLANs</strong> extra sin depender solo del Wi\u2011Fi local."
  },
  {
    title: "PIN con direcci\xF3n opcional",
    body: "Tras <strong>Restablecer conexi\xF3n</strong>, la tarjeta <strong>PIN del turno</strong> vuelve en \u21C4 con IP opcional del anfitri\xF3n (p. ej. <code>http://10.0.57.52:3738</code>). \xDAtil entre VLANs del hospital."
  },
  {
    title: "Copiar direcci\xF3n del anfitri\xF3n",
    body: "El R4 puede <strong>copiar la URL del host</strong> desde \u21C4 para que colegas en otra VLAN peguen la direcci\xF3n y el PIN de 6 d\xEDgitos."
  },
  {
    title: "\u21C4 m\xE1s liviano",
    body: "Menos barrido en segundo plano, debounce al cambiar de Wi\u2011Fi y sin auto-conexi\xF3n PIN en modo <strong>solo mi equipo</strong>."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.2.1 en todas</strong> las estaciones el mismo d\xEDa. Parche sobre <strong>7.2.0</strong>; esquema SQLCipher sigue en <strong>v14</strong>."
  }
];
var RELEASE_NOTES_720 = [
  {
    title: "Anfitri\xF3n visible de nuevo",
    body: "Si el <strong>c\xF3digo del equipo</strong> y el estado LAN quedaban desalineados, el servidor crasheaba y nadie encontraba al anfitri\xF3n. <strong>7.2.0</strong> re-alinea el hash al arrancar y al desbloquear la base, sin borrar censo ni salas."
  },
  {
    title: "LAN consolidado (7.1.9\u20137.1.10)",
    body: "Huella de anfitri\xF3n, <strong>mDNS</strong> y beacon <strong>UDP</strong>, roam Wi\u2011Fi, transporte <strong>WS \u2192 SSE \u2192 HTTP</strong> y diagn\xF3stico \u21C4 con perfil de red y RTT."
  },
  {
    title: "mDNS resiliente",
    body: "Bonjour deja de crashear al perder la interfaz Wi\u2011Fi; R+ reinicia el anuncio cuando vuelve una IP privada."
  },
  {
    title: "Reconectar clientes",
    body: "Tras actualizar el anfitri\xF3n, usa <strong>Conectar al turno</strong> o el enlace de invitaci\xF3n \u21C4 para alinear el token en cada Mac."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.2.0 en todas</strong> las estaciones el mismo d\xEDa. Sin cambio de esquema SQLCipher (sigue <strong>v14</strong>)."
  }
];
var RELEASE_NOTES_719 = [
  {
    title: "Descubrimiento mDNS y UDP",
    body: "R+ anuncia y busca <strong>_rplus._tcp</strong> en el puerto <strong>3738</strong> y env\xEDa un <strong>beacon UDP</strong> en multicast, adem\xE1s del escaneo /24. Encuentra el turno m\xE1s r\xE1pido en Wi\u2011Fi hospitalaria."
  },
  {
    title: "Roam por huella digital",
    body: "El anfitri\xF3n se identifica por <strong>clientId:startedAt</strong>, no solo por IP. Al cambiar de red, si la huella sigue viva, R+ reconecta sin un barrido completo."
  },
  {
    title: "WS \u2192 SSE \u2192 HTTP",
    body: "Si un proxy bloquea WebSocket, <strong>LanConnectionManager</strong> cae a <strong>SSE</strong> o polling HTTP sin que tengas que reconfigurar nada."
  },
  {
    title: "Panel \u21C4 m\xE1s claro",
    body: "Fila de <strong>pre-vuelo</strong> con huella, transporte y outbox; badges visibles sin abrir el bloque de diagn\xF3stico."
  },
  {
    title: "QR con huella de guardia",
    body: "El c\xF3digo QR incluye una huella del turno; R+ avisa si intentas unirte a otra guardia por error (rangos IP solapados)."
  },
  {
    title: "Parche sobre 7.1.8",
    body: "Instala <strong>7.1.9 en todas</strong> las estaciones del turno. Sin cambio de esquema SQLCipher (sigue <strong>v14</strong>)."
  }
];
var RELEASE_NOTES_718 = [
  {
    title: "Conectar al anfitri\xF3n",
    body: "Corrige el caso en que al pulsar <strong>OK</strong> en \xABCombinar servidores\xBB o al reconectar no pasaba nada: el cableado LAN transport fallaba con chunks duplicados de esbuild."
  },
  {
    title: "Auto-uni\xF3n al arrancar",
    body: "Al reabrir R+ con anfitri\xF3n guardado, la uni\xF3n silenciosa a la sala \u21C4 ya no lanza <code>registerLanSyncTransportDeps() not called</code> en consola."
  },
  {
    title: "Combinar sin sala",
    body: "Si confirmas unirte al anfitri\xF3n de mayor rango sin estar en una sala \u21C4, ver\xE1s un aviso claro en lugar de un fallo silencioso."
  },
  {
    title: "Parche sobre 7.1.7",
    body: "Instala <strong>7.1.8 en todas</strong> las estaciones del turno. Sin cambio de esquema SQLCipher (sigue <strong>v14</strong>)."
  }
];
var RELEASE_NOTES_717 = [
  {
    title: "Cambio de red Wi\u2011Fi",
    body: "Al cambiar de red o VLAN, R+ detecta la nueva subred en unos <strong>3 segundos</strong>, descarta un anfitri\xF3n que ya no aplica y vuelve a buscar el turno sin esperar al escaneo lento."
  },
  {
    title: "Escaneo en todas las subredes",
    body: "El descubrimiento autom\xE1tico \u21C4 recorre <strong>todas las /24</strong> del Mac (como el PIN del turno), \xFAtil en Wi\u2011Fi hospitalaria con varias VLAN."
  },
  {
    title: "Reconexi\xF3n inmediata",
    body: "Tras el roam: reanuda la b\xFAsqueda (aunque hubiera pausa por 5 fallos), reinicia \u21C4 y prueba <strong>PIN del turno</strong> en silencio si eres cliente."
  },
  {
    title: "Parche sobre 7.1.6",
    body: "Instala <strong>7.1.7 en todas</strong> las estaciones del turno. Sin cambio de esquema SQLCipher (sigue <strong>v14</strong>)."
  }
];
var RELEASE_NOTES_715 = [
  {
    title: "\u21C4 sin bucle de reconexi\xF3n",
    body: "Si no hay anfitri\xF3n tras <strong>5 intentos</strong>, R+ deja de buscar solo. El estado pasa a <strong>desconectado</strong> (no \xABreconectando\u2026\xBB). Vuelve a intentar al abrir \u21C4, usar PIN o <strong>Restablecer conexi\xF3n al turno</strong>."
  },
  {
    title: "Entregas hu\xE9rfanas en guardia",
    body: "Entregas activas cuyo paciente ya no est\xE1 en el censo local aparecen en una franja: puedes abrir el expediente, borrar en el host o quitar la entrega local."
  },
  {
    title: "Guardias resueltas en la red",
    body: "Las entregas cerradas se recuerdan en <strong>clinical_ops</strong> para que otra Mac del turno no las vuelva a mostrar como pendientes."
  },
  {
    title: "Parche sobre 7.1.4",
    body: "Instala <strong>7.1.5 en todas</strong> las estaciones desde <strong>7.1.4</strong>; sin cambios de esquema SQLCipher."
  }
];
var RELEASE_NOTES_714 = [
  {
    title: "Censo guardia para Admin/R4",
    body: "Los <strong>Filtros censo</strong> (sala, equipo, alcance) aplican al tablero. Sectores R4 por \xE1rea real; Admin puede ver pacientes del turno que faltaban en esta Mac."
  },
  {
    title: "Filtro por equipo",
    body: "Elegir un equipo en el filtro ya no muestra <strong>0 pacientes</strong> por un bug de ciclo del viewer."
  },
  {
    title: "Directorio LAN usable",
    body: "Menos actualizaciones pesadas; las secciones <strong>R1 / R2\u2026</strong> se quedan colapsadas. Perfiles con nombre+sala aparecen aunque falte @usuario."
  },
  {
    title: "Un solo anfitri\xF3n en \u21C4",
    body: "Si cada Mac tiene distinto <strong>hostUrl</strong>, el roster no converge: una Mac anfitriona y las dem\xE1s <strong>Unirse</strong> con su enlace. Desactiva \xABFijar anfitri\xF3n\xBB si apunta a otra IP."
  },
  {
    title: "Parche sobre 7.1.3",
    body: "Instala <strong>7.1.4 en todas</strong> las estaciones desde <strong>7.1.3</strong>; PIN, command sync y Learn Hub sin cambios de esquema."
  }
];
var RELEASE_NOTES_713 = [
  {
    title: "Signos vitales sin falsas alarmas",
    body: "Las notificaciones respetan el <strong>plan de entrega</strong> (intervalo o turno). Rutina / sin activar ya no dispara avisos; cada alerta se env\xEDa una vez por ventana."
  },
  {
    title: "Aprender sin modal Sala/IC",
    body: "Tras actualizar se abre el <strong>Learn Hub</strong> directamente. Fundamentos muestra m\xF3dulos de <strong>Sala</strong> e <strong>Interconsulta</strong> por separado."
  },
  {
    title: "Interconsulta en Fundamentos",
    body: "Cuatro m\xF3dulos: paciente y lab, expediente cl\xEDnico, ajustes/perfil y equipo (LiveSync)."
  },
  {
    title: "Parche sobre 7.1.2",
    body: "Instala <strong>7.1.3 en todas</strong> las estaciones desde <strong>7.1.2</strong>; PIN, sala, command sync y track guardia-v7 no cambian."
  }
];
var RELEASE_NOTES_712 = [
  {
    title: "Aprender R+",
    body: "Bot\xF3n <strong>libro</strong> en el header y entrada en Ajustes. El <strong>Learn Hub</strong> re\xFAne m\xF3dulos, art\xEDculos y tutoriales con progreso guardado."
  },
  {
    title: "Guardia 7.x paso a paso",
    body: "Track <strong>guardia-v7</strong> (5 cap\xEDtulos, 19 pasos) tras el registro si vienes de &lt; 7.0. Tarjeta de actualizaci\xF3n descartable en el \xE1rea principal."
  },
  {
    title: "Sin Manejo autom\xE1tico",
    body: "Fuera el m\xF3dulo <strong>Manejo</strong> (electrolitos, ATB, protocolos, calculadoras) y sugerencias inferidas en labs/HC/VPO. VPO sigue como documentaci\xF3n manual."
  },
  {
    title: "Parche sobre 7.1.1",
    body: "Instala <strong>7.1.2 en todas</strong> las estaciones desde <strong>7.1.1</strong>; PIN, sala y command sync no cambian."
  }
];
var RELEASE_NOTES_711 = [
  {
    title: "LAN command sync",
    body: "Estado actual, eventualidades y pendientes via comandos tipados con outbox persistente; ACK ordenado por <code>deltaSeq</code>. Bundle completo sigue como fallback."
  },
  {
    title: "Entrega en Guardia",
    body: "Tap en el chip del paciente abre el modal de entrega <strong>antes</strong> de iniciar turno activo."
  },
  {
    title: "Cr\xEDticos corregidos",
    body: "Borde rojo del censo solo por toggle cl\xEDnico + vasoactivo/VMI; sin marcar por signos alterados ni badge \xABAlterado\xBB."
  },
  {
    title: "Parche sobre 7.1.0",
    body: "Instala <strong>7.1.1 en todas</strong> las estaciones desde <strong>7.1.0</strong>; PIN, sala y barra de fases no cambian."
  }
];
var RELEASE_NOTES_710 = [
  {
    title: "Guardia m\xE1s espacio",
    body: "Resumen del turno en una barra compacta; quitamos botones duplicados para dejar m\xE1s censo y signos vitales."
  },
  {
    title: "Entrega clara",
    body: "Barra de fases: <strong>Iniciar entrega</strong> o <strong>Iniciar turno sin entrega</strong>. Roster de handoff a pantalla completa."
  },
  {
    title: "Turno activo",
    body: "Feed de signos del turno, reloj y cuenta regresiva en las tarjetas del censo."
  },
  {
    title: "LAN delta sync",
    body: "Cambios de historia cl\xEDnica via delta por WebSocket; menos reenv\xEDo del bundle completo."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.1.0 en todas</strong> las estaciones desde <strong>7.0.3</strong>; PIN y sala siguen igual."
  }
];
var RELEASE_NOTES_703 = [
  {
    title: "Censo sin parpadeo",
    body: "La lista lateral de pacientes se actualiza en sitio cuando llegan cambios por LAN: menos saltos visuales durante pase, ronda o guardia."
  },
  {
    title: "Pacientes por equipo",
    body: "Lista y sync LAN respetan alcance: <strong>R4/Admin</strong> ven todo (filtro <strong>Equipo</strong> opcional); <strong>R2/R3</strong> su equipo; <strong>R1</strong> en equipo solo sus pacientes \u2014 sala amplia en entrega o guardia."
  },
  {
    title: "Alcance R1 corregido",
    body: "Si perteneces a un equipo, ya no ves en la barra lateral pacientes de otros equipos de la misma sala. La vista amplia vuelve al activar <strong>fase entrega</strong> o <strong>modo guardia</strong>."
  },
  {
    title: "Arranque estable",
    body: "Corrige un fallo de arranque que pod\xEDa dejar la app sin lista de pacientes ni botones al sincronizar LAN."
  },
  {
    title: "Asignar equipo",
    body: "En <strong>Datos del paciente</strong> aparece el selector de equipo para cambiar la cubeta y empujar clinical-ops por LAN."
  },
  {
    title: "PIN del turno m\xE1s estable",
    body: "El PIN dura el mes calendario, sobrevive reinicios del host y conserva el PIN anterior en gracia si se regenera manualmente."
  },
  {
    title: "Antes de delta sync",
    body: "Incluye harness de peer virtual para probar directorio, push y churn de roster antes del overhaul mayor de sincronizaci\xF3n."
  }
];
var RELEASE_NOTES_702 = [
  {
    title: "Guardar perfil en Windows",
    body: "Corrige el error al pulsar <strong>Continuar</strong> en el registro (nombre en guardia, rango, sala). Ya no aparece <code>Cannot access before initialization</code> en consola."
  },
  {
    title: "Recuperar @usuario",
    body: "\xABRecuperar mi usuario\xBB y el flujo al reclamar un handle ya registrado vuelven a enlazar la cuenta en este dispositivo."
  },
  {
    title: "Incluye 7.0.1",
    body: "PIN del turno, reconexi\xF3n Wi\u2011Fi hospital, directorio LAN y empaquetado SQLCipher en Windows."
  },
  {
    title: "Actualiza el turno",
    body: "Parche sobre <strong>7.0.1</strong>: instala en todas las estaciones; no cambia PIN ni sala."
  }
];
var RELEASE_NOTES_701 = [
  {
    title: "PIN del turno",
    body: "6 d\xEDgitos del anfitri\xF3n (\u21C4). Pulsa <strong>Conectar</strong> o <strong>Conectar al turno</strong> en la barra \u2014 R+ encuentra la sala en la red del hospital."
  },
  {
    title: "Cambio de Wi\u2011Fi",
    body: "Al cambiar de red o quedar en \xABreconectando\u2026\xBB, R+ vuelve a buscar el anfitri\xF3n con el mismo PIN (sin pegar enlaces ni IPs)."
  },
  {
    title: "M\xE1s simple",
    body: "El enlace de invitaci\xF3n queda en opci\xF3n avanzada. Mensajes claros: \xABBuscando anfitri\xF3n del turno\u2026\xBB, \xABListo: conectado al turno\xBB."
  },
  {
    title: "Incluye 6.7.0",
    body: "Directorio LAN corregido, sin falso \xABPerfil guardado\xBB, diagn\xF3stico \u21C4 y empaquetado Windows SQLCipher."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.0.1 en todas</strong> las Macs, PCs e iPads el mismo d\xEDa. Misma red cl\xEDnica que el anfitri\xF3n; firewall <strong>3738</strong> en Windows."
  }
];
var RELEASE_NOTES_670 = [
  {
    title: "Directorio LAN corregido",
    body: "El anfitri\xF3n ya no borra el roster al recibir un bundle vac\xEDo. Los <strong>@usuario</strong> de la guardia vuelven a verse en equipos, censo y entregas."
  },
  {
    title: "PIN del turno",
    body: "En LiveSync: PIN de <strong>6 d\xEDgitos</strong> (~12 h) para que los residentes se unan escaneando la red, sin copiar enlace de invitaci\xF3n."
  },
  {
    title: "Sin falso \xE9xito",
    body: "Si a\xFAn no hay host o sala, ya no ver\xE1s \xABPerfil guardado\xBB como si estuvieras en la guardia: aparece un bot\xF3n para <strong>conectar \u21C4</strong>."
  },
  {
    title: "Diagn\xF3stico \u21C4",
    body: "Cada push clinical-ops deja traza con <code>NO_LAN</code>, <code>NO_ROOM</code> u otro c\xF3digo en el JSON de diagn\xF3sticos."
  },
  {
    title: "Sobre 6.6.9",
    body: "Incluye arranque <strong>Windows SQLCipher</strong>, icono Wi\u2011Fi LiveSync, iPad/m\xF3vil y onboarding local."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>6.7.0 en todas</strong> las Macs, PCs e iPads el mismo d\xEDa. Firewall <strong>3738</strong> en Windows la primera vez."
  }
];
var RELEASE_NOTES_669 = [
  {
    title: "Windows \u2014 arranque corregido",
    body: "Corrige <strong>R+ no pudo iniciar</strong> por <em>not a valid Win32 application</em> en <code>better_sqlite3.node</code>. Reinstala desde Releases si ten\xEDas <strong>6.6.7</strong> o <strong>6.6.8</strong> en PC."
  },
  {
    title: "Empaquetado SQLCipher",
    body: "El instalador Windows incluye el binario nativo <strong>win32-x64</strong> correcto (no el Mach-O de macOS)."
  },
  {
    title: "Incluye 6.6.8",
    body: "LiveSync Wi\u2011Fi en el header, directorio LAN y el resto de la l\xEDnea <strong>6.6.8</strong>."
  }
];
var RELEASE_NOTES_729 = [
  {
    title: "Manejo \u2014 parser SOME ampliado",
    body: "Pega el bloque del hospital con tabuladores: <strong>MEDICAMENTOS</strong>, <strong>MEDICAMENTOS P2</strong> y <strong>DIETAS</strong>. Cuidados y estudios se omiten con conteo."
  },
  {
    title: "Dieta \u2192 Estado actual",
    body: "En sala, la dieta detectada va como <strong>propuesta pendiente</strong> en EA (confirmar o descartar). Nuevo campo <strong>prote\xEDna (g/d\xEDa)</strong>."
  },
  {
    title: "SOAP pre-marcado",
    body: "ATB, antiHTA, insulinas, D50 y rescates PRN por glucometr\xEDa se marcan solos en la grilla SOAP al procesar Manejo."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.2.9 en todas</strong> las estaciones el mismo d\xEDa. Parche sobre <strong>7.2.8</strong>; esquema SQLCipher sigue en <strong>v15</strong>."
  }
];
var RELEASE_NOTES_734 = [
  {
    title: "Arranque m\xE1s liviano",
    body: "<strong>Labs</strong>, gr\xE1ficas de <strong>Estado actual</strong> y <strong>Tendencias</strong> entran con <strong>import()</strong> y chunks \u2014 menos c\xF3digo en el primer paint."
  },
  {
    title: "Censo virtual",
    body: "Lista activa con <strong>scroll virtual</strong> cuando hay m\xE1s de 30 pacientes; listas cortas siguen con repintado incremental."
  },
  {
    title: "Pendientes con vencimiento",
    body: "Fecha/hora opcional, orden por <strong>vencidos</strong>, modal de fecha y <strong>recordatorio</strong> nativo en Electron cuando lo activas."
  },
  {
    title: "Filtro Entrega",
    body: "Tareas dejadas por otro residente: chip <strong>De @usuario</strong>, filtro <strong>Entrega</strong> y acuse al completar."
  },
  {
    title: "iPad \u2014 solo tu equipo",
    body: "El espejo m\xF3vil muestra pacientes de <strong>equipos a los que te uniste</strong> m\xE1s cobertura de guardia activa \u2014 no el censo completo de sala."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.3.4 en todas</strong> las estaciones el mismo d\xEDa. Esquema SQLCipher sigue en <strong>v17</strong>; actualiza iPads con enlace m\xF3vil."
  }
];
var RELEASE_NOTES_733 = [
  {
    title: "Balance I/O en la nota",
    body: "Si falta el balance del turno pero hay egresos num\xE9ricos parciales, la cl\xE1usula SOAP lo calcula (p. ej. diuresis <strong>NC</strong> + gastrostom\xEDa \u2192 balance con signo)."
  },
  {
    title: "Evacuaciones \u2014 conteo, no CC",
    body: "Evacuaciones num\xE9ricas en <strong>Estado actual</strong>, historial y <strong>censo</strong> sin sufijo <strong>CC</strong>; <strong>NC</strong> y variantes normalizadas."
  },
  {
    title: "Censo \u2014 balance mixto",
    body: "Columna I/O del censo: balance con diuresis no cuantificada y drenajes num\xE9ricos; evacuaciones como conteo en PDF y listados."
  },
  {
    title: "Dieta \u2014 kcal total visible",
    body: "El campo <strong>Kcal total</strong> muestra kcal/kg \xD7 peso sin sobrescribir el valor guardado hasta que edites kcal/kg o el total."
  },
  {
    title: "Parche sobre 7.3.2",
    body: "Instala <strong>7.3.3 en todas</strong> las estaciones el mismo d\xEDa. Esquema SQLCipher sigue en <strong>v17</strong>; iPad sin cambios."
  }
];
var RELEASE_NOTES_732 = [
  {
    title: "Republicaci\xF3n \u2014 arranque",
    body: "Corrige fallo al abrir la app (<em>Cannot find module \u2026 window-open-policy</em>). Reinstala el instalador <strong>7.3.2</strong> de esta fecha si la versi\xF3n anterior no arrancaba."
  },
  {
    title: "Workbench Refinado",
    body: "Tokens de elevaci\xF3n y tipograf\xEDa cl\xEDnica en <strong>escritorio, m\xF3vil e interno</strong>. Overlays de vidrio en modales, men\xFAs y <strong>\u2318K</strong>; presets de movimiento en Ajustes."
  },
  {
    title: "Navegaci\xF3n agrupada",
    body: "Expediente ancho: grupos <strong>Paciente \xB7 Cl\xEDnico \xB7 Resultados \xB7 Salida</strong> con expansi\xF3n al hover. Contexto de paciente + selector de modo siempre visibles."
  },
  {
    title: "Gr\xE1ficas en Estado actual",
    body: "Modal con <strong>pesta\xF1as</strong> (signos, balance, labs), downsampling con tooltip de serie completa y curvas alineadas a <strong>Tendencias</strong>."
  },
  {
    title: "LAN y seguridad",
    body: "Purga en anfitri\xF3n solo para hu\xE9rfanos/admin con guard de propiedad. <strong>CSP</strong>, allowlist de ventanas externas y borrado de claves cl\xEDnicas al cerrar sesi\xF3n web."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.3.2 en todas</strong> las estaciones el mismo d\xEDa. Esquema SQLCipher sigue en <strong>v17</strong>; iPad sin cambio obligatorio."
  }
];
var RELEASE_NOTES_731 = [
  {
    title: "Manejo \u2014 Importar SOME",
    body: "El pegado del hospital abre en <strong>modal</strong> (como perfil SOME). La grilla \xABMedicamentos del turno\xBB muestra etiquetas compactas, fecha y <strong>+1 d\xEDa</strong>."
  },
  {
    title: "SOAP \u2014 AAS por dosis",
    body: "\xC1cido acetilsalic\xEDlico <strong>\u2264160 mg</strong> va a <strong>Otros</strong> (antiplaquetario); dosis mayores a <strong>Analgesia</strong>. Usa <code>dosisRaw</code> del SOME."
  },
  {
    title: "Perfil \u2014 borrar mes o todo",
    body: "Men\xFA <strong>\u22EF</strong> en perfil farmacoterap\xE9utico: elimina el <strong>mes visible</strong> o borra el <strong>perfil completo</strong> del paciente."
  },
  {
    title: "Estado actual \u2014 dieta",
    body: "Barra de confirmaci\xF3n de dieta pendiente; rejilla FOUR/Glasgow/Soporte y nutrici\xF3n en filas dedicadas. Texto copiado sin \xABPARA PESO DE X KG\xBB."
  },
  {
    title: "Parche sobre 7.3.0",
    body: "Instala <strong>7.3.1 en todas</strong> las estaciones el mismo d\xEDa. Esquema SQLCipher sigue en <strong>v17</strong>; iPad sin cambios."
  }
];
var RELEASE_NOTES_730 = [
  {
    title: "Perfil hist\xF3rico cross-mes",
    body: "Grilla din\xE1mica: solape autom\xE1tico cerca de fin de mes, filas continuas por medicamento y mes pasado acotado por <strong>fecha de ingreso</strong>."
  },
  {
    title: "Directorio LAN con actividad",
    body: "\xDAltima actividad por usuario, filtros por sala/equipo/actividad y rangos colapsables. Bot\xF3n <strong>Directorio LAN</strong> en la barra de equipos."
  },
  {
    title: "Laboratorio \u2014 historial por fecha",
    body: "Selector <strong>Estudio</strong> (fecha + tipo) para re-procesar, re-enviar a nota o borrar. FAB <strong>Copiar</strong> solo en Lab/EA con contenido."
  },
  {
    title: "Censo y anfitri\xF3n",
    body: "PDF: labs y pendientes con texto completo. Anfitri\xF3n: <strong>dashboard modal</strong> del censo host (fantasmas, archivados, purga)."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.3.0 en todas</strong> las estaciones el mismo d\xEDa. Esquema SQLCipher sube a <strong>v17</strong> (<code>last_activity_at</code>)."
  }
];
var RELEASE_NOTES_736 = [
  {
    title: "Identidad LAN verificable",
    body: "Al conectar con PIN, el anfitri\xF3n emite <strong>identidad por cliente</strong>. La <strong>purga de pacientes</strong> usa identidad resuelta en servidor \u2014 ya no basta con falsificar par\xE1metros en la URL."
  },
  {
    title: "LiveSync m\xE1s mantenible",
    body: "El <strong>orchestrator</strong> se dividi\xF3 en m\xF3dulos (<strong>conflicts</strong>, <strong>patient-delete</strong>, <strong>historia-sync</strong>, \u2026) sin cambiar el comportamiento visible en guardia."
  },
  {
    title: "Cultivos y arranque",
    body: "Detecci\xF3n <strong>superset</strong> de cultivos alineada en censo, pegado e historial. <strong>npm start</strong> deja de forzar rebuild SQLCipher cuando el nativo ya coincide con Electron."
  },
  {
    title: "Pruebas y seguridad",
    body: "Trece pruebas de integraci\xF3n <strong>IPC cl\xEDnico</strong>; cinco suites reactivadas en CI. <strong>window.open</strong> limitado a GitHub y LAN privada."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.3.6 en todas</strong> las estaciones el mismo d\xEDa. Esquema SQLCipher sigue en <strong>v17</strong>; identidad LAN requiere versi\xF3n homog\xE9nea en el turno."
  }
];
var RELEASE_NOTES_735 = [
  {
    title: "LAN m\xE1s seguro",
    body: "La <strong>purga de pacientes</strong> en el anfitri\xF3n valida propiedad en servidor (403 si no eres due\xF1o). Tras <strong>8 PIN fallidos</strong> en el intercambio, bloqueo de <strong>5 minutos</strong>."
  },
  {
    title: "Anfitri\xF3n confiable",
    body: "Al cerrar R+, el host hace <strong>flush</strong> del almac\xE9n LAN (tope 3 s). Los fallos de persistencia quedan registrados para diagn\xF3stico en guardia."
  },
  {
    title: "Datos del paciente en modal",
    body: "En el expediente, la pesta\xF1a <strong>Paciente</strong> abre en modal dedicado con la misma tarjeta demogr\xE1fica y asignaci\xF3n de equipo."
  },
  {
    title: "ATB y vencimientos",
    body: "En <strong>Estado actual</strong>, el texto de antibi\xF3ticos avanza seg\xFAn la <strong>fecha de actualizaci\xF3n</strong> de Manejo. Pendientes: presets <strong>Hoy 18:00</strong>, <strong>Ma\xF1ana 8:00</strong>, <strong>En 3 h / 24 h</strong> editables."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.3.5 en todas</strong> las estaciones el mismo d\xEDa. Esquema SQLCipher sigue en <strong>v17</strong>; anfitri\xF3n y clientes deben coincidir para purga y PIN."
  }
];
var RELEASE_NOTES_740 = [
  {
    title: "Arranque m\xE1s r\xE1pido",
    body: "Entrega, plataforma, tour, modales y export r\xE1pido cargan <strong>bajo demanda</strong>. Menos espera al abrir R+ entre pacientes."
  },
  {
    title: "Signos vitales por turno",
    body: "Al <strong>registrar</strong> monitoreo se valida el m\xE1ximo por signo en el turno. La hora de alteraci\xF3n se prellena desde la fecha/hora del registro."
  },
  {
    title: "Censo sin parpadeo",
    body: "Re-tocar el mismo paciente ya no re-dibuja toda la lista. El highlight activo se actualiza en silencio al cambiar de cama."
  },
  {
    title: "Pase y expediente",
    body: "Al cambiar paciente, el expediente se fuerza a pintar si el panel estaba vac\xEDo. En pase + nota, el overview del turno queda alineado."
  },
  {
    title: "UI m\xE1s clara",
    body: "Tarjetas con profundidad sutil, sidebar <strong>cama primero</strong>, spacing en Estado actual e interno alineado al design system."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.4.0 en todas</strong> las estaciones para arranque homog\xE9neo. Esquema SQLCipher sigue en <strong>v17</strong>; sin migraci\xF3n de base."
  }
];
var RELEASE_NOTES_738 = [
  {
    title: "COAG como secci\xF3n propia",
    body: "Coagulaci\xF3n (TP, TTP, INR, Fib, DD) sale en bloque <strong>COAG</strong> separado de BH \u2014 en parser, pase, panel y diagramas. Merge del mismo d\xEDa conserva la fila m\xE1s completa."
  },
  {
    title: "Balance NC en monitoreo",
    body: "Si los egresos est\xE1n declarados pero no cuantificados (p. ej. <strong>DIURESIS NC</strong>), el balance muestra <strong>NC</strong> y el texto SOAP incluye <strong>BALANCE NC</strong>."
  },
  {
    title: "Registro y arranque",
    body: "Modal de registro EA con selector fecha/hora alineado al resto de la UI. Al boot, toast claro si la base cl\xEDnica est\xE1 bloqueada o el binario SQLCipher no coincide."
  },
  {
    title: "Directorio LAN y dieta EA",
    body: "Directorio trae <strong>todos los usuarios registrados</strong> (\u21C4 todas las salas); filtros y grupos ya no se reinician al refrescar. Confirmar dieta SOME persiste tras sync."
  }
];
var RELEASE_NOTES_737 = [
  {
    title: "Censo que no pierde readmisiones",
    body: "Corregido: pacientes que <strong>desaparec\xEDan del censo</strong> tras \u21C4 cuando otro Mac hab\xEDa borrado un expediente con el <strong>mismo registro</strong>. Los deletes LAN aplican solo por <strong>id</strong> del chart."
  },
  {
    title: "Tombstones y merge",
    body: "Al dar de alta un paciente se limpian tombstones LAN viejos del registro. El bundle del anfitri\xF3n ya no suprime entradas con <strong>id nuevo</strong> y registro reutilizado."
  },
  {
    title: "Importar desde Drive",
    body: "En modo sala, el bot\xF3n <strong>Importar desde Drive</strong> vive en la barra del bloque <strong>Cl\xEDnico</strong> del expediente (solo visible ah\xED), con estilo pill alineado al resto de la UI."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.3.7 en todas</strong> las estaciones del turno si usan \u21C4 compartido. Esquema SQLCipher sigue en <strong>v17</strong>."
  }
];
var RELEASE_NOTES_741 = [
  {
    title: "Dieta SOME m\xE1s fiable",
    body: "Mejor clasificaci\xF3n de suplementos y columnas desalineadas. Al re-aplicar receta, no sobrescribe dieta confirmada con la misma huella."
  },
  {
    title: "Signos alineados al SOAP",
    body: "Monitoreo y tira de signos comparten las mismas lecturas. Temperatura pico en formato <strong>(PICO \u2026 \xB0C)</strong>."
  },
  {
    title: "LAN en la subred",
    body: "Beacon antes del ping; CORS en Electron para consultar peers en <code>:3738</code> sin depender de cada anfitri\xF3n."
  },
  {
    title: "Sin migraci\xF3n de base",
    body: "SQLCipher sigue en <strong>v17</strong>. Instala <strong>7.4.1</strong> en todas las estaciones del turno si usan \u21C4 o pegan dieta desde SOME."
  }
];
var RELEASE_NOTES_753 = [
  {
    title: "Importar desde repositorio",
    body: "En el panel de laboratorio: <strong>registro</strong> + rango de fechas \u2192 R+ consulta el portal intrahospitalario, descarga PDFs y los ingresa al historial con la misma deduplicaci\xF3n que el pegado masivo."
  },
  {
    title: "Silencioso o revisi\xF3n",
    body: "Si el paciente activo coincide y los estudios son nuevos, importaci\xF3n <strong>directa</strong>; si hay ambig\xFCedad, registro distinto o duplicados, abre el modal de <strong>revisi\xF3n masiva</strong>."
  },
  {
    title: "PDF ef\xEDmero",
    body: "Descarga y extracci\xF3n en el proceso principal; los PDF temporales se <strong>borran</strong> tras extraer el texto SOME. Solo red hospitalaria \u2014 sin nube."
  },
  {
    title: "Parche sobre 7.5.2",
    body: "Sin migraci\xF3n de base (SQLCipher <strong>v20</strong>). Instala <strong>7.5.3</strong> en estaciones con acceso al portal de laboratorio del hospital."
  }
];
var RELEASE_NOTES_752 = [
  {
    title: "Signos vitales en filas",
    body: "Resumen compacto en <strong>filas</strong> (no cajas anchas). Toca una fila con historial para ver lecturas del turno en un modal."
  },
  {
    title: "SOAP al d\xEDa",
    body: "Copiar/guardar usa la <strong>\xFAltima</strong> lectura. <strong>PICO</strong> solo fiebre \u226538 \xB0C dentro de 5 d\xEDas, con fecha corta y sin <code>@ 00:00</code> en cierre de turno."
  },
  {
    title: "SOME ayuno + traqueostom\xEDa",
    body: "Detecta <strong>AYUNO</strong> en indicaciones (filas cortas, con o sin tabs). Nuevo soporte <strong>Traqueostom\xEDa</strong> en Estado Actual y export."
  },
  {
    title: "Parche sobre 7.5.1",
    body: "Sin migraci\xF3n de base (SQLCipher <strong>v20</strong>). Instala <strong>7.5.2</strong> en estaciones que usen Estado Actual o peguen SOME con ayuno."
  }
];
var RELEASE_NOTES_751 = [
  {
    title: "Push en cola de equipos",
    body: "En <code>/equipos</code> activa avisos cuando un <strong>Lumify / EKG / US</strong> queda libre, al devolver Lumify (con % si eres el siguiente) o hay reporte de material/falla. LAN y <strong>cloud</strong>."
  },
  {
    title: "eTFG del expediente",
    body: "La <strong>eTFG</strong> en qu\xEDmica usa sexo y edad del paciente en R+ (CKD-EPI 2021), no el encabezado SOME."
  },
  {
    title: "Labs masivos \u2014 ventana 2 h",
    body: "Al pegar varios bloques del mismo turno, la consolidaci\xF3n agrupa por d\xEDa + tipo dentro de <strong>2 horas</strong> \u2014 menos duplicados."
  },
  {
    title: "UI plana Rams",
    body: "Papel c\xE1lido, bordes hairline y sin sombras en tarjetas; gr\xE1ficas EA con menos tinta decorativa."
  },
  {
    title: "Parche sobre 7.5.0",
    body: "Instala <strong>7.5.1</strong> si usas cola de equipos con push o pegas labs masivos. Esquema SQLCipher sube a <strong>v20</strong> (suscripciones push en host LAN)."
  }
];
var RELEASE_NOTES_750 = [
  {
    title: "Cola Lumify / EKG / US",
    body: "Lista de espera del programa en <strong>Modo Guardia</strong> y m\xF3vil <code>/equipos</code>: retiro, devoluci\xF3n con fotos, alertas de material/falla y reportes por equipo."
  },
  {
    title: "Cloud sin Mac anfitri\xF3n",
    body: "Opcional: cola en <strong>Cloudflare Worker</strong> (D1 + R2) cuando no hay servidor LAN. Configura URL y clave admin en escritorio \u2192 Equipos."
  },
  {
    title: "Panel \u21C4 m\xE1s claro",
    body: "Estado y <strong>PIN del turno</strong> en zona h\xE9roe; filas unificadas para iPad, salas, diagn\xF3stico y toggles. Alertas de conflicto como franja, no tarjeta morada."
  },
  {
    title: "SQLCipher v19",
    body: "Al desbloquear, la base migra a <strong>v19</strong> (tablas equipos). Instala <strong>7.5.0</strong> en estaciones que usen cola LAN de equipos o el nuevo panel \u21C4."
  }
];
var RELEASE_NOTES_755 = [
  {
    title: "Dieta desde AYUNO",
    body: "Al pegar SOME con <strong>receta/dieta</strong>, si la dieta confirmada (p. ej. <strong>AYUNO</strong>) difiere de la del SOME, R+ llena <strong>pendienteReceta</strong> con kcal/prote\xEDna \u2014 sin flag <code>force</code>."
  },
  {
    title: "Onboarding registro",
    body: "Formulario de registro cl\xEDnico <strong>cableado de nuevo</strong>; perfil persistido en ajustes evita repetir onboarding si la sesi\xF3n IPC va retrasada; LAN push en segundo plano tras guardar."
  },
  {
    title: "Parche sobre 7.5.4",
    body: "Incluye <strong>7.5.4</strong>: signos iPad\u2192LAN, sync-bundle 16 MB y recuperaci\xF3n desde cola. Sin migraci\xF3n (SQLCipher <strong>v20</strong>)."
  }
];
var RELEASE_NOTES_754 = [
  {
    title: "Signos iPad \u2192 Mac",
    body: "<strong>Guardar</strong> en Estado Actual empuja al outbox LAN (registrar, eliminar medici\xF3n y texto cl\xEDnico incluidos). El anfitri\xF3n acepta bundles hasta <strong>16 MB</strong> \u2014 menos 500 en censos grandes."
  },
  {
    title: "Recuperar desde cola",
    body: "En \u21C4 \u2192 <strong>Estado de sincronizaci\xF3n</strong>: <strong>Recuperar signos desde cach\xE9 LAN</strong> restaura monitoreo del outbox o snapshot si el iPad refresc\xF3 antes de sincronizar."
  },
  {
    title: "Merge por lectura",
    body: "Al reconciliar LAN, el historial de signos hace <strong>uni\xF3n por id de medici\xF3n</strong> \u2014 no se pierden lecturas solo del iPad."
  },
  {
    title: "Parche sobre 7.5.3",
    body: "Sin migraci\xF3n de base (SQLCipher <strong>v20</strong>). Instala <strong>7.5.4</strong> en Mac anfitri\xF3n e iPad; reinicia R+ en el host tras actualizar."
  }
];
var RELEASE_NOTES_763 = [
  {
    title: "Conexi\xF3n sin c\xF3digo",
    body: "R1\u2013R3 se unen al turno <strong>sin PIN ni c\xF3digo manual</strong>: R+ busca el anfitri\xF3n en la Wi\u2011Fi del hospital al arrancar y al abrir \u21C4."
  },
  {
    title: "Endpoints del turno embarcados",
    body: "La app prueba la URL y prefijo LAN del hospital guardados en el build; el barrido sigue aunque a\xFAn no tengas token en esta Mac."
  },
  {
    title: "Parche sobre 7.6.2",
    body: "Incluye <strong>iPad scope LAN</strong>, sala <strong>Interconsultas</strong> por equipo y filtro de censo de la versi\xF3n anterior."
  }
];
var RELEASE_NOTES_762 = [
  {
    title: "iPad \u2014 scope LAN",
    body: "Sin SQLCipher en el navegador se conserva el <strong>scope</strong> hidratado por el anfitri\xF3n; el censo no aplica pacientes LAN hasta que tengas <strong>equipo unido</strong>."
  },
  {
    title: "Interconsultas \u2014 sala correcta",
    body: "Al registrar o asignar equipo, la <strong>sala del equipo</strong> prevalece sobre el stamp UX del perfil; el filtro de censo por sala incluye pacientes del equipo."
  },
  {
    title: "Ops cl\xEDnicas en m\xF3vil",
    body: "iPad/PWA descarga y aplica el snapshot de ops del host; reconcile de pacientes tras merge sin depender del modo DB del escritorio."
  },
  {
    title: "Parche sobre 7.6.1",
    body: "Incluye <strong>SQLCipher v21</strong>, borrador <strong>Mi rotaci\xF3n</strong> y equipos push de la versi\xF3n anterior."
  }
];
var RELEASE_NOTES_761 = [
  {
    title: "SQLCipher v21 \u2014 Interconsultas",
    body: "Al desbloquear la base, migraci\xF3n autom\xE1tica a <strong>v21</strong>: <strong>users</strong>, <strong>teams</strong> y acceso interno aceptan salas <strong>Interconsultas</strong>, <strong>UX</strong> y <strong>Eme</strong>."
  },
  {
    title: "Mi rotaci\xF3n sin perder borrador",
    body: "Crear equipo, editar perfil o pegar c\xF3digo de uni\xF3n ya no se borran cuando el panel <strong>Mi rotaci\xF3n</strong> se refresca en segundo plano (sync LAN o directorio)."
  },
  {
    title: "Equipos \u2014 push en cola",
    body: "Las notificaciones push de Lumify/EKG/US solo se activan si ya est\xE1s <strong>en la cola</strong> del dispositivo."
  },
  {
    title: "Downgrade estable",
    body: "Restaurar versi\xF3n anterior tolera mejor la red: timeout de cat\xE1logo y enlace directo al instalador en <strong>GitHub</strong> si falla la carga."
  },
  {
    title: "Parche sobre 7.6.0",
    body: "Incluye <strong>\u21C4 sin PIN</strong> y <strong>censo abierto por equipo</strong> de la versi\xF3n anterior."
  }
];
var RELEASE_NOTES_760 = [
  {
    title: "\u21C4 sin PIN de turno",
    body: "Por defecto R+ se une al anfitri\xF3n LAN <strong>sin los 6 d\xEDgitos</strong>: al guardar perfil o registrarte descubre el host y obtiene token. El panel \u21C4 ya no pide ni muestra PIN de turno."
  },
  {
    title: "Restaurar PIN (anfitri\xF3n)",
    body: "Para volver al emparejamiento con PIN, el Mac anfitri\xF3n arranca con <strong>R_PLUS_LAN_REQUIRE_SHIFT_PIN=1</strong> (ver <code>.env.example</code>). Los clientes vuelven a ver el campo PIN."
  },
  {
    title: "Censo abierto por equipo (temporal)",
    body: "Todos los pacientes de la sala son legibles en gu\xEDa cl\xEDnica, <strong>sin filtrar por equipo asignado</strong>. Pensado para despliegue en guardia; el filtro por equipo regresar\xE1 en una versi\xF3n posterior."
  },
  {
    title: "Parche sobre 7.5.9",
    body: "Incluye censo recuperable, tombstones/fantasmas del anfitri\xF3n LAN y directorio de equipos. Sin migraci\xF3n (SQLCipher <strong>v20</strong>)."
  }
];
var RELEASE_NOTES_759 = [
  {
    title: "Censo recuperable",
    body: "En <strong>Ajustes \u2192 Exportar censo recuperable\u2026</strong> lee pacientes desde SQLCipher (incluye cach\xE9 LAN) aunque el sidebar est\xE9 vac\xEDo. Importa con <strong>Importar rango\u2026</strong>."
  },
  {
    title: "Exportar pacientes\u2026",
    body: "Elige varios del censo en un solo JSON desde <strong>Ajustes \u2192 Respaldo</strong>."
  },
  {
    title: "Anfitri\xF3n LAN",
    body: "<strong>Limpiar tombstones</strong> restaura visibilidad local; <strong>Restaurar</strong> por fantasma; <strong>Eliminar fantasmas</strong> descarga respaldo antes de purgar solo el host."
  },
  {
    title: "Directorio LAN",
    body: "Asignaciones de equipo remapean al <strong>@usuario</strong> can\xF3nico de esta Mac tras sync entre equipos."
  },
  {
    title: "Parche sobre 7.5.8",
    body: "Incluye cat\xE1logo downgrade <strong>7.5.7</strong> y confirmaci\xF3n <strong>SUPLEMENTO</strong> en EA. Sin migraci\xF3n (SQLCipher <strong>v20</strong>)."
  }
];
var RELEASE_NOTES_758 = [
  {
    title: "Cat\xE1logo downgrade",
    body: "En <strong>Ajustes \u2192 Restaurar versi\xF3n estable anterior</strong>, <strong>7.5.7</strong> aparece como release curada recomendada para volver desde versiones m\xE1s nuevas."
  },
  {
    title: "Parche sobre 7.5.7",
    body: "Incluye confirmaci\xF3n de dieta <strong>SUPLEMENTO</strong> en Estado actual (sin re-propuesta tras sync) y la l\xEDnea <strong>7.5.6</strong> (onboarding Windows/wipe). Sin migraci\xF3n (SQLCipher <strong>v20</strong>)."
  }
];
var RELEASE_NOTES_757 = [
  {
    title: "Confirmar suplemento",
    body: "Al aceptar dieta <strong>SUPLEMENTO</strong> importada desde SOME en <strong>Estado actual</strong>, desaparecen el badge <strong>Propuesta</strong> y los botones Confirmar/Descartar."
  },
  {
    title: "Sync sin re-propuesta",
    body: "Refrescar EA o re-sincronizar Manejo ya no vuelve a proponer el mismo suplemento por kcal/prote\xEDna residuales del SOME."
  },
  {
    title: "Parche sobre 7.5.6",
    body: "Incluye onboarding Windows/wipe y la l\xEDnea <strong>7.5.5</strong> (dieta AYUNO, signos iPad\u2192LAN). Sin migraci\xF3n (SQLCipher <strong>v20</strong>)."
  }
];
var RELEASE_NOTES_756 = [
  {
    title: "Borrado en Windows",
    body: "El borrado completo confirma dentro del modal (<strong>escribe BORRAR</strong>). Ya no depende de <code>prompt()</code> ni <code>confirm()</code>, que fallaban en Electron."
  },
  {
    title: "Registro tras wipe",
    body: "<strong>Guardar perfil</strong> y <strong>Recuperar mi usuario</strong> vuelven a avanzar tras borrar ajustes locales; el <code>clientId</code> del dispositivo se repone autom\xE1ticamente."
  },
  {
    title: "Solo este equipo",
    body: "Un clic en <strong>Solo este equipo</strong> entra directo a la app (sin segunda pantalla). Firma por defecto <strong>Usuario R+</strong> \u2014 c\xE1mbiala en Mi Perfil cuando quieras."
  },
  {
    title: "Parche sobre 7.5.5",
    body: "Incluye dieta AYUNO, registro cableado y la l\xEDnea <strong>7.5.4</strong> (signos iPad\u2192LAN). Sin migraci\xF3n (SQLCipher <strong>v20</strong>)."
  }
];
var RELEASE_NOTES_764 = [
  {
    title: "Direcci\xF3n del anfitri\xF3n visible",
    body: "En \u21C4, <strong>Conectar al anfitri\xF3n del turno</strong> muestra el campo de URL del R4 (sin PIN). Pega <code>http://10.0.57.65:3738</code> si el barrido no encuentra al host."
  },
  {
    title: "Restablecer reconecta solo",
    body: "Tras <strong>Restablecer conexi\xF3n</strong>, R+ vuelve a buscar al anfitri\xF3n en la Wi\u2011Fi y conserva el endpoint del hospital \u2014 ya no pide PIN."
  },
  {
    title: "Unirse a sala m\xE1s f\xE1cil",
    body: "<strong>Unirse</strong> en una sala intenta conectar al R4 antes de mostrar error; al conectar, entra a tu sala de <strong>Mi rotaci\xF3n</strong> cuando aplica."
  },
  {
    title: "Parche sobre 7.6.3",
    body: "Incluye auto-connect sin c\xF3digo de la versi\xF3n anterior. Instala <strong>7.6.4</strong> en Macs cliente y anfitri\xF3n el mismo d\xEDa."
  }
];
var RELEASE_NOTES_765 = [
  {
    title: "Anfitri\xF3n sin 401",
    body: "Si el R4 ve <strong>degraded</strong> con <code>invalid_token</code>, esta versi\xF3n alinea el bearer con <code>lan-team-code.txt</code> y reintenta el sync autom\xE1ticamente."
  },
  {
    title: "Enlace de sala empaquetado",
    body: "Tras actualizar, \u21C4 muestra el enlace del turno pre-llenado en <strong>Unirse con enlace</strong>. El R4 debe pegar el ticket vigente en el build antes de publicar."
  },
  {
    title: "Auto-connect conservado",
    body: "Sigue el host empaquetado <code>http://10.0.57.65:3738</code> y la reconexi\xF3n sin PIN de <strong>7.6.4</strong>."
  },
  {
    title: "Actualiza todo el turno",
    body: "Instala <strong>7.6.5</strong> en Macs anfitri\xF3n y cliente el mismo d\xEDa. Reinicia R+ en el R4 tras instalar."
  }
];
var RELEASE_NOTES_767 = [
  {
    title: "Equipos \u2014 avisos push",
    body: "La PWA de lista de espera (<strong>Lumify / EKG / US</strong>) puede avisarte cuando te llaman: <strong>Activar avisos</strong> en la cola. En iPhone: instalar desde Safari (pantalla de inicio) y seguir la gu\xEDa en <strong>Ayuda</strong>."
  },
  {
    title: "Troponina I (hs)",
    body: "Pega reportes SOME solo troponina: R+ extrae <strong>TnI</strong> con flag de elevaci\xF3n y muestra la serie en <strong>Tendencias</strong>."
  },
  {
    title: "Labs \u2014 consolidaci\xF3n",
    body: "Al pegar varios bloques del mismo d\xEDa: une qu\xEDmica y gasometr\xEDa inicial en ventana de 2 h, pero <strong>nunca</strong> fusiona gasometr\xEDa con gasometr\xEDa."
  },
  {
    title: "Parche sobre 7.6.6",
    body: "Incluye QR imprimible y anfitri\xF3n LAN estable. Instala <strong>7.6.7</strong> en Mac anfitri\xF3n y clientes el mismo d\xEDa."
  }
];
var RELEASE_NOTES_766 = [
  {
    title: "QR listo para imprimir",
    body: "En interno y equipos: <strong>Copiar QR</strong> o <strong>Descargar QR</strong> generan PNG en alta resoluci\xF3n (~2048px) para pegar en carteleras o WhatsApp."
  },
  {
    title: "Anfitri\xF3n que no cede",
    body: "Si el R4 ten\xEDa rol <strong>host</strong> pero un pin remoto viejo, \u21C4 ya no lo empuja a unirse al otro Mac: repinea la IP local autom\xE1ticamente."
  },
  {
    title: "Parche sobre 7.6.5",
    body: "Incluye token <code>lan-team-code.txt</code>, invite empaquetado y auto-connect. Instala <strong>7.6.6</strong> en anfitri\xF3n y clientes el mismo d\xEDa."
  }
];
var RELEASE_NOTES_768 = [
  {
    title: "Bomba de insulina en EA",
    body: "Al pegar SOME con <strong>insulina IV</strong> y <strong>BOMBA EN ALGORITMO 1\u20134</strong>, R+ activa el bloque en <strong>Estado actual</strong>: registro, snapshot y texto copiable. Confirmar la propuesta NM ya no vuelve a mostrar <strong>Propuesta</strong> tras refrescar."
  },
  {
    title: "Filtro de sala al instante",
    body: "En <strong>Filtros censo</strong>, al cambiar sala la lista y el tablero Guardia se actualizan de inmediato \u2014 sin esperar sync LAN ni un segundo clic."
  },
  {
    title: "Medicamentos en Manejo",
    body: "La receta hospitalaria (TSV/SOME) vive en la pesta\xF1a <strong>Manejo</strong> del expediente; menos pesta\xF1as sueltas en Cl\xEDnico."
  },
  {
    title: "Parche sobre 7.6.7",
    body: "Incluye avisos push en equipos, <strong>troponina hs</strong> en tendencias y consolidaci\xF3n de labs. Instala <strong>7.6.8</strong> en todo el turno el mismo d\xEDa."
  }
];
var RELEASE_NOTES_770 = [
  {
    title: "Interpretaci\xF3n citoqu\xEDmica",
    body: "Al pegar SOME de l\xEDquidos corporales, R+ muestra un bloque <strong>INTERPRETACI\xD3N CITOQU\xCDMICO:</strong> con GASA, Light, PBE/SBP, empiema pleural y etiolog\xEDa LCR \u2014 solo informativo, no se copia a nota ni censo."
  },
  {
    title: "LCR \u2014 qu\xEDmica + bacteriolog\xEDa",
    body: "Fusiona los bloques duales del SOME (<strong>CITOQUIMICO DE LCR</strong> + <strong>LIQ. LCR</strong>) en una l\xEDnea <strong>LCR:</strong> sin mezclar glucosa con qu\xEDmica sangu\xEDnea."
  },
  {
    title: "pH LCR fuera de rango",
    body: "Si el pH reportado est\xE1 fuera de <strong>7.28\u20137.42</strong>, R+ avisa en interpretaci\xF3n para verificar muestra o reporte; el valor copiable no cambia."
  },
  {
    title: "Diagramas colapsables",
    body: "En <strong>Resultados</strong> puedes plegar la secci\xF3n de diagramas de laboratorio; la preferencia se recuerda en esta Mac."
  },
  {
    title: "Parche sobre 7.6.9",
    body: "Incluye gasometr\xEDa resaltada, historial consolidado en LiveSync e import del repositorio. Instala <strong>7.7.0</strong> en todo el turno el mismo d\xEDa."
  }
];
var RELEASE_NOTES_769 = [
  {
    title: "Gasometr\xEDa \u2014 alterados visibles",
    body: "pCO\u2082, pO\u2082, lactato, bicarbonato y dem\xE1s vuelven a marcarse en <strong>RESULTADOS</strong> (asterisco rojo) y en el diagrama <strong>Gasometr\xEDa</strong> (subrayado)."
  },
  {
    title: "Historial y reproceso",
    body: "Al guardar estudios o reprocesar desde el reporte SOME, R+ ya no pierde el resaltado de gasometr\xEDa \u2014 reaplica rangos del laboratorio."
  },
  {
    title: "Repositorio \u2014 ani\xF3n gap",
    body: "Al importar gasometr\xEDa y qu\xEDmica del mismo d\xEDa desde el <strong>repositorio</strong>, R+ fusiona los reportes y calcula <strong>AG</strong> y <strong>Delta-Delta</strong> con Na/Cl de la qu\xEDmica."
  },
  {
    title: "Historial \u2014 consolidar y LiveSync",
    body: "Al fusionar estudios del mismo d\xEDa, el cambio se replica al anfitri\xF3n del turno; ya no vuelven a aparecer Labs (1)\u2013(4) tras sincronizar."
  },
  {
    title: "\u21C4 \u2014 fijar anfitri\xF3n",
    body: "\xABFijar anfitri\xF3n del turno\xBB activa el servidor en esta Mac sin parpadear el panel; desaparece el aviso contradictorio cuando ya elegiste ser anfitri\xF3n."
  },
  {
    title: "Parche sobre 7.6.8",
    body: "Incluye bomba de insulina en EA, filtro de sala al instante y receta en <strong>Manejo</strong>. Instala <strong>7.6.9</strong> en todo el turno el mismo d\xEDa."
  }
];
var RELEASE_NOTES_773 = [
  {
    title: "Alta directa desde SOME",
    body: "Un solo reporte de <strong>paciente nuevo</strong> abre el modal de alta con datos del laboratorio; al guardar, <strong>Procesar</strong> contin\xFAa sin confirmaci\xF3n intermedia."
  },
  {
    title: "Orden cl\xEDnico en Resultados",
    body: "Las secciones SOME se ordenan fijo: <strong>BH \u2192 QS \u2192 ESC \u2192 PFHs \u2192 GASES</strong>, otros bloques y <strong>EGO al final</strong>."
  },
  {
    title: "Labs m\xE1s simples",
    body: "Retirado el wizard de 2 p\xE1ginas <strong>Configurar lectura</strong>; los paneles hospitalarios siguen por <strong>overlay PanelDef</strong> y sync LAN."
  },
  {
    title: "Parche sobre 7.7.2",
    body: "Incluye paste SOME, \u2318K acciones, colas docs/cultivos y checklist pre-entrega. Instala <strong>7.7.3</strong> en todo el turno el mismo d\xEDa."
  }
];
var RELEASE_NOTES_772 = [
  {
    title: "Pega SOME en cualquier pantalla",
    body: "Pega texto de laboratorio donde est\xE9s o usa <strong>\u2318K \u2192 Procesar SOME</strong>: R+ propone paciente por registro/nombre y abre <strong>Laboratorio</strong> listo."
  },
  {
    title: "\u2318K con acciones directas",
    body: "Batch labs mi equipo, cola docs, EA, export, pendiente y pase desde la paleta; con b\xFAsqueda vac\xEDa aparecen <strong>pins</strong> frecuentes primero."
  },
  {
    title: "Colas en el header",
    body: "<strong>Docs</strong> (labs hoy + pendientes) y <strong>cultivos</strong> (ATB pendiente / sin nota) con badge \u2014 un clic al paciente correcto."
  },
  {
    title: "Labs \u2192 Eventualidades",
    body: "Tras <strong>Procesar</strong>, import del repositorio o <strong>Actualizar</strong> batch, hallazgos relevantes se env\xEDan solos a Eventualidades."
  },
  {
    title: "Pre-entrega y clipboard EA",
    body: "Checklist mi equipo (HC, EA hoy, pendientes vencidos, cultivos) y <strong>Copiar indicaciones</strong> (meds + bomba) desde Estado actual."
  },
  {
    title: "Parche sobre 7.7.1",
    body: "Incluye receta SOAP ampliada, rescates insulina y citoqu\xEDmica. Instala <strong>7.7.2</strong> en todo el turno el mismo d\xEDa."
  }
];
var RELEASE_NOTES_771 = [
  {
    title: "SOAP \u2014 m\xE1s categor\xEDas desde receta",
    body: "Al pegar SOME/TSV en <strong>Manejo</strong>, R+ clasifica antiem\xE9ticos, sedaci\xF3n, antiepil\xE9pticos, transfusiones, anticoagulaci\xF3n y m\xE1s; puedes corregir el destino SOAP por fila."
  },
  {
    title: "Rescates de insulina",
    body: "Insulina PRN SC por glucometr\xEDa se agrupa como <strong>RESCATES DE INSULINA</strong> con un solo checkbox SOAP y suspender en bloque."
  },
  {
    title: "Glucometr\xEDas con UI en nota",
    body: "Si aplicaste rescate en monitoreo, el texto NM muestra <strong>valor, NUI</strong> (p. ej. 142, 4UI) en lugar de solo la cifra capilar."
  },
  {
    title: "Bomba IV m\xE1s fiable",
    body: "Mejor detecci\xF3n de bomba en algoritmo 1\u20134; el cloruro portador ya no aparece como medicamento NM suelto."
  },
  {
    title: "Parche sobre 7.7.0",
    body: "Incluye interpretaci\xF3n citoqu\xEDmica, fusi\xF3n LCR y diagramas colapsables. Instala <strong>7.7.1</strong> en todo el turno el mismo d\xEDa."
  }
];
var RELEASE_NOTES_774 = [
  {
    title: "Repo sin BH en series q4h",
    body: "Al importar del repositorio, la <strong>BH matutina</strong> ya no se copia a electrolitos/gases cada 4 h. Se respeta la ventana de <strong>\u22642 h</strong> y las gasometr\xEDas seriadas quedan aparte."
  },
  {
    title: "Consolidar a tu medida",
    body: "En historial de Labs, <strong>Consolidar</strong> lista los conjuntos y t\xFA armas los grupos (mismo d\xEDa). Ya no fusiona el d\xEDa entero por defecto."
  },
  {
    title: "COAG m\xE1s fiable",
    body: "En PDFs incompletos, R+ ya no toma el <strong>TTP como INR</strong> ni el m\xEDnimo del rango como <strong>TP</strong>."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.7.4 en todas</strong> las Macs y PCs del turno el mismo d\xEDa si usan import del repositorio o consolidaci\xF3n de labs."
  }
];
var RELEASE_NOTES_775 = [
  {
    title: "Todas las gasometr\xEDas del repo",
    body: "Importar del repositorio trae <strong>todas</strong> las gasos. Junta solo la m\xE1s cercana a labs dentro de <strong>\u22642 h</strong>; el resto queda aparte (nunca dos gasos en el mismo conjunto)."
  },
  {
    title: "Qu\xEDmica al consolidar",
    body: "QS, ESC, PFHs y Lipasa se unen por campos al consolidar: <strong>CPK</strong> y el resto no se pierden entre PDFs del mismo bloque."
  },
  {
    title: "Receta HU oficial",
    body: "La plantilla <strong>HU 000-061-R-06-12</strong> llena el ejemplar izquierdo de forma legible (vista landscape)."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.7.5 en todas</strong> las Macs y PCs del turno el mismo d\xEDa si importan labs del repositorio con varias gasometr\xEDas."
  }
];
var RELEASE_NOTES_776 = [
  {
    title: "Labs sin membrete SOME",
    body: "El historial solo guarda paneles cl\xEDnicos (BH/QS/\u2026/cultivo). Se descarta el membrete, demograf\xEDa y basura de <strong>Impresi\xF3n.aspx</strong> al procesar o consolidar."
  },
  {
    title: "Vitales del turno",
    body: "En Estado actual, el prefill trae solo lecturas de la <strong>ventana del turno</strong> y el tope de 4 no cuenta dos veces la misma lectura ya guardada."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.7.6 en todas</strong> las Macs y PCs del turno el mismo d\xEDa si pegan labs SOME o usan signos vitales seriados en EA."
  }
];
var RELEASE_NOTES_777 = [
  {
    title: "Labs externos",
    body: "En Laboratorio: elige el <strong>tipo</strong> de estudio, llena <strong>celdas</strong> y guarda. Entra al historial (tendencias, nota y LiveSync) marcado como <strong>\xB7 Ext</strong>."
  },
  {
    title: "Actualizar labs unificado",
    body: "Un solo bot\xF3n reemplaza Importar del repositorio. Con <strong>paciente activo</strong> solo pedir\xE1 fechas; sin paciente, la lista de <strong>mi equipo</strong>."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.7.7 en todas</strong> las Macs y PCs del turno el mismo d\xEDa si capturan labs externos o actualizan desde el repositorio."
  }
];
var RELEASE_NOTES_778 = [
  {
    title: "Actualizar labs de mi equipo",
    body: "Con <strong>2 o m\xE1s</strong> pacientes del equipo abre el modal con checkboxes aunque haya uno activo. Solo fechas cuando es un \xFAnico paciente."
  },
  {
    title: "Labs externos m\xE1s claros",
    body: "Toolbar: Procesar \u2192 Actualizar \u2192 Separador \u2192 Limpiar \u2192 <strong>Labs externos</strong>. El selector de tipo ya no duplica el c\xF3digo (BH)."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.7.8 en todas</strong> las Macs y PCs del turno el mismo d\xEDa si usan Actualizar labs o Labs externos."
  }
];
var RELEASE_NOTES_779 = [
  {
    title: "Alterados sin rangos SOME",
    body: "Si el reporte no trae <strong>Valor de Referencia</strong>, R+ marca fuera de rango con refs de estudios previos del paciente o est\xE1ndares (BH, QS, ESC, PFH, gases\u2026)."
  },
  {
    title: "Historial sin clones",
    body: "Reimportar a la <strong>misma hora</strong> no crea Labs (1)\u2026(8): anexa paneles nuevos o omite duplicados. <strong>Mismos GASES</strong> se filtran; gasos seriados distintos siguen aparte."
  },
  {
    title: "Actualizar labs m\xE1s claro",
    body: "Cola al <strong>pie del sidebar</strong>, lista m\xE1s limpia y bot\xF3n <strong>Solo activo</strong> junto a Todos / Ninguno."
  }
];
var RELEASE_NOTES_780 = [
  {
    title: "Alterados sin rangos SOME",
    body: "Si el reporte no trae <strong>Valor de Referencia</strong>, R+ marca fuera de rango con refs de estudios previos o est\xE1ndares (QS, ESC, PFH, BH, gases\u2026)."
  },
  {
    title: "Historial m\xE1s fiel",
    body: "Reproceso completo del SOME; match de expediente con d\xEDgito verificador; ya no inventa PCT fantasma en refs."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.8.0 en todas</strong> las Macs y PCs del turno el mismo d\xEDa si pegan labs incompletos del SOME."
  }
];
var RELEASE_NOTES_781 = [
  {
    title: "Diagn\xF3sticos que s\xED se guardan",
    body: "Al sincronizar por LAN, los <strong>diagn\xF3sticos en Datos del paciente</strong> (y meds de censo) ya no se pierden en el merge."
  },
  {
    title: "Sin borrado fantasma",
    body: "Una fila vac\xEDa del formulario ya no pisa diagn\xF3sticos reales al aplicar el host."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.8.1 en todas</strong> las Macs y PCs del turno el mismo d\xEDa si usan Diagn\xF3sticos en Datos con LiveSync."
  }
];
var RELEASE_NOTES_790 = [
  {
    title: "Recuperar Nube y panel Conexi\xF3n",
    body: "C\xF3digo de recuperaci\xF3n al registrarte (gu\xE1rdalo). Panel \u21C4 en pasos: <strong>Conectar \u2192 Sala \u2192 Equipo \u2192 M\xE1s</strong>; sin sesi\xF3n solo ves Conectar. Admin puede restablecer contrase\xF1a."
  },
  {
    title: "Nube sin host LAN",
    body: "En <strong>Sala</strong> y <strong>Torre HU</strong>, el panel \u21C4 conecta a una sala en la nube (Cloudflare Free): el turno sincroniza sin depender de un Mac anfitri\xF3n."
  },
  {
    title: "Migraci\xF3n 7.9",
    body: "Al abrir 7.9 se reinician usuarios cl\xEDnicos con un panel de migraci\xF3n: eliges tu <strong>@usuario</strong>, recuperas equipo y reclamas pacientes. Los pacientes y labs no se borran."
  },
  {
    title: "Offline con outbox",
    body: "Sin Internet sigues trabajando en local; al reconectar se env\xEDan los cambios. Labs sin tope de sets en el piloto."
  },
  {
    title: "Otras salas igual",
    body: "<strong>Interconsultas</strong>, <strong>UX</strong>, <strong>Eme</strong> y <strong>\xC1rea A</strong> siguen en LiveSync LAN (host + PIN)."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.9.0 en todas</strong> las Macs y PCs del turno el mismo d\xEDa. En Sala/Torre: completa la migraci\xF3n y entra a Nube desde \u21C4."
  }
];
var RELEASE_NOTES_791 = [
  {
    title: "Recuperar cuenta Nube",
    body: "Al registrarte recibes un <strong>c\xF3digo de recuperaci\xF3n</strong> (gu\xE1rdalo). Con \xE9l recuperas la contrase\xF1a; tambi\xE9n puedes regenerarlo. Admin puede restablecer."
  },
  {
    title: "Conexi\xF3n por pasos",
    body: "El panel \u21C4 gu\xEDa <strong>Conectar \u2192 Sala \u2192 Equipo \u2192 M\xE1s</strong>. Sin sesi\xF3n Nube solo ves Conectar."
  },
  {
    title: "Borrado masivo",
    body: "Selecciona varios pacientes en la lista y b\xF3rralos de una vez; el purge llega a LAN/Nube para que <strong>no regresen</strong> al sincronizar."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.9.1 en todas</strong> las Macs y PCs del turno el mismo d\xEDa si usan Nube o borrado de pacientes con LiveSync."
  }
];
var RELEASE_NOTES_792 = [
  {
    title: "Censo \u2014 rescates y dieta",
    body: "En ATB/Meds, las insulinas r\xE1pidas PRN SC se agrupan como <strong>RESCATES DE INSULINA</strong>. El suplemento nutricional SOME aparece como <strong>DIETA SUPLEMENTO</strong>, no como medicamento."
  },
  {
    title: "Conexi\xF3n m\xE1s clara",
    body: "\u21C4 abre con la <strong>hoja de estado</strong>; R4, admin y LAN avanzado viven en <strong>Opciones</strong>."
  },
  {
    title: "Cultivos y signos",
    body: "Cultivos ignoran membrete SOME (USER/Labo). El prefill de signos en Estado Actual usa solo lecturas del <strong>mismo d\xEDa</strong>."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.9.2 en todas</strong> las Macs y PCs del turno el mismo d\xEDa."
  }
];
var RELEASE_NOTES_793 = [
  {
    title: "Eventualidades \u2014 Labs",
    body: "Switcher <strong>Eventualidad / Labs</strong>. La interpretaci\xF3n va a una caja dedicada con formato <strong>Estudios</strong>; Procesar y Actualizar labs fusionan ah\xED sin crear entradas cl\xEDnicas nuevas."
  },
  {
    title: "Nube m\xE1s fiable",
    body: "Sync por bloque con relojes propios (monitoreo / eventualidades / censo). Labs sin PDF; polling adaptativo y error visible en el chip <strong>\u21C4</strong>."
  },
  {
    title: "EA registro y labs",
    body: "El registro manual abre <strong>limpio</strong> por secciones. Labs consolidan misma fecha+hora; cuarto/cama no se pisan al sincronizar."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.9.3 en todas</strong> las Macs y PCs del turno el mismo d\xEDa."
  }
];
var RELEASE_NOTES_794 = [
  {
    title: "Hybrid H \u2014 nuevo chrome",
    body: "Materiales <strong>vidrio/s\xF3lido</strong>, springs, toast con swipe, <strong>\u2318K</strong> instant\xE1neo y paneles (pase, labs, expediente, <strong>\u21C4</strong>, Eventualidades) alineados al nuevo lenguaje visual."
  },
  {
    title: "EA \u2014 Tab spine",
    body: "En el registro manual, <strong>Tab</strong> recorre signos, glu e I/E en orden cl\xEDnico; sin saltos +1 ni controles Alterada."
  },
  {
    title: "Conexi\xF3n / Nube m\xE1s clara",
    body: "Cuenta antes de sala; sin hero LAN en salas Nube; c\xF3digo de recuperaci\xF3n obligatorio antes de continuar."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.9.4 en todas</strong> las Macs y PCs del turno el mismo d\xEDa."
  }
];
var RELEASE_NOTES_795 = [
  {
    title: "iPad / R+ M\xF3vil en Nube",
    body: "En <strong>Sala</strong> y <strong>Torre HU</strong>: copia enlace o QR desde <strong>\u21C4</strong>, abre en Safari, inicia sesi\xF3n y usa guardia + EA sin Mac anfitri\xF3n LAN."
  },
  {
    title: "Un c\xF3digo de sala por mes",
    body: "La sala Nube dura el <strong>mes calendario</strong> (<code>YYYY-MM</code> CDMX). Al abrir R+, el censo se siembra solo; el iPad lee la sala activa."
  },
  {
    title: "Signos, COAG y censo LAN",
    body: "Signos con <strong>recordedAt</strong> reciente ya no se pierden. Labs une <strong>TP/TTP/INR/Fib/DD</strong>. En LAN, borrados del host no resucitan."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.9.5 en todas</strong> las Macs el mismo d\xEDa. En Nube: <code>build:cloud-mobile</code> + <code>db:migrate:remote</code> + <code>deploy</code>."
  }
];
var RELEASE_NOTES_796 = [
  {
    title: "Sala 1 / 2 / E distintas",
    body: "En Nube cada unidad es su propia sala (<strong>Sala 1</strong>, <strong>Sala 2</strong>, <strong>Sala E</strong>, <strong>Torre HU</strong>) con c\xF3digo mensual <code>YYYY-MM</code>."
  },
  {
    title: "Censo por equipo",
    body: "R1/R2 ven solo pacientes de su equipo. <strong>R4/Admin</strong> en Mac ven el censo completo de la sala. iPad siempre filtra por equipo."
  },
  {
    title: "Sin pacientes fantasma",
    body: "Tras sincronizar con Nube, R+ quita del sidebar pacientes fuera de tu alcance y protege el monitoreo EA de stubs vac\xEDos."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.9.6 en todas</strong> las Macs y despliega el Worker (<code>build:cloud-mobile</code> + <code>deploy</code>) el mismo d\xEDa."
  }
];
var RELEASE_NOTES_797 = [
  {
    title: "Mutate por entidad",
    body: "Pendientes, agenda y bajas Nube llevan su propio <code>clientMutationId</code> \u2014 menos colisiones en el outbox y sync m\xE1s fiable entre Macs."
  },
  {
    title: "Pendientes al instante",
    body: "Tras pull Nube, la UI de <strong>pendientes</strong> se refresca en los pacientes tocados (igual que en LAN)."
  },
  {
    title: "EA \u2192 sync inmediato",
    body: "Registrar signos en <strong>Estado actual</strong> dispara push al guardar; monitoreo llega al turno sin esperar otro evento."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.9.7 en todas</strong> las Macs el mismo d\xEDa. No requiere redeploy del Worker Nube."
  }
];
var RELEASE_NOTES_799 = [
  {
    title: "Sin banner offline falso",
    body: "En <strong>app://rplus</strong> las notas salen por IPC \u2014 ya no aparece la franja roja de \xABservidor local\xBB ni se consulta <code>/health</code> en :3738."
  },
  {
    title: "Conexi\xF3n m\xE1s clara",
    body: "Errores de red en \u21C4 muestran un hint en espa\xF1ol (Wi\u2011Fi / VPN) en lugar de <em>Failed to fetch</em>."
  },
  {
    title: "Actualizaci\xF3n sin muro HTML",
    body: "Si el modal de update mostr\xF3 HTML crudo al bajar 7.9.8, <strong>7.9.9</strong> resume el error y acorta las notas de versi\xF3n."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.9.9 en todas</strong> las Macs. Redeploy del Worker es opcional (solo CORS admin)."
  }
];
var RELEASE_NOTES_798 = [
  {
    title: "Nube en todas las salas",
    body: "<strong>Interconsultas</strong>, <strong>UX</strong>, <strong>Eme</strong> y <strong>\xC1rea A</strong> sincronizan por Nube igual que Sala 1/2/E y Torre HU \u2014 sin Mac anfitri\xF3n LAN."
  },
  {
    title: "LAN sync retirado",
    body: "LiveSync LAN queda <strong>apagado</strong> por defecto. El turno vive en <strong>\u21C4 Conexi\xF3n</strong> (Nube). Offline = base local."
  },
  {
    title: "Borrado que no vuelve",
    body: "\xD7 y borrado masivo van a Nube; el Worker limpia labs, pendientes y agenda del paciente y <strong>no lo resucita</strong> tras el tombstone."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>7.9.8 en todas</strong> las Macs el mismo d\xEDa que el operador despliega el Worker. Si ven\xEDas de LAN en Inters/UX/Eme/\xC1rea A, \xFAnete en \u21C4."
  }
];
var RELEASE_NOTES_800 = [
  {
    title: "Nube en todas las salas",
    body: "<strong>Sala 1/2/E</strong>, <strong>Torre HU</strong>, <strong>Interconsultas</strong>, <strong>UX</strong>, <strong>Eme</strong> y <strong>\xC1rea A</strong> sincronizan por \u21C4 Conexi\xF3n \u2014 sin Mac anfitri\xF3n LAN."
  },
  {
    title: "R+ M\xF3vil / iPad",
    body: "El iPad abre desde internet (<code>/mobile/</code>), inicia sesi\xF3n con tu @usuario y ve signos y expediente esencial con alcance por equipo."
  },
  {
    title: "LAN sync retirado",
    body: "LiveSync LAN queda <strong>apagado</strong> por defecto. El turno vive en Nube; offline = base local SQLCipher + outbox."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.0.0 en todas</strong> las Macs el mismo d\xEDa que el operador despliega el Worker. Si ven\xEDas de LAN, \xFAnete en \u21C4."
  }
];
var RELEASE_NOTES_801 = [
  {
    title: "Pull Nube arreglado",
    body: "Al conectar en \u21C4 ya no aparece <strong>\xABNo se pudieron aplicar los cambios de la nube\xBB</strong>: el censo remoto vuelve a aplicarse en salas Nube sin montar LAN."
  },
  {
    title: "Push m\xE1s fiable",
    body: "El Worker confirma mutaciones con <strong>revisi\xF3n at\xF3mica</strong> y reintento si dos Macs/iPads escriben a la vez \u2014 menos choques al guardar."
  },
  {
    title: "Despliega Worker + app",
    body: "Instala <strong>8.0.1 en todas</strong> las Macs y ejecuta <code>npm run deploy</code> en <code>cloud/sync-worker</code> el mismo d\xEDa del turno."
  }
];
var RELEASE_NOTES_802 = [
  {
    title: "Diagn\xF3stico Nube",
    body: "En \u21C4 \u2192 <strong>Opciones</strong> \u2192 <strong>Diagn\xF3stico Nube</strong>: cola de mutaciones, \xFAltimos errores y trazas push/pull. <strong>Copiar informe</strong> para soporte sin DevTools."
  },
  {
    title: "Sala Torre y equipos",
    body: "<strong>torre</strong> ya normaliza a <strong>Torre HU</strong> al unirte a Nube. Al <strong>salir del equipo</strong>, las entregas activas se resuelven en lugar de bloquearte."
  },
  {
    title: "Sync m\xE1s fiable",
    body: "Todos en Nube llevan <strong>patientId</strong>; la sala de <strong>Mi rotaci\xF3n</strong> (SQLCipher) gana sobre ajustes viejos; al reconectar se alinea el room del turno."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.0.2 en todas</strong> las Macs. Si usas Torre HU, ejecuta <code>npm run deploy</code> en <code>cloud/sync-worker</code> el mismo d\xEDa."
  }
];
var RELEASE_NOTES_803 = [
  {
    title: "Eventualidades: solo bit\xE1cora",
    body: "Se quita la pesta\xF1a <strong>Labs</strong> / interpretaci\xF3n de laboratorios en Eventualidades. Vuelve el formulario para <strong>agregar</strong> notas cl\xEDnicas abajo."
  },
  {
    title: "Admin Nube \u2014 Equipos",
    body: "En <strong>\u21C4 \u2192 Admin Nube \u2192 Equipos</strong> asign\xE1s residentes a equipos cl\xEDnicos (equipo + ciclo). Los cambios se publican a la sala por R+ Cloud."
  },
  {
    title: "Reingreso en Nube",
    body: "Tras borrar un paciente, un <strong>alta nueva</strong> vuelve al censo del turno. El cliente empuja censo al admitir; el Worker limpia tombstones con ops m\xE1s nuevas (mismo <strong>registro</strong>, id distinto incluido)."
  },
  {
    title: "Revisi\xF3n de sync estable",
    body: "La revisi\xF3n local <strong>no retrocede</strong> si el Worker devuelve un n\xFAmero viejo en un push duplicado (p. ej. <code>clinicalOps</code>). Menos pulls en bucle y cola m\xE1s predecible."
  },
  {
    title: "Sync sin forzar",
    body: "R+ Cloud hace pull/push solo (~15 s o al enfocar la ventana). Los <strong>equipos</strong> se publican al conectar. En R1\u2013R3 el censo es por <strong>equipo asignado</strong> (no toda la sala)."
  },
  {
    title: "Perfil sin repetir",
    body: "Si ya ten\xEDas <strong>@usuario</strong>, nombre y sala guardados, R+ ya no te obliga a repetir el registro de perfil en cada reinicio."
  },
  {
    title: "Actualiza el turno",
    body: "Instala esta actualizaci\xF3n en <strong>todas</strong> las Macs del turno el mismo d\xEDa. El operador debe desplegar el Worker Nube si aplica reingreso en sala."
  }
];
var RELEASE_NOTES_804 = [
  {
    title: "Nube m\xE1s estable (Worker)",
    body: "El pull ya no carga historiales enormes de mutaciones (evita ca\xEDdas D1). Tras cada push se podan ops viejas; peers atrasados reciben <strong>snapshot</strong>."
  },
  {
    title: "Cierre de guardia",
    body: "Al <strong>Finalizar turno</strong>, revisa estudios abiertos por equipo y devu\xE9lvelos con un toque sin perder pendientes."
  },
  {
    title: "Heredar pacientes",
    body: "Al unirte a un equipo nuevo, asistente en 4 pasos para traer casos de tu equipo anterior sin reasignar uno por uno."
  },
  {
    title: "Tablero Guardia",
    body: "Franja de confianza Nube/sala/equipo, censo agrupado por equipo (R4/Admin) y estados vac\xEDos con gu\xEDa clara."
  },
  {
    title: "Admin Equipos en lote",
    body: "Selecci\xF3n m\xFAltiple, guardar/quitar en lote, filtros por actividad y badges con historial de uso (esquema v22)."
  },
  {
    title: "Atajos de expediente",
    body: "<strong>\u2318E</strong>/<strong>\u2318T</strong>/<strong>\u2318D</strong> navegan EA, tendencias y datos; <strong>\u2318G</strong>/<strong>\u2318I</strong>/<strong>\u2318P</strong>/<strong>\u2318S</strong> cambian modo."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.0.4 en todas</strong> las Macs del turno el mismo d\xEDa. El operador debe desplegar el Worker Nube (pull/poda)."
  }
];
var RELEASE_NOTES_805 = [
  {
    title: "LAN LiveSync retirado",
    body: "El turno sincroniza solo por <strong>R+ Cloud</strong>. \u21C4 Conexi\xF3n usa facades Nube; sin PIN de anfitri\xF3n ni beacon."
  },
  {
    title: "Interno MIP en Nube",
    body: "QR <strong>Internos (MIP)</strong> desde \u21C4 por sala (<code>/interno/{slug}</code>); tokens en D1. No requiere Wi\u2011Fi LAN ni Mac host."
  },
  {
    title: "Equipos cloud-only",
    body: "Cola Lumify/EKG/US solo por Worker Nube; sin host LAN en el turno."
  },
  {
    title: "Historia cl\xEDnica fuera del expediente",
    body: "Panel HC y push <code>historiaClinica</code> retirados; texto cl\xEDnico compartido en m\xF3dulos comunes."
  },
  {
    title: "Ward server solo dev",
    body: "<code>server.js</code> fuera del pack de producci\xF3n. Dev local: <code>R_PLUS_DEV_WARD_SERVER=1 npm start</code>."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.0.5 en todas</strong> las Macs el mismo d\xEDa y despliega el Worker Nube (Interno MIP + sidecars)."
  }
];
var RELEASE_NOTES_806 = [
  {
    title: "Ya tengo cuenta en onboarding",
    body: "Login Nube con @usuario, <strong>Recu\xE9rdame</strong> y pull de censo/equipos \u2014 sin crear cuenta duplicada."
  },
  {
    title: "Modales sobre Conexi\xF3n",
    body: "C\xF3digo de recuperaci\xF3n, admin e historial Equipos se apilan correctamente sobre el panel \u21C4."
  },
  {
    title: "Reinstalar en Mac nueva",
    body: "Elige <strong>Ya tengo cuenta</strong> en \xAB\xBFC\xF3mo usar\xE1s R+?\xBB en lugar de registrar de nuevo."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.0.6</strong> en todas las Macs; compatible con peers 8.0.5 en el mismo turno."
  }
];
var RELEASE_NOTES_807 = [
  {
    title: "Equipos en staging",
    body: "Equipos nuevos del mes entrante quedan inactivos hasta que R4 inicia la <strong>nueva rotaci\xF3n</strong>; luego se activan y archivan los viejos."
  },
  {
    title: "Heredar pacientes",
    body: "Solo en ventana de cambio de mes o tras nueva rotaci\xF3n \u2014 bot\xF3n en la tarjeta del equipo, no al unirte cualquier d\xEDa."
  },
  {
    title: "Recu\xE9rdame tras actualizar",
    body: "Token Nube guardado omite onboarding y rehidrata @usuario desde Nube si hace falta."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.0.7</strong> en todas las Macs; compatible con peers 8.0.6 en el mismo turno."
  }
];
var RELEASE_NOTES_808 = [
  {
    title: "Soporte respiratorio en EA",
    body: "Estado Actual con modalidades (litros, alto flujo, VMNI, VM, TQT), par\xE1metros por tier y c\xE1lculos: PaFi, driving pressure, ROX y ml/kg."
  },
  {
    title: "Dieta parenteral",
    body: "Paste SOME reconoce <strong>KAVIBEN</strong>, <strong>SMOFKABIVEN</strong> y NPT; extrae kcal/prote\xEDna y etiqueta <strong>PARENTERAL</strong> en EA."
  },
  {
    title: "Diagn\xF3stico Nube",
    body: "\u21C4 \u2192 Opciones: dashboard legible, gu\xEDas de correcci\xF3n y reintento de cola sin perder sesi\xF3n."
  },
  {
    title: "Recu\xE9rdame tras actualizar",
    body: "Token Nube guardado omite onboarding al instalar <strong>8.0.8</strong> \u2014 sin migraci\xF3n de base ni cierre de sesi\xF3n."
  }
];
var RELEASE_NOTES_809 = [
  {
    title: "Reposici\xF3n de potasio",
    body: "Paste SOME agrupa cloruro/fosfato/acetato de K IV en NM como <strong>REPOSICI\xD3N DE POTASIO</strong>, con duraci\xF3n de infusi\xF3n del diluyente."
  },
  {
    title: "Aire ambiente sin PaFi falsa",
    body: "Estado Actual no muestra avisos de PaFi ni gasometr\xEDa cuando el soporte es <strong>aire ambiente</strong>."
  },
  {
    title: "Insulina preprandial",
    body: "Esquema SC agrupado en Manejo, EA y censo \u2014 selecci\xF3n y suspensi\xF3n en bloque."
  },
  {
    title: "Borrados Nube en lote",
    body: "Los tombstones de pacientes se coalescen en un solo push; Diagn\xF3stico Nube actualiza pendientes en vivo. Worker Free guarda snapshot en JSON."
  },
  {
    title: "Tendencias / Cultivos",
    body: "Los paneles del expediente se remontan tras reset DOM \u2014 ya no quedan en blanco en escritorio."
  },
  {
    title: "Nube m\xE1s fiable",
    body: "Pull lee revisi\xF3n en D1 antes de KV; reintento en 503. Fetch Nube por IPC desde <strong>app://rplus</strong> \u2014 sin cambiar origen ni perder Recu\xE9rdame."
  }
];
var RELEASE_NOTES_811 = [
  {
    title: "Censo por Filtros",
    body: "En escritorio, R1\u2013R3 ven el censo completo y lo estrechan con <strong>Filtros</strong> (sala + equipo). El iPad sigue el espejo de equipo."
  },
  {
    title: "Borrado con permiso",
    body: "Admin/R4 pueden quitar cualquier expediente; el resto solo pacientes de su equipo. Si Nube lo borr\xF3 en otra Mac, esta pregunta antes de quitarlo aqu\xED."
  },
  {
    title: "Clinical-repo",
    body: "Escrituras locales primero (schema <strong>v23</strong>) y cola hacia Nube. Eventualidades y projector encendidos por defecto."
  },
  {
    title: "Estado Actual / SOAP",
    body: "Destino SOAP al clasificar meds, reclasificar que sobrevive al refresco, y ABX alineado con receta."
  },
  {
    title: "Recu\xE9rdame durable",
    body: "El token queda en el dispositivo (<strong>userData</strong>) y no se pierde al actualizar. No usar en Macs compartidas."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.1.1 en todas</strong> las Macs el mismo d\xEDa. Sin wipe; la migraci\xF3n a v23 corre al abrir. Worker de 8.1.0 sigue vigente."
  }
];
var RELEASE_NOTES_810 = [
  {
    title: "Censo cross-sala",
    body: "Expediente, labs y asignaciones van al room Nube de la <strong>sala del equipo</strong> \u2014 no solo la sala activa de tu Mac."
  },
  {
    title: "Tendencias con eventualidades",
    body: "Marcadores coloreados en gr\xE1ficas (transfusi\xF3n, biopsia, procedimiento) y alta con categor\xEDa/fecha desde Tendencias."
  },
  {
    title: "Reconciliaci\xF3n Nube",
    body: "Tras asignar paciente a equipo, pull autom\xE1tico si faltan expedientes en esta Mac (reemplaza reconcile LAN)."
  },
  {
    title: "Worker m\xE1s simple",
    body: "Eliminada cach\xE9 KV de revisi\xF3n \u2014 pull lee solo D1; menos complejidad y cupo KV."
  },
  {
    title: "Filtros de censo",
    body: "Barra de filtros anclada al sidebar; preferencias persisten al recrear la UI."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.1.0 en todas</strong> las Macs el mismo d\xEDa y despliega el Worker Nube."
  }
];
var RELEASE_NOTES_812 = [
  {
    title: "Paciente \u2192 Resumen",
    body: "Al abrir un expediente caes en <strong>Resumen</strong>: estado cl\xEDnico, labs del d\xEDa y medicamentos N/HD/HI. Labs, Tendencias y Cultivos viven bajo <strong>Laboratorio</strong>."
  },
  {
    title: "Labs por d\xEDa",
    body: "El historial se navega <strong>por fecha</strong> (no por cada env\xEDo). Dentro del d\xEDa, ventanas horarias como al consolidar. Nuevo panel <strong>FEB</strong> (febriles)."
  },
  {
    title: "SOAP y receta SOME",
    body: "Destino SOAP y packs <strong>IV\u2192VO</strong> desde el cat\xE1logo SOME. Reposici\xF3n de K puede ir mixta (KCl + KPO4 en la misma bolsa)."
  },
  {
    title: "Nube y actualizaciones",
    body: "El login pinta la sesi\xF3n en cuanto responde la API. Las b\xFAsquedas de update son <strong>silenciosas</strong> (arrancar / labs / paciente); el toast \xABya actualizado\xBB solo si buscaste en Ajustes."
  },
  {
    title: "Learn Hub v17",
    body: "Primero la estructura de la app, <strong>+ Agregar</strong> y completar cuarto/cama/servicio. Tendencias se ense\xF1a bajo Laboratorio."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.1.2 en todas</strong> las Macs el mismo d\xEDa. Sin wipe; schema v23 no cambia. Worker de 8.1.0 sigue vigente."
  }
];
var RELEASE_NOTES_813 = [
  {
    title: "Instrumento",
    body: "Botones ink, overlays que crecen desde el control (sin rebote) y chips neutros. Se quita la c\xE1psula <strong>+1 d\xEDa</strong> junto a Importar SOME."
  },
  {
    title: "SOME por Nube",
    body: "El turno env\xEDa el texto crudo; cada Mac reparsea si el set llega vac\xEDo. El historial por d\xEDa deja menos duplicados."
  },
  {
    title: "Censo \u2191/\u2193",
    body: "Flechas recorren el censo visible (no al escribir). En iPad, soltar sobre la tarjeta selecciona al paciente."
  },
  {
    title: "Nube / equipos",
    body: "Unirse o actualizar el perfil <strong>no borra</strong> asignaciones que el compa\xF1ero a\xFAn no hab\xEDa bajado. Hay que desplegar el Worker de 8.1.3."
  },
  {
    title: "macOS firmado",
    body: "El <code>.dmg</code> se firma con Developer ID y se notariza. En una Mac limpia no deber\xEDa hacer falta clic derecho \u2192 Abrir."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.1.3 en todas</strong> las Macs el mismo d\xEDa y despliega el Worker. Sin wipe; schema v23 no cambia."
  }
];
var RELEASE_NOTES_814 = [
  {
    title: "Nube \u2014 cifrado AES-256-GCM",
    body: "Cada snapshot se almacena cifrado en el Worker con <strong>AES-256-GCM</strong>. Blobs anteriores siguen siendo compatibles."
  },
  {
    title: "Actualizaci\xF3n bloqueante \u2014 descarga directa",
    body: "El modal de versi\xF3n m\xEDnima ahora muestra un bot\xF3n con el instalador correcto seg\xFAn plataforma: <strong>Mac Apple Silicon</strong>, <strong>Mac Intel</strong> o <strong>Windows</strong>."
  },
  {
    title: "Pegado de labs \u2014 sin duplicados SOME",
    body: "Al pegar m\xFAltiples tomas de gases del mismo d\xEDa, las secciones compartidas (EGO, etc.) ya no se repiten entre env\xEDos."
  },
  {
    title: "Censo \u2014 sync sin rechazos",
    body: "Diagn\xF3sticos y medicamentos ahora estampan el reloj al guardar; la Nube ya no rechaza la operaci\xF3n como obsoleta al hacer pull."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.1.4 en todas</strong> las Macs y PCs del turno el mismo d\xEDa."
  }
];
var RELEASE_NOTES_815 = [
  {
    title: "iPad \u2014 Vista ronda ya no esconde contenido",
    body: "Estado actual y Eventualidades ya no quedan ocultos debajo de labs. El panel ahora hace scroll en vez de cortar el contenido."
  },
  {
    title: "Atajo \u2318\u21E7C \u2014 copia seg\xFAn la pesta\xF1a activa",
    body: "Copia los labs de hoy de los pacientes fijados, o el estado actual si est\xE1s en esa pesta\xF1a, con un solo atajo de teclado."
  },
  {
    title: "Nube \u2014 un item atascado ya no detiene la cola",
    body: "Si un cambio falla al enviarse, los dem\xE1s cambios pendientes se siguen enviando en vez de congelar toda la cola."
  },
  {
    title: "Nube \u2014 labs grandes ya no se atascan",
    body: "Se baj\xF3 el m\xE1ximo de tama\xF1o de un op de labs para que siempre quepa en un env\xEDo a la Nube."
  },
  {
    title: "Dashboard de paciente m\xE1s compacto",
    body: "La tarjeta de signos vitales se ve mejor sin datos."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.1.5 en todas</strong> las Macs y PCs del turno el mismo d\xEDa."
  }
];
var RELEASE_NOTES_816 = [
  {
    title: "Estado actual \u2014 ya no cruza vitales de paciente",
    body: "La sincronizaci\xF3n en segundo plano pod\xEDa escribir los signos vitales de un paciente en la ficha de otro. Corregido."
  },
  {
    title: "Cultivos \u2014 ya no se duplican al actualizar",
    body: '"Actualizar" pod\xEDa crear una fila repetida del mismo cultivo. Ahora se identifica el mismo aislamiento y se conserva el reporte m\xE1s completo.'
  },
  {
    title: "EGO \u2014 deja de apilar un campo por l\xEDnea",
    body: "Un resultado con varios campos por l\xEDnea se le\xEDa mal y quedaba un campo por rengl\xF3n."
  },
  {
    title: "Egresos y censo \u2014 menos falsos positivos y duplicados",
    body: 'Una "E" a media palabra ya no dispara el detector de egresos; el censo ya no repite un mismo estudio de laboratorio.'
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.1.6 en todas</strong> las Macs y PCs del turno el mismo d\xEDa."
  }
];
var RELEASE_NOTES_817 = [
  {
    title: "Cerrar sesi\xF3n \u2014 ya no borra la sala",
    body: "Al cerrar sesi\xF3n en Nube se perd\xEDa el c\xF3digo de sala y hab\xEDa que volver a escribirlo. Ahora R+ lo recuerda para el siguiente inicio de sesi\xF3n."
  },
  {
    title: "Cultivos \u2014 encabezado ya no se pega al texto",
    body: 'En "UROCULTIVO", "HEMOCULTIVO" y similares, el encabezado a veces se ve\xEDa pegado al resto de la l\xEDnea ("UROCULTIVOPOR SONDA"). Corregido, texto y espaciado.'
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.1.7 en todas</strong> las Macs y PCs del turno. Si descargas la actualizaci\xF3n y dejas R+ inactivo (pantalla de bloqueo por inactividad), se instala sola sin interrumpir tu trabajo."
  }
];
var RELEASE_NOTES_818 = [
  {
    title: "Gasometr\xEDas \u2014 el AG/cAG ya no se pierde",
    body: "Si una toma del d\xEDa trae gasometr\xEDa sin Na/Cl/Alb propios, R+ ahora usa el electrolito s\xE9rico de la toma m\xE1s temprana del d\xEDa para seguir calculando el anion gap."
  },
  {
    title: "Aviso de borrado remoto \u2014 dice qui\xE9n lo borr\xF3",
    body: 'El mensaje "Quitar de esta Mac" ahora nombra al miembro del equipo (o "varios usuarios") que elimin\xF3 el paciente en Nube, en vez de "un admin" gen\xE9rico.'
  },
  {
    title: "Insulina prandial \u2014 ya no confunde basales",
    body: "Glargina, Lantus, Toujeo, Degludec, Tresiba, Detemir, Levemir y NPH ya no se detectan por error como dosis prandial."
  },
  {
    title: "Labs no se refrescaban solos",
    body: "Al pegar un reporte SOME nuevo o importar desde Drive, la pantalla pod\xEDa seguir mostrando el estudio anterior (a veces de otro paciente) hasta cambiar de paciente y regresar. Ahora se refresca de inmediato."
  },
  {
    title: "Calcio corregido (cCa) \u2014 nuevo",
    body: 'Cuando el reporte trae calcio y alb\xFAmina, R+ calcula y muestra el calcio corregido junto al calcio crudo. El anion gap corregido tambi\xE9n cambi\xF3 de nombre, de AGc a cAG (se lee igual que se dice: "corregido" antes del analito).'
  },
  {
    title: "Tendencias \u2014 20 gr\xE1ficas m\xE1s con rango de normalidad",
    body: "eTFG, Procalcitonina, VSG, T3 libre, Cortisol, PTH, Vitamina D, CK-MB, % saturaci\xF3n de transferrina, Factor Reumatoide, C3, C4, Amonio, Osmolaridad, Alb/Cr, Digoxina, AFP, CEA, PSA, Folato, Calprotectina y Etanol ya muestran su banda de normalidad."
  },
  {
    title: "INR \u2014 la banda de normalidad en Tendencias ya no se cruzaba con la de TTP",
    body: "Si el reporte no imprime rango propio para INR, R+ tomaba por error el rango de Tiempo de Tromboplastina (el siguiente estudio en el reporte) y la banda de normalidad quedaba invisible. Ya no."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.1.8 en todas</strong> las Macs y PCs del turno el mismo d\xEDa."
  }
];
var RELEASE_NOTES_819 = [
  {
    title: "Relaci\xF3n BUN/CR \u2014 nueva",
    body: "Cuando el reporte trae BUN y creatinina, R+ calcula y muestra la relaci\xF3n BUN/CR junto a ellos, en Qu\xEDmica Cl\xEDnica y en Tendencias."
  },
  {
    title: "Tendencias \u2014 copiar gr\xE1fica como imagen",
    body: "Cada panel de Tendencias tiene un bot\xF3n nuevo para copiar la gr\xE1fica (con t\xEDtulo y leyenda de series activas) como imagen PNG."
  },
  {
    title: "Tendencias \u2014 orden de leyenda por arrastre",
    body: "En los paneles agrupados, ahora puedes arrastrar los renglones de la leyenda para reordenar las series. R+ recuerda el orden por paciente y panel."
  },
  {
    title: "Actualiza el turno",
    body: "Instala <strong>8.1.9 en todas</strong> las Macs y PCs del turno el mismo d\xEDa."
  }
];
var RELEASE_NOTES_820 = [
  {
    title: "Llave de rescate para salas de Nube",
    body: "Si se pierde el c\xF3digo de una sala y ning\xFAn dispositivo tiene la llave en cach\xE9, el <strong>admin</strong> puede recuperarla con su propia llave."
  },
  {
    title: "Listas con animaci\xF3n",
    body: "Censo y pendientes: las filas nuevas entran con transici\xF3n y las que se quitan se desvanecen, sin saltos bruscos."
  },
  {
    title: "Fusi\xF3n de pacientes m\xE1s confiable",
    body: "La comparaci\xF3n de signos vitales entre dos registros ahora usa la hora real de guardado, evitando empates que perd\xEDan datos."
  }
];
var RELEASE_NOTES_821 = [
  {
    title: "Labs ya no se reenv\xEDan completos",
    body: 'Corrige un error que hac\xEDa que los labs "pesados" se re-sincronizaran enteros con Nube en cada sync, en vez de solo lo nuevo.'
  },
  {
    title: "Menos tr\xE1fico de Nube",
    body: "La cola de sincronizaci\xF3n deja de acumular lotes repetidos de labs ya enviados, as\xED que se vac\xEDa m\xE1s r\xE1pido."
  }
];
var RELEASE_NOTES_822 = [
  {
    title: "Tablero de interconsultas redise\xF1ado",
    body: 'En modo Interconsultas, la barra lateral se reemplaza por un tablero con 4 equipos (guardia, postguardia, activo x2) y columnas Preop/Nuevas hoy, Pendientes y Under. Un clic en un paciente abre su Resumen a pantalla completa; "\u2190 Tablero" o Esc regresa.'
  },
  {
    title: "Alta r\xE1pida desde el tablero",
    body: 'El bot\xF3n "+ Agregar" en el tablero de interconsultas da de alta un paciente nuevo sin esperar un laboratorio.'
  },
  {
    title: "Servicio solicitante y equipo editables",
    body: "Desde el Resumen del paciente ahora se puede elegir el servicio solicitante (mismo cat\xE1logo por categor\xEDas que Interconsultas en sala) y asignar el equipo con un selector r\xE1pido, sin salir de la pantalla."
  }
];
var RELEASE_NOTES_823 = [
  {
    title: "Instalador Mac firmado y notarizado",
    body: 'El DMG de 8.2.2 se public\xF3 sin firma de Apple: macOS lo bloqueaba con "R+ no se puede abrir". 8.2.3 corrige el proceso de release para firmar y notarizar el instalador antes de publicarlo.'
  },
  {
    title: "Verificaci\xF3n de firma antes de publicar",
    body: "El release ahora deja el DMG firmado y con el ticket de notarizaci\xF3n pegado (stapled), listo para abrir sin advertencias de Gatekeeper."
  }
];
var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_823;
var RELEASE_NOTES_HIGHLIGHTS = {
  "8.2.3": RELEASE_NOTES_823,
  "8.2.2": RELEASE_NOTES_822,
  "8.2.1": RELEASE_NOTES_821,
  "8.2.0": RELEASE_NOTES_820,
  "8.1.9": RELEASE_NOTES_819,
  "8.1.8": RELEASE_NOTES_818,
  "8.1.7": RELEASE_NOTES_817,
  "8.1.6": RELEASE_NOTES_816,
  "8.1.5": RELEASE_NOTES_815,
  "8.1.4": RELEASE_NOTES_814,
  "8.1.3": RELEASE_NOTES_813,
  "8.1.2": RELEASE_NOTES_812,
  "8.1.1": RELEASE_NOTES_811,
  "8.1.0": RELEASE_NOTES_810,
  "8.0.9": RELEASE_NOTES_809,
  "8.0.8": RELEASE_NOTES_808,
  "8.0.7": RELEASE_NOTES_807,
  "8.0.6": RELEASE_NOTES_806,
  "8.0.5": RELEASE_NOTES_805,
  "8.0.4": RELEASE_NOTES_804,
  "8.0.3": RELEASE_NOTES_803,
  "8.0.2": RELEASE_NOTES_802,
  "8.0.1": RELEASE_NOTES_801,
  "8.0.0": RELEASE_NOTES_800,
  "7.9.9": RELEASE_NOTES_799,
  "7.9.8": RELEASE_NOTES_798,
  "7.9.7": RELEASE_NOTES_797,
  "7.9.6": RELEASE_NOTES_796,
  "7.9.5": RELEASE_NOTES_795,
  "7.9.4": RELEASE_NOTES_794,
  "7.9.3": RELEASE_NOTES_793,
  "7.9.2": RELEASE_NOTES_792,
  "7.9.1": RELEASE_NOTES_791,
  "7.9.0": RELEASE_NOTES_790,
  "7.8.1": RELEASE_NOTES_781,
  "7.8.0": RELEASE_NOTES_780,
  "7.7.9": RELEASE_NOTES_779,
  "7.7.8": RELEASE_NOTES_778,
  "7.7.7": RELEASE_NOTES_777,
  "7.7.6": RELEASE_NOTES_776,
  "7.7.5": RELEASE_NOTES_775,
  "7.7.4": RELEASE_NOTES_774,
  "7.7.3": RELEASE_NOTES_773,
  "7.7.2": RELEASE_NOTES_772,
  "7.7.1": RELEASE_NOTES_771,
  "7.7.0": RELEASE_NOTES_770,
  "7.6.9": RELEASE_NOTES_769,
  "7.6.8": RELEASE_NOTES_768,
  "7.6.7": RELEASE_NOTES_767,
  "7.6.6": RELEASE_NOTES_766,
  "7.6.5": RELEASE_NOTES_765,
  "7.6.4": RELEASE_NOTES_764,
  "7.6.3": RELEASE_NOTES_763,
  "7.6.2": RELEASE_NOTES_762,
  "7.6.1": RELEASE_NOTES_761,
  "7.6.0": RELEASE_NOTES_760,
  "7.5.9": RELEASE_NOTES_759,
  "7.5.8": RELEASE_NOTES_758,
  "7.5.7": RELEASE_NOTES_757,
  "7.5.6": RELEASE_NOTES_756,
  "7.5.5": RELEASE_NOTES_755,
  "7.5.4": RELEASE_NOTES_754,
  "7.5.3": RELEASE_NOTES_753,
  "7.5.2": RELEASE_NOTES_752,
  "7.5.1": RELEASE_NOTES_751,
  "7.5.0": RELEASE_NOTES_750,
  "7.4.1": RELEASE_NOTES_741,
  "7.4.0": RELEASE_NOTES_740,
  "7.3.8": RELEASE_NOTES_738,
  "7.3.7": RELEASE_NOTES_737,
  "7.3.6": RELEASE_NOTES_736,
  "7.3.5": RELEASE_NOTES_735,
  "7.3.4": RELEASE_NOTES_734,
  "7.3.3": RELEASE_NOTES_733,
  "7.3.2": RELEASE_NOTES_732,
  "7.3.1": RELEASE_NOTES_731,
  "7.3.0": RELEASE_NOTES_730,
  "7.2.9": RELEASE_NOTES_729,
  "7.2.8": RELEASE_NOTES_728,
  "7.2.7": RELEASE_NOTES_727,
  "7.2.6": RELEASE_NOTES_726,
  "7.2.5": RELEASE_NOTES_725,
  "7.2.4": RELEASE_NOTES_724,
  "7.2.3": RELEASE_NOTES_723,
  "7.2.2": RELEASE_NOTES_722,
  "7.2.1": RELEASE_NOTES_721,
  "7.2.0": RELEASE_NOTES_720,
  "7.1.9": RELEASE_NOTES_719,
  "7.1.8": RELEASE_NOTES_718,
  "7.1.7": RELEASE_NOTES_717,
  "7.1.6": [
    {
      title: "LiveSync m\xE1s liviano en la red",
      body: "Al unirse un colega, cada Mac env\xEDa una <strong>pista de revisi\xF3n</strong> en lugar de un bundle WS grande. Las respuestas HTTP del turno van <strong>comprimidas</strong> cuando pesan m\xE1s de 2 KB."
    },
    {
      title: "Guardados por dominio",
      body: "<strong>Nota, indicaciones, laboratorios y campos</strong> se sincronizan por mutaci\xF3n tipada. El bundle completo de la sala queda para unirse, reconectar o un respaldo de <strong>30 s</strong> en dominios sin tipar."
    },
    {
      title: "OFFLINE y Reconectar",
      body: "Si el anfitri\xF3n no responde, \u21C4 entra en <strong>OFFLINE</strong>: sin escaneo en segundo plano. Toca <strong>Reconectar</strong> para un ping, vaciar la cola y volver a sincronizar."
    },
    {
      title: "Parche sobre 7.1.5",
      body: "Instala <strong>7.1.6 en todas</strong> las estaciones del turno. La base cl\xEDnica sube a esquema <strong>v14</strong> (outbox LAN ampliado). Macs en 7.1.5 siguen compatibles."
    }
  ],
  "7.1.5": RELEASE_NOTES_715,
  "7.1.4": RELEASE_NOTES_714,
  "7.1.3": RELEASE_NOTES_713,
  "7.1.2": RELEASE_NOTES_712,
  "7.1.1": RELEASE_NOTES_711,
  "7.1.0": RELEASE_NOTES_710,
  "7.0.3": RELEASE_NOTES_703,
  "7.0.2": RELEASE_NOTES_702,
  "7.0.1": RELEASE_NOTES_701,
  "6.7.0": RELEASE_NOTES_670,
  "6.6.9": RELEASE_NOTES_669,
  "6.6.8": RELEASE_NOTES_668,
  "6.6.7": RELEASE_NOTES_667,
  "6.6.6": RELEASE_NOTES_666,
  "6.6.5": RELEASE_NOTES_665,
  "6.6.4": [
    {
      title: "Enlace \u21C4 para iPad",
      body: "Copia un enlace <code>/join/req_\u2026</code> para abrir R+ en iPad en la misma red. Para guardia con sala en vivo, preferir <strong>6.6.7</strong>."
    },
    {
      title: "Arranque en chunks",
      body: "Contin\xFAa la mejora de arranque de <strong>6.6.3</strong> (menos c\xF3digo en el primer paint)."
    }
  ],
  "6.6.3": RELEASE_NOTES_663,
  "6.6.2": [
    {
      title: "LAN ward-ready",
      body: "<strong>Clinical-ops</strong> y directorio ya no dependen de subir el bundle completo del turno. La cola offline se drena con avisos claros si algo queda pendiente."
    },
    {
      title: "\u21C4 sin errores al sincronizar",
      body: "Correcciones al abrir expediente y al fusionar <strong>eventualidades</strong>. El anfitri\xF3n sirve historia cl\xEDnica del censo cuando a\xFAn no hay registro <code>hc:</code> dedicado."
    },
    {
      title: "Actualiza todo el turno",
      body: "Instala <strong>6.6.2 en todas</strong> las Macs y PCs el mismo d\xEDa. No mezcles <strong>6.6.1</strong> o anterior en la misma guardia."
    }
  ],
  "6.6.1": [
    {
      title: "LiveSync m\xE1s fiable",
      body: "El censo y datos de sala se publican por <strong>HTTP</strong> con menos bundles duplicados por Wi\u2011Fi. La cola offline vive en la <strong>base cifrada</strong> cuando est\xE1 desbloqueada. Al guardar <strong>@usuario</strong> ya no se corta el WebSocket en vivo."
    },
    {
      title: "\u21C4 diagn\xF3stico y anfitri\xF3n",
      body: "Panel <strong>Estado de sincronizaci\xF3n</strong> en \u21C4. Puedes <strong>fijar el anfitri\xF3n</strong> del turno. Si la sala solo se infiere de Ajustes, R+ pide confirmaci\xF3n antes de unirte."
    },
    {
      title: "Actualiza todo el turno",
      body: "Instala <strong>6.6.1 en todas</strong> las Macs y PCs del turno el mismo d\xEDa. No mezcles <strong>6.6.0</strong> y <strong>6.6.1</strong> en la misma guardia \u2014 el censo puede no verse en equipos viejos."
    }
  ],
  "6.6.0": [
    {
      title: "@usuario sin depender de \u21C4",
      body: "Puedes <strong>registrar @usuario</strong> y guardar tu perfil <strong>sin sala en vivo</strong> si no hay red. Cuando vuelva el Wi\u2011Fi, abre <strong>\u21C4</strong>, \xFAnete a tu sala y guarda de nuevo para publicar en el directorio del turno."
    },
    {
      title: "Directorio LAN e iPad",
      body: "Mejoras de <strong>directorio</strong> y sync de perfiles (6.5.9 + cloud). Al <strong>copiar enlace para iPad</strong> se genera un ticket nuevo. En <strong>labs</strong>, copia varios d\xEDas desde el men\xFA del historial."
    },
    {
      title: "Recomendaci\xF3n de turno",
      body: "Actualiza <strong>todas</strong> las Macs y PCs del turno a <strong>6.6.0</strong>. En Windows, permite R+ en el firewall (puerto <strong>3738</strong>) la primera vez en sala."
    }
  ],
  "6.5.9": [
    {
      title: "Directorio y sync LAN (Mac y Windows)",
      body: "El <strong>directorio LAN</strong> muestra usuarios de <strong>todas las salas</strong>, carga sin quedarse en \xABCargando\u2026\xBB, y al sincronizar \u21C4 <strong>no se pierden</strong> los @usuario entre versiones o PCs Windows."
    },
    {
      title: "@usuario publicado al guardar",
      body: "Si ya tienes LAN, debes tener la sala <strong>\u21C4</strong> activa (o unirte por invitaci\xF3n) <strong>antes</strong> de registrar @usuario. Al guardar perfil, R+ lo <strong>publica al turno</strong> de inmediato \u2014 no solo en tu Mac."
    },
    {
      title: "Entrega, equipos y Windows",
      body: "<strong>Modo Entrega</strong>: plantillas y + procedimiento. <strong>Mi rotaci\xF3n</strong>: eliminar equipo corregido. En <strong>Windows</strong>, todo el turno en 6.5.9 y firewall (3738) la primera vez en sala."
    }
  ],
  "6.5.8": [
    {
      title: "Interno m\xF3vil (QR de sala)",
      body: "Admin/R4 generan un <strong>QR por sala</strong> para que los MIP registren signos y glucometr\xEDas en el celular. Los datos llegan a <strong>Estado actual</strong> y al <strong>Modo Guardia</strong> del residente."
    },
    {
      title: "Entrega y rollback",
      body: "<strong>Modo Entrega</strong> con pendientes estructurados (estudios/procedimientos y plantillas). Si una actualizaci\xF3n falla, en <strong>Ajustes \u2192 Aplicaci\xF3n</strong> puedes <strong>restaurar una versi\xF3n estable anterior</strong> sin perder tu base cl\xEDnica."
    }
  ],
  "6.5.7": [
    {
      title: "Sync LAN de equipos",
      body: "Al conectar la sala \u21C4 se sincronizan <strong>equipos</strong>, <strong>usuarios LAN</strong> y <strong>eventualidades</strong> entre Macs. Compatible con una Mac en 6.5.6 (stubs de usuario hasta el perfil completo)."
    },
    {
      title: "Eventualidades en vivo",
      body: "Las eventualidades de ambas Macs se fusionan por paciente; al guardar una se dispara sync \u21C4 adem\xE1s del host REST."
    }
  ],
  "6.5.6": [
    {
      title: "Mi rotaci\xF3n",
      body: "Equipos por sala, <strong>tu ciclo</strong> en cada equipo (R1/R2), agregar integrantes por usuario LAN e <strong>invitaci\xF3n por c\xF3digo</strong> para la app del Mac (no Safari)."
    },
    {
      title: "Conflictos de sincronizaci\xF3n",
      body: "Al refrescar ya no se abre el comparador una y otra vez: el conflicto queda en <strong>Ajustes \u2192 LAN</strong>. Si el texto se ve igual, R+ se alinea con la sala; si no, el modal es m\xE1s claro y ancho."
    }
  ],
  "6.5.5": [
    {
      title: "Reparaci\xF3n para 6.5.4",
      body: "Si tras actualizar a <strong>6.5.4</strong> ves \xABnative binding\xBB o la base no abre, usa <strong>Ajustes \u2192 Reinstalar actualizaci\xF3n de reparaci\xF3n (6.5.5)</strong> en canal <strong>Estable</strong>. Tus datos locales se conservan."
    },
    {
      title: "Instalador corregido",
      body: "Esta versi\xF3n repite las novedades de 6.5.4 (identidad LAN, equipos, arranque sin contrase\xF1a) con el empaquetado nativo completo en Mac Intel y Apple Silicon."
    }
  ],
  "6.5.4": [
    {
      title: "Arranque sin contrase\xF1a",
      body: "R+ ya <strong>no pide contrase\xF1a maestra</strong> al abrir. El almac\xE9n cl\xEDnico se abre solo en este equipo. Si antes quedaste atascado en la pantalla de desbloqueo, actualiza a esta versi\xF3n."
    },
    {
      title: "Configura tu rotaci\xF3n",
      body: "Al abrir la base ver\xE1s el asistente en el <strong>centro de la pantalla</strong>: usuario LAN, equipos de tu sala y unirte o crear equipo. Tambi\xE9n en la barra lateral y en <strong>Mi Perfil</strong> \u2192 <strong>Mi rotaci\xF3n</strong>."
    },
    {
      title: "Equipos sin \u201CGuardia hoy\u201D",
      body: "Los <strong>equipos</strong> son unidades persistentes de sala/ciclo: cr\xE9alos o \xFAnete sin marcar guardia del d\xEDa en el equipo. Los pacientes se asocian por <strong>coincidencia estructural</strong>."
    },
    {
      title: "R4 / Admin: filtros censo",
      body: "<strong>R4</strong> y <strong>Admin</strong> ven filtros <strong>Sala / Equipo / Servicio</strong> en la barra lateral (colapsables). <strong>R1\u2013R3</strong> no ven ese bloque; su lista sigue el alcance cl\xEDnico."
    }
  ],
  "5.6.3": [
    {
      title: "Laboratorio y pacientes",
      body: "Al cambiar de paciente el laboratorio se limpia y el historial se expande. Orden de tarjetas por <strong>arrastre</strong> (SortableJS) y vista de ronda m\xE1s compacta."
    },
    {
      title: "Modo Pase y receta",
      body: "Vista <strong>Pase</strong> con agenda y pendientes en fila; dosis de medicaci\xF3n solo antes de <code>//</code>; chips compactos en UI grandes."
    },
    {
      title: "Actualizaciones",
      body: "Canal <strong>Estable</strong> por defecto; pre-releases solo si lo activas en Ajustes."
    }
  ],
  "6.5.2": [
    {
      title: "Recuperaci\xF3n de contrase\xF1a",
      body: "Si olvidas tu contrase\xF1a maestra, haz clic en <strong>\xBFOlvidaste tu contrase\xF1a?</strong> en la pantalla de desbloqueo e ingresa el <strong>c\xF3digo de recuperaci\xF3n</strong> que R+ te mostr\xF3 al configurar la base (es \xFAnico de esta instalaci\xF3n)."
    },
    {
      title: "Llave de respaldo autom\xE1tica",
      body: "Cada vez que desbloqueas la base, se guarda autom\xE1ticamente una copia cifrada (AES-256-GCM) de tu llave; no requiere configuraci\xF3n manual."
    },
    {
      title: "Modo Guardia (prototipo)",
      body: "El <strong>Modo Guardia</strong> est\xE1 en desarrollo y <strong>a\xFAn no funciona</strong> para uso cl\xEDnico real. Es un prototipo funcional. No lo uses para decisiones cl\xEDnicas."
    }
  ],
  "6.5.1": [
    {
      title: "Perfil farmacoterap\xE9utico",
      body: "En <strong>Medicamentos \u2192 Perfil hist\xF3rico</strong>: calendario mensual SOME, marcas <strong>no administrado</strong>, adherencia por fila y merge desde <strong>Receta</strong>."
    },
    {
      title: "Datos cl\xEDnicos cifrados",
      body: "En escritorio, pacientes y expediente viven en una base <strong>SQLCipher</strong> con contrase\xF1a maestra; migraci\xF3n autom\xE1tica la primera vez que desbloqueas."
    },
    {
      title: "Auditor\xEDa y respaldos",
      body: "<strong>Verificar cadena</strong> de integridad en Ajustes; export/import del almac\xE9n cifrado desde <strong>Respaldos, sync y recuperaci\xF3n</strong>."
    },
    {
      title: "Sala en vivo",
      body: "El perfil se sincroniza en <strong>\u21C4</strong>; <strong>borradores de conflicto</strong> en el panel LAN hasta resolver cambios simult\xE1neos."
    }
  ],
  "6.5.0": [
    {
      title: "Historia Cl\xEDnica (Sala)",
      body: "Formulario institucional en <strong>3 pasos</strong> con cat\xE1logos APP, AHF e IPAS; vista <strong>Lectura</strong> con narrativa compilada; ancla de labs de ingreso y sync en <strong>\u21C4</strong>."
    },
    {
      title: "Eventualidades y Cl\xEDnico reorganizado",
      body: "En <strong>Sala</strong>, <strong>Cl\xEDnico</strong> agrupa <strong>Historia Cl\xEDnica \u2192 Estado actual \u2192 Eventualidades \u2192 Manejo</strong>. Bit\xE1cora cl\xEDnica por d\xEDa en <strong>Eventualidades</strong>."
    },
    {
      title: "Word sin Python",
      body: "<strong>Nota</strong>, <strong>Indicaciones</strong> y <strong>Listado</strong> se generan en Node; el instalador ya no depende de Python para esos <code>.docx</code>."
    },
    {
      title: "Sala en vivo m\xE1s robusta",
      body: "Fusi\xF3n por <strong>versi\xF3n</strong> de entidad, cola de escritura en el anfitri\xF3n y panel de <strong>conflictos</strong> con borrador local hasta resolver."
    }
  ],
  "6.4.2": [
    {
      title: "Censo PDF en instalador",
      body: "La exportaci\xF3n de <strong>censo PDF</strong> vuelve a incluirse correctamente en el build de escritorio."
    },
    {
      title: "Arranque",
      body: "Correcci\xF3n menor que imped\xEDa abrir la app en algunos instaladores recientes."
    }
  ],
  "6.4.1": [
    {
      title: "Misma base que 6.4.0",
      body: "VPO, formatos en Nota/Indicaciones, censo PDF y el resto de <strong>6.4.0</strong> sin pantallas nuevas; versi\xF3n de mantenimiento."
    },
    {
      title: "Publicaci\xF3n m\xE1s segura",
      body: "<code>release:publish</code> comprueba tag y release en GitHub antes del build para evitar repetir <strong>6.4.0</strong> por error."
    },
    {
      title: "Tests al publicar",
      body: "Correcci\xF3n en censo PDF para que la bater\xEDa de tests pase en Node durante el release."
    }
  ],
  "6.4.0": [
    {
      title: "Valoraci\xF3n preoperatoria (VPO)",
      body: "Nueva pesta\xF1a <strong>VPO</strong> con calculadora ASA, RCRI, Gupta, ARISCAT y Caprini; EKG/Rx editables; f\xE1rmacos perioperatorios desde la receta SOME y bloques para copiar."
    },
    {
      title: "Procedimiento y diagn\xF3sticos",
      body: "Cat\xE1logo <strong>Gupta</strong> con b\xFAsqueda; diagn\xF3sticos importables desde la nota; botones para tomar labs y signos del expediente sin pisar lo escrito."
    },
    {
      title: "Formatos en Nota e Indicaciones",
      body: "Desde <strong>Mi Perfil</strong>, edita plantillas en blanco en las pesta\xF1as del expediente (misma vista que al atender) y pulsa <strong>Guardar</strong> al final."
    }
  ],
  "6.3.6": [
    {
      title: "Cultivos multipaciente",
      body: "Varios <strong>MICROORGANISMO</strong> en un informe SOME: <strong>una fila por aislamiento</strong> en Cultivos, con cuenta y antibiograma (R/I/S) por germen."
    },
    {
      title: "Preliminar y resistencia",
      body: "Cabecera <strong>Preliminar</strong> sin ATB; marcas <strong>BLEE</strong>, <strong>Carb-R</strong> y <strong>BLAC</strong> por aislamiento; alertas en <strong>Manejo \u2192 ATB</strong>."
    },
    {
      title: "Sala en vivo \u2014 anfitri\xF3n suplente",
      body: "Si el anfitri\xF3n cierra R+ o deja de responder, otra <strong>Mac o Windows</strong> con R+ de escritorio (enlace de invitaci\xF3n) asume el servidor hasta que vuelva; el equipo reconecta solo cuando puede."
    }
  ],
  "6.3.5": [
    {
      title: "Bomba de insulina (switch)",
      body: "Interruptor como en <strong>Vista de laboratorio</strong>: activado solo filas con <strong>unidades</strong>; apagado, glucometr\xEDas normales."
    },
    {
      title: "Sala en vivo \u2014 Unirse",
      body: "Corregido <strong>Unirse</strong> en la lista de salas: el bot\xF3n vuelve a responder al primer clic."
    }
  ],
  "6.3.4": [
    {
      title: "Estado Actual \u2014 multilectura",
      body: "Hasta <strong>4 lecturas</strong> del mismo signo vital en el turno con bot\xF3n <strong>+1</strong> en T\xB0, TA, FC, FR y SatO\u2082; hora opcional por lectura."
    },
    {
      title: "Bomba de insulina",
      body: "Registro opcional de glu + unidades + hora; el texto SOAP incluye <strong>BOMBA DE INSULINA</strong> cuando aplica."
    },
    {
      title: "Expediente y Sala en vivo",
      body: "Al cambiar de paciente conservas la pesta\xF1a (<strong>Estado actual</strong>, Tendencias\u2026). Corregido <strong>Copiar invitaci\xF3n</strong> en \u21C4."
    }
  ],
  "6.3.3": [
    {
      title: "Gu\xEDa cl\xEDnica",
      body: "<strong>Manejo</strong> oculto hasta confirmar con la frase del modal; <strong>Nota</strong> e <strong>Indicaciones</strong> siguen en Cl\xEDnico."
    },
    {
      title: "Modales",
      body: "<strong>Esc</strong> y clic en el fondo vuelven a cerrar ayuda, laboratorio, perfil, Estado Actual y capas anidadas."
    },
    {
      title: "Tendencias y gasometr\xEDa",
      body: "Interpretaci\xF3n extendida con <strong>razonamiento</strong> y tooltips; sparks ligeros; filtro <strong>Solo fuera de rango</strong>."
    }
  ],
  "6.3.2": [
    {
      title: "Pegar monitoreo",
      body: "En <strong>Estado Actual</strong>, pega T\xB0, FC, TA, DXT, I, E y EVAC; el balance resta todas las salidas en cc (ignora <strong>B:</strong>)."
    },
    {
      title: "Egresos en el SOAP",
      body: "Diuresis, drenajes y nefrostom\xEDas se listan por separado en el texto; evacuaciones con <strong>NC</strong> o frase libre."
    },
    {
      title: "Receta y pendientes",
      body: "Receta hospitalaria por paciente; pendientes <strong>Repo</strong> eliminados o hechos no reaparecen tras reiniciar ni con LiveSync."
    }
  ],
  "6.3.1": [
    {
      title: "Cultivos y micobacterias",
      body: "Secreci\xF3n de herida con par\xE9ntesis en el nombre, reportes <strong>MYCOBACTERIAS</strong> (baciloscopia + cultivo) y muestra desde <strong>OBSERVACIONES</strong> vuelven a reflejarse bien en <strong>Cultivos</strong>."
    },
    {
      title: "Gasometr\xEDa venosa / mixta",
      body: "pH, PCO2 y HCO3 aunque los flags A/B vayan en l\xEDneas separadas; la interpretaci\xF3n puede incluir trastorno metab\xF3lico concomitante."
    },
    {
      title: "Estado Actual",
      body: "Cuadritos de signos vitales sin artefactos en las esquinas."
    }
  ],
  "6.3.0": [
    {
      title: "Sala en vivo m\xE1s simple",
      body: "En Mac: sin pesta\xF1as Anfitri\xF3n/Cliente; <strong>Activar sala en vivo</strong>, crear o unirse a salas y compartir el enlace. Opci\xF3n para unirse a la sala de otra computadora."
    },
    {
      title: "Reconexi\xF3n estable",
      body: "Corregido el estado <strong>reconectando\u2026</strong> que pod\xEDa quedarse fijo al reconectar LiveSync en la misma sala."
    },
    {
      title: "Sesiones guardadas",
      body: "Si ya est\xE1s en una sala, el bot\xF3n muestra <strong>En sala</strong> en lugar de <strong>Unirse</strong>."
    }
  ],
  "6.2.1": [
    {
      title: "Expediente m\xE1s fluido",
      body: "Menos pausa al cambiar de paciente y al volver a <strong>Estado actual</strong> o <strong>Resultados</strong>. La app carga el frontend en un solo bundle y reutiliza paneles ya pintados."
    },
    {
      title: "Ocultar solo Manejo",
      body: "En <strong>Mi Perfil \u2192 Expediente</strong>, <strong>Ocultar Manejo en Cl\xEDnico</strong> deja visibles Nota e Indicaciones en Interconsulta; solo quita el segmento Manejo."
    },
    {
      title: "Correcci\xF3n Sala",
      body: "En modo Sala, la pesta\xF1a <strong>Resultados</strong> ya no muestra el formulario de Nota encima de Tendencias."
    }
  ],
  "6.2.0": [
    {
      title: "Estado Actual en Sala",
      body: "Nueva pesta\xF1a <strong>Estado actual</strong> en el expediente: signos vitales, glucometr\xEDas, balance h\xEDdrico, historial, gr\xE1ficas y texto cl\xEDnico copiable. Bot\xF3n verde en el encabezado para abrir el panel."
    },
    {
      title: "Laboratorio \u2014 salida r\xE1pida",
      body: "En <strong>Vista de laboratorio</strong> (engranaje) puedes activar <strong>Salida r\xE1pida</strong> para formatear SOME sin tener al paciente en tu lista."
    },
    {
      title: "Expediente m\xE1s \xE1gil",
      body: "Menos lag al cambiar pesta\xF1as: carga diferida de Manejo, Tendencias y gr\xE1ficas; precarga al pasar el mouse y cach\xE9 al volver a una pesta\xF1a ya visitada."
    }
  ],
  "6.1.0": [
    {
      title: "Manejo: Infusiones, ATB y CAD/EHH",
      body: "Expediente \u2192 Cl\xEDnico \u2192 <strong>Manejo</strong> ahora incluye cuatro sub-pesta\xF1as. <strong>Infusiones</strong> (vasopresores, sedaci\xF3n y calculadoras), <strong>ATB</strong> (cat\xE1logo con sugerencias seg\xFAn cultivos) y <strong>CAD/EHH</strong> (checklist ADA con lectura de laboratorio), adem\xE1s de <strong>Electrolitos</strong>."
    },
    {
      title: "ATB asistido",
      body: "Filtra por familia o indicaci\xF3n, revisa dosis y ajuste renal desde laboratorios recientes, y copia la indicaci\xF3n SOME sin +Pendiente."
    },
    {
      title: "Pesta\xF1as cl\xEDnicas unificadas",
      body: "Nota, Indicaciones y las sub-pesta\xF1as de Manejo comparten la misma barra subrayada para navegar el expediente con menos fricci\xF3n."
    }
  ],
  "6.0.1": [
    {
      title: "Laboratorio: entrada masiva",
      body: "Pega varios reportes SOME en el mismo cuadro. Varios d\xEDas del mismo paciente van seguidos; entre pacientes distintos usa Separador de paciente. Al procesar pegados masivos, la vista previa muestra pacientes, d\xEDas y errores antes de guardar."
    },
    {
      title: "Receta HU \u2192 PDF",
      body: "Exportaci\xF3n PDF con plantilla oficial HU 000-061-R-06-12 desde el servidor local de R+."
    },
    {
      title: "Tutorial actualizado",
      body: "El tour usa dos d\xEDas de laboratorio de DEMO P\xC9REZ (alta en el censo al procesar) y explica el separador multi-paciente con ejemplo DEMO GARC\xCDA."
    }
  ],
  "6.0.0": [
    {
      title: "Expediente en 4 pesta\xF1as",
      body: "Paciente, Cl\xEDnico, Resultados y Salida \u2014 en Sala (Manejo; Salida: Listado + Receta HU) e Interconsulta (Nota, Indicaciones, Manejo + Receta HU). Datos del paciente en bloque colapsable."
    },
    {
      title: "Modo Pase sin cambios en el resumen",
      body: "El tablero de ronda se ve igual que antes. Al abrir el detalle en pesta\xF1as (vista Normal) entras al expediente reorganizado."
    },
    {
      title: "Manejo cl\xEDnico",
      body: "Expediente \u2192 Cl\xEDnico \u2192 <strong>Manejo</strong>: cuatro sub-pesta\xF1as \u2014 <strong>Electrolitos</strong> (alteraciones con SOME copiable), <strong>Infusiones</strong> (infusiones y sedaci\xF3n con calculadoras), <strong>ATB</strong> (cat\xE1logo con sugerencias seg\xFAn cultivos positivos) y <strong>CAD/EHH</strong> (checklist ADA con lectura de laboratorio). Receta HU exporta PDF oficial; en Sala e Interconsulta est\xE1 en Expediente \u2192 Salida."
    }
  ],
  "5.2.1": [
    {
      title: "Interfaz Arc",
      body: "C\xE1scara flotante con esquinas radiales, paneles unificados y rail discreto cuando ocultas la barra de pacientes."
    },
    {
      title: "Correcciones UX",
      body: "Agenda con un solo panel; pesta\xF1a Datos sin perder el foco al escribir; esquinas alineadas con sidebar auto-oculto."
    }
  ],
  "5.2.0": [
    {
      title: "Tutorial Sala",
      body: "Tour guiado de paciente, laboratorio y tendencias desde Aprender R+."
    }
  ],
  "5.1.0": [
    {
      title: "Tablas del reporte SOME",
      body: "Tras procesar un SOME, abre el modal desde Resultados: cada departamento en tabla con flags de alerta y secciones plegables."
    },
    {
      title: "Copiar TSV o PNG por departamento",
      body: "Desde el modal, copia una secci\xF3n entera al portapapeles como tabla (TSV) o imagen (PNG) para pegar en notas o mensajes."
    },
    {
      title: "Parser SOME m\xE1s fiable",
      body: "Mejor lectura de EGO, citoqu\xEDmico de l\xEDquidos y qu\xEDmica; menos filas basura. Historial de labs m\xE1s estable al restaurar respaldos."
    }
  ],
  "5.0.4": [
    {
      title: "Historial de labs reparado",
      body: "Corrige respaldos con historial mal formado que imped\xEDan abrir Laboratorio (error forEach en sets corruptos)."
    }
  ],
  "5.0.3": [
    {
      title: "Copiar labs en Windows",
      body: "Tras procesar un reporte ver\xE1s Copiar en Resultados y el bot\xF3n flotante; en Windows queda por encima de la barra de tareas."
    },
    {
      title: "Tendencias al estilo SOME",
      body: "Las gr\xE1ficas de BH y qu\xEDmica sangu\xEDnea siguen el orden del informe; m\xE1s par\xE1metros de diferencial listos para mostrar."
    }
  ],
  "5.0.2": [
    {
      title: "C\xF3digo m\xE1s modular",
      body: "La app arranca desde un bootstrap liviano; laboratorio, pacientes, Pase y ajustes viven en m\xF3dulos separados para mantener y probar m\xE1s f\xE1cil."
    },
    {
      title: "Pase y pacientes corregidos",
      body: "Tras el refactor: selecci\xF3n en la lista, guardado de pacientes y resumen Modo Pase vuelven a mostrarse al elegir un expediente."
    }
  ],
  "5.0.1": [
    {
      title: "Diferencial manual y BH legible",
      body: "SOME con diferencial manual: Segmentados, bandas y coagulaci\xF3n en salida clara (Dif. / Coag.), sin confundir con biometr\xEDa autom\xE1tica ni EGO."
    },
    {
      title: "Tendencias BH y gr\xE1fica fullscreen",
      body: "Panel Diferencial manual en gr\xE1ficas y tablas con nombres del reporte. Modal Gr\xE1fica del estudio a pantalla completa."
    },
    {
      title: "LiveSync: borrados en la sala",
      body: "Al quitar un pendiente o eliminar un paciente en la sala \u21C4, el cambio se aplica en todos los equipos conectados."
    }
  ],
  "3.5.0": [
    {
      title: "Gr\xE1fica y tabla por estudio",
      body: "En Tendencias, pulsa \xABGr\xE1fica\xBB en un estudio (BH, QS, gases\u2026): tendencias agrupadas por panel y tabla copiable (PNG o TSV)."
    },
    {
      title: "Paneles, t\xEDtulos y cierre unificado",
      body: "Reordena u oculta paneles; edita el t\xEDtulo de cada gr\xE1fica con un clic. Todas las ventanas se cierran con Esc o clic fuera (sin botones \xD7 / Cerrar)."
    }
  ],
  "3.4.1": [
    {
      title: "Sugerencias cl\xEDnicas desde laboratorio",
      body: "Al procesar labs, R+ puede agregar un pendiente autom\xE1tico si Hb < 7 g/dL (transfusi\xF3n). Las reposiciones electrol\xEDticas no se agregan solas: usa Manejo \u2192 Electrolitos y el bot\xF3n + Pendiente. Sin duplicar la misma regla el mismo d\xEDa."
    },
    {
      title: "Medicamentos: +1 d\xEDa (DIA#)",
      body: "Bot\xF3n +1 d\xEDa en Medicamentos para incrementar el d\xEDa de tratamiento sin volver a pegar del hospital (todos los \xEDtems con DIA# activos)."
    }
  ],
  "3.4.0": [
    {
      title: "R+ M\xF3vil (Safari, misma Wi\u2011Fi)",
      body: "Abre el enlace m\xF3vil en iPad o tel\xE9fono: la misma interfaz R+ que en escritorio (sin generar Word). Sincroniza pacientes, labs, pendientes y agenda por sala LiveSync. Copia el enlace en \u21C4 \u2192 Copiar enlace m\xF3vil."
    },
    {
      title: "Tutorial: LiveSync al terminar",
      body: "Al completar el recorrido Sala o Interconsulta, el tutorial explica \u21C4, salas en vivo y la versi\xF3n m\xF3vil."
    }
  ],
  "3.3.2": [
    {
      title: "LAN: c\xF3digo 1234 y expediente en sala",
      body: "El c\xF3digo de equipo por defecto es 1234. Al unirte a una sala \u21C4 se fusionan pacientes, notas, laboratorios, agenda y pendientes entre el equipo, sin borrar los pacientes que solo existen en tu R+."
    },
    {
      title: "Copiar labs (3.3.1)",
      body: "Copiar en Resultados vuelve a usar el texto compacto de R+, no el informe crudo de SOME."
    }
  ],
  "3.3.1": [
    {
      title: "Copiar labs corregido",
      body: "El bot\xF3n Copiar en Resultados vuelve a copiar el texto compacto de R+ (BH, QS, gases, etc.), no el informe crudo pegado desde SOME con tablas y flags sueltos."
    }
  ],
  "3.3.0": [
    {
      title: "LiveSync por sala",
      body: "Al unirte a una sala LAN (\u21C4), la agenda de procedimientos y los pendientes del expediente se comparten en tiempo real con el equipo en esa sala. Al salir se guarda un snapshot local para reconciliar al volver."
    },
    {
      title: "Copiar prompt IA (Listado)",
      body: "En Listado de problemas, el bot\xF3n Copiar prompt IA lleva al portapapeles la plantilla para generar el listado activo/inactivo y planes iniciales en un chat externo."
    }
  ],
  "3.2.2": [
    {
      title: "Actualizaciones en canal Estable",
      body: "Con Estable seleccionado en Ajustes, la app vuelve a detectar releases oficiales en GitHub (incluido salto desde versiones 3.0.x). Al cambiar de canal se busca de nuevo. El aviso Pre-release solo aparece en borradores reales de GitHub."
    },
    {
      title: "Laboratorio (BH, Copiar, asteriscos)",
      body: "BH compacta sin l\xEDnea extendida; bot\xF3n Copiar en Resultados; valores alterados con * al copiar. Ver detalle en notas de 3.2.1 si vienes de 3.2.0."
    }
  ],
  "3.2.1": [
    {
      title: "Laboratorio: BH compacta y Copiar visible",
      body: "Con BH extendida apagada, la primera l\xEDnea solo lleva Hb, Hto, VCM, HCM, Leu, Neu, Eos y Plt (m\xE1s coag si aplica); RBC, CHCM, RDW, MPV y reticulocitos van a la segunda l\xEDnea solo cuando activas la preferencia. El bot\xF3n Copiar del encabezado de Resultados vuelve a verse en densidad de interfaz normal."
    },
    {
      title: "Alterados con asterisco al copiar",
      body: "El texto generado para portapapeles y nota conserva el * en valores fuera de rango. En pantalla el asterisco aparece en rojo junto al valor; se evita copiar el texto \u201C, alterado\u201D al seleccionar los resultados."
    }
  ],
  "3.2.0": [
    {
      title: "Interfaz \u201Csoft\u201D y rendimiento",
      body: "Superficies s\xF3lidas (sin vidrio animado pesado para la GPU), sombras m\xE1s ligeras, lista de pacientes y tarjetas sin desplazamientos costosos al hacer hover; bot\xF3n principal en degradados solo violeta (--action)."
    },
    {
      title: "Tutorial: Modo Pase en ambos flujos",
      body: "El recorrido guiado para Sala y para Interconsulta incluye el mismo paso de vista Pase (resumen de ronda); despu\xE9s el tour contin\xFAa en pesta\xF1as completas. Versi\xF3n estable 3.2."
    }
  ],
  "3.0.2": [
    {
      title: "Gasometr\xEDa e historial",
      body: "Delta-delta e interpretaci\xF3n cl\xEDnica cuando hay datos. Reprocesar desde el historial usando el texto guardado y deduplicaci\xF3n al consolidar entradas muy similares."
    },
    {
      title: "Laboratorio al cambiar de paciente",
      body: "Se limpian los resultados del paciente anterior, el historial se expande y la vista hace scroll a la tarjeta del paciente seleccionado."
    },
    {
      title: "Listado de Problemas (.docx)",
      body: "Cada problema va en su propia tabla para evitar cortes entre p\xE1ginas; el texto largo en a) b) c) se parte en p\xE1rrafos m\xE1s cortos con cortes en frases."
    },
    {
      title: "Tutorial y Mac",
      body: "El panel del tour queda por encima del contenido resaltado en el paso del listado. En Apple Silicon, si no hay Python embebido, se prioriza Homebrew en /opt/homebrew."
    }
  ],
  "3.0.1": [
    {
      title: "Procalcitonina (PCT)",
      body: "El bloque de Estudios Especiales se procesa: la procalcitonina aparece en QS junto a PCR y se marca cuando excede el l\xEDmite de adulto (por defecto 0.05 ng/mL). Disponible tambi\xE9n como serie en Tendencias."
    },
    {
      title: "Listado de Problemas en 8 pt",
      body: "El texto din\xE1mico del .docx (fecha, n\xFAmero, descripci\xF3n) ahora sale en 8 pt para que entren m\xE1s problemas por hoja sin romper el template."
    }
  ],
  "3.0.0": [
    {
      title: "Modos Sala / Interconsulta",
      body: "El expediente cambia seg\xFAn tu rol. En Mi Perfil eliges Sala o Interconsulta. Sala oculta Nota e Indicaciones, expone Estado Actual y Listado de Problemas, y usa Servicio (con default configurable) en lugar de \xC1rea. Los datos del paciente se editan en la pesta\xF1a <strong>Datos</strong> del expediente."
    },
    {
      title: "Estado Actual",
      body: "En Sala, pesta\xF1a <strong>Estado Actual</strong>: vitales estructurados, glu, balance I/O, tendencias y confirmaci\xF3n frente a receta hospitalaria; <strong>Copiar</strong> / <strong>Guardar y copiar</strong>. El bot\xF3n verde del encabezado sigue abriendo la plantilla sin subjetivo."
    },
    {
      title: "Listado de Problemas",
      body: "Pesta\xF1a nueva con Activos e Inactivos sin l\xEDmite, drag-and-drop, fechas por problema y generador .docx con numeraci\xF3n a) b) c) de Word, t\xEDtulos en negritas y firma editable (m\xE9dicos por defecto se configuran en Mi Perfil)."
    },
    {
      title: "Anion gap en gasometr\xEDa",
      body: "AG (Na \u2212 (Cl + HCO3)) se calcula desde Na y Cl de Qu\xEDmica Sangu\xEDnea o Electrolitos S\xE9ricos; si no hay qu\xEDmica, no se muestra. Se marca cuando cae fuera de 8\u201312 mEq/L."
    },
    {
      title: "Calcio ionizado",
      body: "El bloque de gases extrae Ca++ ionizado desde Observaciones y lo marca seg\xFAn rango."
    },
    {
      title: "Tutorial m\xE1s actionable",
      body: "El tour navega a la zona correcta, resalta el control y espera tu acci\xF3n antes de avanzar. Dock peque\xF1o y semitransparente en la esquina; clic en la barra colapsada para expandirlo. Aviso preventivo si guardas un paciente sin expediente."
    },
    {
      title: "Salida r\xE1pida ramificada",
      body: "En Sala exporta Listado de Problemas (.docx) si hay datos. En Interconsulta exporta Nota igual que antes."
    }
  ],
  "2.4.1": [
    {
      title: "Medicamentos (nombre + d\xEDa) en formato compacto",
      body: "La salida resumida ahora usa formato corto: medicamento, dosis, v\xEDa abreviada, frecuencia abreviada y d\xEDa de uso (por ejemplo: MEROPENEM 2G IV C/8H DIA 2)."
    },
    {
      title: "Tendencias: hover del \xFAltimo punto",
      body: "En la mini-gr\xE1fica ampliada ya aparece el tooltip con la fecha y el valor cuando pasas el cursor sobre el \xFAltimo punto de la serie."
    }
  ],
  "2.4.0": [
    {
      title: "Sidebar de pacientes renovado",
      body: "Nueva organizaci\xF3n del listado con Pinned/Fijados, archivado de pacientes y reordenamiento por arrastrar y soltar con animaci\xF3n m\xE1s fluida."
    },
    {
      title: "Interacci\xF3n y limpieza visual",
      body: "Mi Perfil se abre tocando R+ en el encabezado. Se simplificaron acciones de cada tarjeta para un layout m\xE1s limpio y se ajustaron scrollbars transl\xFAcidos sin barras horizontales innecesarias en el sidebar."
    },
    {
      title: "Nuevos parsers de laboratorio",
      body: "R+ ahora procesa Fisicoqu\xEDmico de heces y Frotis de sangre perif\xE9rica para que esos resultados se integren al flujo cl\xEDnico."
    }
  ],
  "2.3.1": [
    {
      title: "Tendencias y cultivos",
      body: "El panel de tendencias solo incluye analitos de laboratorio convencional (biometr\xEDa, qu\xEDmica, electrolitos, etc.). Los bloques de urocultivo, hemocultivo y similares dejan de aparecer como gr\xE1ficas; siguen en la pesta\xF1a Cultivos del expediente."
    }
  ],
  "2.3.0": [
    {
      title: "Tendencias por tipo de estudio",
      body: "Las gr\xE1ficas se agrupan por secci\xF3n (biometr\xEDa, qu\xEDmica, gases, LCR, etc.) y puedes colapsar cada bloque. El mismo analito no se mezcla entre paneles distintos (por ejemplo hematocrito de biometr\xEDa frente al de gasometr\xEDa)."
    },
    {
      title: "Cat\xE1logo amplio y series ocultas",
      body: "M\xE1s analitos en tendencias; puedes ocultar cada gr\xE1fica con el \xEDcono del ojo. Los ocultos aparecen en una barra con chips, \xABMostrar todos\xBB y la barra se puede colapsar (se recuerda tu preferencia)."
    },
    {
      title: "Gasometr\xEDa",
      body: "Si el bloque de gases incluye hematocrito, tambi\xE9n se extrae para tendencias en esa secci\xF3n."
    }
  ],
  "2.2.1": [
    {
      title: "Tutorial y ayuda al d\xEDa",
      body: "El recorrido Sala / Interconsulta incluye un paso de <strong>Modo Pase</strong> (resumen de ronda) en ambos flujos; el modal inicial y el tour explican Sincronizar y Consolidar en el historial, la pesta\xF1a Cultivos, tendencias y duplicados en Ajustes \u2192 Laboratorio. El mini-tour de Laboratorio incluye un paso sobre el historial."
    },
    {
      title: "Consolidar, m\xE1s claro",
      body: "El mensaje de confirmaci\xF3n y el tooltip del bot\xF3n Consolidar describen en lenguaje sencillo cu\xE1ndo se fusionan env\xEDos del mismo d\xEDa (solo laboratorio o solo cultivos) y qu\xE9 pasa con los conjuntos mixtos."
    }
  ],
  "2.2.0": [
    {
      title: "Pesta\xF1a Cultivos en el expediente",
      body: "Tabla con hemocultivo, urocultivo, cat\xE9ter, Gram y fungicultivo: agrupada por tipo y ordenada del m\xE1s reciente al m\xE1s antiguo; arriba un resumen de cultivos negativos."
    },
    {
      title: "Historial y tendencias",
      body: "Consolidar estudios del mismo d\xEDa (solo labs o solo cultivos), mejor clasificaci\xF3n de bloques de cultivo, tendencias sin puntos duplicados y fechas al copiar labs."
    }
  ],
  "2.1.2": [
    {
      title: "Duplicados en historial de labs",
      body: "Sincronizar desde Laboratorio o revisar todos los pacientes en Ajustes \u2192 Laboratorio; se quitan entradas repetidas y se mantiene la copia m\xE1s antigua."
    },
    {
      title: "Expediente al pegar el reporte",
      body: "Si el texto trae un registro que coincide con otro paciente, R+ cambia a ese paciente. Si el registro no est\xE1 en la lista, no se guarda el lab en el historial del activo por error."
    }
  ],
  "2.1.1": [
    {
      title: "Cultivos polimicrobianos",
      body: "Cuando el informe lista varios microorganismos (urocultivo u otros), cada aislamiento se resume con su antibiograma y su cuenta UFC."
    }
  ],
  "2.1.0": [
    {
      title: "Cultivos y antibiograma",
      body: "Tipo de cultivo y muestra en el resumen; marcas de resistencia (BLEE, carbapenemasas, etc.); antibiograma compacto solo con R, I y ESBL."
    },
    {
      title: "Citoqu\xEDmico de l\xEDquidos",
      body: "Se procesa el bloque de l\xEDquidos corporales (Liq:) sin mezclar esos valores con la qu\xEDmica de suero."
    },
    {
      title: "Barra lateral",
      body: "La lista de pacientes hace scroll por dentro; Mi Perfil y Guardar perfil siguen al alcance."
    }
  ],
  "2.0.1": [
    {
      title: "Modal de actualizaci\xF3n",
      body: "Las notas de la nueva versi\xF3n se muestran como texto legible dentro de la app, sin etiquetas HTML visibles."
    }
  ],
  "2.0.0": [
    {
      title: "Medicamentos y plantilla SOAP",
      body: "Nueva pesta\xF1a Medicamentos: importa la receta en TSV, copia desde SOME, vuelca a tratamiento o a la plantilla SOAP. Cat\xE1logo de clasificaci\xF3n exportable e importable desde Ajustes."
    },
    {
      title: "Ajustes y recuperaci\xF3n de datos",
      body: "Panel en secciones plegables, centro de ayuda arriba, scroll corregido. Deshacer usa copia en memoria fiable; respaldo autom\xE1tico antes de importar todo, restaurable desde Respaldos."
    },
    {
      title: "Laboratorio y tutorial",
      body: "Mejoras en historial de laboratorio y recorridos Sala e Interconsulta, con gu\xEDas m\xE1s claras en el centro de ayuda."
    }
  ]
};

// public/js/features/settings-help/release-notes-close.mjs
var RELEASE_NOTES_SEEN_PREFIX = "rpc-release-notes-seen-";
function closeReleaseNotes(devForceShow) {
  var el = document.getElementById("release-notes-backdrop");
  if (!el) return;
  var v = el.getAttribute("data-version");
  el.classList.remove("open");
  el.setAttribute("aria-hidden", "true");
  if (v && !devForceShow) {
    try {
      localStorage.setItem(RELEASE_NOTES_SEEN_PREFIX + v, "1");
    } catch {
    }
  }
}

// public/js/features/settings-help/release-notes.mjs
var RELEASE_NOTES_DEV_FORCE_SHOW = false;
var RELEASE_NOTES_SEEN_PREFIX2 = "rpc-release-notes-seen-";
function normalizeReleaseVersion(v) {
  return String(v || "").trim().replace(/^v/i, "");
}
function getCuratedReleaseNotes(v) {
  var key = normalizeReleaseVersion(v);
  if (key && RELEASE_NOTES_HIGHLIGHTS[key]) return RELEASE_NOTES_HIGHLIGHTS[key];
  if (!key) return RELEASE_NOTES_HIGHLIGHTS_DEFAULT;
  return null;
}
function stripHtmlFromReleaseBody(html) {
  var raw = html == null ? "" : String(html);
  if (!raw.trim()) return "";
  try {
    var el = document.createElement("div");
    el.innerHTML = raw;
    return (el.textContent || "").replace(/\s+/g, " ").trim();
  } catch {
    return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
}
function releaseNoteBodyHtml(raw) {
  return raw == null ? "" : String(raw);
}
function formatHighlightsPlain(notes) {
  if (!notes || !notes.length) return "";
  return notes.map(function(n) {
    var title = n.title ? String(n.title).trim() : "";
    var body = stripHtmlFromReleaseBody(n.body || "");
    if (title && body) return title + " \u2014 " + body;
    return title || body;
  }).filter(Boolean).join("\n\n");
}
function formatCuratedReleaseNotesPlain(version) {
  return formatHighlightsPlain(getCuratedReleaseNotes(version));
}
function formatUpdaterReleaseNotesPlain(targetVersion, rawNotesFallback) {
  var curated = formatCuratedReleaseNotesPlain(targetVersion);
  if (curated) return curated;
  var fallback = stripHtmlFromReleaseBody(rawNotesFallback || "");
  if (fallback) return fallback;
  return formatCuratedReleaseNotesPlain("");
}
function maybeShowReleaseNotesFor(version, prevVersion) {
  if (!version || !prevVersion || prevVersion === version) return;
  try {
    if (localStorage.getItem(RELEASE_NOTES_SEEN_PREFIX2 + version)) return;
  } catch {
    return;
  }
  setTimeout(function() {
    showReleaseNotesModal(version);
  }, 150);
}
function initReleaseNotesDevPreviewIfEnabled(version) {
  if (!RELEASE_NOTES_DEV_FORCE_SHOW || !version) return;
  try {
    localStorage.removeItem(RELEASE_NOTES_SEEN_PREFIX2 + version);
  } catch {
  }
  setTimeout(function() {
    showReleaseNotesModal(version);
  }, 400);
}
var releaseNotesDismissWired = false;
function wireReleaseNotesDismiss() {
  if (releaseNotesDismissWired) return;
  releaseNotesDismissWired = true;
  var bd = document.getElementById("release-notes-backdrop");
  if (!bd) return;
  bd.addEventListener("click", function(ev) {
    if (!bd.classList.contains("open")) return;
    var panel = bd.querySelector(".release-notes-modal");
    if (panel && panel.contains(ev.target)) return;
    closeReleaseNotes(RELEASE_NOTES_DEV_FORCE_SHOW);
  });
  document.addEventListener(
    "keydown",
    function(ev) {
      if (ev.key !== "Escape" && ev.key !== "Esc") return;
      if (!bd.classList.contains("open")) return;
      ev.preventDefault();
      ev.stopPropagation();
      closeReleaseNotes(RELEASE_NOTES_DEV_FORCE_SHOW);
    },
    true
  );
}
function syncReleaseNotesGuardiaCta() {
  var actions = document.querySelector(".release-notes-actions");
  if (!actions) return;
  var existing = document.getElementById("release-notes-open-guardia-guide");
  if (existing) existing.remove();
  var cur = typeof window !== "undefined" ? window.__RPC_APP_VERSION__ : "";
  var prev = typeof window !== "undefined" ? window.__RPC_PREV_APP_VERSION__ : "";
  if (!cur || !prev) return;
  void import("/mobile/js/chunks/guardia-v7-gating-HBE5TIHB.js").then(function(gating) {
    void import("/mobile/js/chunks/guardia-v7-progress-HEZKRSIW.js").then(function(progress) {
      if (!gating.shouldOfferGuardiaV7Education({
        prevVersion: prev,
        curVersion: cur,
        needsOnboarding: false,
        trackComplete: progress.isGuardiaV7TrackComplete()
      })) {
        return;
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-edit-templates release-notes-guardia-guide-btn";
      btn.id = "release-notes-open-guardia-guide";
      btn.textContent = "Abrir gu\xEDa de guardia";
      btn.addEventListener("click", function() {
        closeReleaseNotes(RELEASE_NOTES_DEV_FORCE_SHOW);
        void import("/mobile/js/chunks/learn-hub-BWAQVDU3.js").then(function(hub) {
          if (typeof hub.openLearnHub === "function") {
            hub.openLearnHub({ focusTrack: "guardia-v7" });
          }
        });
      });
      var primary = actions.querySelector(".release-notes-dismiss-btn");
      if (primary) actions.insertBefore(btn, primary);
      else actions.appendChild(btn);
    });
  });
}
function showReleaseNotesModal(version) {
  wireReleaseNotesDismiss();
  var el = document.getElementById("release-notes-backdrop");
  if (!el) return;
  var title = document.getElementById("release-notes-title");
  if (title) title.textContent = "Novedades de R+";
  var list = document.getElementById("release-notes-list");
  if (list) {
    var notes = getCuratedReleaseNotes(version);
    list.innerHTML = "";
    notes.forEach(function(n) {
      var li = document.createElement("li");
      li.className = "release-notes-item";
      var titleEl = document.createElement("p");
      titleEl.className = "release-notes-item-title";
      titleEl.textContent = n.title || "";
      li.appendChild(titleEl);
      var bodyEl = document.createElement("p");
      bodyEl.className = "release-notes-item-body";
      bodyEl.innerHTML = releaseNoteBodyHtml(n.body);
      li.appendChild(bodyEl);
      list.appendChild(li);
    });
  }
  syncReleaseNotesGuardiaCta();
  el.classList.add("open");
  el.setAttribute("aria-hidden", "false");
  el.setAttribute("data-version", version);
  setTimeout(function() {
    var panel = el.querySelector(".release-notes-modal");
    if (panel) panel.focus();
  }, 50);
}

export {
  closeReleaseNotes,
  RELEASE_NOTES_DEV_FORCE_SHOW,
  formatCuratedReleaseNotesPlain,
  formatUpdaterReleaseNotesPlain,
  maybeShowReleaseNotesFor,
  initReleaseNotesDevPreviewIfEnabled
};
//# sourceMappingURL=/js/chunks/chunk-MUGTURPY.js.map
