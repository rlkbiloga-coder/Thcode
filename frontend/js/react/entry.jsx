/* Entry da camada React do Thcode — bundle único js/react-app.js (iife).
 * Carregado depois do script.js (defer); só monta quando o usuário abre o Painel. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import Home from './home.jsx';

let root = null;

window.ThcodeReact = {
  open() {
    const T = window.ThcodeTest;
    if (!T || !T.Page) return;
    T.Page.open('home', 'Painel', (el) => {
      if (root) { try { root.unmount(); } catch (_) { /* noop */ } }
      root = createRoot(el);
      root.render(<Home T={T} />);
    }, false);
  }
};
