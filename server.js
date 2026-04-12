const express = require('express');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const { spawn } = require('child_process');

const appExpress = express();
appExpress.use(express.json({ limit: '2mb' }));
appExpress.use(express.static(path.join(__dirname, 'public')));

const DOWNLOADS = path.join(os.homedir(), 'Downloads');

function resolvePython() {
  if (process.platform === 'win32') {
    for (const base of [process.resourcesPath, __dirname].filter(Boolean)) {
      const bundled = path.join(base, 'python-runtime', 'win-x64', 'python.exe');
      try { if (fs.statSync(bundled).isFile()) return bundled; } catch { /* not found */ }
    }
  }
  if (process.platform === 'darwin') {
    const arch = process.arch === 'arm64' ? 'mac-arm64' : 'mac-x64';
    for (const base of [process.resourcesPath, __dirname].filter(Boolean)) {
      const binDir = path.join(base, 'python-runtime', arch, 'bin');
      for (const name of ['python3', 'python3.12', 'python3.13']) {
        const bundled = path.join(binDir, name);
        try { if (fs.statSync(bundled).isFile()) return bundled; } catch { /* not found */ }
      }
    }
  }
  const systemPaths = [
    '/usr/local/bin/python3',
    '/opt/homebrew/bin/python3',
    '/usr/bin/python3',
  ];
  return systemPaths.find(p => {
    try { return fs.statSync(p).isFile(); } catch { return false; }
  }) || 'python3';
}
const PYTHON = resolvePython();

function safeName(str) {
  return (str || '').replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]/g, '_');
}

const SCRIPTS_DIR = __dirname.includes('app.asar')
  ? __dirname.replace('app.asar', 'app.asar.unpacked')
  : __dirname;

function runPython(script, payload) {
  return new Promise((resolve, reject) => {
    const py = spawn(PYTHON, [path.join(SCRIPTS_DIR, script)]);
    const chunks = [];
    let err = '';
    py.on('error', reject);
    py.stdout.on('data', c => chunks.push(c));
    py.stderr.on('data', c => { err += c.toString(); });
    py.on('close', code => {
      if (code !== 0) reject(new Error(err || `Error Python (code ${code})`));
      else resolve(Buffer.concat(chunks));
    });
    py.stdin.on('error', () => {}); // suppress EPIPE; process error/close handles it
    py.stdin.write(payload);
    py.stdin.end();
  });
}

appExpress.post('/generate', async (req, res) => {
  const { patient, note } = req.body;
  if (!patient || !note) return res.status(400).json({ error: 'Missing patient or note' });
  try {
    const buf = await runPython('generate_note.py', JSON.stringify({ patient, note }));
    const fileName = `Nota_Evolucion_${safeName(patient.nombre)}_${safeName(note.fecha||'')}.docx`;
    fs.writeFileSync(path.join(DOWNLOADS, fileName), buf);
    res.json({ ok: true, fileName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

appExpress.post('/generate-indicaciones', async (req, res) => {
  const { patient, indicaciones } = req.body;
  if (!patient || !indicaciones) return res.status(400).json({ error: 'Missing patient or indicaciones' });
  try {
    const buf = await runPython('generate_indicaciones.py', JSON.stringify({ patient, indicaciones }));
    const fileName = `Indicaciones_${safeName(patient.nombre)}_${safeName(indicaciones.fecha||'')}.docx`;
    fs.writeFileSync(path.join(DOWNLOADS, fileName), buf);
    res.json({ ok: true, fileName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = 3738;
const server = appExpress.listen(PORT, () => {
  console.log(`R+ → http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} already in use. Close other instances of R+ and try again.`);
    process.exit(1);
  }
});

module.exports = new Promise((resolve) => {
  server.once('listening', () => resolve(server));
});
