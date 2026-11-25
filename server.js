// Servidor local sem dependências: serve o app e persiste os dados em data/db.json.
// Uso: node server.js  (ou npm start)  ->  http://localhost:3000
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '127.0.0.1'; // somente esta máquina
const ROOT = __dirname;
const DB = path.join(ROOT, 'data', 'db.json');
const PUBLICO = new Set(['index.html', 'css', 'js', 'public', 'sw.js', 'manifest.webmanifest']);
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8'
};

const json = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': TIPOS['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
};

function lerBody(req, limite = 5e6) {
  return new Promise((ok, erro) => {
    let n = 0; const partes = [];
    req.on('data', c => { n += c.length; if (n > limite) { erro(new Error('grande')); req.destroy(); } else partes.push(c); });
    req.on('end', () => ok(Buffer.concat(partes).toString('utf8')));
    req.on('error', erro);
  });
}

// valida o formato mínimo antes de gravar
const valido = d => d && typeof d === 'object' && Array.isArray(d.disciplinas) && Array.isArray(d.atividades);

async function api(req, res) {
  if (req.method === 'GET') {
    try { return json(res, 200, JSON.parse(fs.readFileSync(DB, 'utf8'))); }
    catch { return json(res, 404, { erro: 'sem dados' }); }
  }
  if (req.method === 'PUT') {
    if (!(req.headers['content-type'] || '').includes('application/json')) return json(res, 415, { erro: 'use JSON' });
    try {
      const dados = JSON.parse(await lerBody(req));
      if (!valido(dados)) return json(res, 400, { erro: 'formato inválido' });
      fs.mkdirSync(path.dirname(DB), { recursive: true });
      const tmp = DB + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(dados, null, 2));
      fs.renameSync(tmp, DB); // gravação atômica
      return json(res, 200, { ok: true });
    } catch { return json(res, 400, { erro: 'requisição inválida' }); }
  }
  json(res, 405, { erro: 'método não permitido' });
}

function estatico(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); return res.end(); }
  if (rel === '/') rel = '/index.html';
  const alvo = path.normalize(path.join(ROOT, rel));
  const topo = path.relative(ROOT, alvo).split(path.sep)[0];
  if (!alvo.startsWith(ROOT + path.sep) || !PUBLICO.has(topo)) { res.writeHead(404); return res.end('Não encontrado'); }
  fs.readFile(alvo, (e, buf) => {
    if (e) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(alvo)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : buf);
  });
}

http.createServer((req, res) => {
  if (new URL(req.url, 'http://x').pathname === '/api/dados') return api(req, res);
  estatico(req, res);
}).listen(PORT, HOST, () => {
  console.log(`Organizador Acadêmico rodando em http://localhost:${PORT}`);
  console.log(`Dados salvos em: ${DB}`);
});
