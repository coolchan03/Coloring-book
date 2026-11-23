// Starts the app: wires the screens together, the header, theme, backup / restore and the keyboard help.
import { hydrateIcons } from './icons.js';
import { $, el, toast, dialog, confirmDialog, alertDialog, cycleTheme, onTheme, setTheme, themeIcon } from './ui.js';
import { findItem, loadLibrary } from './library.js';
import { createBackup, restoreBackup } from './backup.js';
import { openItem, setNavigator } from './editor.js';
import { cancelPendingRender, showCategory, showHome } from './launcher.js';
import { go, route, startRouter } from './router.js';
import './uploads.js';

hydrateIcons();
setNavigator(go);

/* ---------- header ---------- */

$('homeBtn').addEventListener('click', () => go('home'));
$('themeBtn').addEventListener('click', cycleTheme);
const THEME_NAMES = { auto: 'Match my device', light: 'Light', dark: 'Dark' };
onTheme((t) => {
  $('themeBtn').replaceChildren(themeIcon(t));
  $('themeBtn').title = $('themeBtn').ariaLabel = 'Theme: ' + THEME_NAMES[t] + ' (click to change)';
  document.querySelectorAll('#themeSeg button').forEach((b) => { b.classList.toggle('active', b.dataset.theme === t); b.setAttribute('aria-pressed', String(b.dataset.theme === t)); });
});
document.querySelectorAll('#themeSeg button').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.theme)));

/* ---------- backup and restore ---------- */

if (window.AndroidBridge) $('backupBtn').hidden = true;     // a WebView cannot download files; restoring still works
$('backupBtn').addEventListener('click', async () => {
  try {
    const { blob, uploads, progress } = await createBackup();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `coloring-book-${new Date().toISOString().slice(0, 10)}.cbbackup`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Backed up ${uploads} pictures and ${progress} colored pages`);
  } catch (e) { toast('Could not make a backup'); }
});
$('restoreInput').addEventListener('change', async (e) => {
  const file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  if (!(await confirmDialog('Pictures in the backup are added to yours, and coloring for the same page is replaced by the backup\'s.', { title: 'Restore this backup?', ok: 'Restore' }))) return;
  try {
    const { pictures, colored } = await restoreBackup(file);
    await loadLibrary();
    toast(`Restored ${pictures} pictures and ${colored} colored pages`);
    cancelPendingRender(); route();
  } catch (err) { alertDialog('That file is not a Coloring Book backup, or it is damaged.', 'Could not restore'); }
});

/* ---------- keyboard help ---------- */

const SHORTCUTS = [
  ['B / F / E / I / H', 'Brush, Fill, Eraser, Pick color, Hand (pan)'], ['Alt + click', 'Pick a color from the page'],
  ['[  and  ]', 'Smaller / larger brush'], ['M', 'Cycle symmetry'],
  ['+  /  −  /  0', 'Zoom in / out / fit'], ['Space + drag', 'Pan while zoomed in'],
  ['Mouse wheel · pinch', 'Zoom at the pointer'], ['← / →', 'Previous / next picture'],
  ['Ctrl + Z', 'Undo'], ['Ctrl + Shift + Z  or  Ctrl + Y', 'Redo'], ['Ctrl + S', 'Save as PNG'], ['?', 'This list']
];
function showHelp() {
  if (document.querySelector('dialog[open]')) return;
  const list = el('dl', 'shortcuts');
  for (const [keys, what] of SHORTCUTS) { list.append(el('dt', '', keys), el('dd', '', what)); }
  dialog({ title: 'Keyboard & touch shortcuts', body: list, actions: [{ label: 'Done', value: 'ok', primary: true }] });
}
$('helpBtn').addEventListener('click', showHelp);
window.addEventListener('keydown', (e) => {
  if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) { e.preventDefault(); showHelp(); }
});

/* ---------- start ---------- */

main();
async function main() {
  await loadLibrary();
  startRouter({
    home: showHome,
    category: showCategory,
    page(key) {                                // reloading while coloring reopens that page; otherwise the launcher
      const it = findItem(key);
      if (!it) return false;
      cancelPendingRender();
      document.body.classList.remove('home', 'menu');
      $('pageTitle').textContent = it.title;
      openItem(it);
      return true;
    }
  });
}

// Offline use and "Add to Home screen" for the website (the Android app already bundles everything).
if ('serviceWorker' in navigator && !window.AndroidBridge) navigator.serviceWorker.register('sw.js').catch(() => {});
