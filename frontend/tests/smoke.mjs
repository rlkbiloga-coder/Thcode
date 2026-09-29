/* Thcode smoke tests — jsdom: boot real, editor, bash, plugins, preview, auth.
 * Uso: node tests/smoke.mjs (a partir da raiz do repo)
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { JSDOM } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const script = readFileSync(join(root, 'script.js'), 'utf8').replace(/<\/script/gi, '<\\/script');

const doc = html.replace('<script src="script.js"></script>', () => `<script>${script}</script>`);
const jsErrors = [];
const dom = new JSDOM(doc, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    window.Element.prototype.scrollIntoView = function () {};
    window.addEventListener('error', e => jsErrors.push(String(e.message || e.error)));
  }
});
const { window } = dom;
const { document } = window;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, ms = 8000, label = '') {
  const t0 = Date.now();
  for (;;) {
    try { if (fn()) return true; } catch (_) {}
    if (Date.now() - t0 > ms) throw new Error('timeout: ' + label);
    await sleep(120);
  }
}

let pass = 0, fail = 0;
const results = [];
let current = '(início)';
setTimeout(() => { console.log('\nTRAVADO em: ' + current); process.exit(2); }, 240000).unref?.();
async function test(name, fn) {
  current = name;
  try { await fn(); pass++; results.push(['PASS', name]); console.log('PASS  ' + name); }
  catch (e) { fail++; results.push(['FAIL', name + ' → ' + (e.message || e)]); console.log('FAIL  ' + name + ' → ' + (e.message || e)); }
}
const assert = (c, m) => { if (!c) throw new Error(m || 'assert'); };

// ---------- boot ----------
await test('boot real conclui e mostra o app', async () => {
  await waitFor(() => !document.querySelector('#splash') && !document.querySelector('#app').classList.contains('hidden'), 12000, 'boot');
  const T = window.ThcodeTest;
  assert(T && T.S, 'sem handle ThcodeTest');
  assert(T.Metrics.bootMs > 0, 'bootMs não medido');
  assert(Object.keys(T.Plugins.installed).length >= 5, 'plugins padrão ausentes');
});
const T = window.ThcodeTest;
const $ = s => document.querySelector(s);

// ---------- núcleo v1 ----------
await test('editor abre com conteúdo e abas', async () => {
  assert(T.T.active, 'sem aba ativa');
  assert(T.Ed.input.value.length > 100, 'editor vazio');
  assert(document.querySelectorAll('.tab').length >= 1, 'sem abas');
});
await test('openFile/saveFile + persistência', async () => {
  T.openFile('/MeuJarvis/style.css');
  assert(T.T.open.includes('/MeuJarvis/style.css'), 'aba não criada');
  T.Ed.input.value += '\n/* smoke */';
  T.Ed.onEdit(true);
  assert(T.T.dirty['/MeuJarvis/style.css'], 'dirty não marcado');
  T.saveFile('/MeuJarvis/style.css');
  assert(!T.T.dirty['/MeuJarvis/style.css'], 'dirty não limpo');
  assert((window.localStorage.getItem(T.LS_KEY) || '').includes('style.css'), 'não persistiu');
});
await test('undo/restaura texto', async () => {
  T.openFile('/MeuJarvis/index.html');
  const before = T.Ed.input.value;
  T.Ed.pushUndo('/MeuJarvis/index.html', before);
  T.Ed.input.value = before + 'XYZ';
  T.Ed.doUndo();
  assert(T.Ed.input.value === before, 'undo falhou');
});
await test('autocomplete sugere palavras', async () => {
  T.openFile('/MeuJarvis/script.js');
  T.Ed.input.value += '\ndocu';
  T.Ed.input.selectionStart = T.Ed.input.value.length;
  T.AC.maybeShow();
  assert(T.AC.items.length >= 1, 'sem sugestões');
  T.AC.hide();
});
await test('drawer abre/fecha', async () => {
  T.Drawer.open();
  await sleep(200);
  assert(T.Drawer.isOpen(), 'drawer não abriu');
  T.Drawer.close();
});
await test('paleta lista comandos (base + ferramentas)', async () => {
  const cmds = T.Palette.commands();
  assert(cmds.length >= 35, 'poucos comandos: ' + cmds.length);
  assert(cmds.some(c => c.t.includes('TODO')), 'sem ferramenta TODO');
  assert(cmds.some(c => c.t.includes('Build APK')), 'sem ferramenta APK');
});
await test('terminal renderiza + welcome', async () => {
  T.Panel.open('terminal');
  assert($('#termOut'), 'sem saída do terminal');
  assert(T.Term.lines.length >= 3, 'sem welcome');
});
await test('agente IA responde offline', async () => {
  T.Panel.open('agent');
  const n0 = T.AI.agentMsgs.length;
  $('#agentIn').value = 'explique este código';
  T.AI.sendAgent($('#panelBody'));
  await waitFor(() => T.AI.agentMsgs.length >= n0 + 2, 15000, 'resposta agente');
});
await test('painel plugins lista catálogo', async () => {
  T.Panel.open('plugins');
  assert(T.PLUGIN_DEFS.length >= 43, 'catálogo pequeno: ' + T.PLUGIN_DEFS.length);
  assert(document.querySelectorAll('.plugin-row').length >= 40, 'poucas linhas');
});
await test('busca de plugins filtra', async () => {
  const inp = $('#plugSearch');
  inp.value = 'emmet';
  inp.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert([...document.querySelectorAll('.plugin-name')].some(e => /emmet/i.test(e.textContent)), 'filtro falhou');
  inp.value = '';
  inp.dispatchEvent(new window.Event('input', { bubbles: true }));
});
await test('tema alterna e persiste', async () => {
  T.S.appTheme = 'light'; T.applySettings();
  assert(document.body.dataset.theme === 'light', 'tema não aplicou');
  T.S.appTheme = 'neon'; T.applySettings(); T.Store.save();
});
await test('notificações funcionam', async () => {
  const n0 = T.Notifs.list.length;
  T.Notifs.push('Smoke', 'teste', 'check');
  assert(T.Notifs.list.length === n0 + 1, 'push falhou');
  T.Panel.open('notifications');
  assert($('#panelBody').textContent.includes('Smoke'), 'não listou');
});
await test('processos listam', async () => {
  T.Procs.open();
  assert(T.Page.current === 'procs', 'página procs não abriu');
  T.Page.back();
});
await test('settings.json aplica', async () => {
  T.applySettingsJson('{"tabSize": 8}');
  assert(T.S.tabSize === 8, 'não aplicou');
  T.applySettingsJson('{"tabSize": 2}');
});
await test('sobre mostra versão Studio', async () => {
  T.SettingsPage.about();
  assert($('#pageBody').textContent.includes('Thcode'), 'sem rebrand');
  assert($('#pageBody').textContent.includes('2.4.0'), 'sem versão');
  T.Page.back();
});
await test('changelog tem 2.0.0', async () => {
  T.SettingsPage.changelog();
  assert($('#pageBody').textContent.includes('2.0.0'), 'sem entrada');
  T.Page.back();
});
await test('GitHub renderiza busca (sem rede)', async () => {
  T.Panel.open('github');
  assert($('#ghQ'), 'sem campo de busca');
});

// ---------- bash ----------
await test('bash: redirect grava arquivo', async () => {
  T.Panel.open('terminal');
  T.Term.exec('echo hello > /bash-t1.txt');
  await sleep(400);
  assert((T.fRead('/bash-t1.txt') || '').includes('hello'), 'redirect falhou');
  T.fDel('/bash-t1.txt');
});
await test('bash: pipe + grep', async () => {
  T.Term.exec('echo abc | grep b');
  await sleep(400);
  const last = T.Term.lines.slice(-3).map(l => l[1]).join('\n');
  assert(last.includes('abc'), 'pipe falhou: ' + last);
});
await test('bash: variável + &&', async () => {
  T.Term.exec('QSMOKE=xyz && echo $QSMOKE');
  await sleep(400);
  const last = T.Term.lines.slice(-3).map(l => l[1]).join('\n');
  assert(last.includes('xyz'), 'var/&& falhou: ' + last);
});
await test('bash: substituição $(...)', async () => {
  T.Term.exec('echo A-$(echo B)-C');
  await sleep(400);
  const last = T.Term.lines.slice(-3).map(l => l[1]).join('\n');
  assert(last.includes('A-B-C'), '$() falhou: ' + last);
});
await test('bash: glob *', async () => {
  T.fSet('/MeuJarvis/g1.tmpx', 'a');
  T.fSet('/MeuJarvis/g2.tmpx', 'b');
  T.Term.exec('ls *.tmpx');
  await sleep(400);
  const last = T.Term.lines.slice(-4).map(l => l[1]).join('\n');
  assert(last.includes('g1.tmpx') && last.includes('g2.tmpx'), 'glob falhou: ' + last);
  T.fDel('/MeuJarvis/g1.tmpx'); T.fDel('/MeuJarvis/g2.tmpx');
});
await test('bash: python exige plugin, depois executa', async () => {
  T.fSet('/MeuJarvis/t.py', 'print("PYOK")');
  T.Term.exec('python /MeuJarvis/t.py');
  await sleep(500);
  assert(T.Term.lines.slice(-4).map(l => l[1]).join('\n').includes('instale o plugin'), 'gate python falhou');
  T.Page.back();
  T.Plugins.installed.python = '1.5.0'; T.computeCaps();
  T.Term.exec('python /MeuJarvis/t.py');
  await sleep(400);
  assert(T.Term.lines.slice(-4).map(l => l[1]).join('\n').includes('PYOK'), 'python não executou');
  delete T.Plugins.installed.python; T.computeCaps();
  T.fDel('/MeuJarvis/t.py');
});

// ---------- plugins v2 ----------
await test('detalhe do plugin (OpenCode)', async () => {
  T.PluginDetail.open('opencode-ai');
  assert(T.Page.current === 'plugdetail', 'página não abriu');
  const b = $('#pageBody').textContent;
  assert(b.includes('Visão Geral') && b.includes('victorzee') && b.includes('Contribuidores'), 'conteúdo incompleto');
  T.Page.back();
});
await test('configurações do plugin (BlackBox)', async () => {
  T.PluginSettings.open('blackbox-ai');
  const rows = document.querySelectorAll('.schema-row');
  assert(rows.length === 5, 'esperava 5 linhas, veio ' + rows.length);
  assert($('#pageBody').textContent.includes('Gemini Api Key'), 'sem campo gemini');
  T.Page.back();
});
await test('instalar com overlay ativa efeitos', async () => {
  T.Plugins.install('emmet');
  await waitFor(() => T.Plugins.isInstalled('emmet'), 7000, 'install emmet');
  assert(T.CAPS.emmet === true, 'CAPS.emmet não ativou');
  assert(!document.querySelector('.install-ov'), 'overlay não fechou');
});
await test('emmet expande !', async () => {
  T.openFile('/MeuJarvis/index.html');
  T.Ed.input.value = '!';
  T.Ed.input.selectionStart = 1;
  assert(T.Emmet.tryExpand() === true, 'não expandiu');
  assert(T.Ed.input.value.includes('<!DOCTYPE html>'), 'saída errada');
});
await test('desinstalar remove efeitos', async () => {
  T.Plugins.uninstall('emmet');
  await waitFor(() => !T.Plugins.isInstalled('emmet'), 7000, 'uninstall emmet');
  assert(T.CAPS.emmet === false, 'CAPS.emmet não desativou');
});
await test('temas de plugin entram/saem da lista', async () => {
  const n0 = T.THEMES.length;
  T.Plugins.installed['acode-purple'] = '1.1.7'; T.computeCaps();
  assert(T.THEMES.some(t => t.id === 'royal'), 'tema royal ausente');
  delete T.Plugins.installed['acode-purple']; T.computeCaps();
  assert(T.THEMES.length === n0, 'tema não saiu');
});
await test('pack vscode muda ícones', async () => {
  T.Plugins.installed['vscode-icons'] = '2.0.4'; T.computeCaps();
  T.S.iconPack = 'vscode';
  assert(T.ficon(T.LANGS.js).includes('ipk-letter'), 'pack não aplicou');
  T.S.iconPack = 'default';
  delete T.Plugins.installed['vscode-icons']; T.computeCaps();
});
await test('rainbow coloriza colchetes', async () => {
  assert(T.rainbowify('(a)').includes('<span'), 'sem spans');
});
await test('breadcrumb clicável (abread)', async () => {
  T.Plugins.installed.abread = '1.0.0'; T.computeCaps();
  T.openFile('/MeuJarvis/index.html');
  T.updateCrumb();
  assert(document.querySelectorAll('#crumb .cb').length >= 1, 'sem segmentos');
  delete T.Plugins.installed.abread; T.computeCaps();
  T.updateCrumb();
});
await test('painel exige plugin (terminal)', async () => {
  delete T.Plugins.installed['acodex-term'];
  T.Panel.open('terminal');
  assert($('#needBtn'), 'sem aviso de plugin');
  T.Plugins.installed['acodex-term'] = '3.4.0'; T.computeCaps();
  T.Panel.open('terminal');
  assert($('#termOut'), 'terminal não voltou');
});

// ---------- preview / serviços / páginas ----------
await test('browser abre com URL localhost:8158', async () => {
  T.Browser.open('/MeuJarvis/index.html');
  const b = document.querySelector('.browser');
  assert(b, 'sem browser');
  assert(b.querySelector('.browser-url').textContent.includes('localhost:8158'), 'URL errada');
  T.Browser.close(true);
  assert(!document.querySelector('.browser'), 'não fechou');
});
await test('devices exige plugin', async () => {
  T.Browser.open('/MeuJarvis/index.html');
  T.Browser.devices();
  await sleep(300);
  assert(T.Page.current === 'plugdetail', 'não sugeriu plugin');
  T.Page.back();
  T.Browser.close(true);
});
await test('serviços renderizam status', async () => {
  T.SettingsPage.services();
  await waitFor(() => $('#pageBody').textContent.includes('GitHub API'), 10000, 'services');
  T.Page.back();
});
await test('métricas mostram boot', async () => {
  T.SettingsPage.metrics();
  assert($('#pageBody').textContent.includes('Tempo de boot'), 'sem métricas');
  T.Page.back();
});
await test('diagnóstico lista saúde', async () => {
  T.SettingsPage.diagnostics();
  assert($('#pageBody').textContent.includes('Armazenamento'), 'sem diagnóstico');
  T.Page.back();
});
await test('descobrir lista externos', async () => {
  T.SettingsPage.discover();
  assert(document.querySelectorAll('.disc-card').length >= 12, 'poucos cards');
  T.Page.back();
});
await test('legal abre termos', async () => {
  T.SettingsPage.legal();
  T.SettingsPage.terms();
  assert($('#pageBody').textContent.includes('MIT'), 'sem termos');
  T.Page.back(); T.Page.back();
});

// ---------- auth / tools / customs ----------
await test('auth: criar, sair, entrar', async () => {
  T.Auth.register('Smoke', 'smoke@t.test', '1234');
  assert(T.Auth.current().email === 'smoke@t.test', 'registro falhou');
  T.Auth.logout();
  assert(!T.Auth.current(), 'logout falhou');
  T.Auth.login('smoke@t.test', '1234');
  assert(T.Auth.current().name === 'Smoke', 'login falhou');
  T.Auth.logout();
});
await test('auth rejeita senha errada', async () => {
  let ok = false;
  try { T.Auth.login('smoke@t.test', 'errada'); } catch (_) { ok = true; }
  assert(ok, 'aceitou senha errada');
});
await test('tools: TODOs encontram marcador', async () => {
  T.fSet('/MeuJarvis/td.js', '// TODO: smoke test');
  T.Plugins.installed['todo-tree'] = '2.3.1'; T.computeCaps();
  T.Tools.todos();
  assert(T.Page.current === 'tooltodo', 'página não abriu');
  assert($('#pageBody').textContent.includes('smoke test'), 'não achou TODO');
  T.Page.close();
  delete T.Plugins.installed['todo-tree']; T.computeCaps();
  T.fDel('/MeuJarvis/td.js');
});
await test('tools: stats contam linguagens', async () => {
  T.Plugins.installed['git-dust'] = '1.0.0'; T.computeCaps();
  T.Tools.stats();
  assert($('#pageBody').textContent.includes('Arquivos'), 'sem stats');
  T.Page.close();
  delete T.Plugins.installed['git-dust']; T.computeCaps();
});
await test('plugin personalizado: instala, executa, remove', async () => {
  T.CustomPlugins.install(T.CustomPlugins.template('Smoke Plug'));
  await waitFor(() => T.PLUGIN_DEFS.some(p => p.id === 'custom-smoke-plug'), 7000, 'custom install');
  T.Panel.open('terminal');
  T.Term.exec('custom-smoke-plug');
  await sleep(500);
  assert(T.Term.lines.slice(-4).map(l => l[1]).join('\n').includes('Olá'), 'comando custom falhou');
  T.CustomPlugins.remove('custom-smoke-plug');
  assert(!T.PLUGIN_DEFS.some(p => p.id === 'custom-smoke-plug'), 'não removeu');
});
await test('migração da v1 preserva dados', async () => {
  const backup = window.localStorage.getItem(T.LS_KEY);
  window.localStorage.removeItem(T.LS_KEY);
  window.localStorage.setItem(T.OLD_LS_KEY, JSON.stringify({ marker: 'v1data' }));
  const loaded = T.Store.load();
  assert(loaded && loaded.marker === 'v1data', 'não migrou');
  assert(window.localStorage.getItem(T.LS_KEY), 'não copiou p/ chave nova');
  window.localStorage.removeItem(T.OLD_LS_KEY);
  window.localStorage.setItem(T.LS_KEY, backup);
});

// ---------- resultado ----------
console.log('\n==== THCODE SMOKE ====');
results.forEach(([s, n]) => console.log(s + '  ' + n));
console.log(`\n${pass} passaram, ${fail} falharam, ${jsErrors.length} erros JS`);
if (jsErrors.length) console.log('JS errors:', jsErrors.slice(0, 5));
if (fail || jsErrors.length) { window.close(); process.exit(1); }
console.log('SMOKE OK');
window.close();
process.exit(0);
