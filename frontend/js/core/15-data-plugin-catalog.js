/* ==========================================================================
   THCODE v2 — Catálogo de plugins, capacidades, detalhes e efeitos reais
   ========================================================================== */
PLUGIN_DEFS.push(
  { id: 'lua-support', name: 'Lua Language Support', ver: '1.0.2', dl: '88.4K', desc: 'Realce, snippets e execução para Lua', bg: 'linear-gradient(135deg,#000080,#2b2ba0)', ic: 'files' },
  { id: 'vscode-icons', name: 'vscode Icons', ver: '2.0.4', dl: '210K', desc: 'Ícones de arquivo estilo VS Code (letras)', bg: 'linear-gradient(135deg,#007acc,#00c6ff)', ic: 'grid' },
  { id: 'ai-sidebar', name: 'AI Assistant Sidebar', ver: '2.1.1', dl: '64.2K', desc: 'Ações rápidas de IA sobre a seleção', bg: 'linear-gradient(135deg,#0ea5e9,#6366f1)', ic: 'ai' },
  { id: 'blackbox-ai', name: 'BlackBox AI For TDG', ver: '3.1.6', dl: '32.8K', desc: 'Múltiplos provedores de IA em um plugin', bg: 'linear-gradient(135deg,#111827,#000)', ic: 'grid' },
  { id: 'opencode-ai', name: 'OpenCode AI', ver: '0.2.2', dl: '4.23K', desc: 'Agente de codificação OpenCode no editor', bg: 'linear-gradient(135deg,#e8e8e8,#9a9a9a)', ic: 'console' },
  { id: 'rutex-agent', name: 'RutexAI Coding Agent', ver: '0.0.9', dl: '12.7K', desc: 'Agente autônomo para tarefas de código', bg: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', ic: 'hex' },
  { id: 'font-icons', name: 'Font icons', ver: '1.0.1', dl: '18.9K', desc: 'Ícones de fonte para o explorador', bg: 'linear-gradient(135deg,#f8fafc,#94a3b8)', ic: 'font' },
  { id: 'acode-purple', name: 'Acode Purple (theme)', ver: '1.1.7', dl: '96.1K', desc: 'Tema roxo neon oficial da comunidade', bg: 'linear-gradient(135deg,#a100ff,#5b21b6)', ic: 'palette' },
  { id: 'better-ui', name: 'Better UI', ver: '1.12.5', dl: '141K', desc: 'Densidade, escala e refinamentos de UI', bg: 'linear-gradient(135deg,#f59e0b,#111111)', ic: 'eye' },
  { id: 'eslint', name: 'ESLint', ver: '1.4.0', dl: '120K', desc: 'Lint de JavaScript no editor', bg: 'linear-gradient(135deg,#8080f2,#4b32c3)', ic: 'zap' },
  { id: 'todo-tree', name: 'Todo Tree', ver: '2.3.1', dl: '77.5K', desc: 'Liste TODOs e FIXMEs do projeto', bg: 'linear-gradient(135deg,#22c55e,#14532d)', ic: 'search' },
  { id: 'json-tools', name: 'JSON Tools', ver: '1.2.0', dl: '58.3K', desc: 'Validar e minificar JSON', bg: 'linear-gradient(135deg,#c678dd,#5b21b6)', ic: 'wand' },
  { id: 'md-preview', name: 'Markdown Preview', ver: '1.5.2', dl: '83.9K', desc: 'Preview de Markdown no navegador', bg: 'linear-gradient(135deg,#3b82f6,#0f172a)', ic: 'eye' },
  { id: 'emmet', name: 'Emmet', ver: '2.1.0', dl: '190K', desc: 'Expansão de abreviações com Tab', bg: 'linear-gradient(135deg,#f97316,#7c2d12)', ic: 'zap' },
  { id: 'bracket-colorizer', name: 'Bracket Pair Colorizer', ver: '1.0.8', dl: '66.6K', desc: 'Colchetes coloridos por nível', bg: 'linear-gradient(135deg,#eab308,#84cc16)', ic: 'palette' },
  { id: 'npm-scripts', name: 'npm Scripts', ver: '1.1.0', dl: '29.4K', desc: 'Execute scripts do package.json', bg: 'linear-gradient(135deg,#cb0000,#5c0000)', ic: 'play' }
);
const PLUGIN_META = {
  'acodex-term': { vendor: 'Acode-Foundation', rating: 99, reviews: 412, updated: '2d ago', tags: ['terminal', 'alpine', 'linux'], feats: ['Terminal Alpine com apk', 'Histórico persistente', 'Temas e fontes ajustáveis'] },
  'github': { vendor: 'Acode-Foundation', rating: 97, reviews: 358, updated: '4d ago', tags: ['git', 'github', 'repos'], feats: ['Dados reais via api.github.com', 'Clonar com README real', 'Cache offline'] },
  'ai-assistant': { vendor: 'Thcode', rating: 96, reviews: 187, updated: '1d ago', tags: ['ai', 'chat', 'assistant'], feats: ['Chat com streaming', 'Histórico de conversas', 'API real (OpenRouter) opcional'] },
  'prettier': { vendor: 'Thcode', rating: 98, reviews: 520, updated: '1w ago', tags: ['format', 'lint'], feats: ['JSON com tabWidth configurável', 'Formatar ao salvar', 'Remove espaços extras'] },
  'pinch-zoom': { vendor: 'Thcode', rating: 95, reviews: 96, updated: '3w ago', tags: ['editor', 'zoom'], feats: ['Pinça ajusta a fonte (50–250%)'] },
  'opencode-ai': { vendor: 'victorzee', lic: 'MIT', rating: 100, reviews: 3, updated: '4d ago', tags: ['ai', 'coding', 'agent', 'opencode', 'llm', 'assistant', 'terminal'], oss: true,
    changelog: [['0.2.3', 'Correção do probe de saúde e escala do iframe', '4d ago'], ['0.2.2', 'Render reativo do estado atual', '2w ago'], ['0.2.1', 'Lançamento inicial', '1mo ago']],
    readme: `# opencode\n\nRun the OpenCode AI coding agent inside the Editor.\n\n## Features\n\n- Launches OpenCode as a background HTTP server\n- Embeds the web UI in a full-page iframe\n- Loopback health probe and auto-install\n- Log levels: none, debug, info, warn, error\n\n## Requirements\n\nNode.js and npm must be available in the built-in Alpine Linux terminal:\n\n\`\`\`sh\napk add --no-cache nodejs npm\n\`\`\`\n\n## Project Structure\n\n\`\`\`\nsrc/\n  main.ts      # plugin init/destroy, flow orchestration\n  state.ts     # state machine (transition, onStateChange)\n  opencode/    # install, server, health\n  ui/          # render orchestrator, one func per state\n\`\`\`\n\n## License\n\nMIT — see the LICENSE file.` },
  'blackbox-ai': { vendor: 'The DarkGhost Developer', lic: 'MIT', rating: 100, reviews: 3, updated: '4mo ago', tags: ['thedarkghost', 'blackbox', 'ai', 'gemini', 'openai', 'deepseek', 'claude'],
    changelog: [['3.1.6', 'Suporte a Claude e DeepSeek', '4mo ago'], ['3.1.0', 'Seletor de provedor', '5mo ago']],
    readme: `# BlackBox AI\n\nBlackBox AI adalah platform AI yang memungkinkan pengguna mengakses berbagai layanan kecerdasan buatan secara terpadu.\n\n## Mendapatkan API\n\n- Gemini\n- OpenAI\n- Claude\n- DeepSeek\n\n## Tutorial\n\n1. Escolha o Provider nas configurações\n2. Cole sua Api Key do provedor\n3. Selecione o modelo BlackBox AI no chat\n\nTerimakasih.\n**The DarkGhost**` },
  'rutex-agent': { vendor: 'RutexLabs', rating: 94, reviews: 41, updated: '1w ago', tags: ['ai', 'agent', 'coding'], feats: ['Tarefas multi-etapas', 'Contexto de arquivos (CTX)', 'Modelos via OpenRouter'] },
  'term-pro': { vendor: 'Thcode', rating: 93, reviews: 64, updated: '2w ago', tags: ['terminal', 'themes'], feats: ['Temas Pro extras', 'Fonte dedicada'] },
  'resp-tester': { vendor: 'Thcode', rating: 92, reviews: 58, updated: '3w ago', tags: ['preview', 'responsive', 'devices'], feats: ['Modo Devices no preview', 'Presets 360–768px'] },
  'python': { vendor: 'Thcode', rating: 97, reviews: 890, updated: '5d ago', tags: ['python', 'run'], feats: ['Executa print() no terminal', 'Realce Python'] },
  'py-runner': { vendor: 'Community', rating: 91, reviews: 120, updated: '1mo ago', tags: ['python', 'run'], feats: ['Atalho Run para Python'] },
  'lua-support': { vendor: 'Community', rating: 90, reviews: 45, updated: '2w ago', tags: ['lua'], feats: ['Executa print() no terminal', 'Snippets Lua'] },
  'cpp': { vendor: 'Community', rating: 89, reviews: 37, updated: '1mo ago', tags: ['c', 'cpp'], feats: ['Simula g++ no terminal'] },
  'vscode-icons': { vendor: 'Community', rating: 95, reviews: 230, updated: '1w ago', tags: ['icons', 'theme'], feats: ['Letra colorida por linguagem'] },
  'material-icons': { vendor: 'Community', rating: 93, reviews: 140, updated: '2w ago', tags: ['icons'], feats: ['Ícones com brilho Material'] },
  'font-icons': { vendor: 'Community', rating: 88, reviews: 52, updated: '3w ago', tags: ['icons'], feats: ['Símbolos de fonte no explorer'] },
  'better-ui': { vendor: 'Thcode', rating: 96, reviews: 310, updated: '2d ago', tags: ['ui', 'density'], feats: ['Modo compacto', 'Ajustes de densidade'] },
  'acode-purple': { vendor: 'Community', rating: 98, reviews: 402, updated: '4d ago', tags: ['theme', 'purple'], feats: ['Tema Royal', 'Intensidade do neon'] },
  'ayu': { vendor: 'Community', rating: 94, reviews: 180, updated: '2w ago', tags: ['theme'], feats: ['Tema Ayu'] },
  'sweet-plasma': { vendor: 'Community', rating: 92, reviews: 88, updated: '1mo ago', tags: ['theme'], feats: ['Tema Plasma'] },
  'emmet': { vendor: 'Thcode', rating: 97, reviews: 265, updated: '1w ago', tags: ['editor', 'snippets'], feats: ['! + Tab → boilerplate', '.classe / #id / ul>li*3'] },
  'snippets': { vendor: 'Thcode', rating: 91, reviews: 95, updated: '3w ago', tags: ['editor', 'snippets'], feats: ['Snippets no autocomplete'] },
  'path-intel': { vendor: 'Community', rating: 90, reviews: 70, updated: '1mo ago', tags: ['editor', 'paths'], feats: ['Completa caminhos do projeto'] },
  'bracket-colorizer': { vendor: 'Community', rating: 93, reviews: 112, updated: '2w ago', tags: ['editor', 'colors'], feats: ['Arco-íris por nível ()[]{}'] },
  'abread': { vendor: 'Community', rating: 89, reviews: 40, updated: '1mo ago', tags: ['nav'], feats: ['Breadcrumb clicável'] },
  'ai-sidebar': { vendor: 'Thcode', rating: 92, reviews: 66, updated: '1w ago', tags: ['ai'], feats: ['Perguntar à IA sobre a seleção'] },
  'aicodex': { vendor: 'AicodeX', rating: 88, reviews: 30, updated: '2mo ago', tags: ['ai', 'gpt'], feats: ['Modelo GPT extra'] },
  'eslint': { vendor: 'Community', rating: 90, reviews: 77, updated: '2w ago', tags: ['lint', 'js'], feats: ['Lint: console, ponto e vírgula'] },
  'todo-tree': { vendor: 'Community', rating: 91, reviews: 63, updated: '3w ago', tags: ['todo', 'search'], feats: ['Lista TODO/FIXME do projeto'] },
  'json-tools': { vendor: 'Thcode', rating: 92, reviews: 54, updated: '1w ago', tags: ['json'], feats: ['Validar e minificar JSON'] },
  'md-preview': { vendor: 'Thcode', rating: 93, reviews: 71, updated: '1w ago', tags: ['markdown', 'preview'], feats: ['Renderiza .md no navegador'] },
  'color-palette': { vendor: 'Community', rating: 90, reviews: 69, updated: '1mo ago', tags: ['colors', 'tools'], feats: ['Gera paleta do arquivo atual'] },
  'git-scm': { vendor: 'Community', rating: 91, reviews: 83, updated: '2w ago', tags: ['git'], feats: ['Status e commit simulados'] },
  'gh-manager': { vendor: 'Community', rating: 89, reviews: 44, updated: '1mo ago', tags: ['github'], feats: ['Aba Issues/PRs'] },
  'git-dust': { vendor: 'Community', rating: 87, reviews: 29, updated: '2mo ago', tags: ['git', 'stats'], feats: ['Estatísticas do projeto'] },
  'android-builder': { vendor: 'Thcode', rating: 90, reviews: 58, updated: '3w ago', tags: ['android', 'build'], feats: ['Build APK simulado'] },
  'npm-scripts': { vendor: 'Community', rating: 88, reviews: 33, updated: '1mo ago', tags: ['npm'], feats: ['Lista scripts do package.json'] },
  'add-package': { vendor: 'Thcode', rating: 89, reviews: 47, updated: '2w ago', tags: ['npm'], feats: ['npm install atualiza package.json'] },
  'academy': { vendor: 'Thcode', rating: 94, reviews: 120, updated: '1w ago', tags: ['learn'], feats: ['Tutoriais na Ajuda'] },
  'path-linker': { vendor: 'Community', rating: 86, reviews: 25, updated: '2mo ago', tags: ['nav'], feats: ['Abrir caminho sob o cursor'] },
  'suger': { vendor: 'Community', rating: 85, reviews: 19, updated: '3mo ago', tags: ['debug'], feats: ['Inspecionar arquivo'] }
};
function pmeta(id) {
  const d = PLUGIN_DEFS.find(x => x.id === id) || {};
  const m = PLUGIN_META[id] || {};
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return {
    vendor: m.vendor || 'Community', lic: m.lic || 'MIT',
    rating: m.rating || (88 + (h % 11)), reviews: m.reviews || (8 + (h % 120)),
    updated: m.updated || 'recentemente', tags: m.tags || ['tools'],
    feats: m.feats || [d.desc || 'Plugin para Thcode'],
    changelog: m.changelog || [[d.ver || '1.0.0', 'Versão atual estável', m.updated || 'recente']],
    readme: m.readme || null, oss: m.oss || false,
    contributors: m.contributors || [m.vendor || 'Community']
  };
}
/* ---------- capacidades calculadas dos plugins instalados ---------- */
const CAPS = {};
const PLUGIN_THEMES = [
  { id: 'ayu', name: 'Ayu', bg: '#0d0f11', bar: '#15181c', acc: '#e6b450', need: 'ayu' },
  { id: 'plasma', name: 'Sweet Plasma', bg: '#12081f', bar: '#1e0f33', acc: '#ff2fb3', need: 'sweet-plasma' },
  { id: 'royal', name: 'Royal Purple', bg: '#150a24', bar: '#211038', acc: '#a100ff', need: 'acode-purple' }
];
function syncPluginThemes() {
  for (let i = THEMES.length - 1; i >= 0; i--) if (['ayu', 'plasma', 'royal'].includes(THEMES[i].id)) THEMES.splice(i, 1);
  PLUGIN_THEMES.forEach(t => { if (Plugins.isInstalled(t.need)) THEMES.push({ id: t.id, name: t.name + ' ✦', bg: t.bg, bar: t.bar, acc: t.acc }); });
}
function computeCaps() {
  const has = id => Plugins.isInstalled(id);
  Object.assign(CAPS, {
    rainbow: has('bracket-colorizer'), crumb: has('abread'),
    snippets: has('snippets'), paths: has('path-intel'), emmet: has('emmet'),
    devices: has('resp-tester'), python: has('python') || has('py-runner'),
    lua: has('lua-support'), cpp: has('cpp'), gitx: has('git-scm'),
    todo: has('todo-tree'), eslint: has('eslint'), jsonTools: has('json-tools'),
    md: has('md-preview'), paletteGen: has('color-palette'), builder: has('android-builder'),
    npm: has('add-package') || has('npm-scripts'), academy: has('academy'),
    stats: has('git-dust'), askAI: has('ai-sidebar'), linker: has('path-linker'),
    inspect: has('suger'), termPro: has('terminal-pro')
  });
  syncPluginThemes();
  if (!AI_MODELS.includes('BlackBox AI') && has('blackbox-ai')) AI_MODELS.push('BlackBox AI');
  if (!AI_MODELS.includes('Rutex Zero') && has('rutex-agent')) AI_MODELS.push('Rutex Zero');
}
/* ---------- ícones por pack ---------- */
function ficon(L) {
  const pack = S.iconPack || 'default';
  const ok = pack === 'default' || (pack === 'vscode' && Plugins.isInstalled('vscode-icons')) ||
    (pack === 'material' && Plugins.isInstalled('material-icons')) || (pack === 'font' && Plugins.isInstalled('font-icons'));
  const p = ok ? pack : 'default';
  if (p === 'vscode') return `<i class="ipk-letter" style="background:${L.color}">${esc(L.name[0])}</i>`;
  if (p === 'material') return icon('file', `color:${L.color};filter:drop-shadow(0 0 5px ${L.color})`);
  if (p === 'font') return `<span style="color:${L.color};font-size:15px;line-height:1">◈</span>`;
  return icon('file', `color:${L.color}`);
}
/* ---------- arco-íris de colchetes ---------- */
function rainbowify(html) {
  const cols = ['#e5c07b', '#c678dd', '#61afef', '#98c379', '#e06c75', '#56b6c2'];
  let out = '', depth = 0, inTag = false;
  for (let i = 0; i < html.length; i++) {
    const ch = html[i];
    if (ch === '<') { inTag = true; out += ch; continue; }
    if (ch === '>') { inTag = false; out += ch; continue; }
    if (!inTag && ch === '&') { const sc = html.indexOf(';', i); if (sc > 0 && sc - i < 10) { out += html.slice(i, sc + 1); i = sc; continue; } }
    if (!inTag && '([{'.includes(ch)) { out += `<span style="color:${cols[depth % 6]};font-weight:700">${ch}</span>`; depth++; }
    else if (!inTag && ')]}'.includes(ch)) { depth = Math.max(0, depth - 1); out += `<span style="color:${cols[depth % 6]};font-weight:700">${ch}</span>`; }
    else out += ch;
  }
  return out;
}
/* ---------- snippets / paths / emmet ---------- */
const Snippets = {
  data: {
    js: ['console.log()', 'addEventListener', 'querySelector', 'getElementById', 'async () => {}', 'JSON.parse', 'JSON.stringify', 'for (let i = 0', 'setTimeout('],
    html: ['<div></div>', '<span></span>', '<script></script>', '<link>', '<button></button>', '<!DOCTYPE html>'],
    css: ['@media', 'display: flex', 'margin: 0 auto', ':hover', 'transition:'],
    py: ['print()', 'def ', 'for i in ', 'import '], lua: ['print()', 'function ', 'local '], sh: ['echo ', 'if [  ]; then'],
    json: ['"key": ', 'true', 'false', 'null']
  },
  add(prefix, set) {
    if (!CAPS.snippets || !prefix) return;
    const lang = T.active ? detectLang(T.active) : 'txt';
    (this.data[lang] || this.data.js).forEach(w => { if (w.toLowerCase().startsWith(prefix.toLowerCase()) && w !== prefix && set.size < 46) set.add(w); });
  }
};
const PathIntel = {
  add(prefix, set) {
    if (!CAPS.paths || !prefix || prefix.length < 1) return;
    const v = Ed.input.value.slice(0, Ed.input.selectionStart).split('\n').pop();
    if (!/["'(\s][^"'()\n]*\/[^"'()\n]*$/.test(v) && !v.endsWith('/')) return;
    for (const f of Object.keys(FS.files)) {
      const b = baseName(f);
      if (b !== '.keep' && b.toLowerCase().startsWith(prefix.toLowerCase()) && set.size < 46) set.add(b);
    }
  }
};
const Emmet = {
  tryExpand() {
    if (!CAPS.emmet || !T.active) return false;
    const input = Ed.input, s = input.selectionStart, v = input.value;
    const lineStart = v.lastIndexOf('\n', s - 1) + 1;
    const m = v.slice(lineStart, s).match(/([!a-z.#>+*][\w.#>+*-]*)$/i);
    if (!m) return false;
    const abbr = m[1];
    const lang = detectLang(T.active);
    let out = null;
    if (abbr === '!') out = '<!DOCTYPE html>\n<html>\n<head>\n\t<meta charset="utf-8">\n</head>\n<body>\n\t\n</body>\n</html>';
    else if (abbr === 'lorem') out = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
    else if (lang === 'html' && /^\.[\w-]+$/.test(abbr)) out = `<div class="${abbr.slice(1)}"></div>`;
    else if (lang === 'html' && /^#[\w-]+$/.test(abbr)) out = `<div id="${abbr.slice(1)}"></div>`;
    else if (lang === 'html' && /^ul>li\*\d+$/.test(abbr)) { const k = +abbr.split('*')[1]; out = '<ul>\n' + Array.from({ length: Math.min(k, 20) }, () => '\t<li></li>').join('\n') + '\n</ul>'; }
    else if (/^(div|p|span|a|ul|li|ol|button|input|form|h1|h2|h3|table|tr|td)$/.test(abbr)) out = `<${abbr}></${abbr}>`;
    if (out === null) return false;
    Ed.pushUndo(T.active, v);
    input.value = v.slice(0, s - abbr.length) + out + v.slice(input.selectionEnd);
    input.selectionStart = input.selectionEnd = s - abbr.length + out.length;
    Ed.onEdit(false); toast('Emmet: ' + abbr, 'wand'); return true;
  }
};
/* ---------- markdown lite (README) ---------- */
function mdLite(md) {
  const fences = [];
  md = String(md).replace(/```(\w*)\n([\s\S]*?)```/g, (m, l, code) => { fences.push(`<pre><code>${esc(code).replace(/\n$/, '')}</code></pre>`); return `\u0000${fences.length - 1}\u0000`; });
  let html = esc(md).split('\n').map(line => {
    if (/^###\s/.test(line)) return `<h2>${line.slice(4)}</h2>`;
    if (/^##\s/.test(line)) return `<h1>${line.slice(3)}</h1>`;
    if (/^#\s/.test(line)) return `<h1>${line.slice(2)}</h1>`;
    if (/^(\s*[-*+]|\s*\d+\.)\s/.test(line)) return `<ul><li>${line.replace(/^(\s*[-*+]|\s*\d+\.)\s/, '')}</li></ul>`;
    if (!line.trim() || /^\u0000\d+\u0000$/.test(line.trim())) return line;
    return `<p>${line.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')}</p>`;
  }).join('\n');
  return html.replace(/\u0000(\d+)\u0000/g, (m, i) => fences[+i]);
}
/* ---------- overlay de instalação ---------- */
function installOverlay(name, ver, steps, done) {
  const ov = document.createElement('div');
  ov.className = 'install-ov';
  ov.innerHTML = `<div class="install-card"><h3>${esc(name)}</h3><div class="sub">v${esc(ver)}</div>
    <div class="install-bar"><i></i></div><div class="install-steps">${steps.map(s => `<div class="istep">${icon('clock')}<span>${s}</span></div>`).join('')}</div></div>`;
  document.body.appendChild(ov);
  const rows = [...ov.querySelectorAll('.istep')];
  const bar = ov.querySelector('.install-bar i');
  let i = 0;
  const next = () => {
    if (i > 0) { rows[i - 1].classList.remove('doing'); rows[i - 1].classList.add('done'); rows[i - 1].querySelector('svg').outerHTML = icon('check'); }
    if (i >= rows.length) {
      bar.style.width = '100%';
      setTimeout(() => { ov.remove(); done && done(); }, 280);
      return;
    }
    rows[i].classList.add('doing');
    rows[i].querySelector('svg').outerHTML = icon('refresh');
    bar.style.width = ((i + 1) / rows.length * 100) + '%';
    i++;
    setTimeout(next, 340 + Math.random() * 260);
  };
  next();
}
/* ---------- detalhe do plugin ---------- */
const PluginDetail = {
  tab: 'readme',
  open(id) {
    const def = PLUGIN_DEFS.find(p => p.id === id);
    if (!def) return;
    this.tab = 'readme';
    Page.open('plugdetail', def.name, el => this.render(el, id), false);
    this.gear(id);
  },
  gear(id) {
    document.querySelector('#pageGear')?.remove();
    if (!PLUGIN_SCHEMAS[id]) return;
    const g = document.createElement('button');
    g.className = 'icon-btn'; g.id = 'pageGear'; g.title = 'Configurações do plugin';
    g.innerHTML = icon('settings');
    g.onclick = () => PluginSettings.open(id);
    document.querySelector('.page-head').appendChild(g);
  },
  render(el, id) {
    const def = PLUGIN_DEFS.find(p => p.id === id);
    const m = pmeta(id);
    const inst = Plugins.isInstalled(id);
    const upd = Plugins.updates[id];
    const btns = inst
      ? `<button class="big-btn uninstall" id="pdUn">🗑 Desinstalar</button>${upd ? `<button class="big-btn primary" id="pdUp">⟳ Atualizar</button>` : ''}`
      : `<button class="big-btn primary" id="pdIn" style="flex:1">⬇ Instalar</button>`;
    el.innerHTML = `<div class="pd-hero">
      <div class="pd-icon"><div class="plugin-ico" style="background:${def.bg}">${icon(def.ic)}</div>${m.oss ? `<span class="pd-oss">${icon('github')}Código Aberto</span>` : ''}</div>
      <div class="pd-name">${esc(def.name)}</div>
      <div class="pd-chips"><span class="pd-chip">🏷 v${inst ? Plugins.installed[id] : def.ver}${upd ? ` <span class="up">→ v${upd}</span>` : ''}</span><span class="pd-chip">👤 ${esc(m.vendor)}</span><span class="pd-chip">⚖ ${esc(m.lic)}</span></div>
      <div class="pd-stats"><span>📦 Catálogo real via jsDelivr (npm)</span></div>
      <div class="pd-tags">${m.tags.map(t => `<span class="pd-tag">${esc(t)}</span>`).join('')}</div>
    </div>
    <div class="pd-btns">${btns}</div>
    <div class="pd-note">${icon('info')}<span>Plugins comprados não são sincronizados com sua conta Thcode. Use a mesma conta do Google na Play Store para restaurar sua compra.</span></div>
    <div class="pd-tabs"><button data-t="readme" class="${this.tab === 'readme' ? 'sel' : ''}">Visão Geral</button><button data-t="contrib" class="${this.tab === 'contrib' ? 'sel' : ''}">Contribuidores</button><button data-t="log" class="${this.tab === 'log' ? 'sel' : ''}">Registro de Alterações</button></div>
    <div class="pd-body" id="pdBody"></div>`;
    const paint = () => {
      const b = el.querySelector('#pdBody');
      if (this.tab === 'readme') {
        const readme = m.readme || `# ${def.name}\n\n${def.desc}.\n\n## Recursos\n\n${m.feats.map(f => `- ${f}`).join('\n')}\n\n## Instalação\n\nToque em **Instalar** — nenhuma configuração extra é necessária.\n\n## Licença\n\n${m.lic} — código aberto.`;
        b.innerHTML = mdLite(readme);
      } else if (this.tab === 'contrib') {
        b.innerHTML = `<h1>Contribuidores</h1>` + m.contributors.map((c, i) => `<div class="row">${icon('github')}<div class="grow"><div class="t">${esc(c)}</div><div class="s">${i === 0 ? 'Autor • mantenedor' : 'Colaborador'}</div></div></div>`).join('');
      } else {
        b.innerHTML = `<h1>Registro de Alterações</h1>` + m.changelog.map(([v, txt, d]) => `<div class="cl-ver"><h4>v${esc(v)}</h4><div class="date">${esc(d)}</div><ul><li>${esc(txt)}</li></ul></div>`).join('');
      }
      el.querySelectorAll('.pd-tabs button').forEach(x => x.classList.toggle('sel', x.dataset.t === this.tab));
    };
    el.querySelectorAll('.pd-tabs button').forEach(x => x.onclick = () => { this.tab = x.dataset.t; paint(); });
    paint();
    el.querySelector('#pdIn')?.addEventListener('click', () => { Plugins.install(id); Page.back(); });
    el.querySelector('#pdUn')?.addEventListener('click', async () => {
      const ok = await dConfirm('Desinstalar', `Desinstalar <b>${esc(def.name)}</b>?`, 'Desinstalar');
      if (ok) { Plugins.uninstall(id); Page.back(); }
    });
    el.querySelector('#pdUp')?.addEventListener('click', () => { Plugins.update(id); Page.back(); });
  }
};
/* ---------- schemas de configuração por plugin ---------- */
const PLUGIN_SCHEMAS = {
  'opencode-ai': [
    { k: 'iframeScale', t: 'Iframe Scale (%)', d: 'Scale factor for the web UI iframe (70–150, default 75)', type: 'number', min: 70, max: 150, def: 75 },
    { k: 'logLevel', t: 'Log Level', d: 'Verbosity of plugin log output (none disables all logs)', type: 'select', opts: ['none', 'debug', 'info', 'warn', 'error'], def: 'none' },
    { k: 'hideHeader', t: 'Hide header in landscape', d: 'Automatically hide header in landscape orientation to maximize content area', type: 'toggle', def: true }
  ],
  'blackbox-ai': [
    { k: 'provider', t: 'Provider', d: 'Provider BlackBox AI.', type: 'select', opts: ['openai', 'gemini', 'deepseek', 'claude'], def: 'openai' },
    { k: 'openaiKey', t: 'Openai Api Key', d: 'The Api Key to used', type: 'password', def: '' },
    { k: 'geminiKey', t: 'Gemini Api Key', d: 'The Api Key to used blackbox.', type: 'password', def: '' },
    { k: 'deepseekKey', t: 'DeepSeek Api Key', d: 'The Api Key for DeepSeek Coder.', type: 'password', def: '' },
    { k: 'claudeKey', t: 'Claude Api Key', d: 'The Api Key for Anthropic Claude.', type: 'password', def: '' }
  ],
  'rutex-agent': [
    { k: 'model', t: 'Modelo', d: 'Modelo padrão do agente', type: 'select', opts: AI_MODELS, def: 'OpenRouter' },
    { k: 'apiKey', t: 'API Key', d: 'Chave OpenRouter (opcional, fica no aparelho)', type: 'password', def: '' },
    { k: 'temperature', t: 'Temperature', d: 'Criatividade das respostas (0–1)', type: 'number', min: 0, max: 1, step: 0.1, def: 0.7 }
  ],
  'ai-assistant': [
    { k: 'model', t: 'Modelo', d: 'Modelo padrão do assistente', type: 'select', opts: AI_MODELS, def: 'OpenRouter' },
    { k: 'apiKey', t: 'API Key (OpenRouter)', d: 'Para respostas reais via API', type: 'password', def: '' }
  ],
  'aicodex': [{ k: 'apiKey', t: 'API Key', d: 'Chave da API AicodeX GPT', type: 'password', def: '' }],
  'prettier': [
    { k: 'tabWidth', t: 'Tab Width', d: 'Espaços na indentação do JSON', type: 'select', opts: ['2', '4'], def: '2' },
    { k: 'semi', t: 'Ponto e vírgula', d: 'Manter ; no fim das linhas', type: 'toggle', def: true }
  ],
  'better-ui': [
    { k: 'density', t: 'Densidade', d: 'Espaçamento da interface', type: 'select', opts: ['comfortable', 'compact'], def: 'comfortable' }
  ],
  'acode-purple': [
    { k: 'glow', t: 'Intensidade do neon', d: 'Brilho dos elementos ativos (0–100)', type: 'number', min: 0, max: 100, def: 55 }
  ],
  'terminal-pro': [
    { k: 'theme', t: 'Tema Pro', d: 'Tema extra do terminal', type: 'select', opts: ['pro-green', 'pro-amber', 'pro-purple'], def: 'pro-green' }
  ],
  'eslint': [
    { k: 'noConsole', t: 'Avisar console.*', d: 'Marca console.log como aviso', type: 'toggle', def: true },
    { k: 'semi', t: 'Exigir ponto e vírgula', d: 'Avisa linhas sem ;', type: 'toggle', def: false }
  ]
};
function pset(pid) {
  if (!S.pluginSettings) S.pluginSettings = {};
  if (!S.pluginSettings[pid]) S.pluginSettings[pid] = {};
  const out = S.pluginSettings[pid];
  (PLUGIN_SCHEMAS[pid] || []).forEach(f => { if (out[f.k] === undefined) out[f.k] = f.def; });
  return out;
}
const PluginSettings = {
  open(pid) {
    const def = PLUGIN_DEFS.find(p => p.id === pid);
    Page.open('pset', def ? def.name : pid, el => this.render(el, pid), false);
  },
  render(el, pid) {
    const schema = PLUGIN_SCHEMAS[pid] || [];
    const cur = pset(pid);
    el.innerHTML = '';
    if (!schema.length) { el.innerHTML = '<div class="empty">Este plugin não tem configurações.</div>'; return; }
    schema.forEach(f => {
      const row = document.createElement('div');
      row.className = 'schema-row';
      let ctrl = '';
      if (f.type === 'toggle') ctrl = `<div class="switch${cur[f.k] ? ' on' : ''}"></div>`;
      else if (f.type === 'select') ctrl = `<select>${f.opts.map(o => `<option${String(cur[f.k]) === String(o) ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
      else if (f.type === 'number') ctrl = `<span class="num-val">${esc(cur[f.k])}</span>${icon('chevron', 'width:16px;height:16px;color:var(--muted2)')}`;
      else ctrl = `<input type="password" value="${esc(cur[f.k])}" placeholder="••••••••" autocomplete="off">`;
      row.innerHTML = `<div class="grow"><div class="t">${esc(f.t)}</div><div class="s">${esc(f.d)}</div></div>${ctrl}`;
      if (f.type === 'toggle') row.onclick = () => { cur[f.k] = !cur[f.k]; row.querySelector('.switch').classList.toggle('on', cur[f.k]); Store.save(); this.applied(pid, f.k); };
      else if (f.type === 'select') row.querySelector('select').onchange = e => { cur[f.k] = e.target.value; Store.save(); this.applied(pid, f.k); toast('Configuração salva', 'settings'); };
      else if (f.type === 'number') row.onclick = async () => {
        const v = await dPrompt(f.t, String(cur[f.k]), `${f.min}–${f.max}`);
        if (v === null || v === '') return;
        const n = clamp(parseFloat(v) || f.def, f.min, f.max);
        cur[f.k] = n; Store.save(); row.querySelector('.num-val').textContent = n; this.applied(pid, f.k);
      };
      else row.querySelector('input').onchange = e => { cur[f.k] = e.target.value; Store.save(); toast('Chave salva localmente', 'lock'); };
      el.appendChild(row);
    });
    if (schema.some(f => f.type === 'password')) note(el, '<b>🔒 Suas chaves ficam somente neste aparelho</b> (localStorage). Nunca as compartilhe.');
  },
  applied(pid, key) {
    if (pid === 'better-ui' && key === 'density') { S.uiDensity = pset(pid).density; applySettings(); Store.save(); }
    if (pid === 'acode-purple' && key === 'glow') { const a = pset(pid).glow / 100; document.body.style.setProperty('--accent-glow', `rgba(161,0,255,${a})`); }
    if (pid === 'terminal-pro' && key === 'theme') { S.termTheme = pset(pid).theme; applyTermTheme(); }
    clog('INFO', `Plugin ${pid}: ${key} atualizado`);
  }
};
/* ---------- overrides: install com overlay + efeitos ---------- */
Plugins._rawInstall = Plugins.install.bind(Plugins);
Plugins._rawUninstall = Plugins.uninstall.bind(Plugins);
Plugins._rawUpdate = Plugins.update.bind(Plugins);
Plugins.install = function (id) {
  const def = PLUGIN_DEFS.find(p => p.id === id);
  installOverlay(def.name, def.ver, ['Baixando pacote', 'Verificando assinatura', 'Registrando recursos', 'Ativando plugin'], () => {
    this._rawInstall(id);
    computeCaps();
    if (Page.current === 'plugdetail') Page.rerender();
    renderEditor();
  });
};
Plugins.uninstall = function (id) {
  const def = PLUGIN_DEFS.find(p => p.id === id);
  installOverlay(def.name, Plugins.installed[id] || def.ver, ['Desativando recursos', 'Removendo arquivos'], () => {
    this._rawUninstall(id);
    computeCaps();
    if (S.appTheme && !THEMES.some(t => t.id === S.appTheme)) { S.appTheme = 'neon'; applySettings(); }
    if (Page.current === 'plugdetail') Page.rerender();
    renderEditor();
  });
};
Plugins.update = function (id) {
  const def = PLUGIN_DEFS.find(p => p.id === id);
  installOverlay(def.name, this.updates[id], ['Baixando atualização', 'Aplicando migração', 'Reiniciando plugin'], () => {
    this._rawUpdate(id);
    computeCaps();
    if (Page.current === 'plugdetail') Page.rerender();
  });
};
const _refreshUI = Plugins.refreshUI.bind(Plugins);
Plugins.refreshUI = function () { computeCaps(); _refreshUI(); };
/* ---------- painel "instale o plugin" ---------- */
const PanelNeed = {
  show(panelTitle, pluginName, pluginId, desc) {
    Panel.setHead(panelTitle, 'Plugin necessário', []);
    const body = $('#panelBody');
    body.innerHTML = `<div class="empty">${icon('puzzle')}<br><b style="color:var(--text)">${esc(pluginName)}</b><br>${esc(desc)}<br><br></div>
      <div class="btn-row"><button class="big-btn primary" id="needBtn">Instalar plugin</button></div>`;
    body.querySelector('#needBtn').onclick = () => PluginDetail.open(pluginId);
  }
};
const _panelRender = Panel.render.bind(Panel);
Panel.render = function () {
  const id = this.current;
  if (id === 'terminal' && !Plugins.isInstalled('acodex-term')) return PanelNeed.show('Terminal', 'AcodeX - Terminal', 'acodex-term', 'O terminal precisa deste plugin para funcionar.');
  if (id === 'github' && !Plugins.isInstalled('github')) return PanelNeed.show('GitHub', 'Github', 'github', 'A integração GitHub precisa deste plugin.');
  if (id === 'ai' && !Plugins.isInstalled('ai-assistant')) return PanelNeed.show('AI Assistant', 'AI Assistant Beta', 'ai-assistant', 'O assistente precisa deste plugin.');
  _panelRender();
};
const _pageBack = Page.back.bind(Page);
Page.back = function () { document.querySelector('#pageGear')?.remove(); _pageBack(); };
const _pageClose = Page.close.bind(Page);
Page.close = function (a) { document.querySelector('#pageGear')?.remove(); _pageClose(a); };

