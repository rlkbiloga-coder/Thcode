/* ============================== SETTINGS PAGES ============================== */
const SettingsPage = {
  open() { Page.open('settings', 'Configurações', el => this.main(el)); },
  main(el) {
    sect(el, 'Core settings');
    el.appendChild(setRow('settings', 'Configurações do aplicativo', 'Language, app behavior, and quick access tools.', () => this.app()));
    el.appendChild(setRow('font', 'Configurações do editor', 'Fonts, tabs, suggestions, and editor display.', () => this.editor()));
    el.appendChild(setRow('terminal', 'Configurações do Terminal', 'Terminal theme, font, cursor, and session behavior.', () => this.terminal()));
    el.appendChild(setRow('globe', 'Configurações da pré-visualização', 'Preview mode, server ports, and browser behavior.', () => this.preview()));
    sect(el, 'Personalização');
    el.appendChild(setRow('palette', 'Tema', 'App theme, contrast, and custom colors.', () => this.theme()));
    el.appendChild(setRow('logo', 'Ícone do aplicativo', 'Escolha o ícone do aplicativo exibido no seu dispositivo.', () => this.appIcon()));
    sect(el, 'Ferramentas');
    el.appendChild(setRow('wand', 'Formatador', 'Choose a formatter for each supported language.', () => this.formatter()));
    el.appendChild(setRow('puzzle', 'Plugins', 'Manage installed plugins and their available actions.', () => Page.open('plugins', 'Plugins', p => renderPlugins(p, true))));
    el.appendChild(setRow('globe', 'Serviços conectados', 'GitHub, OpenRouter, registry e atualizações.', () => SettingsPage.services()));
    el.appendChild(setRow('zap', 'Language servers', 'Configure language servers and editor intelligence.', () => this.lsp()));
    sect(el, 'Maintenance');
    el.appendChild(setRow('backup', 'Backup & Restaurar', 'Export settings to a backup or restore them later.', () => this.backup()));
    el.appendChild(setRow('edit', 'Editar settings.json', 'Edit the raw settings.json file directly.', () => this.settingsJson()));
    el.appendChild(setRow('history', 'Restaurar a configuração original', 'Reset Thcode to its default configuration.', () => this.reset()));
    sect(el, 'About Thcode');
    el.appendChild(setRow('info', 'Sobre', 'Version 2.0.0', () => this.about()));
    el.appendChild(setRow('heart', 'Patrocinador', 'Support ongoing Acode development.', () => this.sponsor()));
    el.appendChild(setRow('clock', 'Registro de Alterações', 'See recent updates and release notes.', () => this.changelog()));
    el.appendChild(setRow('star', 'Avaliar Thcode', 'Rate Thcode on Google Play.', () => this.rate()));
    sect(el, 'Support Thcode');
    el.appendChild(setRow('play', 'Earn ad-free time', 'Watch ads to unlock temporary ad-free access.', () => this.adfree()));
    el.appendChild(setRow('lock', 'Remover propagandas', 'Unlock permanent ad-free access.', () => this.removeAds()));
    sect(el, 'Descubra mais apps');
    el.appendChild(setRow('ai', 'Better Keep Notes', 'Private & Secure OSS notes app', () => this.promo('Better Keep Notes', 'Bloco de notas privado, seguro e open-source.')));
    el.appendChild(setRow('terminal', 'Shellular', 'Your PC in your Pocket', () => this.promo('Shellular', 'SSH + terminal remoto no seu bolso.')));
    sect(el, 'Thcode');
    el.appendChild(setRow('gauge', 'Métricas', 'Desempenho, armazenamento e uso.', () => SettingsPage.metrics()));
    el.appendChild(setRow('shield', 'Diagnóstico', 'Saúde do app e recomendações.', () => SettingsPage.diagnostics()));
    el.appendChild(setRow('star', 'Descobrir', 'Produtos, apps e sites externos.', () => SettingsPage.discover()));
    sect(el, 'Ajuda');
    el.appendChild(setRow('help', 'Ajuda e atalhos', 'Shortcuts, gestures and tips.', () => this.help()));
    el.appendChild(setRow('book', 'Termos e Privacidade', 'Terms of service and privacy policy.', () => SettingsPage.legal()));
  },
  app(el0) {
    Page.open('app', 'Configurações do aplicativo', el => {
      sect(el, 'Idioma e região');
      el.appendChild(selectRow('Idioma / Language', 'lang', [['pt-BR', 'Português (Brasil)'], ['en', 'English'], ['es', 'Español']], () => toast('Interface em pt-BR — tradução completa ainda não existe (não simulamos)', 'globe')));
      sect(el, 'Comportamento');
      el.appendChild(toggleRow('vibrateOnTap', 'Vibrar ao tocar', 'vibrateOnTap — feedback tátil nas ações'));
      el.appendChild(toggleRow('confirmOnExit', 'Confirmar ao sair', 'confirmOnExit — pergunta antes de fechar com alterações'));
      el.appendChild(toggleRow('showSideButtons', 'Botões laterais', 'showSideButtons — mostra a barra de ícones'));
      el.appendChild(toggleRow('fullscreen', 'Tela cheia', 'Oculta barras do sistema (quando suportado)', v => { try { v ? document.documentElement.requestFullscreen?.() : document.exitFullscreen?.(); } catch (_) {} }));
      el.appendChild(toggleRow('floatingButton', 'Botão flutuante', 'Atalho flutuante do QuickTools', v => $('#qtFab').style.display = v === false ? 'none' : ''));
      el.appendChild(toggleRow('rememberFiles', 'Lembrar arquivos', 'rememberFiles — restaura abas ao abrir'));
      el.appendChild(toggleRow('checkForAppUpdates', 'Verificar atualizações', 'checkForAppUpdates na inicialização'));
      el.appendChild(toggleRow('developerMode', 'Modo desenvolvedor', 'Logs extras e selo DEV no Sobre'));
      sect(el, 'Aparência');
      el.appendChild(segRow('Animações', 'animation', [['system', 'Sistema'], ['on', 'Ligadas'], ['off', 'Desligadas'], ['reduced', 'Reduzidas']], v => { S.reduceMotion = (v === 'off' || v === 'reduced'); applySettings(); }));
      el.appendChild(toggleRow('reduceMotion', 'Reduzir animações', 'Desativa animações para economizar bateria', () => applySettings()));
      el.appendChild(rangeRow('Zoom da interface', 'uiZoom', 80, 130, 5, v => v + '%', v => document.body.style.fontSize = (14 * v / 100) + 'px'));
      sect(el, 'QuickTools');
      el.appendChild(segRow('Linhas do QuickTools', 'quickTools', [[0, 'Oculto'], [1, '1 linha'], [2, '2 linhas']], () => applySettings()));
      el.appendChild(segRow('Posição das abas', 'openFileListPos', [['header', 'Topo'], ['bottom', 'Embaixo']], v => moveTabs(v)));
      sect(el, 'Salvamento');
      el.appendChild(segRow('Autosave', 'autosave', [[0, 'Off'], [5, '5s'], [15, '15s'], [30, '30s'], [60, '60s']], () => setupAutosave()));
      note(el, '<b>Dica:</b> todas as alterações são salvas automaticamente no dispositivo (localStorage).');
    });
  },
  editor() {
    Page.open('editor', 'Configurações do editor', el => {
      sect(el, 'Fonte');
      el.appendChild(rangeRow('Tamanho da fonte', 'fontSize', 10, 24, 0.5, v => v, () => { applySettings(); renderEditor(); }));
      el.appendChild(selectRow('Fonte do editor', 'editorFont', [['Roboto Mono', 'Roboto Mono'], ['Fira Code', 'Fira Code'], ['JetBrains Mono', 'JetBrains Mono'], ['monospace', 'Monospace (sistema)']], () => { applySettings(); renderEditor(); }));
      el.appendChild(rangeRow('Altura da linha', 'lineHeight', 1.2, 2.2, 0.05, v => (+v).toFixed(2), () => { applySettings(); renderEditor(); }));
      sect(el, 'Exibição');
      el.appendChild(toggleRow('linenumbers', 'Números de linha', 'linenumbers', () => { applySettings(); renderEditor(); }));
      el.appendChild(toggleRow('relativeLineNumbers', 'Linhas relativas', 'relativeLineNumbers — distância até o cursor', () => renderEditor()));
      el.appendChild(toggleRow('minimap', 'Minimap', 'Miniatura do código na lateral', () => { applySettings(); renderEditor(); }));
      el.appendChild(toggleRow('highlightActiveLine', 'Destacar linha atual', 'highlightActiveLine', () => renderEditor()));
      el.appendChild(toggleRow('textWrap', 'Quebra de linha', 'textWrap — ajusta linhas longas', () => { applySettings(); renderEditor(); }));
      el.appendChild(toggleRow('colorPreview', 'Prévia de cores', 'colorPreview — mostra chip em #hex/rgb', () => renderEditor()));
      sect(el, 'Indentação');
      el.appendChild(segRow('Tamanho do Tab', 'tabSize', [[2, '2'], [4, '4'], [8, '8']], () => { applySettings(); renderEditor(); }));
      el.appendChild(toggleRow('softTab', 'Tab com espaços', 'softTab — insere espaços em vez de \\t'));
      el.appendChild(toggleRow('autoIndent', 'Indentação automática', 'autoIndent ao pressionar Enter'));
      sect(el, 'Inteligência');
      el.appendChild(toggleRow('liveAutoCompletion', 'Autocompletar', 'liveAutoCompletion — sugestões ao digitar'));
      el.appendChild(toggleRow('localWordCompletion', 'Completar palavras locais', 'localWordCompletion — usa palavras do arquivo'));
      el.appendChild(toggleRow('autoCloseBrackets', 'Fechar colchetes', 'autoCloseBrackets — () [] {} "" automaticamente'));
      el.appendChild(toggleRow('autoCloseTags', 'Fechar tags HTML', 'autoCloseTags — completa </tag>'));
      el.appendChild(toggleRow('bracketMatching', 'Casamento de colchetes', 'bracketMatching — mostra o par na barra de status'));
      sect(el, 'Formatação');
      el.appendChild(toggleRow('formatOnSave', 'Formatar ao salvar', 'formatOnSave com o formatador da linguagem'));
      const row = document.createElement('div'); row.className = 'btn-row';
      row.innerHTML = '<button class="big-btn primary">Formatar arquivo atual</button>';
      row.querySelector('button').onclick = () => { Page.close(); formatActive(); };
      el.appendChild(row);
    });
  },
  terminal() {
    Page.open('termset', 'Configurações do Terminal', el => {
      sect(el, 'Aparência');
      el.appendChild(rangeRow('Tamanho da fonte', 'termFontSize', 10, 20, 0.5, v => v, () => { if (Panel.current === 'terminal') Panel.render(); }));
      el.appendChild(selectRow('Tema do terminal', 'termTheme', [['dark', 'Dark'], ['green', 'Green phosphor'], ['amber', 'Amber'], ['light', 'Light'], ...(Plugins.isInstalled('terminal-pro') ? [['pro-green', 'Pro Green ✦'], ['pro-amber', 'Pro Amber ✦'], ['pro-purple', 'Pro Purple ✦']] : [])], v => applyTermTheme()));
      el.appendChild(toggleRow('cursorBlink', 'Cursor piscante', 'Anima o cursor do terminal', () => applyTermTheme()));
      sect(el, 'Sessão');
      el.appendChild(rangeRow('Tamanho do histórico', 'termHistory', 50, 1000, 50, v => v + ' cmds'));
      el.appendChild(selectRow('Shell', 'termShell', [['sh', 'sh (Alpine)'], ['bash', 'bash']]));
      note(el, 'O terminal opera sobre os mesmos arquivos do editor: <b>ls, cd, cat, touch, mkdir, echo &gt; arq</b> são reais.');
    });
  },
  preview() {
    Page.open('prevset', 'Configurações da pré-visualização', el => {
      sect(el, 'Modo');
      el.appendChild(segRow('Preview Mode', 'previewMode', [['inapp', 'In-App'], ['browser', 'Browser']]));
      el.appendChild(toggleRow('useCurrentFileForPreview', 'Usar arquivo atual', 'useCurrentFileForPreview para o Preview'));
      el.appendChild(toggleRow('disableCache', 'Desativar cache', 'disableCache — sempre recarrega'));
      sect(el, 'Servidor');
      el.appendChild(textRow('Host', 'host'));
      el.appendChild(textRow('Server port', 'serverPort', 'number'));
      el.appendChild(textRow('Preview port', 'previewPort', 'number'));
      note(el, `Preview real: os HTML são renderizados no próprio navegador (srcdoc com sandbox).`);
    });
  },
  theme() {
    Page.open('theme', 'Tema', el => {
      sect(el, 'Tema do aplicativo');
      const grid = document.createElement('div');
      grid.className = 'theme-grid';
      THEMES.forEach(t => {
        const c = document.createElement('div');
        c.className = 'theme-card' + (S.appTheme === t.id ? ' sel' : '');
        c.innerHTML = `<div class="theme-prev" style="background:${t.bg}"><div class="tp-bar" style="background:${t.bar}"></div><div class="tp-l1" style="background:${t.acc}"></div><div class="tp-l2" style="background:${t.bar}"></div><div class="tp-dot" style="background:${t.acc}"></div></div><div class="theme-name">${esc(t.name)}</div>`;
        c.onclick = () => { S.appTheme = t.id; applySettings(); Store.save(); toast('Tema alterado: ' + t.name, 'palette'); clog('INFO', 'Theme: ' + t.id); Page.rerender(); };
        grid.appendChild(c);
      });
      el.appendChild(grid);
      sect(el, 'Tema do editor');
      const list = document.createElement('div');
      list.className = 'opt-list';
      EDITOR_THEMES.forEach(t => {
        const o = document.createElement('div');
        o.className = 'opt-row' + (S.editorTheme === t.id ? ' sel' : '');
        o.innerHTML = `<span class="radio"></span>${esc(t.name)}`;
        o.onclick = () => { S.editorTheme = t.id; applySettings(); Store.save(); renderEditor(); toast('Tema do editor: ' + t.name, 'palette'); Page.rerender(); };
        list.appendChild(o);
      });
      el.appendChild(list);
    });
  },
  appIcon() {
    Page.open('appicon', 'Ícone do aplicativo', el => {
      sect(el, 'Escolha o ícone');
      const grid = document.createElement('div');
      grid.className = 'icon-grid';
      APP_ICONS.forEach(a => {
        const d = document.createElement('div');
        d.className = 'appicon' + (State.appIcon === a.id ? ' sel' : '');
        d.style.background = a.bg;
        d.innerHTML = icon('logo', `color:${a.fg}`);
        d.onclick = () => { State.appIcon = a.id; applyAppIcon(); Store.save(); toast('Ícone atualizado', 'check'); Page.rerender(); };
        grid.appendChild(d);
      });
      el.appendChild(grid);
      note(el, 'Ícone aplicado ao menu/splash do app e ao PWA instalado (real).');
    });
  },
  formatter() {
    Page.open('formatter', 'Formatador', el => {
      sect(el, 'Por linguagem');
      const langs = [['html', 'HTML'], ['css', 'CSS'], ['js', 'JavaScript'], ['json', 'JSON'], ['py', 'Python'], ['php', 'PHP']];
      if (!S.formatter) S.formatter = {};
      langs.forEach(([id, name]) => {
        const wrap = document.createElement('div');
        wrap.className = 'txt-row';
        const cur = S.formatter[id] || 'prettier';
        wrap.innerHTML = `<label>${name}</label><select data-l="${id}">${['prettier', 'beautify', 'none'].map(f => `<option${f === cur ? ' selected' : ''}>${f}</option>`).join('')}</select>`;
        wrap.querySelector('select').onchange = e => { S.formatter[id] = e.target.value; Store.save(); toast(`${name}: ${e.target.value}`, 'wand'); };
        el.appendChild(wrap);
      });
      el.appendChild(toggleRow('formatOnSave', 'Formatar ao salvar', 'formatOnSave'));
      const row = document.createElement('div'); row.className = 'btn-row';
      row.innerHTML = '<button class="big-btn primary">Formatar arquivo atual</button>';
      row.querySelector('button').onclick = () => { Page.close(); formatActive(); };
      el.appendChild(row);
    });
  },
  lsp() {
    Page.open('lsp', 'Language servers', el => {
      sect(el, 'Servidores');
      const servers = [['ts', 'TypeScript'], ['py', 'Python (pyright)'], ['php', 'PHP (intelephense)'], ['java', 'Java'], ['cpp', 'C/C++ (clangd)'], ['html', 'HTML'], ['css', 'CSS'], ['json', 'JSON']];
      if (!S.lsp) S.lsp = {};
      servers.forEach(([id, name]) => {
        const on = S.lsp[id] !== false;
        const b = document.createElement('div');
        b.className = 'set-row'; b.style.cursor = 'pointer';
        b.innerHTML = `${icon('zap')}<div class="grow"><div class="t">${name}</div><div class="s">${on ? '● ativo (dicionário local real)' : '○ inativo'}</div></div><div class="switch${on ? ' on' : ''}"></div>`;
        b.onclick = () => {
          S.lsp[id] = !on; Store.save();
          toast(`${name} ${!on ? 'conectado' : 'desconectado'}`, 'zap');
          clog('INFO', `LSP ${id}: ${!on ? 'connected' : 'disconnected'}`);
          Page.rerender();
        };
        el.appendChild(b);
      });
      note(el, 'Autocomplete/diagnóstico atual: dicionário local real do editor. LSP completo requer backend — não simulado.');
    });
  },
  backup() {
    Page.open('backup', 'Backup & Restaurar', el => {
      sect(el, 'Backup');
      let size = 0;
      try { size = (localStorage.getItem(LS_KEY) || '').length; } catch (_) {}
      note(el, `<b>Armazenamento local:</b> ${fmtSize(size)}<br>Inclui arquivos, abas, plugins, tema, configurações e históricos.`);
      const r1 = document.createElement('div'); r1.className = 'btn-row';
      r1.innerHTML = '<button class="big-btn primary">Exportar backup (.json)</button>';
      r1.querySelector('button').onclick = () => {
        Store.save();
        setTimeout(() => {
          const blob = new Blob([localStorage.getItem(LS_KEY) || '{}'], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `thcode-backup-${Date.now()}.json`;
          a.click();
          toast('Backup exportado', 'backup');
          clog('INFO', 'Backup exported');
        }, 450);
      };
      el.appendChild(r1);
      /* ---- Backup REAL em Gist privado (api.github.com) ---- */
      const rg = document.createElement('div'); rg.className = 'btn-row';
      rg.innerHTML = '<button class="big-btn primary">Backup → Gist privado (GitHub)</button>';
      rg.querySelector('button').onclick = async () => {
        let tk = GH.token;
        if (!tk) { const p = await dPrompt('GitHub token (scope gist)', 'Necessário para criar o Gist', ''); if (!p) return; tk = p.trim(); }
        const files = {};
        Object.entries(FS.files).forEach(([p, f]) => {
          const name = p.replace(/^\/+/, '').replace(/\//g, '__') + '.txt';
          files[name] = { content: (f && f.c) || '' };
        });
        if (!Object.keys(files).length) { toast('VFS vazio — nada para enviar', 'close'); return; }
        try {
          const r = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + tk, 'Accept': 'application/vnd.github+json' },
            body: JSON.stringify({ description: 'Thcode VFS backup ' + new Date().toISOString(), public: false, files })
          });
          if (!r.ok) throw new Error('GitHub ' + r.status + ' ' + (await r.text()).slice(0, 80));
          const g = await r.json();
          localStorage.setItem('thcode.gist.id', g.id);
          toast('Gist privado criado (backup real)', 'backup');
          clog('INFO', 'VFS backup → gist ' + g.id);
        } catch (e) { toast('Erro real: ' + e.message.slice(0, 60), 'close'); }
      };
      el.appendChild(rg);
      const rgr = document.createElement('div'); rgr.className = 'btn-row';
      rgr.innerHTML = '<button class="big-btn">Restaurar do Gist (id salvo)</button>';
      rgr.querySelector('button').onclick = async () => {
        const gid = localStorage.getItem('thcode.gist.id') || (await dPrompt('ID do Gist', '', ''));
        if (!gid) return;
        let tk = GH.token;
        if (!tk) { const p = await dPrompt('GitHub token', '', ''); if (!p) return; tk = p.trim(); }
        try {
          const r = await fetch('https://api.github.com/gists/' + encodeURIComponent(gid), { headers: { 'Authorization': 'Bearer ' + tk } });
          if (!r.ok) throw new Error('GitHub ' + r.status);
          const g = await r.json();
          let n = 0;
          Object.entries(g.files).forEach(([name, f]) => {
            const path = '/' + name.replace(/\.txt$/, '').replace(/__/g, '/');
            if (f.content !== undefined) { ensureDir(path.split('/').slice(0, -1).join('/') || '/'); fSet(path, f.content); n++; }
          });
          toast(n + ' arquivos restaurados do Gist (real)', 'backup');
          clog('INFO', 'VFS restore ← gist ' + gid + ' (' + n + ' arq)');
        } catch (e) { toast('Erro real: ' + e.message.slice(0, 60), 'close'); }
      };
      el.appendChild(rgr);
      const r2 = document.createElement('div'); r2.className = 'btn-row';
      r2.innerHTML = '<button class="big-btn">Restaurar de arquivo</button>';
      r2.querySelector('button').onclick = () => {
        const fi = $('#hiddenFileInput');
        fi.accept = '.json'; fi.webkitdirectory = false;
        fi.onchange = e => {
          const f = e.target.files[0];
          if (!f) return;
          const rd = new FileReader();
          rd.onload = () => {
            try {
              const data = JSON.parse(rd.result);
              if (!data.settings || !data.fs) throw 0;
              localStorage.setItem(LS_KEY, JSON.stringify(data));
              toast('Backup restaurado — recarregando', 'backup');
              setTimeout(() => location.reload(), 900);
            } catch (_) { toast('Arquivo de backup inválido', 'info'); }
          };
          rd.readAsText(f); fi.value = '';
        };
        fi.click();
      };
      el.appendChild(r2);
    });
  },
  settingsJson() {
    if (!fExists('__settings__.json')) fSet('__settings__.json', JSON.stringify(S, null, 2));
    else fSet('__settings__.json', JSON.stringify(S, null, 2));
    Page.close();
    openFile('__settings__.json');
    toast('Edite e salve para aplicar', 'edit');
  },
  async reset() {
    const ok = await dConfirm('Restaurar configuração original', 'Apagar <b>todos</b> os dados locais (arquivos, plugins, tema, configurações) e voltar ao padrão?', 'Restaurar');
    if (!ok) return;
    try { localStorage.removeItem(LS_KEY); } catch (_) {}
    toast('Configuração restaurada', 'history');
    setTimeout(() => location.reload(), 800);
  },
  about() {
    Page.open('about', 'Sobre', el => {
      el.innerHTML = `<div class="about-hero"><div class="drawer-logo" id="aboutLogo">${icon('logo', 'color:#fff')}</div>
        <h2>Acode ${S.developerMode ? '<span style="font-size:10px;background:var(--accent);color:#fff;border-radius:5px;padding:2px 7px;vertical-align:3px">DEV</span>' : ''}</h2>
        <p>powerful text/code editor for android</p></div>`;
      const rows = [
        ['info', 'Versão', APP_VER],
        ['terminal', 'Plataforma', (navigator.userAgentData ? navigator.userAgentData.platform : navigator.platform || 'web') + ' (real)'],
        ['globe', 'Núcleos CPU', (navigator.hardwareConcurrency || '?') + ' (real)'],
        ['files', 'Idioma', S.lang || 'pt-BR'],
        ['files', 'Base Acode', ACODE_BASE],
        ['puzzle', 'Plugins instalados', Object.keys(Plugins.installed).length + ''],
        ['heart', 'Licença', 'MIT — Thcode • base Acode']
      ];
      rows.forEach(([ic, t, s]) => {
        const d = document.createElement('div');
        d.className = 'set-row';
        d.innerHTML = `${icon(ic)}<div class="grow"><div class="t">${t}</div><div class="s">${esc(s)}</div></div>`;
        el.appendChild(d);
      });
      const r = document.createElement('div'); r.className = 'btn-row';
      r.innerHTML = '<button class="big-btn">Website</button><button class="big-btn">GitHub</button>';
      r.children[0].onclick = () => window.open('https://acode.foxdebug.com', '_blank');
      r.children[1].onclick = () => window.open(THCODE_REPO, '_blank');
      el.appendChild(r);
      applyAppIcon();
    });
  },
  sponsor() {
    Page.open('sponsor', 'Patrocinador', el => {
      note(el, '<b>Support ongoing Thcode development.</b><br>O Thcode é gratuito e open-source (MIT). Considere apoiar os desenvolvedores.');
      const r = document.createElement('div'); r.className = 'btn-row';
      r.innerHTML = '<button class="big-btn primary">Patrocinar ❤</button>';
      r.querySelector('button').onclick = () => { toast('Obrigado pelo apoio! ❤', 'heart'); clog('INFO', 'Sponsor clicked'); };
      el.appendChild(r);
    });
  },
  changelog() {
    Page.open('changelog', 'Registro de Alterações', el => {
      const vers = [
        { v: '2.0.0', tag: 'ATUAL', d: '2026-09-28', items: ['Thcode: nova identidade open-source (MIT)', 'Páginas de detalhes e configurações por plugin', 'Navegador de preview com Devices e Disable Cache', 'Terminal bash com pipes, variáveis e redirecionamento', 'Conectores reais: GitHub e OpenRouter', 'Contas locais, métricas, diagnóstico e serviços'] },
        { v: '1.13.5', d: '2026-09-20', items: ['Novo terminal Alpine com suporte a apk', 'AI Assistant Beta integrado', 'Melhorias de desempenho na inicialização', 'Correções de estabilidade no editor'] },
        { v: '1.13.4', d: '2026-08-30', items: ['Novos temas: Bling, Moon e Tomyris', 'QuickTools personalizável', 'Correção no preview in-app'] },
        { v: '1.13.0', d: '2026-07-12', items: ['Language servers (LSP)', 'Gerenciador de fontes', 'Backup & Restore'] },
        { v: '1.12.2', d: '2026-05-02', items: ['Correções de bugs', 'Traduções atualizadas (pt-BR)'] }
      ];
      vers.forEach(x => {
        const d = document.createElement('div');
        d.className = 'cl-ver';
        d.innerHTML = `<h4>v${x.v}${x.tag ? `<span class="tag">${x.tag}</span>` : ''}</h4><div class="date">${x.d}</div><ul>${x.items.map(i => `<li>${i}</li>`).join('')}</ul>`;
        el.appendChild(d);
      });
    });
  },
  rate() {
    dialog({
      title: 'Avaliar Thcode', body: '<p style="margin:6px 0 10px">Rate Acode on Google Play.</p><div id="stars" style="font-size:34px;text-align:center;letter-spacing:6px;cursor:pointer">★★★★★</div>',
      buttons: [{ label: 'Depois', value: false }, { label: 'Avaliar', primary: true, value: true }],
      onMount: () => {
        const st = $('#stars');
        let n = 5;
        const paint = () => st.innerHTML = '★★★★★'.split('').map((s, i) => `<span style="color:${i < n ? 'var(--yellow)' : 'var(--surface4)'}">★</span>`).join('');
        paint();
        st.onclick = e => { const i = [...st.children].indexOf(e.target.closest('span')); if (i >= 0) { n = i + 1; paint(); vibrate(8); } };
      }
    }).then(r => { if (r) { toast('Avaliação salva no seu dispositivo (sem envio — Play Store requer publicação)', 'star'); clog('INFO', 'App rated locally'); } });
  },
  adfree() {
    Page.open('adfree', 'Sem anúncios', el => {
      note(el, '<b>Anúncio com recompensa real requer AdMob/AdSense</b> (unidade de anúncio própria).<br>Indisponível até configurar uma conta de anúncios — nada é simulado aqui.<br><br>A alternativa real é o Thcode PRO (pagamento Stripe).');
      const box = document.createElement('div');
      box.innerHTML = '<div class="btn-row"><button class="big-btn primary" id="proBtn2">Ver Thcode PRO</button></div>';
      el.appendChild(box);
      box.querySelector('#proBtn2').onclick = () => State.removeAds ? State.removeAds() : drawerItem();
    });
  },
  removeAds() {
    const srv = window.ThcodeServer;
    if (!(srv && srv.isUp())) {
      dialog({ title: 'Pagamento indisponível', body: '<p style="margin:6px 0">O checkout real usa <b>Stripe</b> pelo backend (STRIPE_SECRET_KEY).<br><br>Conecte um backend com Stripe configurado em <b>Servidor → Conectar</b>.</p>', buttons: [{ label: 'OK', value: true }] });
      return;
    }
    dialog({
      title: 'Thcode PRO — R$ 19,90',
      body: '<p style="margin:6px 0">Pagamento único via <b>Stripe Checkout</b> (real).<br><span style="color:var(--muted);font-size:12px">Se o Stripe não estiver configurado no backend, você verá o erro real.</span></p>',
      buttons: [{ label: 'Cancelar', value: false }, { label: 'Pagar com Stripe', primary: true, value: true }]
    }).then(async r => {
      if (!r) return;
      try {
        const res = await srv.api('POST', '/api/billing/checkout', { origin: location.origin });
        if (res.url) { location.href = res.url; clog('INFO', 'Stripe checkout: ' + res.id); }
        else throw new Error(res.error || 'sem URL de checkout');
      } catch (e) { toast('Erro real: ' + e.message.slice(0, 70), 'close'); }
    });
  },
  promo(name, desc) {
    Page.open('promo', name, el => {
      el.innerHTML = `<div class="about-hero"><div class="drawer-logo">${icon('logo', 'color:#fff')}</div><h2>${esc(name)}</h2><p>${esc(desc)}</p></div>`;
      const r = document.createElement('div'); r.className = 'btn-row';
      r.innerHTML = '<button class="big-btn primary">Baixar APK (GitHub Releases)</button>';
      r.querySelector('button').onclick = () => window.open('https://github.com/rlkbiloga-coder/Thcode/releases', '_blank', 'noopener');
      el.appendChild(r);
    });
  },
  help() {
    Page.open('help', 'Ajuda', el => {
      sect(el, 'Atalhos de teclado');
      [['Ctrl+S', 'Salvar arquivo'], ['Ctrl+F', 'Localizar'], ['Ctrl+H', 'Localizar e substituir'], ['Ctrl+Z / Ctrl+Y', 'Desfazer / refazer'], ['Ctrl+Shift+P', 'Command Palette'], ['Esc', 'Fechar painel/menu']].forEach(([k, d]) => {
        const r = document.createElement('div');
        r.className = 'set-row';
        r.innerHTML = `${icon('keyboard')}<div class="grow"><div class="t">${d}</div></div><span class="kbd" style="font-family:var(--font-code);font-size:11px;background:var(--surface3);padding:3px 8px;border-radius:6px">${k}</span>`;
        el.appendChild(r);
      });
      sect(el, 'Gestos mobile');
      [['Deslize rápido nas abas', 'Troca de arquivo'], ['Deslize da borda esquerda', 'Abre o menu'], ['Pinça no editor', 'Zoom da fonte'], ['Toque longo em arquivo', 'Menu de contexto'], ['Toque longo na aba', 'Opções da aba']].forEach(([g, d]) => {
        const r = document.createElement('div');
        r.className = 'set-row';
        r.innerHTML = `${icon('info')}<div class="grow"><div class="t">${g}</div><div class="s">${d}</div></div>`;
        el.appendChild(r);
      });
      note(el, 'Dúvidas? Visite <b>acode.foxdebug.com/docs</b> ou o <b>Discord</b> da comunidade.');
    });
  }
};
/* ---- misc: tabs position, autosave, term theme, app icon, formatter ---- */
function moveTabs(pos) {
  const tabs = $('#tabs');
  if (pos === 'bottom') {
    let slot = $('#tabsBottom');
    if (!slot) {
      slot = document.createElement('div');
      slot.id = 'tabsBottom';
      slot.className = 'no-select';
      slot.style.cssText = 'flex:none;display:flex;height:40px;background:var(--surface);border-top:1px solid var(--line);padding:4px;';
      $('#app').insertBefore(slot, $('#quicktools'));
    }
    slot.appendChild(tabs);
    tabs.style.flex = '1';
  } else {
    $('.topbar').insertBefore(tabs, $('#newTabBtn'));
    tabs.style.flex = '';
    $('#tabsBottom')?.remove();
  }
  renderTabs();
}
let autosaveIv = null;
function setupAutosave() {
  clearInterval(autosaveIv);
  if (S.autosave > 0) {
    autosaveIv = setInterval(() => {
      if (T.active) Ed.snapshot(T.active);
      const dirty = Object.keys(T.dirty);
      if (dirty.length) { dirty.forEach(p => saveFileSilent(p)); toast('Autosave: ' + dirty.length + ' arquivo(s)', 'save'); }
    }, S.autosave * 1000);
  }
}
function saveFileSilent(p) {
  const content = p === T.active ? Ed.value() : Ed.currentContent(p);
  fSet(p, content);
  delete T.dirty[p];
  renderTabs(); updateCrumb();
}
function applyTermTheme() {
  let st = $('#termThemeStyle');
  if (!st) { st = document.createElement('style'); st.id = 'termThemeStyle'; document.head.appendChild(st); }
  const themes = {
    dark: ['#0a0c10', '#d6dce4'], green: ['#031007', '#7ee787'],
    amber: ['#100a02', '#e3b341'], light: ['#f6f8fa', '#24292f'],
    'pro-green': ['#02120a', '#00ff9d'], 'pro-amber': ['#170b00', '#ffb020'], 'pro-purple': ['#0e0618', '#c084fc']
  };
  const [bg, fg] = themes[S.termTheme] || themes.dark;
  st.textContent = `.term,.term-in-row{background:${bg}!important;color:${fg}}.term-in{color:${fg}!important}.term-out{color:${fg}}${S.cursorBlink === false ? '.term-cursor{animation:none}' : ''}`;
}
function applyAppIcon() {
  const a = APP_ICONS.find(x => x.id === State.appIcon) || APP_ICONS[0];
  $$('.drawer-logo').forEach(d => { d.style.background = a.bg; });
}
function formatCode(content, lang) {
  if (lang === 'json') {
    try { const tw = (S.pluginSettings && S.pluginSettings.prettier && S.pluginSettings.prettier.tabWidth) || 2; return JSON.stringify(JSON.parse(content), null, tw) + '\n'; } catch (_) { return content; }
  }
  return content.split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n{4,}/g, '\n\n\n').replace(/\s*$/, '\n');
}
function formatActive() {
  if (!T.active) { toast('Nenhum arquivo aberto', 'info'); return; }
  Ed.pushUndo(T.active, Ed.value());
  Ed.setValue(formatCode(Ed.value(), detectLang(T.active)));
  Ed.onEdit(false);
  toast('Arquivo formatado', 'wand');
  clog('INFO', 'Format: ' + T.active);
}
function applySettingsJson(text) {
  try {
    const obj = JSON.parse(text);
    let n = 0;
    for (const [k, v] of Object.entries(obj)) {
      if (k in DEFAULT_SETTINGS && typeof v === typeof DEFAULT_SETTINGS[k]) { S[k] = v; n++; }
    }
    applySettings(); setupAutosave(); moveTabs(S.openFileListPos === 'bottom' ? 'bottom' : 'header'); renderEditor();
    toast(`${n} configurações aplicadas`, 'settings');
    clog('INFO', 'settings.json applied');
  } catch (e) { toast('settings.json inválido: ' + e.message, 'info'); }
}

