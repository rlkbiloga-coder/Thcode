/* Execução REAL de código — detecta runtime antes de rodar */
import { execCapture } from './terminal.js';
import { config } from './security.js';

export async function hasRuntime(bin) {
  const r = await execCapture('/usr/bin/env', [bin, '--version'], { timeout: 5000 });
  return r.code === 0 || (!/not found|no such/i.test(r.stderr));
}

export async function runFile(rel, args = []) {
  const ext = rel.split('.').pop().toLowerCase();
  const map = {
    js: ['node'], mjs: ['node'], cjs: ['node'],
    py: ['python3'],
    sh: ['bash']
  };
  const rt = map[ext];
  if (!rt) return { ok: false, error: `Linguagem .${ext} não suportada. Suportadas: .js .mjs .py .sh` };
  const ok = await hasRuntime(rt[0]);
  if (!ok) return { ok: false, error: `Runtime ${rt[0]} não instalado no servidor.` };
  const t0 = Date.now();
  const r = await execCapture(rt[0], [config.workspace.replace(/\/$/, '') + '/' + rel.replace(/^\/+/, ''), ...args], { timeout: 30000 });
  return {
    ok: r.code === 0,
    runtime: rt[0],
    exitCode: r.code,
    durationMs: Date.now() - t0,
    stdout: r.stdout,
    stderr: r.stderr
  };
}
