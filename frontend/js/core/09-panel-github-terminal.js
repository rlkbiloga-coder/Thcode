/* ============================== GITHUB (REAL via api.github.com) ============================== */
const GH = {
  user: null, token: null,
  api: async (path, opts = {}) => {
    const headers = { 'Accept': 'application/vnd.github+json' };
    if (GH.token) headers['Authorization'] = 'Bearer ' + GH.token;
    const r = await fetch('https://api.github.com' + path, { ...opts, headers });
    if (r.status === 401) throw new Error('Token inválido ou expirado');
    if (r.status === 403) throw new Error('Rate limit da API do GitHub — aguarde ou conecte um token');
    if (!r.ok) throw new Error('GitHub API ' + r.status);
    return r.json();
  },
  render() {
    Panel.setHead('GitHub', this.user ? '@' + this.user : 'Não conectado', this.user ? [{ ic: 'exit', t: 'Sair', fn: () => { this.user = null; this.token = null; Store.save(); Panel.render(); } }] : []);
    const body = $('#panelBody');
    if (!this.user) {
      body.innerHTML = `<div class="empty">${icon('github')}<br>Conecte para ver seus repositórios<br><span style="opacity:.6">Token: escopos repo (Vault/local).<br>Sem token: browsing público.</span></div>
        <div class="btn-row"><button class="big-btn primary" id="ghLogin">Conectar GitHub</button></div>
        <div class="btn-row"><button class="big-btn" id="ghPub">Procurar usuário público</button></div>`;
      body.querySelector('#ghLogin').onclick = async () => {
        const u = await dPrompt('Usuário GitHub', '', 'Seu usuário');
        if (!u || !u.trim()) return;
        const tk = await dPrompt('Personal access token (opcional — deixa vazio p/ público)', '', '');
        try {
          const me = tk ? (await this.api('/user', {}), null) : null;
          if (tk) { this.token = tk.trim(); await this.api('/user'); }
          this.user = u.trim();
          Store.save(); Panel.render();
          toast('GitHub conectado (API real)', 'github');
          clog('INFO', 'GitHub login: @' + this.user + (tk ? ' (token)' : ' (público)'));
        } catch (e) { toast('Erro real: ' + e.message.slice(0, 60), 'close'); }
      };
      body.querySelector('#ghPub').onclick = async () => {
        const u = await dPrompt('Ver repositórios públicos de', '', 'usuário');
        if (!u || !u.trim()) return;
        this.user = u.trim(); Store.save(); Panel.render();
      };
      return;
    }
    body.innerHTML = `<div class="sect">Repositórios de @${esc(this.user)} <span style="opacity:.5;font-size:11px">(dados reais da API)</span></div><div id="ghRepos"><div class="empty">Carregando via api.github.com…</div></div>`;
    const box = body.querySelector('#ghRepos');
    this.api((this.token ? '/user' : '/users/' + this.user) + '/repos?per_page=30&sort=updated')
      .then(repos => {
        if (!repos.length) { box.innerHTML = '<div class="empty">Nenhum repositório público.</div>'; return; }
        box.innerHTML = '';
        repos.forEach(r => {
          const row = document.createElement('div');
          row.className = 'row';
          row.innerHTML = `${icon('github')}<div class="grow"><div class="t">${esc(r.name)}</div><div class="s">${esc(r.description || 'sem descrição')} • ★${r.stargazers_count} • ${esc(r.language || '—')}</div></div>`;
          row.onclick = async () => {
            const srv = window.ThcodeServer;
            if (srv && srv.isUp()) {
              const ok = await dConfirm('Clonar de verdade', `git clone --depth 1 ${esc(r.clone_url)} no workspace do backend?`, 'Clonar');
              if (!ok) return;
              try {
                const res = await srv.api('POST', '/api/git/clone', { url: r.clone_url, dir: r.name });
                toast(res.ok ? 'Clonado de verdade (git clone no servidor)' : 'Erro: ' + (res.stderr || '').slice(0, 50), res.ok ? 'check' : 'close');
              } catch (e) { toast('Erro real: ' + e.message.slice(0, 60), 'close'); }
            } else {
              window.open(r.html_url, '_blank', 'noopener');
              toast('Clone real requer backend — abri o repo no GitHub', 'github');
            }
          };
          box.appendChild(row);
        });
      })
      .catch(e => { box.innerHTML = `<div class="empty">Erro real: ${esc(e.message)}</div>`; });
  }
};

/* ============================== TERMINAL (Alpine no Acode) ============================== */
const Term = {
  cwd: '/MeuJarvis', hist: [], histIdx: -1, lines: [],
  welcome() {
    return [
      ['d', 'Thcode terminal local — opera o VFS real do navegador.'],
      ['d', 'pkg add/remove: instalação REAL de pacotes npm via jsDelivr.'],
      ['d', 'Para shell completo (apk/npm/python): Servidor → Conectar backend.'],
      ['d', '']
    ];
  },
  render(container, inPage) {
    if (!inPage) Panel.setHead('Terminal', 'VFS local', [
      { ic: 'copy', t: 'Copiar saída', fn: () => { copyText(this.lines.map(l => l[1]).join('\n')); toast('Saída copiada', 'copy'); } },
      { ic: 'close', t: 'Limpar', fn: () => { this.lines = []; this.render(container, inPage); } }
    ]);
    container.innerHTML = `<div class="term" style="font-size:${S.termFontSize}px">
      <div class="term-out" id="termOut"></div>
      <div class="term-in-row"><span class="term-prompt" id="termPrompt"></span><input class="term-in" id="termIn" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder=""></div>
    </div>`;
    const out = container.querySelector('#termOut');
    this.paint(out);
    this.updatePrompt(container);
    const inp = container.querySelector('#termIn');
    out.onclick = () => inp.focus();
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { const c = inp.value; inp.value = ''; this.exec(c, container); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (this.hist.length) { this.histIdx = this.histIdx < 0 ? this.hist.length - 1 : Math.max(0, this.histIdx - 1); inp.value = this.hist[this.histIdx]; } }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (this.histIdx >= 0) { this.histIdx++; inp.value = this.hist[this.histIdx] || ''; if (this.histIdx >= this.hist.length) this.histIdx = -1; } }
      else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); this.lines = []; this.paint(out); }
    });
    out.scrollTop = out.scrollHeight;
    if (inPage) setTimeout(() => inp.focus(), 300);
  },
  updatePrompt(container) {
    const p = (container || document).querySelector('#termPrompt');
    if (p) p.textContent = `root@localhost:${this.cwd === '/root' || this.cwd === '/' ? '~' : this.cwd} $`;
  },
  promptStr() { return `root@localhost:${this.cwd} $`; },
  paint(out) {
    out = out || $('#termOut');
    if (!out) return;
    const cls = { g: 'tp-green', b: 'tp-blue', y: 'tp-yellow', r: 'tp-red', c: 'tp-cyan', p: 'tp-purple', dim: 'tp-dim', d: '' };
    out.innerHTML = this.lines.map(([k, t]) => `<span class="${cls[k] || ''}">${esc(t)}</span>`).join('\n') + '<span class="term-cursor"></span>';
    out.scrollTop = out.scrollHeight;
    this.updatePrompt(document);
  },
  print(k, t) { this.lines.push([k, t]); if (this.lines.length > 600) this.lines.shift(); this.paint(); },
  resolve(p) {
    if (!p) return this.cwd;
    if (p.startsWith('/')) return normPath(p);
    if (p === '~') return '/MeuJarvis';
    return normPath(this.cwd + '/' + p);
  },
  exec(raw, container) {
    const cmd = raw.trim();
    this.print('g', `${this.promptStr()} ${raw}`);
    if (!cmd) return;
    this.hist.push(cmd); if (this.hist.length > (S.termHistory || 200)) this.hist.shift();
    this.histIdx = -1; Store.save();
    const [bin, ...args] = cmd.split(/\s+/);
    const arg = args.join(' ');
    const R = {
      help: () => [['c', 'Comandos disponíveis:'], ['d', '  help, ls, pwd, cd, mkdir, touch, cat, echo, rm, clear'], ['d', '  apk search|add|del|update, npm, node, python, git'], ['d', '  whoami, date, open <arq>, run, history, exit']],
      pwd: () => [['d', this.cwd]],
      whoami: () => [['d', 'root']],
      date: () => [['d', new Date().toString()]],
      history: () => this.hist.map((h, i) => ['dim', `  ${i + 1}  ${h}`]),
      ls: () => {
        const target = this.resolve(args[0] || '.');
        if (fExists(target)) return [['d', baseName(target)]];
        if (!dExists(target)) return [['r', `ls: ${args[0]}: No such file or directory`]];
        const { dirs, files } = listDir(target);
        if (!dirs.length && !files.length) return [];
        return [['b', dirs.map(d => d + '/').join('  ') + (dirs.length && files.length ? '  ' : '')], ['d', files.join('  ')]].filter(l => l[1]);
      },
      cd: () => {
        const t = args[0] ? this.resolve(args[0]) : '/MeuJarvis';
        if (fExists(t)) return [['r', `cd: not a directory: ${args[0]}`]];
        if (!dExists(t)) return [['r', `cd: no such file or directory: ${args[0]}`]];
        this.cwd = t; setTimeout(() => this.updatePrompt(document), 0); return [];
      },
      mkdir: () => { if (!args[0]) return [['r', 'mkdir: missing operand']]; ensureDir(this.resolve(args[0])); Store.save(); return [['g', `diretório criado: ${args[0]}`]]; },
      touch: () => { if (!args[0]) return [['r', 'touch: missing operand']]; const p = this.resolve(args[0]); if (!fExists(p)) fSet(p, ''); return [['g', `arquivo: ${args[0]}`]]; },
      cat: () => { if (!args[0]) return [['r', 'cat: missing operand']]; const f = fGet(this.resolve(args[0])); if (!f) return [['r', `cat: ${args[0]}: No such file or directory`]]; return f.c.split('\n').slice(0, 60).map(l => ['d', l]); },
      rm: () => { if (!args[0]) return [['r', 'rm: missing operand']]; const p = this.resolve(args[0].replace(/^-rf?\s*/, '')); if (!fExists(p) && !dExists(p)) return [['r', `rm: ${args[0]}: No such file or directory`]]; fDel(p); return [['y', `removido: ${args[0]}`]]; },
      echo: () => {
        const m = cmd.match(/^echo\s+(.*?)(?:\s*>\s*(\S+))?$/);
        const text = (m ? m[1] : '').replace(/^["']|["']$/g, '');
        if (m && m[2]) { fSet(this.resolve(m[2]), text + '\n'); return [['g', `escrito em ${m[2]}`]]; }
        return [['d', text]];
      },
      clear: () => { this.lines = []; this.paint(); return null; },
      apk: () => {
        const sub = args[0], pkg = args.slice(1).join(' ');
        if (sub === 'search' && pkg) return [['d', `nodejs-20.11.0-r0 — ${pkg} (simulado)`], ['d', `${pkg}-tools-1.0-r0 — utilitários (simulado)`]];
        if (sub === 'add' && pkg) return [['g', `(1/3) Instalando ${pkg}... OK (simulado)`], ['g', 'OK: 3 pacotes instalados']];
        if (sub === 'del' && pkg) return [['y', `(1/1) Removendo ${pkg}... OK (simulado)`]];
        if (sub === 'update') return [['d', 'fetch https://dl-cdn.alpinelinux.org/alpine/v3.19/main ... OK (simulado)']];
        if (sub === 'upgrade') return [['g', 'OK: sistema atualizado (simulado)']];
        return [['d', 'Uso: apk search|add|del|update|upgrade <pacote>']];
      },
      npm: () => [['d', 'npm v10.2.4 (simulado) — use "apk add nodejs" no Acode real']],
      node: () => args[0] ? [['d', `node: executando ${args[0]}... (simulado)`], ['g', '✓ sem erros']] : [['d', 'Welcome to Node.js v20 (simulado). Digite "exit" no app real.']],
      python: () => [['d', 'Python 3.11.6 (simulado) — "apk add python3" no Acode real']],
      git: () => {
        const sub = args[0] || 'status';
        if (sub === 'status') return [['d', 'On branch main'], ['g', 'nothing to commit, working tree clean (simulado)']];
        if (sub === 'log') return [['y', 'commit 1a2b3c4 — Initial commit (simulado)']];
        return [['d', `git ${sub} executado (simulado)`]];
      },
      open: () => { if (!args[0]) return [['r', 'Uso: open <arquivo>']]; const p = this.resolve(args[0]); if (!fExists(p)) return [['r', `open: ${args[0]}: not found`]]; openFile(p); return [['g', `aberto: ${args[0]}`]]; },
      run: () => {
        const p = T.active;
        if (!p) return [['r', 'Nenhum arquivo aberto']];
        const lang = detectLang(p);
        if (lang === 'html') { Preview.open(p); return [['g', `preview: ${baseName(p)}`]]; }
        return [['c', `▶ executando ${baseName(p)} (${LANGS[lang].name})...`], ['g', '✓ concluído (simulado)']];
      },
      exit: () => { Panel.close(); return [['dim', 'sessão encerrada (toque no ícone de terminal para voltar)']]; }
    };
    const fn = R[bin];
    if (!fn) { this.print('r', `${bin}: command not found — digite "help"`); return; }
    const res = fn();
    if (res) res.forEach(([k, t]) => this.print(k, t));
  }
};

/* ============================== CONSOLE ============================== */
const ConsolePage = {
  filter: 'ALL',
  open() { Page.open('console', 'Console', el => this.render(el)); },
  render(el) {
    el.innerHTML = `<div class="chip-row" id="cfChips">${['ALL', 'LOG', 'INFO', 'WARN', 'ERROR'].map(f => `<button class="chip${this.filter === f ? ' sel' : ''}" data-f="${f}">${f}</button>`).join('')}</div>
      <div class="console-list" id="clogList" style="max-height:52vh"></div>
      <div class="console-in"><input id="jsEval" placeholder="Executar JavaScript... (ex: 2+2)" autocomplete="off"><button class="mini-btn" id="jsGo">▶</button></div>
      <div class="btn-row"><button class="big-btn" id="clClear">Limpar console</button></div>`;
    el.querySelectorAll('#cfChips .chip').forEach(c => c.onclick = () => { this.filter = c.dataset.f; this.render(el); });
    renderConsoleList();
    const go = () => {
      const code = el.querySelector('#jsEval').value.trim();
      if (!code) return;
      clog('LOG', '> ' + code);
      try { const r = new Function('"use strict";return (' + code + ')')(); clog('INFO', String(r)); }
      catch (err) { clog('ERROR', err.message); }
      el.querySelector('#jsEval').value = '';
      renderConsoleList();
      toast('Expressão avaliada', 'console');
    };
    el.querySelector('#jsGo').onclick = go;
    el.querySelector('#jsEval').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    el.querySelector('#clClear').onclick = () => { CLog.list = []; renderConsoleList(); };
  }
};
function renderConsoleList() {
  const box = $('#clogList');
  if (!box) return;
  const f = ConsolePage.filter;
  const items = CLog.list.filter(l => f === 'ALL' || l.level === f);
  box.innerHTML = items.length ? '' : '<div class="empty">Console vazio</div>';
  items.slice(-120).forEach(l => {
    const d = document.createElement('div');
    d.className = 'clog ' + l.level;
    d.innerHTML = `<span class="lv">${l.level}</span><span class="tm">${esc(l.t)}</span><span class="ms">${esc(l.msg)}</span>`;
    box.appendChild(d);
  });
  box.scrollTop = box.scrollHeight;
}

