/* ==========================================================================
   THCODE SERVER — backend avançado opcional (Node puro, zero dependências)
   O app funciona 100% offline/estático; este servidor ATIVA recursos extras:
     GET  /api/health        → status do servidor e provedores configurados
     POST /api/chat          → proxy da IA (OpenRouter) com chave no servidor
     GET  /api/plugins/search?q=&cat= → busca de plugins no GitHub
   Uso:  npm start  (porta 8158)  ·  configure OPENROUTER_API_KEY no .env
   ========================================================================== */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { URL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8158;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8'
};

const readEnv = () => {
  try {
    for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf-8').split('\n')) {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch (_) {}
};
readEnv();

const json = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
};

const serveStatic = (req, res, pathname) => {
  let p = path.normalize(path.join(__dirname, decodeURIComponent(pathname)));
  if (!p.startsWith(__dirname)) { res.writeHead(403); return res.end('forbidden'); }
  if (!pathname.includes('.') || !fs.existsSync(p)) p = path.join(__dirname, 'index.html');
  fs.readFile(p, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(buf);
  });
};

const fetchSafe = async (url, opts = {}, ms = 30000) => {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ac.signal }); }
  finally { clearTimeout(t); }
};

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = u.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    return res.end();
  }

  if (p === '/api/health') {
    return json(res, 200, {
      ok: true,
      app: 'thcode',
      server: 'node',
      uptime: Math.round(process.uptime()),
      ai: process.env.OPENROUTER_API_KEY ? 'openrouter (configurado)' : 'ausente (use /api/chat apenas com chave)',
      githubSearch: true,
      time: new Date().toISOString()
    });
  }

  if (p === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', async () => {
      try {
        const { messages, model = 'openai/gpt-4o-mini' } = JSON.parse(body);
        if (!Array.isArray(messages) || !messages.length) return json(res, 400, { error: 'campo "messages" obrigatório' });
        if (!process.env.OPENROUTER_API_KEY) return json(res, 503, { error: 'OPENROUTER_API_KEY não configurada no servidor (.env)' });
        const r = await fetchSafe('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
          body: JSON.stringify({ model, messages })
        });
        const d = await r.json().catch(() => ({}));
        const content = d?.choices?.[0]?.message?.content;
        if (!r.ok || !content) return json(res, 502, { error: d?.error?.message || 'OpenRouter indisponível' });
        return json(res, 200, { content });
      } catch (e) { return json(res, 500, { error: 'payload inválido' }); }
    });
    return;
  }

  if (p === '/api/plugins/search') {
    try {
      const q = (u.searchParams.get('q') || '').trim();
      const ghQ = `topic:thcode-plugin ${q}`.trim();
      const headers = { Accept: 'application/vnd.github+json' };
      if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      const r = await fetchSafe(`https://api.github.com/search/repositories?q=${encodeURIComponent(ghQ)}&per_page=10`, { headers }, 10000);
      if (!r.ok) return json(res, r.status, { error: 'GitHub search indisponível' });
      const d = await r.json();
      return json(res, 200, {
        total: d.items?.length || 0,
        plugins: (d.items || []).map(repo => ({
          id: repo.name, name: repo.full_name, desc: repo.description || '',
          repository: repo.html_url, stars: repo.stargazers_count
        }))
      });
    } catch (_) { return json(res, 502, { error: 'falha de rede na busca GitHub' }); }
  }

  return serveStatic(req, res, p);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Thcode server → http://localhost:${PORT}`);
  console.log(`IA: ${process.env.OPENROUTER_API_KEY ? 'OpenRouter ATIVO' : 'desativado (defina OPENROUTER_API_KEY)'}`);
});
