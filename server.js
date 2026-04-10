const express = require('express');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const { spawn } = require('child_process');

const appExpress = express();
appExpress.use(express.json({ limit: '10mb' }));
appExpress.use(express.static(path.join(__dirname, 'public')));

const DOWNLOADS = path.join(os.homedir(), 'Downloads');

const PYTHON_PATHS = [
  '/usr/local/bin/python3',
  '/opt/homebrew/bin/python3',
  '/usr/bin/python3',
];
const PYTHON = PYTHON_PATHS.find(p => {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}) || 'python3';

function safeName(str) {
  return (str || '').replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]/g, '_');
}

function runPython(script, payload) {
  return new Promise((resolve, reject) => {
    const py = spawn(PYTHON, [path.join(__dirname, script)]);
    const chunks = [];
    let err = '';
    py.on('error', reject);
    py.stdout.on('data', c => chunks.push(c));
    py.stderr.on('data', c => { err += c.toString(); });
    py.on('close', code => {
      if (code !== 0) reject(new Error(err || `Error Python (code ${code})`));
      else resolve(Buffer.concat(chunks));
    });
    py.stdin.write(payload);
    py.stdin.end();
  });
}

appExpress.post('/generate', async (req, res) => {
  const { patient, note } = req.body;
  try {
    const buf = await runPython('generate_note.py', JSON.stringify({ patient, note }));
    const fileName = `Nota_Evolucion_${safeName(patient.nombre)}_${(note.fecha||'').replace(/\//g,'-')}.docx`;
    fs.writeFileSync(path.join(DOWNLOADS, fileName), buf);
    res.json({ ok: true, fileName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

appExpress.post('/generate-indicaciones', async (req, res) => {
  const { patient, indicaciones } = req.body;
  try {
    const buf = await runPython('generate_indicaciones.py', JSON.stringify({ patient, indicaciones }));
    const fileName = `Indicaciones_${safeName(patient.nombre)}_${(indicaciones.fecha||'').replace(/\//g,'-')}.docx`;
    fs.writeFileSync(path.join(DOWNLOADS, fileName), buf);
    res.json({ ok: true, fileName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = 3738;
const server = appExpress.listen(PORT, () => {
  console.log(`R+ Clinical → http://localhost:${PORT}`);
});

module.exports = server;
