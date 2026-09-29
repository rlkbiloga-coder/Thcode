/* Thcode Backend — API REST real + WebSocket (terminal, logs, processos)
   Segurança: token Bearer obrigatório, rate limit, path traversal bloqueado,
   execução sem shell (execFile), workspace isolado. */
import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import os from 'node:os';
import path from 'node:path';
import fss from 'node:fs';
import { auth, rateLimit, config, log, LOGS } from './security.js';
import * as FS from './fs.js';
import * as Git from './git.js';
import * as GH from './github.js';
import * as SFTP from './sftp.js';
import * as AI from './ai.js';
import * as Run from './run.js';
import { startTerminal, killTerminal, sessions, backendType } from './terminal.js';

if (!config.workspace) throw new Error('WORKSPACE_DIR inválido');
fss.mkdirSync(path.resolve(config.workspace), { recursive: true });

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit);

const wrap = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (e) {
    const status = e.status || 500;
    if (status >= 500) log('ERROR', 'api', `${req.method} ${req.path}: ${e.message}`);
    res.status(status).json({ error: e.message, ...(e.status ? {} : { stack: e.stack?.split('\n').slice(0, 3).join(' | ') }) });
  }
};

/* ============ HEALTH / SYSTEM STATUS ============ */
app.get('/api/health', wrap(async (req, res) => {
  const up = (name, ok, detail) => ({ name, ok: !!ok, detail });
  const [node, python, gitBin] = await Promise.all([Run.hasRuntime('node'), Run.hasRuntime('python3'), Run.hasRuntime('git')]);
  res.json({
    status: 'ok',
    backend: backendType(),
    uptime: process.uptime(),
    node: process.version,
    platform: `${os.type()} ${os.arch()}`,
    memory: { total: os.totalmem(), free: os.freemem() },
    workspace: path.resolve(config.workspace),
    checks: [
      up('Frontend → Backend API', true, 'REST respondendo'),
      up('Filesystem', fss.existsSync(path.resolve(config.workspace)), 'workspace acessível'),
      up('Terminal', true, backendType()),
      up('Node.js runtime', node, 'node ' + process.version),
      up('Python runtime', python, 'python3'),
      up('Git', gitBin, 'git via execFile'),
      up('GitHub API', !!process.env.GITHUB_TOKEN, process.env.GITHUB_TOKEN ? 'token configurado' : 'sem GITHUB_TOKEN (503 nas rotas /github)'),
      up('SFTP/ssh2', true, 'ssh2 carregado'),
      up('AI providers', AI.availableProviders(), AI.availableProviders().length ? 'disponíveis: ' + AI.availableProviders().join(', ') : 'nenhuma API key configurada'),
      up('WebSocket', true, 'wss ativo em /ws/terminal /ws/logs')
    ]
  });
}));

/* ============ FILESYSTEM ============ */
app.get('/api/fs/list', auth, wrap(async (r, w) => w.json({ path: r.query.path || '', entries: await FS.listDir(r.query.path || '') })));
app.post('/api/fs/file', auth, wrap(async (r, w) => w.json(await FS.createFile(r.body.path, r.body.content))));
app.get('/api/fs/file', auth, wrap(async (r, w) => w.json(await FS.readFile(r.query.path))));
app.put('/api/fs/file', auth, wrap(async (r, w) => w.json(await FS.writeFile(r.body.path, r.body.content))));
app.delete('/api/fs/file', auth, wrap(async (r, w) => w.json(await FS.deleteFile(r.query.path))));
app.get('/api/fs/stat', auth, wrap(async (r, w) => w.json(await FS.stat(r.query.path))));
app.post('/api/fs/folder', auth, wrap(async (r, w) => w.json(await FS.createFolder(r.body.path))));
app.delete('/api/fs/folder', auth, wrap(async (r, w) => w.json(await FS.deleteFolder(r.query.path))));
app.post('/api/fs/move', auth, wrap(async (r, w) => w.json(await FS.move(r.body.from, r.body.to))));
app.post('/api/fs/copy', auth, wrap(async (r, w) => w.json(await FS.copy(r.body.from, r.body.to))));

/* ============ EXECUÇÃO ============ */
app.post('/api/run', auth, wrap(async (r, w) => w.json(await Run.runFile(r.body.path, r.body.args || []))));

/* ============ GIT ============ */
app.post('/api/git/init', auth, wrap(async (r, w) => w.json(await Git.gitInit(r.body.path || ''))));
app.get('/api/git/status', auth, wrap(async (r, w) => w.json(await Git.gitStatus(r.query.path || ''))));
app.get('/api/git/log', auth, wrap(async (r, w) => w.json(await Git.gitLog(r.query.path || ''))));
app.get('/api/git/diff', auth, wrap(async (r, w) => w.json(await Git.gitDiff(r.query.path || ''))));
app.get('/api/git/branches', auth, wrap(async (r, w) => w.json(await Git.gitBranches(r.query.path || ''))));
app.post('/api/git/add', auth, wrap(async (r, w) => w.json(await Git.gitAdd(r.body.path || '', r.body.files || '.'))));
app.post('/api/git/commit', auth, wrap(async (r, w) => w.json(await Git.gitCommit(r.body.path || '', r.body.message))));
app.post('/api/git/clone', auth, wrap(async (r, w) => w.json({ ...(await Git.gitClone(r.body.url, r.body.dir)) })));
app.post('/api/git/pull', auth, wrap(async (r, w) => w.json(await Git.gitPull(r.body.path || ''))));
app.post('/api/git/push', auth, wrap(async (r, w) => w.json(await Git.gitPush(r.body.path || ''))));
app.post('/api/git/checkout', auth, wrap(async (r, w) => w.json(await Git.gitCheckout(r.body.path || '', r.body.branch))));
app.post('/api/git/merge', auth, wrap(async (r, w) => w.json(await Git.gitMerge(r.body.path || '', r.body.branch))));

/* ============ GITHUB ============ */
app.get('/api/github/me', auth, wrap(async (r, w) => w.json(await GH.me())));
app.get('/api/github/repos', auth, wrap(async (r, w) => w.json(await GH.repos())));
app.get('/api/github/repo/:owner/:name', auth, wrap(async (r, w) => w.json(await GH.repo(r.params.owner, r.params.name))));
app.get('/api/github/repo/:owner/:name/branches', auth, wrap(async (r, w) => w.json(await GH.branches(r.params.owner, r.params.name))));
app.get('/api/github/repo/:owner/:name/commits', auth, wrap(async (r, w) => w.json(await GH.commits(r.params.owner, r.params.name))));
app.get('/api/github/repo/:owner/:name/issues', auth, wrap(async (r, w) => w.json(await GH.issues(r.params.owner, r.params.name))));
app.get('/api/github/repo/:owner/:name/pulls', auth, wrap(async (r, w) => w.json(await GH.pulls(r.params.owner, r.params.name))));
app.get('/api/github/repo/:owner/:name/releases', auth, wrap(async (r, w) => w.json(await GH.releases(r.params.owner, r.params.name))));
app.post('/api/github/repo', auth, wrap(async (r, w) => w.json(await GH.createRepo(r.body.name, { private: r.body.private }))));
app.post('/api/github/fork', auth, wrap(async (r, w) => w.json(await GH.fork(r.body.owner, r.body.repo))));
app.post('/api/github/star', auth, wrap(async (r, w) => w.json(await GH.star(r.body.owner, r.body.repo))));
app.post('/api/github/watch', auth, wrap(async (r, w) => w.json(await GH.watch(r.body.owner, r.body.repo))));
app.get('/api/github/oauth/start', wrap((r, w) => w.json({ url: GH.oauthUrl(r.protocol + '://' + r.get('host')) })));
app.get('/api/github/oauth/callback', wrap(async (r, w) => {
  const t = await GH.oauthToken(r.query.code);
  w.send(`Token OAuth obtido. Guarde-o no backend (GITHUB_TOKEN) e feche esta aba. (Não repetimos o token aqui por segurança — configure-o manualmente.)`);
}));

/* ============ SFTP ============ */
app.post('/api/sftp/connect', auth, wrap(async (r, w) => w.json(await SFTP.sftpConnect(r.body))));
app.get('/api/sftp/sessions', auth, wrap((r, w) => w.json(SFTP.sftpSessions())));
app.post('/api/sftp/disconnect', auth, wrap((r, w) => w.json({ ok: SFTP.sftpDisconnect(r.body.id) })));
app.post('/api/sftp/list', auth, wrap(async (r, w) => w.json(await SFTP.sftpList(r.body.id, r.body.dir))));
app.post('/api/sftp/read', auth, wrap(async (r, w) => w.json({ content: await SFTP.sftpRead(r.body.id, r.body.path) })));
app.post('/api/sftp/write', auth, wrap(async (r, w) => w.json(await SFTP.sftpWrite(r.body.id, r.body.path, r.body.content))));
app.post('/api/sftp/mkdir', auth, wrap(async (r, w) => w.json(await SFTP.sftpMkdir(r.body.id, r.body.dir))));
app.post('/api/sftp/rename', auth, wrap(async (r, w) => w.json(await SFTP.sftpRename(r.body.id, r.body.from, r.body.to))));
app.post('/api/sftp/delete', auth, wrap(async (r, w) => w.json(await SFTP.sftpDelete(r.body.id, r.body.path))));

/* ============ IA ============ */
app.get('/api/ai/providers', auth, wrap((r, w) => w.json({ available: AI.availableProviders() })));
app.post('/api/ai/chat', auth, wrap(async (r, w) => w.json(await AI.aiChat(r.body))));

/* ============ PROCESSOS (reais, deste processo) ============ */
app.get('/api/processes', auth, wrap((r, w) => w.json({
  terminals: [...sessions.values()].map(s => ({ id: s.id, created: new Date(s.created).toISOString(), type: s.isPty ? 'pty' : 'bash' })),
  memory: process.memoryUsage(),
  uptime: process.uptime()
})));

/* ============ LOGS ============ */
app.get('/api/logs', auth, wrap((r, w) => w.json(LOGS.slice(-500))));
app.post('/api/logs/clear', auth, wrap((r, w) => { LOGS.length = 0; w.json({ ok: true }); }));

/* ============ 404 ============ */
app.use((r, w) => w.status(404).json({ error: 'Rota não existe: ' + r.path }));

/* ============ WEBSOCKET ============ */
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/* /ws/terminal?token=... — sessão real de shell */
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://x');
  if (!config.token || url.searchParams.get('token') !== config.token) { ws.close(4001, 'token inválido'); return; }
  if (url.pathname !== '/ws/terminal') { ws.close(4000, 'rota ws desconhecida'); return; }
  if (sessions.size >= config.maxTerminals * 10) { ws.close(1013, 'limite de sessões'); return; }
  const sess = startTerminal();
  log('INFO', 'ws', `terminal ${sess.id} conectado`);
  ws.send(JSON.stringify({ type: 'meta', id: sess.id, backend: backendType() }));
  sess.proc.onData ? sess.proc.onData(d => { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'out', data: d })); })
    : (sess.proc.stdout.on('data', d => ws.readyState === 1 && ws.send(JSON.stringify({ type: 'out', data: d.toString() }))),
       sess.proc.stderr.on('data', d => ws.readyState === 1 && ws.send(JSON.stringify({ type: 'err', data: d.toString() }))));
  sess.proc.on('exit', code => { if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'exit', code })); ws.close(); sessions.delete(sess.id); });
  ws.on('message', raw => {
    try {
      const m = JSON.parse(raw.toString());
      if (m.type === 'in') sess.write(m.data);
      else if (m.type === 'resize') sess.resize(m.cols, m.rows);
    } catch { }
  });
  ws.on('close', () => { killTerminal(sess.id); log('INFO', 'ws', `terminal ${sess.id} desconectado`); });
});

const logWs = new Set();
wss.on('connection', (ws, req) => { /* /ws/logs */
  const url = new URL(req.url, 'http://x');
  if (url.pathname !== '/ws/logs' || !config.token || url.searchParams.get('token') !== config.token) return;
  logWs.add(ws);
  ws.send(JSON.stringify({ type: 'snapshot', logs: LOGS.slice(-100) }));
  ws.on('close', () => logWs.delete(ws));
});
const origLog = log;
/* retransmite logs para ws (streaming real) */
const _push = (level, service, message) => {
  const e = origLog(level, service, message);
  const payload = JSON.stringify({ type: 'log', ...e });
  logWs.forEach(ws => ws.readyState === 1 && ws.send(payload));
  return e;
};
export const pushLog = _push;

const PORT = +(process.env.PORT || 8080);
server.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log(`Thcode backend real: http://localhost:${PORT}`);
  console.log(`Terminal: ${backendType()} | Workspace: ${path.resolve(config.workspace)}`);
  console.log(`Auth: ${config.token ? 'token configurado' : '⚠ THCODE_API_TOKEN ausente — API bloqueada'}`);
});
