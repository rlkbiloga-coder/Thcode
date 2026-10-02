/* Accessible, localized first-run tour. Uses the actual panels already provided by the app. */
(() => {
  'use strict';
  const STORAGE_KEY = 'thcode.tour.v2';
  const STEPS = [
    { title: 'tour.title.1', body: 'tour.body.1' },
    { title: 'tour.title.2', body: 'tour.body.2', panel: 'terminal' },
    { title: 'tour.title.3', body: 'tour.body.3', panel: 'plugins' },
    { title: 'tour.title.4', body: 'tour.body.4', panel: 'bridge' }
  ];
  let observer;
  let launched = false;
  let overlay = null;
  let card = null;
  let activeStep = 0;
  let onKeydown;
  let previousFocus = null;

  function wasCompleted() {
    try { return localStorage.getItem(STORAGE_KEY) === 'done'; }
    catch (_) { return false; }
  }
  async function text(key) {
    try {
      if (window.ThcodeI18n?.t) return await window.ThcodeI18n.t(key);
      return key;
    } catch (_) { return key; }
  }
  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function openPanelFor(index) {
    const panel = STEPS[index]?.panel;
    if (!panel) return;
    try { window.ThcodeTest?.Panel?.open(panel); }
    catch (_) { /* A restored app view must never be blocked by the optional tour. */ }
  }
  async function finish() {
    try { localStorage.setItem(STORAGE_KEY, 'done'); }
    catch (_) { /* Tour can still close when browser storage is disabled. */ }
    overlay?.remove();
    overlay = null;
    card = null;
    if (observer) observer.disconnect();
    window.removeEventListener('keydown', onKeydown);
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function activateFocus(el) {
    requestAnimationFrame(() => el?.focus({ preventScroll: true }));
  }
  async function renderStep(index) {
    if (!overlay || !card) return;
    activeStep = Math.max(0, Math.min(index, STEPS.length - 1));
    openPanelFor(activeStep);
    const [kicker, title, body, progress, previousLabel, nextLabel, skipLabel, finishLabel] = await Promise.all([
      text('tour.kicker'), text(STEPS[activeStep].title), text(STEPS[activeStep].body),
      text('tour.progress'), text('tour.previous'), text('tour.next'), text('tour.skip'), text('tour.finish')
    ]);
    if (!card?.isConnected) return;
    card.replaceChildren();
    const status = element('p', 'thcode-tour-kicker', kicker);
    const heading = element('h2', 'thcode-tour-title', title);
    heading.id = 'thcode-tour-title';
    const description = element('p', 'thcode-tour-description', body);
    description.id = 'thcode-tour-description';
    const currentProgress = element('p', 'thcode-tour-progress', progress
      .replace(/\{current\}/g, String(activeStep + 1))
      .replace(/\{total\}/g, String(STEPS.length)));
    currentProgress.setAttribute('role', 'status');
    currentProgress.setAttribute('aria-live', 'polite');
    const track = element('div', 'thcode-tour-track');
    track.setAttribute('aria-hidden', 'true');
    const fill = element('span', 'thcode-tour-track-fill');
    fill.style.width = `${((activeStep + 1) / STEPS.length) * 100}%`;
    track.append(fill);
    const nav = element('nav', 'thcode-tour-actions');
    nav.setAttribute('aria-label', kicker);
    const skip = element('button', 'thcode-tour-skip', skipLabel);
    skip.type = 'button';
    skip.addEventListener('click', finish);
    const back = element('button', 'thcode-tour-back');
    back.type = 'button';
    back.textContent = previousLabel;
    back.hidden = activeStep === 0;
    back.addEventListener('click', () => renderStep(activeStep - 1));
    const next = element('button', 'thcode-tour-next', activeStep === STEPS.length - 1 ? finishLabel : nextLabel);
    next.type = 'button';
    next.addEventListener('click', () => {
      if (activeStep === STEPS.length - 1) {
        openPanelFor(activeStep);
        finish();
      } else renderStep(activeStep + 1);
    });
    nav.append(skip, back, next);
    card.append(status, heading, description, currentProgress, track, nav);
    activateFocus(back.hidden ? skip : next);
  }
  function trapFocus(event) {
    if (!overlay) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      finish();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = [...overlay.querySelectorAll('button:not([disabled]):not([hidden])')];
    if (!controls.length) { event.preventDefault(); return; }
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  async function show() {
    if (launched || wasCompleted()) return;
    if (!document.querySelector('#app:not(.hidden)')) return;
    if (document.querySelector('#legalGate, #cookieBar, #splash')) return;
    launched = true;
    observer?.disconnect();
    try { await window.ThcodeI18n?.ready?.(); } catch (_) { /* Portuguese fallback remains safe offline. */ }
    previousFocus = document.activeElement;
    overlay = element('div', 'thcode-tour-backdrop');
    card = element('section', 'thcode-tour-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'thcode-tour-title');
    card.setAttribute('aria-describedby', 'thcode-tour-description');
    overlay.append(card);
    document.body.append(overlay);
    onKeydown = trapFocus;
    window.addEventListener('keydown', onKeydown);
    await renderStep(0);
  }
  if (!wasCompleted()) {
    observer = new MutationObserver(() => { show().catch(() => {}); });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    show().catch(() => {});
  }
})();
