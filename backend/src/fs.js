/* Filesystem real do backend — sandboxed no workspace */
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { wsPath, assertSafeRel } from './security.js';

async function exists(p) { try { await fs.stat(p); return true; } catch { return false; } }

export async function createFile(rel, content = '') {
  rel = assertSafeRel(rel);
  const p = wsPath(rel);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content, 'utf8');
  return { ok: true, path: rel };
}

export async function readFile(rel) {
  rel = assertSafeRel(rel);
  const p = wsPath(rel);
  const st = await fs.stat(p);
  if (st.size > 2_000_000) { const e = new Error('Arquivo grande demais (máx 2 MB)'); e.status = 413; throw e; }
  const content = await fs.readFile(p, 'utf8');
  return { path: rel, size: st.size, modified: st.mtime.toISOString(), content };
}

export async function writeFile(rel, content) {
  rel = assertSafeRel(rel);
  const p = wsPath(rel);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, String(content ?? ''), 'utf8');
  return { ok: true, path: rel };
}

export async function deleteFile(rel) {
  rel = assertSafeRel(rel);
  await fs.rm(wsPath(rel), { force: true });
  return { ok: true };
}

export async function stat(rel) {
  rel = assertSafeRel(rel);
  const st = await fs.stat(wsPath(rel));
  return { path: rel, type: st.isDirectory() ? 'dir' : 'file', size: st.size, modified: st.mtime.toISOString() };
}

export async function listDir(rel = '') {
  rel = assertSafeRel(rel);
  const dir = wsPath(rel);
  if (!fss.existsSync(dir)) { const e = new Error('Diretório não existe'); e.status = 404; throw e; }
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.map(e => ({
    name: e.name,
    type: e.isDirectory() ? 'dir' : 'file',
    size: e.isDirectory() ? null : fss.statSync(path.join(dir, e.name)).size
  }));
}

export async function createFolder(rel) {
  rel = assertSafeRel(rel);
  await fs.mkdir(wsPath(rel), { recursive: true });
  return { ok: true, path: rel };
}

export async function deleteFolder(rel) {
  rel = assertSafeRel(rel);
  const p = wsPath(rel);
  if (p === wsPath('')) { const e = new Error('Recusado: apagar a raiz do workspace'); e.status = 400; throw e; }
  await fs.rm(p, { recursive: true, force: true });
  return { ok: true };
}

export async function move(src, dst) {
  src = assertSafeRel(src); dst = assertSafeRel(dst);
  const from = wsPath(src), to = wsPath(dst);
  if (!await exists(from)) { const e = new Error('Origem não existe'); e.status = 404; throw e; }
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.rename(from, to);
  return { ok: true, from: src, to: dst };
}

export async function copy(src, dst) {
  src = assertSafeRel(src); dst = assertSafeRel(dst);
  const from = wsPath(src), to = wsPath(dst);
  if (!await exists(from)) { const e = new Error('Origem não existe'); e.status = 404; throw e; }
  await fs.mkdir(path.dirname(to), { recursive: true });
  const st = await fs.stat(from);
  if (st.isDirectory()) await fs.cp(from, to, { recursive: true });
  else await fs.copyFile(from, to);
  return { ok: true, from: src, to: dst };
}
