/* Terminal REAL — sessões persistentes via WebSocket.
   Usa node-pty (PTY verdadeiro) se instalado; fallback: bash com pipes
   (comando e saída continuam 100% reais, apenas sem TUI interativa). */
import { spawn, execFile } from 'node:child_process';
import { config, log } from './security.js';

let pty = null;
try { pty = (await import('node-pty')).default; } catch { /* fallback */ }

export const sessions = new Map();
let seq = 0;

export function backendType() { return pty ? 'node-pty (PTY real)' : 'child_process bash (pipes reais)'; }

export function startTerminal(cwd, env = {}) {
  const id = 't' + (++seq);
  const wsRoot = config.workspace.replace(/\/$/, '');
  let proc, write, resize = () => {}, isPty = false;
  if (pty) {
    proc = pty.spawn('/bin/bash', ['--login'], {
      name: 'xterm-256color',
      cols: 80, rows: 24,
      cwd: wsRoot,
      env: { ...process.env, TERM: 'xterm-256color', HOME: wsRoot, ...env }
    });
    isPty = true;
    write = d => proc.write(d);
    resize = (cols, rows) => { try { proc.resize(cols, rows); } catch { } };
  } else {
    proc = spawn('/bin/bash', ['--noprofile', '--norc', '-i'], {
      cwd: wsRoot,
      env: { ...process.env, PS1: '\\w $ ', TERM: 'dumb', HOME: wsRoot },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    write = d => proc.stdin.write(d);
  }
  const sess = { id, proc, write, resize, isPty, created: Date.now(), out: '' };
  sessions.set(id, sess);
  log('INFO', 'terminal', `sessão ${id} iniciada (${backendType()})`);
  return sess;
}

export function killTerminal(id) {
  const s = sessions.get(id);
  if (!s) return false;
  try { s.proc.kill(); } catch { }
  sessions.delete(id);
  log('INFO', 'terminal', `sessão ${id} encerrada`);
  return true;
}

/* execução única (sem shell) — para /api/run e utilidades */
export function execCapture(cmd, args, opts = {}) {
  return new Promise(resolve => {
    execFile(cmd, args, { timeout: opts.timeout || 15000, cwd: opts.cwd || config.workspace, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => resolve({ code: err ? (err.code ?? 1) : 0, stdout, stderr: stderr + (err && err.message ? '\n' + err.message : '') }));
  });
}
