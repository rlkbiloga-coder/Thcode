/* Segurança: auth, rate limit, proteção de path, validação */
import crypto from 'node:crypto';
import path from 'node:path';

export const config = {
  token: process.env.THCODE_API_TOKEN || '',
  workspace: process.env.WORKSPACE_DIR || './workspace',
  rateWindow: +(process.env.RATE_WINDOW_MS || 60000),
  rateMax: +(process.env.RATE_MAX || 300),
  maxTerminals: +(process.env.MAX_TERMINALS || 5),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://rlkbiloga-coder.github.io,https://localhost:8080').split(',').map(v => v.trim()).filter(Boolean)
};

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  return config.allowedOrigins.includes(origin) || config.allowedOrigins.some(v => v === '*' || v === origin);
}

export function redactSecrets(input = '') {
  return String(input)
    .replace(/(Authorization\s*:\s*Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[redacted]')
    .replace(/(token|secret|key|authorization)\s*[:=]\s*([A-Za-z0-9._-]+)/gi, '$1=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]');
}

/* --- auth: Bearer token obrigatório se configurado --- */
export function auth(req, res, next) {
  if (!config.token) return res.status(500).json({ error: 'THCODE_API_TOKEN não configurado no backend' });
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : (req.query.token);
  if (!t || !timingSafeEq(t, config.token)) return res.status(401).json({ error: 'Token inválido ou ausente' });
  next();
}
function timingSafeEq(a, b) {
  const ba = Buffer.from(String(a)), bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/* --- rate limit simples em memória --- */
const hits = new Map();
export function rateLimit(req, res, next) {
  const key = req.ip || 'x';
  const now = Date.now();
  const rec = hits.get(key) || { n: 0, reset: now + config.rateWindow };
  if (now > rec.reset) { rec.n = 0; rec.reset = now + config.rateWindow; }
  rec.n++;
  hits.set(key, rec);
  if (rec.n > config.rateMax) return res.status(429).json({ error: 'Muitas requisições — tente novamente em instantes' });
  next();
}

/* --- path traversal: resolve e prende ao workspace --- */
export function wsPath(rel = '') {
  const root = path.resolve(config.workspace);
  const p = path.resolve(root, String(rel).replace(/\\/g, '/'));
  if (p !== root && !p.startsWith(root + path.sep)) {
    const e = new Error('Caminho fora do workspace (path traversal bloqueado)');
    e.status = 400;
    throw e;
  }
  return p;
}

export function assertSafeRel(rel) {
  if (typeof rel !== 'string' || rel.includes('\0') || /(^|\/)\.\.($|\/)/.test(rel)) {
    const e = new Error('Caminho inválido'); e.status = 400; throw e;
  }
  return rel.replace(/^\/+/, '');
}

/* --- validação de corpo --- */
export function need(obj, fields) {
  const missing = fields.filter(f => obj[f] === undefined || obj[f] === null || obj[f] === '');
  if (missing.length) { const e = new Error('Campos obrigatórios ausentes: ' + missing.join(', ')); e.status = 400; throw e; }
}

/* --- command injection: comandos fixos + args validados --- */
export function safeArgs(args) {
  return (Array.isArray(args) ? args : []).map(a => {
    if (typeof a !== 'string' || a.length > 500 || a.includes('\n') || a.includes('\0')) {
      const e = new Error('Argumento inválido'); e.status = 400; throw e;
    }
    return a;
  });
}

/* --- logs em memória --- */
export const LOGS = [];
export function log(level, service, message) {
  const entry = { ts: new Date().toISOString(), level, service, message: redactSecrets(String(message).slice(0, 2000)) };
  LOGS.push(entry);
  if (LOGS.length > 5000) LOGS.shift();
  const line = `[${entry.ts}] [${level}] [${service}] ${entry.message}`;
  if (level === 'ERROR') console.error(line); else console.log(line);
  return entry;
}
