/* ==========================================================================
   THCODE v2 — API de plugins personalizados + hooks
   ========================================================================== */
const Hooks = {
  map: {},
  on(pid, ev, fn) { (this.map[ev] = this.map[ev] || []).push({ pid, fn }); },
  fire(ev, data) { (this.map[ev] || []).forEach(h => { try { h.fn(data); } catch (e) { console.warn('[thcode] hook', ev, e); } }); }
};
const CustomCmds = {
  list: [],
  add(pid, name, fn) { this.list = this.list.filter(c => c.name !== name); this.list.push({ pid, name, fn }); },
  find(name) { return this.list.find(c => c.name === name); }
};
const ThcodeAPI = {
  for(pid) {
    return {
      version: APP_VER,
      notify: (t, b) => Notifs.push(t, b || '', 'puzzle'),
      commands: { register: (name, fn) => CustomCmds.add(pid, name, fn) },
      on: (ev, fn) => Hooks.on(pid, ev, fn),
      fs: {
        read: p => fRead(p),
        write: (p, c) => fSet(p, c),
        list: () => Object.keys(FS.files)
      },
      settings: {
        get: (k, d) => { const s = pset(pid); return s[k] !== undefined ? s[k] : d; },
        set: (k, v) => { const s = pset(pid); s[k] = v; Store.save(); }
      }
    };
  }
};
const CustomPlugins = {
  KEY: 'thcode.custom.v1',
  list: [],
  template(name) {
    const id = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `// ==ThcodePlugin==\n// @name ${name}\n// @id ${id}\n// @version 1.0.0\n// @description Meu plugin personalizado\n// ==/ThcodePlugin==\n\n// Registra um comando de terminal: digite "${id}"\nThcode.commands.register('${id}', async (args) => {\n  Thcode.notify('${name}', 'Comando executado: ' + args);\n  return 'Olá do ${name}!';\n});\n\n// Reage a eventos: fs:save, app:boot\nThcode.on('fs:save', (path) => {\n  console.log('[${id}] salvo:', path);\n});\n`;
  },
  parse(code) {
    const g = k => (String(code).match(new RegExp('// @' + k + ' (.+)')) || [])[1] || '';
    return { id: (g('id') || ('custom-' + Date.now())).trim(), name: (g('name') || 'Sem nome').trim(), ver: (g('version') || '1.0.0').trim(), desc: (g('description') || 'Plugin personalizado').trim(), code: String(code) };
  },
  load() {
    try { this.list = JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (_) { this.list = []; }
    this.list.forEach(c => this.register(c, true));
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.list)); } catch (_) {} },
  register(c, silent) {
    if (!PLUGIN_DEFS.some(p => p.id === c.id)) PLUGIN_DEFS.push({ id: c.id, name: c.name + ' ✎', ver: c.ver, dl: '—', desc: c.desc, bg: 'linear-gradient(135deg,#334155,#0f172a)', ic: 'puzzle' });
    if (c.installed !== false) Plugins.installed[c.id] = c.ver;
    PLUGIN_META[c.id] = { vendor: 'Você', lic: 'MIT', rating: 100, reviews: 1, updated: 'agora', tags: ['custom'], feats: ['Comandos de terminal próprios', 'Hooks fs:save e app:boot', 'Acesso à API Thcode'] };
    try {
      new Function('Thcode', c.code)(ThcodeAPI.for(c.id));
      if (!silent) { toast('Plugin "' + c.name + '" ativo!', 'check'); clog('INFO', 'Plugin personalizado ativo: ' + c.id); }
    } catch (e) { toast('Erro no plugin ' + c.name, 'error'); clog('ERROR', 'Falha no plugin ' + c.id + ': ' + e.message); }
  },
  install(code) {
    const c = this.parse(code);
    if (PLUGIN_DEFS.some(p => p.id === c.id) && !c.id.startsWith('custom-')) { toast('ID já existe: ' + c.id, 'error'); return; }
    this.list = this.list.filter(x => x.id !== c.id);
    c.installed = true;
    this.list.push(c); this.save();
    installOverlay(c.name, c.ver, ['Lendo manifesto', 'Validando API', 'Ativando plugin'], () => {
      this.register(c, true);
      toast('Plugin "' + c.name + '" instalado!', 'check');
      if (Panel.current === 'plugins') Panel.render();
    });
  },
  fromFile() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.js';
    inp.onchange = () => {
      const f = inp.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => this.install(String(r.result || ''));
      r.readAsText(f);
    };
    inp.click();
  },
  async fromURL() {
    const url = await dPrompt('Instalar da URL', 'https://', 'Cole o link do arquivo .js do plugin');
    if (!url) return;
    try {
      const r = await fetch(url);
      if (!r.ok) throw 0;
      this.install(await r.text());
    } catch (_) { toast('Falha ao baixar o plugin', 'error'); }
  },
  async newPlugin() {
    const name = await dPrompt('Novo plugin', '', 'Nome do plugin (ex: Meu Atalho)');
    if (!name) return;
    const code = this.template(name);
    const c = this.parse(code);
    fSet('/plugins/' + c.id + '.js', code);
    openFile('/plugins/' + c.id + '.js');
    this.install(code);
  },
  remove(id) {
    this.list = this.list.filter(x => x.id !== id); this.save();
    delete Plugins.installed[id];
    const i = PLUGIN_DEFS.findIndex(p => p.id === id);
    if (i >= 0) PLUGIN_DEFS.splice(i, 1);
    CustomCmds.list = CustomCmds.list.filter(c => c.pid !== id);
    computeCaps();
    toast('Plugin removido', 'trash');
    if (Panel.current === 'plugins') Panel.render();
  }
};

