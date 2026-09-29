/* GitHub REAL no backend — token do .env (nunca no navegador).
   Sem OAuth configurado e sem token → erro honesto, não fake. */
import { config } from './security.js';

const API = 'https://api.github.com';

async function gh(path, opts = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) { const e = new Error('Backend sem GITHUB_TOKEN configurado (.env). GitHub indisponível.'); e.status = 503; throw e; }
  const r = await fetch(API + path, {
    ...opts,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {})
    }
  });
  const text = await r.text();
  if (!r.ok) { const e = new Error(`GitHub API ${r.status}: ${text.slice(0, 200)}`); e.status = 502; throw e; }
  return r.status === 204 ? null : JSON.parse(text);
}

export const me = () => gh('/user');
export const repos = () => gh('/user/repos?per_page=50&sort=updated');
export const repo = (owner, name) => gh(`/repos/${owner}/${name}`);
export const branches = (owner, name) => gh(`/repos/${owner}/${name}/branches`);
export const commits = (owner, name) => gh(`/repos/${owner}/${name}/commits?per_page=20`);
export const issues = (owner, name) => gh(`/repos/${owner}/${name}/issues?per_page=20&state=open`);
export const pulls = (owner, name) => gh(`/repos/${owner}/${name}/pulls?per_page=20`);
export const releases = (owner, name) => gh(`/repos/${owner}/${name}/releases?per_page=10`);
export const createRepo = (name, opts = {}) => gh('/user/repos', { method: 'POST', body: JSON.stringify({ name, private: !!opts.private, auto_init: true }) });
export const fork = (owner, name) => gh(`/repos/${owner}/${name}/forks`, { method: 'POST' });
export const star = (owner, name) => gh(`/user/starred/${owner}/${name}`, { method: 'PUT' });
export const watch = (owner, name) => gh(`/repos/${owner}/${name}/subscription`, { method: 'PUT', body: JSON.stringify({ subscribed: true }) });

/* OAuth (opcional) — fluxo real com GITHUB_CLIENT_ID/SECRET */
export function oauthUrl(origin) {
  const id = process.env.GITHUB_CLIENT_ID;
  if (!id) { const e = new Error('OAuth não configurado: defina GITHUB_CLIENT_ID no backend'); e.status = 503; throw e; }
  return `https://github.com/login/oauth/authorize?client_id=${id}&scope=repo,read:user&redirect_uri=${encodeURIComponent(origin + '/api/github/oauth/callback')}`;
}
export async function oauthToken(code) {
  const r = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    })
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('OAuth falhou: ' + (j.error_description || j.error));
  return j.access_token;
}
