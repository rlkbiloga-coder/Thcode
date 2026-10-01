/* Small JSON-backed locale layer for the app-settings screen. */
(function (g) {
  'use strict';
  const supported = new Set(['pt-BR', 'en', 'es']);
  const catalogues = new Map([['pt-BR', {}]]);
  let active = 'pt-BR';
  try {
    const saved = JSON.parse(localStorage.getItem('thcode.app.v2') || '{}')?.settings?.lang;
    if (supported.has(saved) && saved !== 'pt-BR') catalogue(saved).then(() => { active = saved; document.documentElement.lang = saved; }).catch(() => {});
  } catch (_) { /* first launch or unavailable storage: Portuguese remains the default */ }
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
    if (settingsRoot) applySettings(settingsRoot, dict);
    return true;
  }
  g.ThcodeI18n = {
    current: () => active,
    translate(text) { return translate(text, catalogues.get(active) || {}); },
    async applySettings(root) { const dict = await catalogue(active); applySettings(root, dict); return true; },
    setLanguage
  };
})(window);
