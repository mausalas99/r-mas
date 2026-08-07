const express = require('express');
const http = require('node:http');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const docExport = require('./lib/doc-export-service.js');
const { sendDocxBuffer, sendPdfBuffer } = require('./lib/doc-export-http.js');
const { logDocExport } = require('./lib/doc-export-audit.js');
const {
  createDocumentExportAuthMiddleware,
  shouldSkipGlobalRateLimit,
  shouldSkipGlobalJsonBodyParser,
} = require('./lib/server-http-security.js');
const { createInternoRouter, broadcastInterno } = require('./lib/interno/interno-router.js');
const { createInternoHostStoreFromDb } = require('./lib/interno/host-store-db.cjs');
const { createEquiposRouter } = require('./lib/equipos/equipos-router.js');
const { scheduleEquiposPhotoPurge } = require('./lib/equipos/equipos-photo-purge.mjs');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const appExpress = express();
const globalJsonBodyParser = express.json({ limit: '2mb' });
appExpress.use((req, res, next) => {
  if (shouldSkipGlobalJsonBodyParser(req)) return next();
  return globalJsonBodyParser(req, res, next);
});

const LAN_HTTP_PORT = Number(process.env.R_PLUS_LAN_HTTP_PORT) || 3738;

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

function applyLanCorsHeaders(req, res) {
  const rawOrigin = req.headers.origin;
  if (!rawOrigin) return;
  try {
    const originUrl = new URL(rawOrigin);
    if (isAllowedLanCorsOrigin(originUrl, req.headers.host)) {
      res.setHeader('Access-Control-Allow-Origin', rawOrigin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Interno-Token, X-Interno-Sala, X-Equipos-Token'
      );
    }
  } catch (_e) {
    /* ignore malformed Origin */
  }
}

appExpress.use((req, res, next) => {
  applyLanCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

appExpress.use((_req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
  next();
});

const rateLimitHandler = (req, res) => {
  applyLanCorsHeaders(req, res);
  res.status(429).json({ error: 'rate_limit_exceeded' });
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: shouldSkipGlobalRateLimit,
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
    path: String(req.originalUrl || req.url || ''),
  };
  next();
});

appExpress.get('/join', (_req, res) => {
  res.redirect(302, '/mobile/');
});

appExpress.get('/join/:ticketId', (_req, res) => {
  res.redirect(302, '/mobile/');
});

const INTERNO_SLUGS = ['sala-1', 'sala-2', 'sala-e'];
for (const slug of INTERNO_SLUGS) {
  appExpress.get(`/interno/${slug}`, (_req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'interno', 'index.html'));
  });
}

appExpress.get('/equipos', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'equipos', 'index.html'));
});

appExpress.get('/health', (_req, res) => {
  try {
    res.json({ ok: true, app: 'r-plus' });
  } catch (e) {
    try {
      res.status(500).json({ ok: false, error: (e && e.message) || 'health failed' });
    } catch (_inner) {
      /* response already broken */
    }
  }
});

appExpress.use('/js', (req, res, next) => {
  if (/\.(mjs|js|css)(\?|$)/i.test(req.path || '')) {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
  }
  next();
});

appExpress.get('/manifest.webmanifest', (_req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(__dirname, 'public', 'manifest.webmanifest'));
});
appExpress.use(express.static(path.join(__dirname, 'public')));

const DOWNLOADS = path.join(os.homedir(), 'Downloads');
const userData = process.env.R_PLUS_USER_DATA || require('node:os').tmpdir();
const equiposPhotosDir = path.join(userData, 'equipos-photos');

const { getLanDbManager } = require('./lib/db/lan-db-bridge.cjs');
const lanDbManager = getLanDbManager();

const documentExportAuth = createDocumentExportAuthMiddleware(() => ({}));

function docExportHttpError(res, e, meta) {
  if (meta) logDocExport(Object.assign({ status: 500, error: e && e.message }, meta));
  if (e && e.code === 'BAD_REQUEST') {
    return res.status(400).json({ error: e.message });
  }
  if (e && (e.code === 'OUTPUT_DIR_NOT_ALLOWED' || e.code === 'OUTPUT_DIR_NOT_WRITABLE')) {
    return res.status(400).json({ error: e.message });
  }
  if (!res.headersSent) {
    res.status(500).json({ error: 'No se pudo generar el documento. Intenta de nuevo.' });
  }
}

appExpress.post('/generate', generateLimiter, documentExportAuth, async (req, res) => {
  const { patient, note } = req.body;
  try {
    const { buffer, fileName } = await docExport.exportNoteDocx({ patient, note });
    sendDocxBuffer(res, { buf: buffer, fileName, type: 'nota', patient });
  } catch (e) {
    docExportHttpError(res, e, { type: 'nota', patient });
  }
});

appExpress.post('/generate-indicaciones', generateLimiter, documentExportAuth, async (req, res) => {
  const { patient, indicaciones } = req.body;
  try {
    const { buffer, fileName } = await docExport.exportIndicacionesDocx({ patient, indicaciones });
    sendDocxBuffer(res, { buf: buffer, fileName, type: 'indicaciones', patient });
  } catch (e) {
    docExportHttpError(res, e, { type: 'indicaciones', patient });
  }
});

appExpress.post('/generate-listado', generateLimiter, documentExportAuth, async (req, res) => {
  const { patient, listado, medicos } = req.body;
  try {
    const { buffer, fileName } = await docExport.exportListadoDocx({ patient, listado, medicos });
    sendDocxBuffer(res, { buf: buffer, fileName, type: 'listado', patient });
  } catch (e) {
    docExportHttpError(res, e, { type: 'listado', patient });
  }
});

appExpress.post('/generate-censo', generateLimiter, documentExportAuth, async (req, res) => {
  const { header, rows, servicio } = req.body;
  try {
    const { buffer, fileName } = await docExport.exportCensoPdf({ header, rows, servicio });
    sendPdfBuffer(res, { buf: buffer, fileName, type: 'censo' });
  } catch (e) {
    docExportHttpError(res, e);
  }
});

appExpress.post('/generate-receta-hu', generateLimiter, documentExportAuth, async (req, res) => {
  const { patient, receta, doctorName, cedulaProfesional } = req.body;
  try {
    const { buffer, fileName } = await docExport.exportRecetaHuPdf({
      patient,
      receta,
      doctorName,
      cedulaProfesional,
    });
    sendPdfBuffer(res, { buf: buffer, fileName, type: 'receta-hu', patient });
  } catch (e) {
    docExportHttpError(res, e, { type: 'receta-hu', patient });
  }
});

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

appExpress.use('/api/lan/v1', (_req, res) => {
  res.status(410).json({
    error: 'lan_sync_retired',
    message: 'LiveSync LAN retirado — usa Nube (⇄ Conexión).',
  });
});

function getClinicalDbForInterno() {
  if (!lanDbManager || typeof lanDbManager.isUnlocked !== 'function') return null;
  if (!lanDbManager.isUnlocked()) return null;
  return typeof lanDbManager.getDb === 'function' ? lanDbManager.getDb() : null;
}

const internoBoardStore = createInternoHostStoreFromDb(getClinicalDbForInterno);

/** @type {(obj: object) => void} */
let onInternoHostSync = null;

function setOnInternoHostSync(fn) {
  onInternoHostSync = typeof fn === 'function' ? fn : null;
}

const httpServer = http.createServer(appExpress);

appExpress.use(
  '/api/interno/v1',
  createInternoRouter({
    store: internoBoardStore,
    getDb: getClinicalDbForInterno,
    broadcastSync: undefined,
    onHostSync: (obj) => {
      if (typeof onInternoHostSync === 'function') onInternoHostSync(obj);
    },
    httpServer,
  })
);

appExpress.use(
  '/api/equipos/v1',
  createEquiposRouter({
    getDb: getClinicalDbForInterno,
    photosDir: equiposPhotosDir,
    httpServer,
  })
);

appExpress.use((err, req, res, _next) => {
  console.error('[express]', {
    message: err && err.message,
    code: err && err.code,
    ...(req.__safeForLog || {}),
  });
  if (res.headersSent) return;
  const status = Number(err && (err.status || err.statusCode)) || 500;
  const error =
    status === 413 ? 'payload_too_large' : status === 500 ? 'internal_error' : err.message || 'request_failed';
  res.status(status).json({ error });
});

let serverInstance = null;
let listenPromise = null;

function listenErrorMessage(err) {
  if (err && err.code === 'EADDRINUSE') {
    return new Error(
      `El puerto ${PORT} ya está en uso${portInUseProcessHint(PORT)}. ` +
        'Cierra la otra instancia de R+ (o el proceso que escucha en ese puerto) y vuelve a abrir la aplicación. ' +
        'En macOS/Linux: lsof -nP -iTCP:' + PORT + ' -sTCP:LISTEN'
    );
  }
  return err;
}

function startLanServer() {
  if (serverInstance && serverInstance.listening) {
    return Promise.resolve(serverInstance);
  }
  if (listenPromise) return listenPromise;

  listenPromise = new Promise((resolve, reject) => {
    const srv = httpServer.listen(PORT, () => {
      console.log(`R+ → http://localhost:${PORT}`);
      serverInstance = srv;
      try {
        scheduleEquiposPhotoPurge(equiposPhotosDir, getClinicalDbForInterno);
      } catch (e) {
        console.error('[equipos-purge]', e && e.message ? e.message : e);
      }
      resolve(srv);
    });
    srv.once('error', (err) => {
      listenPromise = null;
      reject(listenErrorMessage(err));
    });
  });
  return listenPromise;
}

async function flushHostStoreNow() {
  /* LAN host store retired */
}

function stopLanServer() {
  const STOP_DEADLINE_MS = 2000;

  return new Promise((resolve) => {
    const finish = () => {
      serverInstance = null;
      listenPromise = null;
      resolve();
    };
    if (!serverInstance) {
      finish();
      return;
    }
    const timer = setTimeout(finish, STOP_DEADLINE_MS);
    if (typeof timer.unref === 'function') timer.unref();

    Promise.resolve()
      .then(() => {
        if (typeof httpServer.closeAllConnections === 'function') {
          httpServer.closeAllConnections();
        }
      })
      .then(
        () =>
          new Promise((resolveClose) => {
            httpServer.close(() => resolveClose());
          })
      )
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer);
        finish();
      });
  });
}

function getLanWardHostRegistry() {
  return null;
}

module.exports = {
  startLanServer,
  stopLanServer,
  flushHostStoreNow,
  getLanWardHostRegistry,
  setOnInternoHostSync,
  broadcastInterno,
};
