/* Painel React — Home do Thcode (ilha React sobre o app vanilla)
 * Todo acesso ao app vai por window.ThcodeTest, exposto pelo core.
 * Reusa as classes CSS do app (.sect, .set-row, .note) para visual nativo. */
import React, { useState } from 'react';

const Icon = ({ n }) => <svg aria-hidden="true"><use href={'#i-' + n} /></svg>;

const fmtBytes = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

function Row({ ic, t, s, onClick, chevron = true }) {
  return (
    <button className="set-row" onClick={onClick}>
      <Icon n={ic} />
      <div className="grow">
        <div className="t">{t}</div>
        {s ? <div className="s">{s}</div> : null}
      </div>
      {chevron ? <svg className="chev" aria-hidden="true"><use href="#i-chevron" /></svg> : null}
    </button>
  );
}

export default function Home({ T }) {
  const [, force] = useState(0);
  const S = T.S;
  const FS = T.FS || {};
  const files = Object.keys(FS.files || {}).filter((f) => !String(f).endsWith('.keep'));
  const bytes = Object.values(FS.files || {}).reduce((a, c) => a + String(c == null ? '' : c).length, 0);
  const plugins = Object.keys((T.Plugins && T.Plugins.installed) || {}).length;

  const actions = [
    ['plus', 'Novo arquivo', 'Cria um arquivo vazio na raiz', () => { T.Page.close(true); T.newFile(); force((n) => n + 1); }],
    ['file', 'Abrir arquivo', 'Busca rápida entre os arquivos', () => T.quickOpen()],
    ['upload', 'Importar do dispositivo', 'Arquivos reais para o workspace', () => T.pickImport(false)],
    ['terminal', 'Terminal', 'Alpine shell com bash real', () => T.Panel.open('terminal')],
    ['puzzle', 'Plugins', 'Mercado de extensões', () => T.Panel.open('plugins')],
    ['ai', 'AI Assistant', 'Assistente com contexto', () => T.Panel.open('ai')],
    ['settings', 'Configurações', 'Editor, temas e conta', () => T.SettingsPage.open()],
    ['palette', 'Trocar tema', () => T.SettingsPage.theme()],
  ];

  const stats = [
    ['Versão', T.APP_VER],
    ['UI', 'React ' + React.version + ' (ilha sobre core vanilla)'],
    ['Boot', ((T.Metrics && T.Metrics.bootMs) || 0) + ' ms'],
    ['Arquivos', String(files.length)],
    ['Plugins ativos', String(plugins)],
    ['Workspace', fmtBytes(bytes)],
    ['Tema', S.theme || '—'],
  ];

  return (
    <div style={{ padding: '10px 12px 42px' }}>
      <div className="sect">Ações rápidas</div>
      {actions.map(([ic, t, s, fn]) => (
        <Row key={t} ic={ic} t={t} s={s} onClick={() => { try { fn(); } catch (e) { T.toast('Falha: ' + e.message, 'close'); } }} />
      ))}

      <div className="sect">Arquivos ({files.length})</div>
      {files.length === 0
        ? <div className="note">Nenhum arquivo no workspace. Use “Novo arquivo” ou importe do dispositivo.</div>
        : files.slice(0, 12).map((f) => (
            <Row
              key={f}
              ic="file"
              t={String(f).split('/').pop()}
              s={f}
              onClick={() => { T.Page.close(true); T.openFile(f); }}
            />
          ))}

      <div className="sect">Estado do app</div>
      <div className="note">
        {stats.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '3px 0' }}>
            <span>{k}</span><span style={{ textAlign: 'right', opacity: 0.9 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
