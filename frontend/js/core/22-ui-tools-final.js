/* ==========================================================================
   THCODE v2 — Ferramentas dos plugins (paleta de comandos)
   ========================================================================== */
function gotoLine(path, ln) {
  openFile(path);
  setTimeout(() => {
    const v = Ed.input.value.split('\n');
    let pos = 0;
    for (let i = 0; i < Math.min(ln - 1, v.length); i++) pos += v[i].length + 1;
    Ed.input.focus();
    try { Ed.input.setSelectionRange(pos, pos + (v[ln - 1] || '').length); } catch (_) {}
    Ed.updateCursor();
  }, 80);
}
const Tools = {
  _need(pid) { toast('Instale o plugin para usar', 'info'); PluginDetail.open(pid); },
  palette() {
    if (!Plugins.isInstalled('color-palette')) return this._need('color-palette');
    if (!T.active) return toast('Abra um arquivo primeiro', 'info');
    const src = (fGet(T.active) || { c: '' }).c;
    const cols = [...new Set([...src.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m => m[0]).concat([...src.matchAll(/rgba?\([^)]+\)/g)].map(m => m[0])))].slice(0, 40);
    Page.open('toolpal', 'Paleta do arquivo', el => {
      el.innerHTML = cols.length ? `<div class="discover-grid">${cols.map(c => `<div class="disc-card" data-c="${esc(c)}"><div style="height:44px;border-radius:9px;background:${esc(c)};border:1px solid var(--line)"></div><b style="font-family:var(--font-code);font-size:11px">${esc(c)}</b><span class="go">Copiar</span></div>`).join('')}</div>` : '<div class="empty">Nenhuma cor encontrada neste arquivo.</div>';
      el.querySelectorAll('.disc-card').forEach(d => d.onclick = () => { navigator.clipboard?.writeText(d.dataset.c); toast(d.dataset.c + ' copiado', 'check'); });
    }, false);
  },
  todos() {
    if (!Plugins.isInstalled('todo-tree')) return this._need('todo-tree');
    const hits = [];
    for (const [p, f] of Object.entries(FS.files)) {
      ((f && f.c) || '').split('\n').forEach((l, i) => {
        const m = l.match(/(TODO|FIXME|XXX|HACK|NOTE)\s*:?\s*(.*)/);
        if (m) hits.push({ p, ln: i + 1, tag: m[1], txt: m[2].trim().slice(0, 80) });
      });
    }
    Page.open('tooltodo', `TODOs (${hits.length})`, el => {
      el.innerHTML = hits.length ? hits.map(h => `<div class="row" data-p="${esc(h.p)}" data-l="${h.ln}"><span class="tag">${h.tag}</span><div class="grow"><div class="t">${esc(h.txt) || '(sem texto)'}</div><div class="s">${esc(h.p)}:${h.ln}</div></div></div>`).join('') : '<div class="empty">Nenhum TODO no projeto. 🎉</div>';
      el.querySelectorAll('.row').forEach(r => r.onclick = () => { Page.close(); gotoLine(r.dataset.p, +r.dataset.l); });
    }, false);
  },
  lint() {
    if (!Plugins.isInstalled('eslint')) return this._need('eslint');
    if (!T.active) return toast('Abra um arquivo primeiro', 'info');
    const rules = pset('eslint');
    const issues = [];
    ((fGet(T.active) || { c: '' }).c).split('\n').forEach((l, i) => {
      if (rules.noConsole && /console\.(log|warn|error)/.test(l)) issues.push({ ln: i + 1, msg: 'console.* encontrado (no-console)', lv: 'warn' });
      if (rules.semi && detectLang(T.active) === 'js' && /^\s*(const|let|var|return|import|export|await).*\S$/.test(l) && !/[;{}:]$/.test(l.trim())) issues.push({ ln: i + 1, msg: 'Falta ponto e vírgula (semi)', lv: 'warn' });
      if (/\t/.test(l) && S.tabsToSpaces) issues.push({ ln: i + 1, msg: 'Tab onde há espaços (indent)', lv: 'info' });
    });
    Page.open('toollint', `Lint (${issues.length})`, el => {
      el.innerHTML = issues.length ? issues.map(x => `<div class="diag-row" data-l="${x.ln}"><div class="diag-ic ${x.lv === 'warn' ? 'warn' : 'info'}">${icon('alert')}</div><div class="grow"><div class="t">Linha ${x.ln}</div><div class="s">${esc(x.msg)}</div></div></div>`).join('') + `<div class="btn-row"><button class="big-btn" id="lintCfg">Regras</button></div>` : '<div class="empty">Nenhum problema. ✨</div>';
      el.querySelectorAll('.diag-row').forEach(r => r.onclick = () => { Page.close(); gotoLine(T.active, +r.dataset.l); });
      el.querySelector('#lintCfg')?.addEventListener('click', () => PluginSettings.open('eslint'));
    }, false);
  },
  jsonValidate() {
    if (!Plugins.isInstalled('json-tools')) return this._need('json-tools');
    if (!T.active) return toast('Abra um arquivo primeiro', 'info');
    try { JSON.parse(Ed.input.value); dAlert('JSON válido', '✓ O arquivo <b>' + esc(baseName(T.active)) + '</b> é um JSON válido.'); }
    catch (e) { dAlert('JSON inválido', '✕ ' + esc(e.message)); }
  },
  jsonMin() {
    if (!Plugins.isInstalled('json-tools')) return this._need('json-tools');
    if (!T.active) return toast('Abra um arquivo primeiro', 'info');
    try {
      const min = JSON.stringify(JSON.parse(Ed.input.value));
      Ed.pushUndo(T.active, Ed.input.value);
      Ed.input.value = min; Ed.onEdit(true); saveFile(T.active, min);
      toast('JSON minificado ✓', 'check');
    } catch (e) { toast('JSON inválido: ' + e.message, 'error'); }
  },
  gitQuick() {
    if (!Plugins.isInstalled('git-scm')) return this._need('git-scm');
    const dirty = Object.keys(T.dirty);
    Page.open('toolgit', 'Git rápido', el => {
      el.innerHTML = `<div class="diag-row"><div class="diag-ic info">${icon('git')}</div><div class="grow"><div class="t">branch main</div><div class="s">${dirty.length} arquivo(s) modificado(s) (simulado)</div></div></div>
      ${dirty.map(p => `<div class="row">${icon('file')}<div class="grow"><div class="t">${esc(baseName(p))}</div><div class="s">${esc(p)}</div></div><span class="tag">M</span></div>`).join('')}
      <div class="btn-row"><button class="big-btn primary" id="gCommit">Commit</button></div>`;
      el.querySelector('#gCommit').onclick = async () => {
        const msg = await dPrompt('Commit', '', 'Mensagem do commit');
        if (!msg) return;
        clog('INFO', 'git commit: ' + msg);
        Notifs.push('Git', 'Commit "' + msg + '" (simulado).', 'git');
        toast('Commit criado (simulado) ✓', 'check');
      };
    }, false);
  },
  apk() {
    if (!Plugins.isInstalled('android-builder')) return this._need('android-builder');
    Page.open('toolapk', 'Build APK', el => {
      el.innerHTML = `<div class="install-bar" style="margin:16px"><i id="apkBar"></i></div><div class="install-steps" id="apkSteps" style="padding:0 16px"></div><div class="btn-row"><button class="big-btn primary" id="apkGo">Iniciar build</button></div>`;
      el.querySelector('#apkGo').onclick = () => {
        const steps = ['Coletando arquivos', 'Compilando (aapt)', 'Assinando (debug)', 'Alinhando (zipalign)'];
        const box = el.querySelector('#apkSteps'), bar = el.querySelector('#apkBar');
        box.innerHTML = steps.map(s => `<div class="istep">${icon('clock')}<span>${s}</span></div>`).join('');
        const rows = [...box.children];
        let i = 0;
        const next = () => {
          if (i > 0) { rows[i - 1].classList.replace('doing', 'done'); rows[i - 1].querySelector('svg').outerHTML = icon('check'); }
          if (i >= rows.length) { bar.style.width = '100%'; toast('app-debug.apk gerado (12,4 MB) — simulado', 'check'); return; }
          rows[i].classList.add('doing'); rows[i].querySelector('svg').outerHTML = icon('refresh');
          bar.style.width = ((i + 1) / rows.length * 100) + '%';
          i++; setTimeout(next, 600);
        };
        next();
      };
    }, false);
  },
  stats() {
    if (!Plugins.isInstalled('git-dust')) return this._need('git-dust');
    const byLang = {};
    let lines = 0;
    for (const [p, f] of Object.entries(FS.files)) {
      const L = LANGS[detectLang(p)];
      byLang[L.name] = byLang[L.name] || { n: 0, l: 0, c: L.color };
      byLang[L.name].n++; const k = ((f && f.c) || '').split('\n').length; byLang[L.name].l += k; lines += k;
    }
    const rows = Object.entries(byLang).sort((a, b) => b[1].l - a[1].l);
    const max = rows[0] ? rows[0][1].l : 1;
    Page.open('toolstats', 'Estatísticas', el => {
      el.innerHTML = `<div class="metric-grid"><div class="metric"><div class="v">${rows.reduce((a, r) => a + r[1].n, 0)}</div><div class="l">Arquivos</div></div><div class="metric"><div class="v">${lines.toLocaleString('pt-BR')}</div><div class="l">Linhas</div></div></div>` +
        rows.map(([n, d]) => `<div class="diag-row"><div class="grow"><div class="t">${esc(n)} — ${d.n} arq • ${d.l.toLocaleString('pt-BR')} linhas</div><div class="install-bar" style="margin-top:8px"><i style="width:${(d.l / max * 100).toFixed(1)}%;background:${d.c}"></i></div></div></div>`).join('');
    }, false);
  },
  askAI() {
    if (!Plugins.isInstalled('ai-sidebar')) return this._need('ai-sidebar');
    const sel = Ed.input.value.slice(Ed.input.selectionStart, Ed.input.selectionEnd).trim();
    if (!sel) { toast('Selecione um trecho de código primeiro', 'info'); return; }
    Panel.open('agent');
    setTimeout(() => {
      const inp = document.querySelector('#agentIn');
      if (inp) { inp.value = `Explique este código:\n\n${sel.slice(0, 1500)}`; inp.focus(); }
      toast('Seleção enviada ao agente', 'ai');
    }, 80);
  },
  npm() {
    if (!CAPS.npm) return this._need('npm-scripts');
    let j = {};
    try { j = JSON.parse((fGet('/package.json') || { c: '{}' }).c); } catch (_) {}
    const scripts = Object.entries((j.scripts) || {});
    Page.open('toolnpm', 'npm scripts', el => {
      el.innerHTML = scripts.length ? scripts.map(([k, v]) => `<div class="row">${icon('play')}<div class="grow"><div class="t">${esc(k)}</div><div class="s">${esc(v)}</div></div><button class="mini-btn">Run</button></div>`).join('') : '<div class="empty">Nenhum script em /package.json</div>';
      el.querySelectorAll('.row').forEach(r => r.querySelector('button').onclick = () => { Page.close(); Panel.open('terminal'); setTimeout(() => Term.exec('npm run ' + r.querySelector('.t').textContent), 120); });
    }, false);
  },
  openPath() {
    if (!Plugins.isInstalled('path-linker')) return this._need('path-linker');
    const v = Ed.input.value, s = Ed.input.selectionStart;
    const m = v.slice(0, s).match(/[\w\-./\\]+$/) || [''];
    const cand = m[0].replace(/['"`)\]]+$/, '');
    const p = normPath(cand.startsWith('/') ? cand : '/' + cand);
    if (FS.files[p] !== undefined) { openFile(p); toast('Aberto: ' + p, 'files'); }
    else if (dExists(p)) { Explorer.root = p; Panel.open('files'); }
    else toast('Caminho não encontrado: ' + cand, 'error');
  },
  inspect() {
    if (!Plugins.isInstalled('suger')) return this._need('suger');
    if (!T.active) return toast('Abra um arquivo primeiro', 'info');
    const c = Ed.input.value, L = LANGS[detectLang(T.active)];
    let h = 5381;
    for (let i = 0; i < c.length; i++) h = ((h << 5) + h + c.charCodeAt(i)) >>> 0;
    Page.open('toolinsp', 'Inspecionar', el => {
      el.innerHTML = `<div class="diag-row"><div class="diag-ic info">${icon('search')}</div><div class="grow"><div class="t">${esc(baseName(T.active))}</div><div class="s">${esc(T.active)}</div></div></div>
      <div class="metric-grid"><div class="metric"><div class="v">${L.name}</div><div class="l">Linguagem</div></div><div class="metric"><div class="v">${c.split('\n').length.toLocaleString('pt-BR')}</div><div class="l">Linhas</div></div>
      <div class="metric"><div class="v">${c.split(/\s+/).filter(Boolean).length.toLocaleString('pt-BR')}</div><div class="l">Palavras</div></div><div class="metric"><div class="v">${(c.length / 1024).toFixed(1)} KB</div><div class="l">Tamanho</div></div></div>
      <div class="diag-row"><div class="grow"><div class="t">Hash djb2</div><div class="s" style="font-family:var(--font-code)">${h.toString(16)}</div></div></div>`;
    }, false);
  },
  md() {
    if (!CAPS.md) return this._need('md-preview');
    if (!T.active) return toast('Abra um arquivo primeiro', 'info');
    Browser.open(T.active);
  }
};
const _palCmds = Palette.commands.bind(Palette);
Palette.commands = function () {
  const base = _palCmds();
  const has = pid => Plugins.isInstalled(pid);
  const need = (pid, t) => ({ t: t + ' 🔌', s: 'Instalar plugin para ativar', fn: () => PluginDetail.open(pid) });
  const ex = [
    has('color-palette') ? { t: 'Gerar paleta do arquivo', s: 'Extrai cores do arquivo atual', fn: () => Tools.palette() } : need('color-palette', 'Gerar paleta do arquivo'),
    has('todo-tree') ? { t: 'Listar TODOs do projeto', s: 'TODO, FIXME, HACK…', fn: () => Tools.todos() } : need('todo-tree', 'Listar TODOs do projeto'),
    has('eslint') ? { t: 'Lint: verificar arquivo', s: 'Regras do plugin ESLint', fn: () => Tools.lint() } : need('eslint', 'Lint: verificar arquivo'),
    has('json-tools') ? { t: 'JSON: validar arquivo', s: 'Valida o JSON atual', fn: () => Tools.jsonValidate() } : need('json-tools', 'JSON: validar arquivo'),
    has('json-tools') ? { t: 'JSON: minificar', s: 'Remove espaços do JSON', fn: () => Tools.jsonMin() } : null,
    has('git-scm') ? { t: 'Git: status e commit', s: 'Commit rápido (simulado)', fn: () => Tools.gitQuick() } : need('git-scm', 'Git: status e commit'),
    has('android-builder') ? { t: 'Build APK', s: 'Gera APK debug (simulado)', fn: () => Tools.apk() } : need('android-builder', 'Build APK'),
    has('git-dust') ? { t: 'Estatísticas do projeto', s: 'Arquivos e linhas por linguagem', fn: () => Tools.stats() } : need('git-dust', 'Estatísticas do projeto'),
    has('ai-sidebar') ? { t: 'Perguntar à IA sobre a seleção', s: 'Envia seleção ao agente', fn: () => Tools.askAI() } : need('ai-sidebar', 'Perguntar à IA sobre a seleção'),
    CAPS.npm ? { t: 'npm: scripts', s: 'Executa scripts do package.json', fn: () => Tools.npm() } : need('npm-scripts', 'npm: scripts'),
    has('path-linker') ? { t: 'Abrir caminho sob o cursor', s: 'Resolve o path no texto', fn: () => Tools.openPath() } : need('path-linker', 'Abrir caminho sob o cursor'),
    has('suger') ? { t: 'Inspecionar arquivo', s: 'Métricas do arquivo atual', fn: () => Tools.inspect() } : need('suger', 'Inspecionar arquivo'),
    CAPS.md ? { t: 'Markdown: preview', s: 'Renderiza .md no navegador', fn: () => Tools.md() } : need('md-preview', 'Markdown: preview'),
    ...CustomCmds.list.map(c => ({ t: '⚡ ' + c.name, s: 'Comando de plugin personalizado', fn: () => { Panel.open('terminal'); setTimeout(() => Term.exec(c.name), 120); } }))
  ].filter(Boolean);
  return [...base, ...ex];
};


/* Handle de depuração/testes (console + tests/smoke.mjs) */
window.ThcodeTest = { S, T, FS, Ed, icon, AC, Term, Bash, Panel, Page, Drawer, Palette, Plugins, PLUGIN_DEFS, PLUGIN_META, AI, GH, AI_MODELS, Browser, Conn, Auth, Tools, CustomPlugins, CustomCmds, Hooks, CAPS, computeCaps, PluginDetail, PluginSettings, pset, SettingsPage, Notifs, Procs, State, Store, Metrics, openFile, saveFile, closeTab, fGet, fSet, fDel, fExists, fRead, dExists, listDir, detectLang, LANGS, baseName, normPath, applySettings, applyTermTheme, applySettingsJson, formatActive, renderEditor, updateCrumb, toast, dialog, dAlert, dConfirm, dPrompt, dList, THEMES, APP_VER, LS_KEY, OLD_LS_KEY, ficon, rainbowify, Emmet, Snippets, gotoLine };
document.addEventListener('DOMContentLoaded', boot);
