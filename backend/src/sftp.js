/* SFTP/SSH REAL via ssh2 — conexão e operações executadas no backend */
import { Client } from 'ssh2';
import { log } from './security.js';

const conns = new Map();

export function sftpConnect({ name, host, port = 22, username, password, privateKey, remoteDir = '.' }) {
  return new Promise((resolve, reject) => {
    if (!host || !username) return reject(new Error('Campos obrigatórios: host, username'));
    const id = 's' + Date.now().toString(36);
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) { conn.end(); return reject(new Error('SFTP falhou: ' + err.message)); }
        conns.set(id, { conn, sftp, remoteDir, name: name || host });
        log('INFO', 'sftp', `conectado a ${host}:${port} (${id})`);
        resolve({ ok: true, id, host, port, username, remoteDir });
      });
    }).on('error', e => {
      const msg = e.level === 'client-authentication' ? 'Authentication failed' :
        e.code === 'ECONNREFUSED' ? 'Connection refused' :
        e.code === 'ENOTFOUND' || e.code === 'ETIMEDOUT' ? 'Host unreachable' : e.message;
      log('ERROR', 'sftp', `${host}: ${msg}`);
      reject(new Error(msg));
    }).connect({
      host, port: +port, username,
      ...(password ? { password } : {}),
      ...(privateKey ? { privateKey } : {}),
      readyTimeout: 15000
    });
  });
}

function get(id) {
  const c = conns.get(id);
  if (!c) { const e = new Error('Sessão SFTP não encontrada — conecte primeiro'); e.status = 404; throw e; }
  return c;
}

export const sftpList = (id, dir) => new Promise((res, rej) => get(id).sftp.readdir(dir || get(id).remoteDir, (e, l) =>
  e ? rej(new Error('SFTP list: ' + e.message)) : res(l.map(x => ({ name: x.filename, type: x.attrs.isDirectory() ? 'dir' : 'file', size: x.attrs.size })))));

export const sftpRead = (id, file) => new Promise((res, rej) => {
  const c = get(id); const chunks = [];
  c.sftp.createReadStream(file).on('data', d => chunks.push(d))
    .on('error', e => rej(new Error('SFTP read: ' + e.message)))
    .on('end', () => res(Buffer.concat(chunks).toString('utf8')));
});

export const sftpWrite = (id, file, content) => new Promise((res, rej) =>
  get(id).sftp.writeFile(file, content, (e) => e ? rej(new Error('SFTP write: ' + e.message)) : res({ ok: true })));

export const sftpMkdir = (id, dir) => new Promise((res, rej) =>
  get(id).sftp.mkdir(dir, e => e && e.code !== 4 ? rej(new Error('SFTP mkdir: ' + e.message)) : res({ ok: true })));

export const sftpRename = (id, a, b) => new Promise((res, rej) =>
  get(id).sftp.rename(a, b, e => e ? rej(new Error('SFTP rename: ' + e.message)) : res({ ok: true })));

export const sftpDelete = (id, file) => new Promise((res, rej) =>
  get(id).sftp.unlink(file, e => e ? rej(new Error('SFTP delete: ' + e.message)) : res({ ok: true })));

export function sftpDisconnect(id) {
  const c = conns.get(id);
  if (!c) return false;
  c.conn.end(); conns.delete(id);
  log('INFO', 'sftp', `desconectado (${id})`);
  return true;
}
export const sftpSessions = () => [...conns.keys()].map(k => ({ id: k, name: conns.get(k).name }));
