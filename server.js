const express = require('express');
const http    = require('node:http');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const { execSync } = require('child_process');
const { fillRecetaHuPdf } = require('./generate-receta-hu.js');
const { renderCensusPdf } = require('./generate-censo.js');
const { generateNoteBuffer } = require('./lib/doc-generators/note.js');
const { generateIndicacionesBuffer } = require('./lib/doc-generators/indicaciones.js');
const { generateListadoBuffer } = require('./lib/doc-generators/listado.js');
const { sendDocxBuffer } = require('./lib/doc-export-http.js');
const { logDocExport } = require('./lib/doc-export-audit.js');
const { createHostStore } = require('./lan-squad/host-store.js');
const { createLanRouter } = require('./lan-squad/host-router.js');
const { attachWsHub } = require('./lan-squad/ws-hub.js');
const { createConflictResolver } = require('./lan-squad/conflict-resolver.js');
const { bootstrapLanTeamCode } = require('./lan-squad/effective-team-code.js');
const { createTicketStore } = require('./lan-squad/ticket-store.js');
const { createAuthRouter } = require('./lan-squad/auth-router.js');
const { redactUrlSecrets, redactForLog } = require('./lan-squad/redact-secrets.js');
const { createDocumentExportAuthMiddleware } = require('./lib/server-http-security.js');
const { resolveAllowedOutputDir } = require('./lib/output-dir-policy.js');
const { createInternoRouter } = require('./lib/interno/interno-router.js');
const rateLimit = require('express-rate-limit');

const appExpress = express();
appExpress.use(express.json({ limit: '2mb' }));

const rateLimitHandler = (_req, res) => {
  res.status(429).json({ error: 'rate_limit_exceeded' });
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

appExpress.use(globalLimiter);

appExpress.use((req, _res, next) => {
  req.__safeForLog = {
    method: req.method,
    path: redactUrlSecrets(req.originalUrl || req.url || ''),
  };
  next();
});

const LAN_HTTP_PORT = 3738;

function isPrivateIpv4Host(host) {
  const h = String(host || '').split(':')[0];
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (!m) return false;
  const a = +m[1];
  const b = +m[2];
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

/** Permite fetch/WebSocket desde el mismo host (p. ej. iPad en http://192.168.x.x:3738). */
function isAllowedLanCorsOrigin(originUrl, requestHost) {
  if (!originUrl || !requestHost) return false;
  const oh = String(originUrl.host || '').toLowerCase();
  const rh = String(requestHost || '').toLowerCase();
  if (oh === rh) return true;
  if (oh === `localhost:${LAN_HTTP_PORT}` || oh === `127.0.0.1:${LAN_HTTP_PORT}`) return true;
  const reqIp = rh.split(':')[0];
  const originIp = String(originUrl.hostname || '').toLowerCase();
  if (isPrivateIpv4Host(originIp) && isPrivateIpv4Host(reqIp)) return true;
  return false;
}

appExpress.use((req, res, next) => {
  const rawOrigin = req.headers.origin;
  if (rawOrigin) {
    try {
      const originUrl = new URL(rawOrigin);
      if (isAllowedLanCorsOrigin(originUrl, req.headers.host)) {
        res.setHeader('Access-Control-Allow-Origin', rawOrigin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Interno-Token, X-Interno-Sala');
      }
    } catch (_e) {
      // Ignore malformed Origin headers and continue normal handling.
    }
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

appExpress.get('/join', (_req, res) => {
  res.redirect(302, '/mobile/');
});

appExpress.get('/join/:ticketId', (req, res) => {
  if (!/^req_[a-f0-9]{12}$/i.test(String(req.params.ticketId || ''))) {
    return res.status(404).send('Invalid join link');
  }
  res.sendFile(path.join(__dirname, 'public', 'mobile', 'join.html'));
});

const INTERNO_SLUGS = ['sala-1', 'sala-2', 'sala-e'];
for (const slug of INTERNO_SLUGS) {
  appExpress.get(`/interno/${slug}`, (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'interno', 'index.html'));
  });
}

appExpress.get('/health', (_req, res) => {
  try {
    res.json({ ok: true, app: 'r-plus' });
  } catch (e) {
    try { res.status(500).json({ ok: false, error: (e && e.message) || 'health failed' }); }
    catch (_inner) { /* response already broken; nothing else to do */ }
  }
});
appExpress.use(express.static(path.join(__dirname, 'public')));

const DOWNLOADS = path.join(os.homedir(), 'Downloads');
const userData = process.env.R_PLUS_USER_DATA || require('node:os').tmpdir();
const lanStatePath = path.join(userData, 'lan-squad-host-state.json');

let lanBoot;
try {
  lanBoot = bootstrapLanTeamCode({ userDataPath: userData, hostStatePath: lanStatePath });
} catch (e) {
  console.error('[lan]', redactForLog({ message: e && e.message, code: e && e.code }));
  process.exit(1);
}

appExpress.locals.lanRequiresMigrationNotice = lanBoot.requiresMigrationNotice;
const LAN_TEAM_CODE = lanBoot.token;

const lanDbManager =
  typeof globalThis !== 'undefined' && globalThis.__rplusDbManager
    ? globalThis.__rplusDbManager
    : null;
if (lanBoot.rotated && lanDbManager && typeof lanDbManager.schedulePendingAudit === 'function') {
  lanDbManager.schedulePendingAudit('lan.token.rotate', { reason: 'weak_token_rotation' });
}
const lanStore = createHostStore({
  filePath: lanStatePath,
  teamCodePlain: LAN_TEAM_CODE,
  dbManager: lanDbManager,
});
const ticketStore = createTicketStore({ getHostToken: () => LAN_TEAM_CODE });
const getLanHostUrl = () => `http://localhost:${LAN_HTTP_PORT}`;

const documentExportAuth = createDocumentExportAuthMiddleware(() => lanStore.getState());

function safeName(str) {
  return (str || '').replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]/g, '_');
}

const SCRIPTS_DIR = __dirname.includes('app.asar')
  ? __dirname.replace('app.asar', 'app.asar.unpacked')
  : __dirname;

function resolveExportDirFromBody(outputDir) {
  try {
    return resolveAllowedOutputDir(outputDir, {
      userDataPath: userData,
      downloadsPath: DOWNLOADS,
    });
  } catch (e) {
    if (e && e.code === 'OUTPUT_DIR_NOT_ALLOWED') {
      const err = new Error('La carpeta de exportación no está autorizada. Configúrala en Mi Perfil.');
      err.code = 'OUTPUT_DIR_NOT_ALLOWED';
      throw err;
    }
    if (e && e.code === 'OUTPUT_DIR_NOT_WRITABLE') {
      const err = new Error('No se puede escribir en la carpeta seleccionada.');
      err.code = 'OUTPUT_DIR_NOT_WRITABLE';
      throw err;
    }
    throw e;
  }
}

appExpress.post('/generate', generateLimiter, documentExportAuth, async (req, res) => {
  const { patient, note } = req.body;
  if (!patient || !note) return res.status(400).json({ error: 'Missing patient or note' });
  try {
    const buf = await generateNoteBuffer({ patient, note });
    const fileName = `Nota_Evolucion_${safeName(patient.nombre)}_${safeName(note.fecha || '')}.docx`;
    sendDocxBuffer(res, { buf, fileName, type: 'nota', patient });
  } catch (e) {
    logDocExport({ type: 'nota', patient, status: 500, error: e && e.message });
    if (!res.headersSent) {
      res.status(500).json({ error: 'No se pudo generar el documento. Intenta de nuevo.' });
    }
  }
});

appExpress.post('/generate-indicaciones', generateLimiter, documentExportAuth, async (req, res) => {
  const { patient, indicaciones } = req.body;
  if (!patient || !indicaciones) {
    return res.status(400).json({ error: 'Missing patient or indicaciones' });
  }
  try {
    const buf = await generateIndicacionesBuffer({ patient, indicaciones });
    const fileName = `Indicaciones_${safeName(patient.nombre)}_${safeName(indicaciones.fecha || '')}.docx`;
    sendDocxBuffer(res, { buf, fileName, type: 'indicaciones', patient });
  } catch (e) {
    logDocExport({ type: 'indicaciones', patient, status: 500, error: e && e.message });
    if (!res.headersSent) {
      res.status(500).json({ error: 'No se pudo generar el documento. Intenta de nuevo.' });
    }
  }
});

appExpress.post('/generate-listado', generateLimiter, documentExportAuth, async (req, res) => {
  const { patient, listado, medicos } = req.body;
  if (!patient || !listado) return res.status(400).json({ error: 'Missing patient or listado' });
  try {
    const buf = await generateListadoBuffer({
      patient,
      listado,
      medicos: medicos || {},
    });
    const now = new Date();
    const stamp = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('-');
    const fileName = `Listado_Problemas_${safeName(patient.nombre)}_${safeName(listado.fecha || '')}_${stamp}.docx`;
    sendDocxBuffer(res, { buf, fileName, type: 'listado', patient });
  } catch (e) {
    logDocExport({ type: 'listado', patient, status: 500, error: e && e.message });
    if (!res.headersSent) {
      res.status(500).json({ error: 'No se pudo generar el documento. Intenta de nuevo.' });
    }
  }
});

appExpress.post('/generate-censo', generateLimiter, documentExportAuth, async (req, res) => {
  const { header, rows, outputDir, servicio } = req.body;
  if (!Array.isArray(rows) || !rows.length) {
    return res.status(400).json({ error: 'No hay pacientes para el censo.' });
  }
  let dest;
  try {
    dest = resolveExportDirFromBody(outputDir);
  } catch (e) {
    return res.status(400).json({ error: (e && e.message) || 'Carpeta no válida.' });
  }
  try {
    const buf = await renderCensusPdf({ header: header || {}, rows });
    const now = new Date();
    const stamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    const fileName = `Censo_${safeName(servicio || (header && header.servicio) || 'guardia')}_${stamp}.pdf`;
    fs.writeFileSync(path.join(dest, fileName), buf);
    res.json({ ok: true, fileName });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo generar el documento. Intenta de nuevo.' });
  }
});

appExpress.post('/generate-receta-hu', generateLimiter, documentExportAuth, async (req, res) => {
  const { patient, receta, doctorName, cedulaProfesional, outputDir } = req.body;
  if (!patient) return res.status(400).json({ error: 'Missing patient' });
  let dest;
  try {
    dest = resolveExportDirFromBody(outputDir);
  } catch (e) {
    return res.status(400).json({ error: (e && e.message) || 'Carpeta no válida.' });
  }
  try {
    const payload = Object.assign({}, receta || {}, {
      patient,
      doctorName: doctorName || '',
      cedulaProfesional: cedulaProfesional || '',
    });
    const buf = await fillRecetaHuPdf(payload, SCRIPTS_DIR);
    const fileName = `Receta_HU_${safeName(patient.nombre)}_${safeName(receta && receta.fecha ? receta.fecha : '')}.pdf`;
    fs.writeFileSync(path.join(dest, fileName), buf);
    res.json({ ok: true, fileName });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo generar el documento. Intenta de nuevo.' });
  }
});

// LAN squad (host): escucha en el puerto de abajo en todas las interfaces; los clientes
// usan http://<IP-de-esta-PC>:3738. Abre el puerto en el firewall del SO si no conecta.
// Código de equipo: variable R_PLUS_LAN_TEAM_CODE o primer línea de userData/lan-team-code.txt
// (tras cambiar el archivo, reinicia R+). Red local de confianza; sin TLS en LAN.
const PORT = LAN_HTTP_PORT;

function portInUseProcessHint(port) {
  try {
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, { encoding: 'utf8' }).trim();
    if (!out) return '';
    const pid = out.split('\n')[0];
    let detail = '';
    try {
      detail = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' }).trim();
    } catch (_e) {
      /* ignore */
    }
    return detail ? ` (PID ${pid}: ${detail})` : ` (PID ${pid})`;
  } catch (_e) {
    return '';
  }
}
const authExchangeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const authTicketLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const authRouter = createAuthRouter({
  ticketStore,
  getHostToken: () => LAN_TEAM_CODE,
  getHostUrl: getLanHostUrl,
  getRequiresMigrationNotice: () => Boolean(appExpress.locals.lanRequiresMigrationNotice),
});

const httpServer = http.createServer(appExpress);
const lanResolver = createConflictResolver({ store: lanStore });
const { broadcast } = attachWsHub(httpServer, {
  getState: () => lanStore.getState(),
  resolver: lanResolver,
});

appExpress.use('/api/lan/v1', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/auth/exchange') {
    return authExchangeLimiter(req, res, next);
  }
  if (req.method === 'POST' && req.path === '/auth/tickets') {
    return authTicketLimiter(req, res, next);
  }
  next();
});
appExpress.use('/api/lan/v1', authRouter);
appExpress.use('/api/lan/v1', createLanRouter({ store: lanStore, broadcast, resolver: lanResolver }));

function getClinicalDbForInterno() {
  if (!lanDbManager || typeof lanDbManager.isUnlocked !== 'function') return null;
  if (!lanDbManager.isUnlocked()) return null;
  return typeof lanDbManager.getDb === 'function' ? lanDbManager.getDb() : null;
}

appExpress.use(
  '/api/interno/v1',
  createInternoRouter({
    store: lanStore,
    getDb: getClinicalDbForInterno,
    broadcastSync: broadcast,
    httpServer: httpServer,
  })
);

appExpress.use((err, req, res, _next) => {
  console.error('[express]', redactForLog({
    message: err && err.message,
    code: err && err.code,
    ...(req.__safeForLog || {}),
  }));
  if (!res.headersSent) res.status(500).json({ error: 'internal_error' });
});

const server = httpServer.listen(PORT, () => {
  console.log(`R+ → http://localhost:${PORT}`);
});

module.exports = new Promise((resolve, reject) => {
  server.once('listening', () => resolve(server));
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      reject(new Error(
        `El puerto ${PORT} ya está en uso${portInUseProcessHint(PORT)}. ` +
          'Cierra la otra instancia de R+ (o el proceso que escucha en ese puerto) y vuelve a abrir la aplicación. ' +
          'En macOS/Linux: lsof -nP -iTCP:' + PORT + ' -sTCP:LISTEN'
      ));
    } else {
      reject(err);
    }
  });
});
