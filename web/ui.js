// Shared interface pieces: DOM helper, toast, modal dialogs and the light/dark theme.
import { icon } from './icons.js';
import { lsGet, lsSet } from './storage.js';

export const $ = (id) => document.getElementById(id);

export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* ---------- toast ---------- */

let toastTimer = 0;
export function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ---------- dialogs (these replace alert / confirm / prompt, which look different on every platform) ---------- */

// Opens a modal and resolves with the value of the button pressed ('cancel' for Esc or a click outside).
// `body` is a node shown under the title; `input` adds a text field whose value is returned in `.text`.
export function dialog({ title, body, input, actions = [{ label: 'OK', value: 'ok', primary: true }] }) {
  return new Promise((resolve) => {
    const d = el('dialog', 'dialog'), form = el('form');
    form.method = 'dialog';
    const head = el('h2', '', title || '');
    head.id = 'dlgTitle'; d.setAttribute('aria-labelledby', 'dlgTitle');
    form.appendChild(head);
    if (body) form.appendChild(body);
    let field = null;
    if (input) {
      field = el('input', 'field'); field.type = 'text'; field.maxLength = input.maxLength || 60;
      field.value = input.value || ''; field.placeholder = input.placeholder || '';
      field.setAttribute('aria-label', title || 'Value');
      form.appendChild(field);
    }
    const row = el('div', 'dialog-actions');
    for (const a of actions) {
      const b = el('button', 'btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : ''), a.label);
      b.value = a.value; b.type = a.value === 'cancel' ? 'button' : 'submit';
      if (a.value === 'cancel') b.addEventListener('click', () => d.close('cancel'));
      row.appendChild(b);
    }
    form.appendChild(row); d.appendChild(form);
    d.addEventListener('click', (e) => { if (e.target === d) d.close('cancel'); });
    d.addEventListener('close', () => {
      const result = { value: d.returnValue || 'cancel', text: field ? field.value.trim() : '' };
      d.remove(); resolve(result);
    });
    document.body.appendChild(d);
    d.showModal();
    if (field) { field.focus(); field.select(); } else (row.querySelector('.primary') || row.lastChild).focus();
  });
}

export async function confirmDialog(message, { title = 'Are you sure?', ok = 'OK', danger = false } = {}) {
  const r = await dialog({ title, body: el('p', 'dialog-text', message), actions: [
    { label: 'Cancel', value: 'cancel' }, { label: ok, value: 'ok', primary: !danger, danger }] });
  return r.value === 'ok';
}

export async function promptDialog(message, { value = '', ok = 'OK', maxLength = 40 } = {}) {
  const r = await dialog({ title: message, input: { value, maxLength }, actions: [
    { label: 'Cancel', value: 'cancel' }, { label: ok, value: 'ok', primary: true }] });
  return r.value === 'ok' ? r.text : null;
}

export const alertDialog = (message, title = 'Heads up') =>
  dialog({ title, body: el('p', 'dialog-text', message) }).then(() => {});

/* ---------- theme: auto follows the device, or force light / dark ---------- */

const THEMES = ['auto', 'light', 'dark'];
const THEME_ICON = { auto: 'contrast', light: 'sun', dark: 'moon' };
let theme = THEMES.includes(lsGet('cb:theme', 'auto')) ? lsGet('cb:theme', 'auto') : 'auto';
const themeListeners = [];

function applyTheme() {
  if (theme === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#ffffff';
  themeListeners.forEach((fn) => fn(theme));
}
export const getTheme = () => theme;
export function setTheme(t) {
  if (!THEMES.includes(t)) return;
  theme = t; lsSet('cb:theme', t); applyTheme();
}
export const cycleTheme = () => setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]);
export const onTheme = (fn) => { themeListeners.push(fn); fn(theme); };
export const themeIcon = (t = theme) => icon(THEME_ICON[t]);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
applyTheme();
