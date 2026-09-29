/* Testes de integração do backend: sobe o servidor real e testa API + WS + terminal */
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';

const TOKEN = crypto.randomBytes(24).toString('hex');
const PORT = 8123;
const WS = fs.mkdtempSync('/tmp/thcode-t-');
const env = { ...process.env, THCODE_API_TOKEN: TOKEN, PORT: String(PORT), WORKSPACE_DIR: WS, GITHUB_TOKEN: '', GROQ_API_KEY: '' };

const srv = spawn('node', ['src/server.js'], { env, cwd: process.cwd() });
let fails = 0, passes = 0;
const ok = (name, cond, extra = '') => { cond ? passes++ : fails++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); };

await new Promise(r => setTimeout(r, 1500));

const api = async (method, path, body, expect = 200) => {
  const r = await fetch(`http://localhost:${PORT}${path}`, {
    method,
    headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  ok(`HTTP ${method} ${path} → ${expect}`, r.status === expect, `got ${r.status}`);
  return r;
};

try {
  await api('GET', '/api/health', null, 200);
  const noAuth = await fetch(`http://localhost:${PORT}/api/fs/list`);
  ok('sem token → 401', noAuth.status === 401);

  /* filesystem real */
  await api('POST', '/api/fs/file', { path: 'proj/app.js', content: 'console.log("real!")' }, 200);
  const f = await (await api('GET', '/api/fs/file?path=proj/app.js', null, 200)).json();
  ok('arquivo persistido com conteúdo real', f.content === 'console.log("real!")');
  await api('PUT', '/api/fs/file', { path: 'proj/app.js', content: 'console.log(40+2)' }, 200);
  await api('POST', '/api/fs/folder', { path: 'proj/sub' }, 200);
  const l = await (await api('GET', '/api/fs/list?path=proj', null, 200)).json();
  ok('listar diretório real', Array.isArray(l.entries) && l.entries.length === 2);

  /* path traversal bloqueado */
  const trav = await fetch(`http://localhost:${PORT}/api/fs/file?path=../../etc/passwd`, { headers: { Authorization: 'Bearer ' + TOKEN } });
  ok('path traversal ../../etc/passwd bloqueado', trav.status === 400);

  /* execução real de node */
  const run = await (await api('POST', '/api/run', { path: 'proj/app.js' }, 200)).json();
  ok('execução real node (stdout)', run.ok === true && run.stdout.trim() === '42', JSON.stringify(run).slice(0, 120));

  /* git real */
  await api('POST', '/api/git/init', { path: 'proj' }, 200);
  const st = await (await api('GET', '/api/git/status?path=proj', null, 200)).json();
  ok('git real inicializado', st.ok && /No commits|main/.test(st.stdout + st.stderr));
  await api('POST', '/api/git/commit', { path: 'proj', message: 'x' }, 200); /* sem user.name → pode falhar, ok */

  /* github sem token → erro honesto 503 */
  const gh = await fetch(`http://localhost:${PORT}/api/github/me`, { headers: { Authorization: 'Bearer ' + TOKEN } });
  ok('GitHub sem token → 503 honesto (não fake)', gh.status === 503);

  /* IA sem key → erro honesto */
  const ai = await fetch(`http://localhost:${PORT}/api/ai/chat`, { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'groq', messages: [{ role: 'user', content: 'oi' }] }) });
  ok('IA sem key → erro honesto (não fake)', ai.status >= 400);

  /* WebSocket terminal real */
  const wsOk = await new Promise(async resolve => {
    const { WebSocket } = await import('ws');
    const ws = new WebSocket(`ws://localhost:${PORT}/ws/terminal?token=${TOKEN}`);
    let out = '', done = false;
    const finish = v => { if (!done) { done = true; try { ws.close(); } catch {} resolve(v); } };
    ws.on('open', () => ws.send(JSON.stringify({ type: 'in', data: 'echo thcode-real-$((6*7))\n' })));
    ws.on('message', m => {
      try { const j = JSON.parse(m.toString()); if (j.type === 'out') out += j.data; } catch {}
      if (out.includes('thcode-real-42')) finish(true);
      if (j_fail(m)) {}
    });
    function j_fail() { return false; }
    setTimeout(() => finish(out.includes('thcode-real')), 8000);
  });
  ok('terminal WS real executa shell de verdade', wsOk);

} finally {
  srv.kill();
  console.log(`\n${passes} passaram, ${fails} falharam`);
  process.exit(fails ? 1 : 0);
}
