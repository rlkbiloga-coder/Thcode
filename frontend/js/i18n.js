/* Small JSON-backed locale layer for the app-settings screen. */
(function (g) {
  'use strict';
  const supported = new Set(['pt-BR', 'en', 'es']);
  // Keep the default language available before a catalogue fetch succeeds or while offline.
  const catalogues = new Map([['pt-BR', {
    'tour.kicker': 'Boas-vindas ao Thcode',
    'tour.title.1': 'Seu editor de código',
    'tour.body.1': 'Crie e edite seus projetos no espaço de trabalho. O arquivo aberto aparece no editor; as alterações ficam salvas neste dispositivo.',
    'tour.title.2': 'Terminal e execução',
    'tour.body.2': 'Abra o Terminal para executar comandos. Use a Prévia para conferir páginas do projeto enquanto trabalha.',
    'tour.title.3': 'Plugins e recursos',
    'tour.body.3': 'Explore Plugins para descobrir ferramentas que ampliam o editor. Instale apenas o que quiser usar.',
    'tour.title.4': 'Instale e leve com você',
    'tour.body.4': 'No celular, use o menu do navegador para adicionar o Thcode à tela inicial. Veja as opções disponíveis no painel Android Bridge.',
    'tour.progress': 'Passo {current} de {total}',
    'tour.previous': 'Voltar',
    'tour.next': 'Continuar',
    'tour.skip': 'Pular tour',
    'tour.finish': 'Ver opções de instalação'
  }]]);
  let active = 'pt-BR';
  let initialising = Promise.resolve();
  try {
    const saved = JSON.parse(localStorage.getItem('thcode.app.v2') || '{}')?.settings?.lang;
    if (supported.has(saved) && saved !== 'pt-BR') {
      initialising = catalogue(saved).then(() => {
        active = saved;
        document.documentElement.lang = saved;
      }).catch(() => { /* Keep pt-BR if a saved catalogue is unavailable offline. */ });
    }
  } catch (_) { /* First launch or unavailable storage: Portuguese remains the default. */ }
  async function catalogue(locale) {
    if (catalogues.has(locale)) return catalogues.get(locale);
    if (!supported.has(locale)) throw new Error('Unsupported locale');
    const response = await fetch(`i18n/${locale}.json`, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`Locale ${locale} unavailable (${response.status})`);
    const data = await response.json();
    if (!data || Array.isArray(data) || typeof data !== 'object' || Object.values(data).some(v => typeof v !== 'string')) throw new Error(`Invalid locale data: ${locale}`);
    catalogues.set(locale, data);
    return data;
  }
  function translate(text, dict) { return dict[text] || text; }
  function applyShell(root, dict) {
    if (!root) return;
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const original = el.hasAttribute('data-i18n-source') ? el.getAttribute('data-i18n-source') : el.textContent.trim();
      if (!el.hasAttribute('data-i18n-source')) el.setAttribute('data-i18n-source', original);
      el.textContent = translate(original, dict);
    });
    for (const attribute of ['aria-label', 'title', 'placeholder']) {
      const sourceAttribute = `data-i18n-${attribute}-source`;
      root.querySelectorAll(`[${attribute}]`).forEach(el => {
        const original = el.hasAttribute(sourceAttribute) ? el.getAttribute(sourceAttribute) : el.getAttribute(attribute);
        if (!dict[original]) return;
        if (!el.hasAttribute(sourceAttribute)) el.setAttribute(sourceAttribute, original);
        el.setAttribute(attribute, translate(original, dict));
      });
    }
  }
  function applySettings(root, dict) {
    if (!root) return;
    const selectors = '.set-sect, .set-row .t, .set-row .s, .txt-row > label, .seg .sect, .seg button, .note';
    root.querySelectorAll(selectors).forEach(el => {
      const original = el.hasAttribute('data-i18n-source') ? el.getAttribute('data-i18n-source') : el.textContent.trim();
      if (!el.hasAttribute('data-i18n-source')) el.setAttribute('data-i18n-source', original);
      el.textContent = translate(original, dict);
    });
  }
  async function setLanguage(locale, settingsRoot) {
    const dict = await catalogue(locale);
    active = locale;
    document.documentElement.lang = locale;
    const title = document.querySelector('#pageTitle');
    if (title && title.textContent.trim() === 'Configurações do aplicativo' || title && ['App settings', 'Ajustes de la aplicación'].includes(title.textContent.trim())) {
      title.textContent = translate('Configurações do aplicativo', dict);
    }
    applyShell(document, dict);
    if (settingsRoot) applySettings(settingsRoot, dict);
    return true;
  }
  g.ThcodeI18n = {
    current: () => active,
    ready() { return initialising; },
    async t(key) { await initialising; return translate(key, await catalogue(active)); },
    translate(text) { return translate(text, catalogues.get(active) || {}); },
    async applySettings(root) { const dict = await catalogue(active); applySettings(root, dict); return true; },
    async applyShell(root = document) { await initialising; applyShell(root, await catalogue(active)); return true; },
    setLanguage
  };
  initialising.then(() => applyShell(document, catalogues.get(active) || {}));
})(window);
