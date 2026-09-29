/* ============================================================
   THCODE PRO MODULE — v2.1.0
   Carrega DEPOIS de script.js. Estende tudo via window.ThcodeTest.
   - GitHub real (clone/pull/commit/push via API REST)
   - Vault: tokens com AES-GCM (WebCrypto) em localStorage
   - Net: fetch real com fallback de proxy CORS + busca web
   - pkg: package manager real (registry.npmjs.org + jsDelivr)
   - Runner: execução real de JS + preview real de HTML a partir do VFS
   - Processos reais (spawn) + bridge Android nativa (Web APIs)
   - IA real: Groq / OpenRouter / Ollama local / HuggingFace
   ============================================================ */
(() => {
  'use strict';
  const W = window.ThcodeTest;
  if (!W) { console.warn('ThcodePro: base não encontrada'); return; }

  const { S, T, FS, Term, Panel, Page, Store, Procs, Notifs, toast, dPrompt, dConfirm, dList,
          esc, icon, openFile, saveFile, fGet, fSet, fDel, fExists, dExists, listDir,
          baseName, normPath, detectLang, LANGS, GH, AI, AI_MODELS, Palette, Plugins } = W;

  /* ---------- helpers locais (não expostos pela base) ---------- */
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const dirName = p => { const parts = normPath(p).split('/'); parts.pop(); return parts.join('/') || '/'; };
  const ensureDir = p => { p = normPath(p); if (p === '/') return; let cur = ''; p.split('/').filter(Boolean).forEach(s => { cur += '/' + s; if (!FS.dirs.includes(cur)) FS.dirs.push(cur); }); };
  const copyText = t => navigator.clipboard && navigator.clipboard.writeText(t).catch(() => {});
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const b64e = s => btoa(unescape(encodeURIComponent(s)));
  const b64d = s => decodeURIComponent(escape(atob(s)));
  const logLine = (k, t) => { try { Term.print(k, t); } catch (e) { console.log(t); } };

  const PRO_VER = 'v2.1.0-pro';
  console.log('%c Thcode PRO ' + PRO_VER + ' ', 'background:#a100ff;color:#fff');

  /* ============================================================
     VAULT — armazenamento seguro de tokens (AES-GCM + PBKDF2)
     ============================================================ */
  const Vault = {
    KEY: 'thcode.vault.v1', salt: null, enc: null, iv: null, key: null, entries: [],
    _raw() { try { return JSON.parse(localStorage.getItem(this.KEY)); } catch (e) { return null; } },
    isSetup() { return !!this._raw(); },
    isUnlocked() { return !!this.key; },
    async setup(pass) {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      this.salt = btoa(String.fromCharCode(...salt));
      await this._derive(pass);
      await this.save();
      return true;
    },
    async _derive(pass) {
      const enc = new TextEncoder();
      const km = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
      const saltBytes = Uint8Array.from(atob(this.salt), c => c.charCodeAt(0));
      this.key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: saltBytes, iterations: 150000, hash: 'SHA-256' },
        km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    },
    async save() {
      if (!this.key) return;
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, new TextEncoder().encode(JSON.stringify(this.entries)));
      localStorage.setItem(this.KEY, JSON.stringify({ salt: this.salt, iv: btoa(String.fromCharCode(...iv)), data: btoa(String.fromCharCode(...new Uint8Array(data))) }));
    },
    async unlock(pass) {
      const raw = this._raw(); if (!raw) return false;
      this.salt = raw.salt;
      await this._derive(pass);
      try {
        const iv = Uint8Array.from(atob(raw.iv), c => c.charCodeAt(0));
        const data = Uint8Array.from(atob(raw.data), c => c.charCodeAt(0));
        const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this.key, data);
        this.entries = JSON.parse(new TextDecoder().decode(dec));
        return true;
      } catch (e) { this.key = null; return false; }
    },
    lock() { this.key = null; this.entries = []; },
    async add(name, service, value) {
      const e = { id: 'k' + Date.now().toString(36), name, service: service || '', value };
      this.entries.push(e); await this.save(); return e;
    },
    async del(id) { this.entries = this.entries.filter(e => e.id !== id); await this.save(); },
    find(n) { return this.entries.find(e => e.name.toLowerCase() === n.toLowerCase()) || null; },
    async getTokenOrPrompt(name, label) {
      if (this.isUnlocked()) { const e = this.find(name); if (e) return e.value; }
      const t = await dPrompt('Token: ' + (label || name), '', 'Cole o token aqui');
      if (t && t.trim()) {
        if (this.isUnlocked()) { await this.add(name, label || '', t.trim()); toast('Token salvo no Vault', 'lock'); }
        return t.trim();
      }
      return null;
    },
    render() {
      Panel.setHead('Vault', 'Tokens criptografados (AES-256-GCM)', [
        { ic: 'lock', t: 'Bloquear', fn: () => { Vault.lock(); Panel.render(); toast('Vault bloqueado', 'lock'); } }
      ]);
      const body = $('#panelBody');
      if (!this.isSetup()) {
        body.innerHTML = `<div class="empty">${icon('lock')}<br>Crie o Vault: seus tokens ficam<br>criptografados no dispositivo.<div class="note" style="margin-top:10px">AES-256-GCM + PBKDF2 (150k iterações). A senha não é recuperável.</div></div>
          <div class="btn-row"><button class="big-btn primary" id="vaultCreate">Criar Vault</button></div>`;
        body.querySelector('#vaultCreate').onclick = async () => {
          const p = await dPrompt('Definir senha do Vault', 'Mínimo 6 caracteres', 'senha');
          if (!p || p.length < 6) { toast('Senha muito curta', 'warn'); return; }
          const p2 = await dPrompt('Confirmar senha', '', 'repita a senha');
          if (p !== p2) { toast('Senhas diferentes', 'warn'); return; }
          await this.setup(p); Panel.render(); toast('Vault criado e desbloqueado', 'check');
        };
        return;
      }
      if (!this.isUnlocked()) {
        body.innerHTML = `<div class="empty">${icon('lock')}<br>Vault bloqueado.</div>
          <div class="btn-row"><input class="term-in" id="vaultPass" type="password" placeholder="senha do vault" style="flex:1">
          <button class="big-btn primary" id="vaultGo">Abrir</button></div>`;
        const go = async () => {
          const ok = await this.unlock(body.querySelector('#vaultPass').value);
          if (ok) { Panel.render(); toast('Vault desbloqueado', 'check'); } else toast('Senha incorreta', 'close');
        };
        body.querySelector('#vaultGo').onclick = go;
        body.querySelector('#vaultPass').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
        return;
      }
      body.innerHTML = `<div class="sect">Tokens (${this.entries.length})</div><div id="vaultList"></div>
        <div class="btn-row"><button class="big-btn primary" id="vaultAdd">${icon('plus')} Adicionar token</button></div>`;
      const box = body.querySelector('#vaultList');
      if (!this.entries.length) box.innerHTML = '<div class="empty" style="padding:20px">Nenhum token salvo.</div>';
      this.entries.forEach(e => {
        const r = document.createElement('div'); r.className = 'row';
        r.innerHTML = `${icon('lock')}<div class="grow"><div class="t">${esc(e.name)}</div><div class="s">${esc(e.service || '')} • ${'•'.repeat(Math.min(12, e.value.length))}</div></div>
          <button class="icon-mini" data-a="copy" title="Copiar">${icon('copy')}</button><button class="icon-mini" data-a="del" title="Excluir">${icon('trash')}</button>`;
        r.querySelector('[data-a=copy]').onclick = () => { copyText(e.value); toast('Token copiado', 'copy'); };
        r.querySelector('[data-a=del]').onclick = async () => { if (await dConfirm('Excluir', `Remover o token <b>${esc(e.name)}</b>?`, 'Excluir')) { await this.del(e.id); Panel.render(); } };
        box.appendChild(r);
      });
      body.querySelector('#vaultAdd').onclick = async () => {
        const n = await dPrompt('Nome do token', '', 'ex: github, groq, openrouter');
        if (!n) return; const v = await dPrompt('Valor do token: ' + n, '', 'cole aqui');
        if (!v) return; await this.add(n.trim(), '', v.trim()); Panel.render(); toast('Token salvo (criptografado)', 'check');
      };
    }
  };

  /* ============================================================
     NET — acesso à internet real (fetch + proxy CORS de fallback)
     ============================================================ */
  const Net = {
    proxy: 'https://api.allorigins.win/raw?url=',
    async fetch(url, opts = {}) {
      try {
        const r = await fetch(url, { method: opts.method || 'GET', headers: opts.headers || {}, body: opts.body || undefined });
        if (!r.ok && !opts.noProxy) { /* tenta proxy em erro de rede apenas */ }
        return { ok: r.ok, status: r.status, text: await r.text() };
      } catch (e) {
        if (!opts.noProxy) {
          try {
            const r2 = await fetch(this.proxy + encodeURIComponent(url));
            return { ok: r2.ok, status: r2.status, text: await r2.text(), viaProxy: true };
          } catch (e2) { return { ok: false, status: 0, text: 'Erro de rede: ' + e.message }; }
        }
        return { ok: false, status: 0, text: 'Erro de rede: ' + e.message };
      }
    },
    async search(q) {
      const r = await this.fetch('https://api.duckduckgo.com/?format=json&no_html=1&q=' + encodeURIComponent(q), { noProxy: true });
      try {
        const j = JSON.parse(r.text);
        const out = [];
        if (j.AbstractText) out.push(['b', j.AbstractText + (j.AbstractURL ? ` (${j.AbstractURL})` : '')]);
        (j.RelatedTopics || []).slice(0, 8).forEach(t => { if (t.Text) out.push(['d', '• ' + t.Text]); });
        if (!out.length) out.push(['dim', 'Nada encontrado (ou bloqueio CORS — tente "net fetch https://...")']);
        return out;
      } catch (e) { return [['r', 'busca indisponível: ' + r.text.slice(0, 120)]]; }
    },
    render() {
      Panel.setHead('Internet', 'Fetch real + busca web', [{ ic: 'refresh', t: 'Limpar', fn: () => Net.render() }]);
      const body = $('#panelBody');
      body.innerHTML = `<div class="ai-input-row" style="padding:8px"><input class="term-in" id="netUrl" placeholder="https://api.exemplo.com/dados.json" style="flex:1"><button class="big-btn primary" id="netGo">Ir</button></div>
        <div class="btn-row" style="padding:0 8px 8px">
          <button class="big-btn" id="netDDG">Buscar na web</button>
          <button class="big-btn" id="netWiki">Wikipédia</button>
          <button class="big-btn" id="netIP">Meu IP</button>
        </div>
        <div id="netOut"><div class="empty">${icon('globe')}<br>Faça uma requisição real.<br>Se o site bloquear CORS, uso proxy automaticamente.</div></div>`;
      const out = body.querySelector('#netOut');
      const show = r => {
        const isJson = (() => { try { JSON.parse(r.text); return true; } catch (e) { return false; } })();
        let txt = r.text || '';
        if (isJson) { try { txt = JSON.stringify(JSON.parse(r.text), null, 2); } catch (e) {} }
        else txt = txt.slice(0, 30000);
        out.innerHTML = `<div class="note">${r.viaProxy ? 'via proxy • ' : ''}HTTP ${r.status} • ${txt.length} bytes</div>
          <div class="btn-row"><button class="big-btn" id="netCopy">Copiar</button><button class="big-btn" id="netSave">Salvar como arquivo</button></div>
          <pre style="white-space:pre-wrap;padding:8px;font-size:12px;max-height:46vh;overflow:auto">${esc(txt)}</pre>`;
        out.querySelector('#netCopy').onclick = () => { copyText(txt); toast('Copiado', 'copy'); };
        out.querySelector('#netSave').onclick = () => {
          const n = prompt('Salvar em:', '/MeuJarvis/response.json'); if (!n) return;
          fSet(normPath(n), txt); toast('Salvo: ' + baseName(n), 'save');
        };
      };
      const go = async () => {
        const u = body.querySelector('#netUrl').value.trim();
        if (!u) return;
        out.innerHTML = '<div class="empty">Buscando ' + esc(u) + '...</div>';
        show(await this.fetch(u));
      };
      body.querySelector('#netGo').onclick = go;
      body.querySelector('#netUrl').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      body.querySelector('#netDDG').onclick = async () => {
        const q = await dPrompt('Buscar na web (DuckDuckGo)', '', 'sua busca'); if (!q) return;
        out.innerHTML = '<div class="empty">Buscando…</div>';
        const r = await this.search(q);
        out.innerHTML = `<div class="note">Resultados para: ${esc(q)}</div><pre style="white-space:pre-wrap;padding:8px">${r.map(([k, t]) => esc(t)).join('\n')}</pre>`;
      };
      body.querySelector('#netWiki').onclick = async () => {
        const q = await dPrompt('Buscar na Wikipédia (pt)', '', 'assunto'); if (!q) return;
        const r = await this.fetch('https://pt.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(q));
        try { const j = JSON.parse(r.text); out.innerHTML = `<div class="sect">${esc(j.title)}</div><div style="padding:8px">${esc(j.extract || 'sem resumo')}</div>`; } catch (e) { show(r); }
      };
      body.querySelector('#netIP').onclick = async () => { const r = await this.fetch('https://api.ipify.org?format=json'); show(r); };
    }
  };

  /* ============================================================
     GIT REAL — GitHub REST API (clone, pull, status, commit, push)
     ============================================================ */
  const GitReal = {
    BIND_KEY: 'thcode.git.v1',
    bindings() { try { return JSON.parse(localStorage.getItem(this.BIND_KEY)) || {}; } catch (e) { return {}; } },
    bindSave(b) { localStorage.setItem(this.BIND_KEY, JSON.stringify(b)); },
    api(path, opts = {}) {
      const headers = { 'Accept': 'application/vnd.github+json', ...opts.headers };
      if (opts.token) headers['Authorization'] = 'Bearer ' + opts.token;
      return fetch('https://api.github.com' + path, { ...opts, headers }).then(async r => {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
        return r.status === 204 ? null : r.json();
      });
    },
    async token() { return (await Vault.getTokenOrPrompt('github', 'GitHub (scope repo)')) || ''; },
    bindingFor(path) { return this.bindings()[normPath(path)] || null; },

    async clone(spec, dest) {
      const [owner, repo] = spec.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').split('/');
      if (!owner || !repo || repo.includes('/')) throw new Error('formato: owner/repo');
      dest = normPath(dest || '/MeuJarvis/' + repo);
      const token = await this.token();
      const info = await this.api(`/repos/${owner}/${repo}`, { token });
      const branch = info.default_branch;
      const tree = await this.api(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { token });
      const files = (tree.tree || []).filter(t => t.type === 'blob' && t.size <= 300000).slice(0, 400);
      ensureDir(dest);
      const proc = ProcsReal.spawn('git clone ' + repo, async () => {
        let i = 0;
        for (const f of files) {
          const r = await Net.fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${f.path}`, { noProxy: true });
          if (r.ok) { ensureDir(dest + '/' + dirName('/' + f.path)); fSet(dest + '/' + f.path, r.text); }
          i++;
          if (i % 10 === 0) { ProcsReal.progress('git clone ' + repo, Math.round(i / files.length * 100)); logLine('dim', `  ${i}/${files.length} — ${f.path}`); }
        }
        this.bindSave({ ...this.bindings(), [dest]: { owner, repo, branch, sha: tree.sha, base: info.pushed_at } });
        Store.save();
        Notifs.list.unshift({ id: 'n' + Date.now(), ic: 'github', t: 'Clone concluído', s: `${owner}/${repo} → ${dest}`, ts: Date.now(), read: false });
        return `${files.length} arquivos de ${owner}/${repo} clonados em ${dest}`;
      });
      return proc;
    },
    async status(path) {
      const b = this.bindingFor(path); if (!b) return null;
      const key = 'thcode.snap.' + normPath(path);
      let snap = {}; try { snap = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) {}
      const cur = {};
      Object.keys(FS.files).filter(f => f.startsWith(path + '/')).forEach(f => cur[f] = FS.files[f].c);
      const changed = [], added = [], deleted = [];
      Object.entries(cur).forEach(([f, c]) => { if (!(f in snap)) added.push(f); else if (snap[f] !== c) changed.push(f); });
      Object.keys(snap).forEach(f => { if (!(f in cur)) deleted.push(f); });
      return { binding: b, changed, added, deleted, clean: !changed.length && !added.length && !deleted.length, snapshot() { localStorage.setItem(key, JSON.stringify(cur)); } };
    },
    async commitAndPush(path, message) {
      const st = await this.status(path);
      if (!st) throw new Error('sem binding — use git clone primeiro');
      if (st.clean) return 'nada para enviar';
      const token = await this.token();
      const b = st.binding;
      const list = [...st.changed, ...st.added];
      if (list.length > 60) throw new Error('muitos arquivos alterados (>60) — atualize em etapas');
      const ref = await this.api(`/repos/${b.owner}/${b.repo}/git/ref/heads/${b.branch}`, { token });
      const commitSha = ref.object.sha;
      const commitObj = await this.api(`/repos/${b.owner}/${b.repo}/git/commits/${commitSha}`, { token });
      const treeItems = [];
      for (const f of list) {
        const blob = await this.api(`/repos/${b.owner}/${b.repo}/git/blobs`, { method: 'POST', token, body: JSON.stringify({ content: FS.files[f].c, encoding: 'utf-8' }) });
        treeItems.push({ path: f.slice(path.length + 1), mode: '100644', type: 'blob', sha: blob.sha });
      }
      for (const f of st.deleted) treeItems.push({ path: f.slice(path.length + 1), mode: '100644', type: 'blob', sha: null });
      const newTree = await this.api(`/repos/${b.owner}/${b.repo}/git/trees`, { method: 'POST', token, body: JSON.stringify({ base_tree: commitObj.tree.sha, tree: treeItems }) });
      const newCommit = await this.api(`/repos/${b.owner}/${b.repo}/git/commits`, { method: 'POST', token, body: JSON.stringify({ message, tree: newTree.sha, parents: [commitSha] }) });
      await this.api(`/repos/${b.owner}/${b.repo}/git/refs/heads/${b.branch}`, { method: 'PATCH', token, body: JSON.stringify({ sha: newCommit.sha }) });
      st.snapshot();
      return `commit ${newCommit.sha.slice(0, 7)} enviado: ${list.length + st.deleted.length} arquivos`;
    },
    async pull(path) {
      const b = this.bindingFor(path); if (!b) throw new Error('sem binding');
      return this.clone(`${b.owner}/${b.repo}`, path);
    },
    async pushFlow(path) {
      const msg = await dPrompt('Commit', 'Mensagem do commit', 'update');
      if (!msg) return null;
      const r = await this.commitAndPush(path, msg);
      return r;
    }
  };

  /* GitHub panel REAL (substitui o simulado) */
  GH.renderReal = function () {
    Panel.setHead('GitHub', GH.user ? '@' + GH.user : 'Conecte com token (scope repo)', [
      { ic: 'lock', t: 'Token no Vault', fn: () => Panel.open('vault') }
    ]);
    const body = $('#panelBody');
    body.innerHTML = `<div class="sect">Ações reais (API REST do GitHub)</div>
      <div class="btn-row">
        <button class="big-btn primary" id="ghClone">${icon('download')} Clonar repo</button>
        <button class="big-btn" id="ghPush">${icon('upload')} Commit + Push</button>
        <button class="big-btn" id="ghPull">${icon('refresh')} Pull</button>
      </div>
      <div class="btn-row"><button class="big-btn" id="ghList">${icon('github')} Meus repositórios</button>
      <button class="big-btn" id="ghReleases">Releases</button><button class="big-btn" id="ghIssues">Issues</button></div>
      <div id="ghOut"></div>`;
    const out = body.querySelector('#ghOut');
    const projRoot = () => { const a = T.active; if (!a) return '/MeuJarvis'; const b = GitReal.bindingFor(a) ? a : null; if (b) return normPath(Object.keys(GitReal.bindings()).find(k => a.startsWith(k + '/')) || a); const binds = Object.keys(GitReal.bindings()); return binds.find(k => a.startsWith(k + '/')) || binds[0] || '/MeuJarvis'; };
    body.querySelector('#ghClone').onclick = async () => {
      const spec = await dPrompt('Clonar repositório', 'owner/repo ou URL', 'ex: rlkbiloga-coder/Thcode'); if (!spec) return;
      GitReal.clone(spec).catch(e => toast(e.message.slice(0, 90), 'close'));
    };
    body.querySelector('#ghPush').onclick = async () => {
      const p = projRoot(); out.innerHTML = '<div class="empty">Enviando…</div>';
      try { const r = await GitReal.pushFlow(p); if (r) { out.innerHTML = `<div class="note" style="color:var(--ok)">${esc(r)}</div>`; toast('Push concluído', 'check'); } } catch (e) { out.innerHTML = `<div class="note" style="color:var(--err)">${esc(e.message)}</div>`; }
    };
    body.querySelector('#ghPull').onclick = async () => {
      const p = projRoot();
      try { await GitReal.pull(p); toast('Pull iniciado', 'refresh'); } catch (e) { toast(e.message.slice(0, 90), 'close'); }
    };
    body.querySelector('#ghList').onclick = async () => {
      out.innerHTML = '<div class="empty">Carregando…</div>';
      try {
        const token = await GitReal.token();
        const repos = await GitReal.api('/user/repos?per_page=30&sort=updated', { token });
        GH.user = (await GitReal.api('/user', { token })).login; Store.save();
        out.innerHTML = `<div class="sect">Repositórios de @${esc(GH.user)}</div>`;
        const box = document.createElement('div');
        repos.forEach(r => {
          const row = document.createElement('div'); row.className = 'row';
          row.innerHTML = `${icon('github')}<div class="grow"><div class="t">${esc(r.name)}</div><div class="s">${esc(r.language || '—')} • ★${r.stargazers_count} • ${esc(r.visibility)}</div></div>`;
          row.onclick = () => GitReal.clone(r.full_name).catch(e => toast(e.message.slice(0, 90), 'close'));
          box.appendChild(row);
        });
        out.appendChild(box);
      } catch (e) { out.innerHTML = `<div class="note" style="color:var(--err)">${esc(e.message)}</div>`; }
    };
    body.querySelector('#ghReleases').onclick = async () => {
      out.innerHTML = '<div class="empty">Carregando…</div>';
      try {
        const b = GitReal.bindingFor(projRoot()); if (!b) throw new Error('sem binding — clone um repo primeiro');
        const rels = await GitReal.api(`/repos/${b.owner}/${b.repo}/releases?per_page=10`, {});
        out.innerHTML = rels.map(r => `<div class="row"><div class="grow"><div class="t">${esc(r.name || r.tag_name)}</div><div class="s">${esc((r.body || '').slice(0, 100))}</div></div></div>`).join('') || '<div class="empty">sem releases</div>';
      } catch (e) { out.innerHTML = `<div class="note" style="color:var(--err)">${esc(e.message)}</div>`; }
    };
    body.querySelector('#ghIssues').onclick = async () => {
      out.innerHTML = '<div class="empty">Carregando…</div>';
      try {
        const b = GitReal.bindingFor(projRoot()); if (!b) throw new Error('sem binding — clone um repo primeiro');
        const iss = await GitReal.api(`/repos/${b.owner}/${b.repo}/issues?per_page=15&state=open`, {});
        out.innerHTML = iss.map(i => `<div class="row"><div class="grow"><div class="t">#${i.number} ${esc(i.title)}</div><div class="s">${esc(i.user.login)} • ${esc(i.state)}</div></div></div>`).join('') || '<div class="empty">sem issues abertas</div>';
      } catch (e) { out.innerHTML = `<div class="note" style="color:var(--err)">${esc(e.message)}</div>`; }
    };
  };
  GH.render = GH.renderReal;

  /* ============================================================
     PKG — package manager real (npm registry + jsDelivr)
     ============================================================ */
  const Pkg = {
    async search(q) {
      const r = await Net.fetch('https://registry.npmjs.org/-/v1/search?size=10&text=' + encodeURIComponent(q), { noProxy: true });
      const j = JSON.parse(r.text);
      return (j.objects || []).map(o => `${o.package.name}@${o.package.version} — ${(o.package.description || '').slice(0, 70)}`);
    },
    async files(name) {
      const r = await Net.fetch('https://data.jsdelivr.com/v1/package/npm/' + name, { noProxy: true });
      return JSON.parse(r.text);
    },
    async add(name) {
      if (!name) throw new Error('uso: pkg add <nome-do-pacote>');
      const files = await this.files(name);
      const pick = files.files || [];
      const target = '/usr/lib/node_modules/' + name;
      ensureDir(target);
      let count = 0;
      for (const f of pick.slice(0, 40)) {
        if (f.type !== 'file') { ensureDir(target + '/' + f.name); continue; }
        const url = `https://cdn.jsdelivr.net/npm/${name}@${files.version}/${f.name}`;
        const r = await Net.fetch(url, { noProxy: true });
        if (r.ok) { ensureDir(target + '/' + dirName('/' + f.name)); fSet(target + '/' + f.name, r.text); count++; }
      }
      Store.save();
      return `${name}@${files.version}: ${count} arquivos em ${target}`;
    },
    list() { return Object.keys(FS.files).filter(f => f.startsWith('/usr/lib/node_modules/')).map(f => f.split('/')[4]).filter((v, i, a) => a.indexOf(v) === i); },
    del(name) { Object.keys(FS.files).filter(f => f.startsWith('/usr/lib/node_modules/' + name + '/')).forEach(fDel); }
  };

  /* ============================================================
     PROCS REAL — processos que executam de verdade
     ============================================================ */
  const ProcsReal = {
    seq: 200,
    spawn(name, task) {
      const pid = ++this.seq;
      const p = { pid, name, status: 'running', cpu: +(Math.random() * 12 + 2).toFixed(1), mem: Math.round(Math.random() * 40 + 20), started: new Date().toLocaleTimeString('pt-BR'), pct: 0 };
      const i = Procs.list.findIndex(x => x.name === name && x.status === 'stopped');
      if (i >= 0) Procs.list[i] = p; else Procs.list.unshift(p);
      if (Page.current === 'procs') Page.open('procs', 'Running processes', el => Procs.render(el));
      const done = r => { p.status = 'running'; p.result = typeof r === 'string' ? r : 'ok'; setTimeout(() => { p.status = 'stopped'; p.cpu = 0; }, 3000); toast(name + ': concluído', 'check'); if (Page.current === 'procs') Page.open('procs'); };
      const fail = e => { p.status = 'stopped'; p.cpu = 0; toast(name + ': ' + String(e).slice(0, 80), 'close'); };
      try { Promise.resolve(task()).then(done, fail); } catch (e) { fail(e); }
      return p;
    },
    progress(name, pct) { const p = Procs.list.find(x => x.name === name && x.status === 'running'); if (p) { p.pct = pct; if (Page.current === 'procs') Page.open('procs'); } }
  };

  /* ============================================================
     RUNNER — execução real de JS + preview real de HTML
     ============================================================ */
  const Runner = {
    runJS(path) {
      const f = fGet(path); if (!f) return 'arquivo não encontrado';
      const logs = [];
      const fakeConsole = { log: (...a) => logs.push(['d', a.map(x => { try { return typeof x === 'object' ? JSON.stringify(x) : String(x); } catch (e) { return String(x); } }).join(' ')]), error: (...a) => logs.push(['r', a.join(' ')]), warn: (...a) => logs.push(['y', a.join(' ')]), info: (...a) => logs.push(['c', a.join(' ')]) };
      try { new Function('console', f.c)(fakeConsole); }
      catch (e) { logs.push(['r', '✖ ' + e.message]); }
      return logs;
    },
    buildDoc(path) {
      let html = fGet(path)?.c || '';
      /* inlina css/js locais do VFS */
      html = html.replace(/<link[^>]+href=["']([^"':]+\.css)["'][^>]*>/gi, (m, href) => { const f = fGet(normPath(dirName(path) + '/' + href)); return f ? `<style>\n${f.c}\n</style>` : m; });
      html = html.replace(/<script[^>]+src=["']([^"':]+\.js)["'][^>]*>\s*<\/script>/gi, (m, src) => { const f = fGet(normPath(dirName(path) + '/' + src)); return f ? `<script>\n${f.c}\n</script>` : m; });
      return html;
    }
  };

  /* Preview REAL a partir do VFS (substitui o preview simulado p/ HTML) */
  const _pvRender = W.Preview ? W.Preview.render.bind(W.Preview) : null;
  if (W.Preview) {
    W.Preview.render = function (el, p) {
      if (p && fExists(p) && detectLang(p) === 'html') {
        el.innerHTML = `<div class="preview-tabs"><button id="pvEdit">Editor</button><button class="sel" id="pvView">Preview</button></div>
          <div class="preview-bar"><div class="preview-url">vfs:${esc(p)}</div>
          <button class="icon-mini" id="pvReload" title="Recarregar">${icon('refresh')}</button>
          <button class="icon-mini" id="pvExt" title="Abrir no navegador">${icon('external')}</button></div>
          <div style="flex:1;display:flex;min-height:50vh"><iframe class="preview-frame" id="pvFrame" sandbox="allow-scripts allow-modals allow-forms allow-popups" title="Preview"></iframe></div>`;
        const load = () => { el.querySelector('#pvFrame').srcdoc = Runner.buildDoc(p); };
        load();
        el.querySelector('#pvReload').onclick = load;
        el.querySelector('#pvEdit').onclick = () => openFile(p);
        el.querySelector('#pvExt').onclick = () => { const b = new Blob([Runner.buildDoc(p)], { type: 'text/html' }); window.open(URL.createObjectURL(b)); };
        return;
      }
      if (_pvRender) return _pvRender(el, p);
    };
  }

  /* ============================================================
     BRIDGE — integração Android nativa via Web APIs
     ============================================================ */
  const Bridge = {
    installEvt: null,
    init() {
      window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.installEvt = e; });
    },
    async share(title, text) {
      try { await navigator.share({ title, text }); return 'compartilhado'; } catch (e) { return 'cancelado/indisponível'; }
    },
    async shareFile(path) {
      const f = fGet(path); if (!f) return 'arquivo não encontrado';
      try {
        const file = new File([f.c], baseName(path), { type: 'text/plain' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: baseName(path) }); return 'arquivo compartilhado'; }
        return 'compartilhamento de arquivo não suportado neste navegador';
      } catch (e) { return 'cancelado'; }
    },
    pickFile() {
      return new Promise(res => {
        const inp = document.createElement('input'); inp.type = 'file';
        inp.onchange = async () => {
          const f = inp.files[0]; if (!f) return res(null);
          const dest = '/MeuJarvis/imported/' + f.name.replace(/[^\w.\-]/g, '_');
          ensureDir('/MeuJarvis/imported');
          fSet(dest, await f.text()); Store.save();
          res(dest);
        };
        inp.click();
      });
    },
    download(path) {
      const f = fGet(path); if (!f) return 'não encontrado';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([f.c], { type: 'text/plain' }));
      a.download = baseName(path); a.click();
      return 'download iniciado: ' + baseName(path);
    },
    async battery() {
      try { const b = await navigator.getBattery(); return `${Math.round(b.level * 100)}%${b.charging ? ' (carregando)' : ''}`; } catch (e) { return 'indisponível'; }
    },
    net() {
      const c = navigator.connection || {};
      return `${c.effectiveType || '?'} • ${navigator.onLine ? 'online' : 'offline'}${c.downlink ? ' • ' + c.downlink + ' Mbps' : ''}`;
    },
    async fullscreen(on) { try { on ? await document.documentElement.requestFullscreen() : document.exitFullscreen(); return 'ok'; } catch (e) { return 'indisponível'; } },
    async install() { if (!this.installEvt) return 'app já instalado ou prompt indisponível'; this.installEvt.prompt(); const c = await this.installEvt.userChoice; return c.outcome; },
    render() {
      Panel.setHead('Android Bridge', 'Recursos nativos do dispositivo', []);
      const body = $('#panelBody');
      body.innerHTML = `<div class="sect">Web APIs nativas (reais)</div>
        <div class="btn-row"><button class="big-btn" id="brShare">Compartilhar app</button>
        <button class="big-btn" id="brShareFile">Compartilhar arquivo</button></div>
        <div class="btn-row"><button class="big-btn" id="brPick">Importar arquivo do device</button>
        <button class="big-btn" id="brDownload">Baixar arquivo ativo</button></div>
        <div class="btn-row"><button class="big-btn" id="brBattery">Bateria</button>
        <button class="big-btn" id="brNet">Rede</button>
        <button class="big-btn" id="brFull">Fullscreen</button></div>
        <div class="btn-row"><button class="big-btn" id="brInstall">Instalar app (PWA)</button>
        <button class="big-btn" id="brVibrate">Vibrar</button></div>
        <div id="brOut"><div class="empty">${icon('zap')}<br>Integração real com o dispositivo.</div></div>`;
      const out = body.querySelector('#brOut');
      const say = t => { out.innerHTML = `<div class="note">${esc(t)}</div>`; toast(String(t).slice(0, 60), 'zap'); };
      body.querySelector('#brShare').onclick = async () => say(await this.share('Thcode', 'IDE mobile open-source: ' + 'https://github.com/rlkbiloga-coder/Thcode'));
      body.querySelector('#brShareFile').onclick = async () => say(await this.shareFile(T.active || '/MeuJarvis/index.html'));
      body.querySelector('#brPick').onclick = async () => { const d = await this.pickFile(); if (d) { say('importado: ' + d); openFile(d); } };
      body.querySelector('#brDownload').onclick = () => say(this.download(T.active || '/MeuJarvis/index.html'));
      body.querySelector('#brBattery').onclick = async () => say('bateria: ' + await this.battery());
      body.querySelector('#brNet').onclick = () => say('rede: ' + this.net());
      body.querySelector('#brFull').onclick = async () => say('fullscreen: ' + await this.fullscreen(!document.fullscreenElement));
      body.querySelector('#brInstall').onclick = async () => say('instalação: ' + await this.install());
      body.querySelector('#brVibrate').onclick = () => { navigator.vibrate && navigator.vibrate([80, 40, 80]); say('vibração enviada'); };
    }
  };

  /* ============================================================
     IA REAL — Groq / OpenRouter / Ollama / HuggingFace
     ============================================================ */
  const REAL_MODELS = ['Real: Groq (llama-3.3-70b)', 'Real: OpenRouter (free)', 'Real: Ollama local', 'Real: Groq (llama-3.1-8b)'];
  REAL_MODELS.forEach(m => { if (!AI_MODELS.includes(m)) AI_MODELS.push(m); });
  const PROVIDERS = {
    groq: { url: 'https://api.groq.com/openai/v1/chat/completions', model: m => m.includes('8b') ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile', keyName: 'groq' },
    openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', model: () => 'meta-llama/llama-3.3-70b-instruct:free', keyName: 'openrouter' },
    ollama: { url: 'http://localhost:12434/v1/chat/completions', model: () => 'llama3.2', keyName: null }
  };
  const AIReal = {
    ctxText() {
      if (!AI.ctx || !AI.ctx.length) return '';
      return AI.ctx.map(f => { const x = fGet(f); return x ? `\n\n# Arquivo ${baseName(f)}\n\`\`\`\n${x.c.slice(0, 6000)}\n\`\`\`` : ''; }).join('');
    },
    async call(prompt) {
      const m = AI.model;
      if (!m.startsWith('Real: ')) return null;
      let prov = m.includes('Groq') ? PROVIDERS.groq : m.includes('Ollama') ? PROVIDERS.ollama : PROVIDERS.openrouter;
      let key = null;
      if (prov.keyName) key = await Vault.getTokenOrPrompt(prov.keyName, prov.keyName + ' (API key)');
      const body = { model: prov.model(m), messages: [{ role: 'user', content: prompt + this.ctxText() }], temperature: 0.7, max_tokens: 2048 };
      const headers = { 'Content-Type': 'application/json' };
      if (key) headers['Authorization'] = 'Bearer ' + key;
      const r = await fetch(prov.url, { method: 'POST', headers, body: JSON.stringify(body) });
      const txt = await r.text();
      if (!r.ok) throw new Error('HTTP ' + r.status + ': ' + txt.slice(0, 150));
      return JSON.parse(txt).choices[0].message.content;
    }
  };
  /* streamReply real: intercepta quando modelo é Real */
  const _streamReply = AI.streamReply.bind(AI);
  AI.streamReply = async function (container, prompt, mode) {
    if (!String(AI.model).startsWith('Real: ')) return _streamReply(container, prompt, mode);
    const boxSel = mode === 'agent' ? '#agentMsgs' : '#aiMsgs';
    const box = container.querySelector(boxSel); if (!box) return;
    AI.streaming = true;
    const typing = document.createElement('div'); typing.className = 'msg ai';
    typing.innerHTML = `<div class="who">${icon('hex')} RUTEX</div><span class="typing-dots"><i></i><i></i><i></i></span>`;
    box.appendChild(typing); box.scrollTop = box.scrollHeight;
    try {
      const full = await AIReal.call(prompt);
      typing.remove();
      const msg = { role: 'ai', text: full || '(vazio)' };
      if (mode === 'agent') { AI.agentMsgs.push(msg); AI.paintAgentMsgs(container); }
      else { AI.currentChat().msgs.push(msg); AI.paintChat(container); }
    } catch (e) {
      typing.remove();
      const msg = { role: 'ai', text: '⚠ Erro na API: ' + e.message + '\n\nVerifique a chave no Vault (painel 🔒) ou use um modelo simulado.' };
      if (mode === 'agent') { AI.agentMsgs.push(msg); AI.paintAgentMsgs(container); }
      else { AI.currentChat().msgs.push(msg); AI.paintChat(container); }
    }
    AI.streaming = false; Store.save();
  };

  /* ============================================================
     TERMINAL — novos comandos reais
     ============================================================ */
  const _exec = Term.exec.bind(Term);
  Term.exec = async function (raw, container) {
    const cmd = raw.trim();
    if (!cmd) return _exec(raw, container);
    const [bin] = cmd.split(/\s+/);
    if (!PRO_CMDS[bin]) return _exec(raw, container);
    /* imprime prompt + histórico como a base faz */
    this.print('g', this.promptStr() + ' ' + raw);
    this.hist.push(cmd); if (this.hist.length > (S.termHistory || 200)) this.hist.shift();
    this.histIdx = -1; Store.save();
    const ok = await PRO_CMDS[bin](cmd.split(/\s+/).slice(1), cmd);
    if (ok === 'CLEAR') this.print('dim', 'clear');
  };

  const tPrint = lines => (lines || []).forEach(([k, t]) => Term.print(k, t));
  const PRO_CMDS = {
    /* ---- internet ---- */
    curl: async args => {
      const url = args.find(a => !a.startsWith('-'));
      const oIdx = args.indexOf('-o');
      if (!url) return tPrint([['r', 'uso: curl <url> [-o arquivo]']]);
      tPrint([['c', '→ GET ' + url]]);
      const r = await Net.fetch(url);
      if (!r.ok) return tPrint([['r', '✖ HTTP ' + r.status]]);
      if (oIdx > -1 && args[oIdx + 1]) { fSet(Term.resolve(args[oIdx + 1]), r.text); Store.save(); return tPrint([['g', `salvo em ${args[oIdx + 1]} (${r.text.length} bytes)`]]); }
      tPrint(r.text.split('\n').slice(0, 40).map(l => ['d', l.slice(0, 400)]));
      if (r.text.split('\n').length > 40) tPrint([['dim', `… +${r.text.split('\n').length - 40} linhas (use -o arquivo)`]]);
    },
    wget: async args => {
      const url = args[0]; if (!url) return tPrint([['r', 'uso: wget <url>']]);
      const name = (url.split('/').pop() || 'index.html').split('?')[0];
      tPrint([['c', '→ baixando ' + url + ' …']]);
      const r = await Net.fetch(url);
      if (!r.ok) return tPrint([['r', '✖ HTTP ' + r.status]]);
      fSet(Term.resolve(name), r.text); Store.save();
      tPrint([['g', `salvo: ${name} (${r.text.length} bytes)`]]);
    },
    ddg: async args => { if (!args.length) return tPrint([['r', 'uso: ddg <busca>']]); tPrint([['c', 'buscando…']]); tPrint(await Net.search(args.join(' '))); },
    ip: async () => { const r = await Net.fetch('https://api.ipify.org?format=json'); tPrint([['d', r.text]]); },
    openurl: async args => { if (!args[0]) return tPrint([['r', 'uso: openurl <url>']]); window.open(args[0].startsWith('http') ? args[0] : 'https://' + args[0], '_blank'); tPrint([['g', 'aberto no navegador']]); },
    /* ---- git real ---- */
    git: async (args, full) => {
      const sub = args[0] || 'status';
      const cwd = Term.cwd;
      const bindPath = Object.keys(GitReal.bindings()).find(k => cwd.startsWith(k)) || null;
      try {
        if (sub === 'clone') { if (!args[1]) return tPrint([['r', 'uso: git clone <owner/repo> [destino]']]); await GitReal.clone(args[1], args[2]); return tPrint([['c', 'clonando… (veja Running processes)']]); }
        if (sub === 'status') {
          if (!bindPath) return tPrint([['y', 'não é um repo clonado (use git clone)'], ['d', 'On branch main'], ['g', 'working tree clean (VFS)']]);
          const st = await GitReal.status(bindPath);
          tPrint([['d', `On branch ${st.binding.branch} (${st.binding.owner}/${st.binding.repo})`]]);
          st.changed.forEach(f => tPrint([['y', '  modified: ' + f]]));
          st.added.forEach(f => tPrint([['g', '  new file: ' + f]]));
          st.deleted.forEach(f => tPrint([['r', '  deleted:  ' + f]]));
          if (st.clean) tPrint([['g', 'nothing to commit, working tree clean']]);
          return;
        }
        if (sub === 'commit') {
          if (!bindPath) return tPrint([['r', 'sem binding']]);
          const m = full.match(/-m\s+["']?([^"']+)["']?/);
          if (!m) return tPrint([['r', 'uso: git commit -m "mensagem"']]);
          tPrint([['c', 'criando commit…']]);
          const r = await GitReal.commitAndPush(bindPath, m[1]);
          return tPrint([['g', r]]);
        }
        if (sub === 'push') {
          if (!bindPath) return tPrint([['r', 'sem binding']]);
          tPrint([['c', 'push…']]);
          return tPrint([['g', await GitReal.commitAndPush(bindPath, 'update ' + new Date().toISOString().slice(0, 16))]]);
        }
        if (sub === 'pull') { if (!bindPath) return tPrint([['r', 'sem binding']]); await GitReal.pull(bindPath); return tPrint([['c', 'pull em andamento…']]); }
        if (sub === 'log') { if (!bindPath) return tPrint([['y', 'clone um repo para ver o log real']]); const r = await Net.fetch(`https://api.github.com/repos/${bindPath ? GitReal.bindings()[bindPath].owner : ''}/${bindPath ? GitReal.bindings()[bindPath].repo : ''}/commits?per_page=5`, { noProxy: true }); try { JSON.parse(r.text).forEach(c => tPrint([['y', `${c.sha.slice(0, 7)} — ${c.commit.message.split('\n')[0].slice(0, 60)} (${c.commit.author.name})`]])); } catch (e) { tPrint([['r', 'log indisponível']]); } return; }
        return tPrint([['d', 'git real: clone, status, commit -m, push, pull, log']]);
      } catch (e) { tPrint([['r', 'git: ' + e.message.slice(0, 200)]]); }
    },
    /* ---- package manager real ---- */
    pkg: async args => {
      const sub = args[0], name = args[1];
      try {
        if (sub === 'search' && name) { tPrint([['c', `buscando "${name}" no npm…`]]); (await Pkg.search(name)).forEach(l => tPrint([['d', l]])); return; }
        if (sub === 'add' && name) { tPrint([['c', `instalando ${name}…`]]); tPrint([['g', await Pkg.add(name)]]); return; }
        if (sub === 'del' && name) { Pkg.del(name); return tPrint([['y', `removido: ${name}`]]); }
        if (sub === 'list') { const l = Pkg.list(); return tPrint(l.length ? [['b', l.join('  ')]] : [['d', 'nenhum pacote (use pkg add <nome>)']]); }
        tPrint([['d', 'pkg real (npm registry + jsDelivr): search | add | del | list']]);
      } catch (e) { tPrint([['r', 'pkg: ' + e.message.slice(0, 160)]]); }
    },
    /* ---- runner real ---- */
    runreal: async args => {
      const p = Term.resolve(args[0] || T.active);
      if (!fExists(p)) return tPrint([['r', 'arquivo não encontrado: ' + (args[0] || 'ativo')]]);
      if (detectLang(p) === 'js') {
        tPrint([['c', `▶ node ${baseName(p)} (execução real, sandbox)`]]);
        const logs = Runner.runJS(p);
        logs.forEach(([k, t]) => Term.print(k, t));
        tPrint([['g', '✓ concluído']]);
      } else if (detectLang(p) === 'html') { W.Preview.open(p); tPrint([['g', 'preview real aberto']]); }
      else tPrint([['y', 'execução real disponível para .js e .html']]);
    },

    /* ---- honestidade: comandos que exigem runtime real ---- */
    apk: async () => tPrint([['y', 'apk não disponível: sem backend conectado.'], ['d', 'Conecte um backend (painel Servidor) para terminal real com pacotes reais.'], ['d', 'Alternativa real sem backend: pkg add <pacote> (baixa do npm via jsDelivr)']]),
    npm: async () => tPrint([['y', 'npm não disponível sem backend conectado.'], ['d', 'Real: conecte o backend (Servidor → Conectar) e use o Terminal REAL (PTY).']]),
    node: async () => tPrint([['y', 'Node.js não disponível sem backend.'], ['d', 'Real: Servidor → Conectar → Terminal REAL, ou "runreal <arquivo.js>" (execução local real do VFS)']]),
    python: async () => tPrint([['y', 'Python não disponível sem backend.'], ['d', 'Real: Servidor → Conectar → Terminal REAL (PTY) e rode python3 lá.']]),
    run: async args => {
      const p = args[0] ? Term.resolve(args[0]) : T.active;
      if (!p || !fExists(p)) return tPrint([['r', 'Nenhum arquivo. Uso: run <arquivo>']]);
      const lang = detectLang(p);
      if (lang === 'html') { W.Preview.open(p); return tPrint([['g', 'preview real aberto: ' + baseName(p)]]); }
      if (lang === 'js') { tPrint([['c', '▶ execução real (sandbox VFS): ' + baseName(p)]]); Runner.runJS(p).forEach(([k, t]) => Term.print(k, t)); return tPrint([['g', '✓ concluído']]); }
      tPrint([['y', 'Execução de ' + LANGS[lang].name + ' requer backend (Servidor → Conectar).']]);
    },
    /* ---- vault ---- */
    vault: async args => {
      const sub = args[0];
      if (!Vault.isSetup()) return tPrint([['y', 'vault não criado — abra o painel 🔒 Vault'], ['d', 'Panel: toque no ícone de cadeado na barra lateral']]);
      if (!Vault.isUnlocked()) return tPrint([['y', 'vault bloqueado — desbloqueie no painel 🔒']]);
      if (sub === 'list') return tPrint(Vault.entries.length ? [['b', Vault.entries.map(e => e.name).join('  ')]] : [['d', 'vazio']]);
      if (sub === 'add' && args[1]) { const v = await dPrompt('Valor do token ' + args[1], '', 'cole aqui'); if (v) { await Vault.add(args[1], '', v.trim()); tPrint([['g', 'token salvo (criptografado)']]); } return; }
      if (sub === 'del' && args[1]) { const e = Vault.find(args[1]); if (e) { await Vault.del(e.id); tPrint([['y', 'removido: ' + args[1]]]); } return; }
      tPrint([['d', 'vault list | add <nome> | del <nome>']]);
    },
    /* ---- bridge ---- */
    bridge: async args => {
      const sub = args[0] || 'menu';
      if (sub === 'share') return tPrint([['d', 'compartilhar: ' + await Bridge.share('Thcode', 'https://github.com/rlkbiloga-coder/Thcode')]]);
      if (sub === 'battery') return tPrint([['d', 'bateria: ' + await Bridge.battery()]]);
      if (sub === 'net') return tPrint([['d', 'rede: ' + Bridge.net()]]);
      if (sub === 'install') return tPrint([['d', 'instalar: ' + await Bridge.install()]]);
      if (sub === 'pick') { const d = await Bridge.pickFile(); if (d) { tPrint([['g', 'importado: ' + d]]); openFile(d); } return; }
      tPrint([['d', 'bridge share | battery | net | install | pick']]);
    },
    /* ---- sistema real ---- */
    neofetch: async () => {
      const b = await Bridge.battery();
      tPrint([['p', '       _______         '], ['p', '     < Thcode >      '], ['p', '       -------        ']]);
      tPrint([['c', 'OS: Thcode Linux (Alpine-like sandbox)']]);
      tPrint([['c', 'Host: ' + ((navigator.userAgentData && navigator.userAgentData.platform) || 'Web')]]);
      tPrint([['c', 'Kernel: ' + navigator.userAgent.split(') ').pop().slice(0, 40)]]);
      tPrint([['c', 'Cores: ' + (navigator.hardwareConcurrency || '?')]]);
      tPrint([['c', 'Memory: ' + (navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '?')]]);
      tPrint([['c', 'Battery: ' + b]]);
      tPrint([['c', 'Net: ' + Bridge.net()]]);
      tPrint([['c', 'Screen: ' + screen.width + 'x' + screen.height]]);
      tPrint([['c', 'Packages: ' + Pkg.list().length + ' (real, /usr/lib)']]);
      tPrint([['c', 'PRO: ' + PRO_VER]]);
    },
    pro: async () => tPrint([['p', 'Thcode ' + PRO_VER], ['d', 'git real • pkg real • curl/wget • vault AES • bridge • IA real (Groq/OpenRouter/Ollama)'], ['d', 'runreal <arquivo> executa JS de verdade']])
  };

  /* ============================================================
     PAINEL: registra rotas novas
     ============================================================ */
  const _panelRender = Panel.render.bind(Panel);
  Panel.render = function () {
    const id = Panel.current;
    if (id === 'vault') return Vault.render();
    if (id === 'net') return Net.render();
    if (id === 'bridge') return Bridge.render();
    return _panelRender();
  };
  const _panelOpen = Panel.open.bind(Panel);
  Panel.open = function (id) { _panelOpen(id); };

  /* botões novos na barra lateral */
  function addRailBtn(id, title, svgId, beforeId) {
    const rail = $('#rail'); if (!rail || document.querySelector(`[data-panel="${id}"]`)) return;
    const b = document.createElement('button');
    b.className = 'rail-btn'; b.dataset.panel = id; b.title = title;
    b.innerHTML = `<svg><use href="#${svgId}"/></svg>`;
    b.onclick = e => { Panel.toggle(id); };
    const ref = beforeId ? rail.querySelector(`[data-panel="${beforeId}"]`) : null;
    rail.insertBefore(b, ref);
  }
  addRailBtn('net', 'Internet', 'i-globe', 'github');
  addRailBtn('vault', 'Vault (tokens)', 'i-lock', 'github');
  addRailBtn('bridge', 'Android Bridge', 'i-zap', 'agent');

  /* ============================================================
     COMMAND PALETTE: comandos PRO
     ============================================================ */
  const _palCmds = Palette.commands.bind(Palette);
  Palette.commands = function () {
    return [..._palCmds(),
      { t: 'Vault: gerenciar tokens', s: 'AES-256-GCM no dispositivo', fn: () => Panel.open('vault') },
      { t: 'Internet: fetch / busca', s: 'Requisições reais + proxy CORS', fn: () => Panel.open('net') },
      { t: 'Android Bridge', s: 'Compartilhar, importar, bateria, PWA', fn: () => Panel.open('bridge') },
      { t: 'Git: commit + push real', s: 'GitHub REST API', fn: () => Panel.open('github') },
      { t: 'Run: executar arquivo real', s: 'JS com saída de console real', fn: () => { Panel.open('terminal'); setTimeout(() => Term.exec('runreal'), 150); } },
      { t: 'pkg: instalar pacote', s: 'npm registry + jsDelivr (real)', fn: async () => { const n = await dPrompt('Instalar pacote (npm)', '', 'ex: lodash'); if (n) { Panel.open('terminal'); setTimeout(() => Term.exec('pkg add ' + n.trim()), 150); } } }
    ];
  };

  /* ============================================================
     ERROR BOUNDARY — captura erros globais
     ============================================================ */
  window.addEventListener('error', e => {
    try { Notifs.list.unshift({ id: 'err' + Date.now(), ic: 'close', t: 'Erro: ' + String(e.message).slice(0, 60), s: (e.filename || '') + ':' + (e.lineno || '?'), ts: Date.now(), read: false }); } catch (x) {}
  });
  window.addEventListener('unhandledrejection', e => {
    try { Notifs.list.unshift({ id: 'rej' + Date.now(), ic: 'close', t: 'Promise rejeitada', s: String(e.reason).slice(0, 80), ts: Date.now(), read: false }); } catch (x) {}
  });

  /* boot do módulo */
  Bridge.init();

  /* Handle para depuração */
  window.ThcodePro = { Vault, Net, GitReal, Pkg, ProcsReal, Runner, Bridge, AIReal, PRO_VER };
  console.log('Thcode PRO pronto. Comandos: git, pkg, curl, wget, ddg, vault, bridge, neofetch, runreal');
})();
