/* Git REAL — git binário via execFile (sem shell, sem concatenação insegura) */
import { execCapture } from './terminal.js';
import { wsPath, assertSafeRel } from './security.js';

export async function git(args, rel = '') {
  rel = assertSafeRel(rel);
  const r = await execCapture('git', ['-c','user.name=Thcode','-c','user.email=thcode@workspace.local', ...args], { cwd: wsPath(rel), timeout: 20000 });
  return { ok: r.code === 0, code: r.code, stdout: r.stdout, stderr: r.stderr };
}
export const gitInit = rel => git(['init'], rel);
export const gitStatus = rel => git(['status', '--porcelain=v1', '-b'], rel);
export const gitLog = (rel, n = 20) => git(['log', `-${n}`, '--oneline', '--format=%h|%an|%ar|%s'], rel);
export const gitDiff = rel => git(['diff', 'HEAD'], rel);
export const gitBranches = rel => git(['branch', '-a'], rel);
export const gitCommit = (rel, msg) => git(['commit', '-m', msg], rel);
export const gitAdd = (rel, p = '.') => git(['add', p], rel);
export const gitClone = (url, dir) => execCapture('git', ['clone', '--depth', '1', url, dir.replace(/^\/+/, '')], { cwd: wsPath(''), timeout: 60000 });
export const gitPull = rel => git(['pull'], rel);
export const gitPush = rel => git(['push'], rel);
export const gitCheckout = (rel, b) => git(['checkout', b], rel);
export const gitMerge = (rel, b) => git(['merge', b], rel);
