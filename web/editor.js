// The coloring screen: canvases, tools, drawing, undo/redo, autosave, zoom, export and the toolbar and sidebar controls.
import { db, lsGet, lsSet, lsJson, lsSetJson } from './storage.js';
import { BRUSHES, grainPattern, sampleCurve, stamp } from './brushes.js';
import { PALETTES, hexToRgb, harmonies } from './colors.js';
import { computeRegion } from './fill.js';
import { History } from './history.js';
import { SYMMETRY, SYMMETRY_ORDER, guideMarkup, withSymmetry } from './symmetry.js';
import { createView } from './view.js';
import { icon } from './icons.js';
import { $, el, toast, confirmDialog } from './ui.js';
import { categoryOf, cutoffFor, isFavorite, rememberRecent, saveCutoff, setProgress, toggleFavorite } from './library.js';

const MAX_SIDE = 1400;       // longest edge of the working canvas, in pixels
const RECENT_COLORS = 8;
const GAP_NAMES = ['Off', 'Small', 'Medium', 'Large', 'Largest'];

const board = $('board'), stage = $('stage'), colorCv = $('color'), strokeCv = $('stroke'), linesCv = $('lines');
const cctx = colorCv.getContext('2d', { willReadFrequently: true });
const sctx = strokeCv.getContext('2d');          // the stroke being drawn; merged into the color layer when you lift
const lctx = linesCv.getContext('2d');
const hist = new History(cctx);

const state = {
  tool: 'brush', brush: 'pencil', color: '#e63946', size: 14, symmetry: 'off', gap: 1, palette: 'classic',
  w: 0, h: 0, alpha: null,           // alpha: line-art opacity per pixel
  source: null, item: null, key: null, title: '',   // source: the loaded image, kept so the cut-off can be re-applied
  dirty: false
};
let go = () => {}, spaceDown = false;
export const setNavigator = (fn) => { go = fn; };
export const currentKey = () => state.key;

/* ---------- view (zoom / pan) ---------- */

const view = createView(stage, board, {
  panMode: () => state.tool === 'pan' || spaceDown,
  cancelStroke: () => cancelStroke(),
  onChange: (z) => { $('zoomLabel').textContent = Math.round(z * 100) + '%'; }
});
new ResizeObserver(() => view.layout(state.w, state.h)).observe(stage);

/* ---------- line art: white -> transparent ---------- */

function renderLines() {
  const { w, h, source } = state;
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const octx = off.getContext('2d', { willReadFrequently: true });
  octx.fillStyle = '#fff';                    // flatten transparency onto white first
  octx.fillRect(0, 0, w, h);
  octx.drawImage(source, 0, 0, w, h);
  const src = octx.getImageData(0, 0, w, h).data;

  const cut = +$('threshold').value;
  const out = lctx.createImageData(w, h);
  const alpha = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < alpha.length; i++, p += 4) {
    const lum = 0.299 * src[p] + 0.587 * src[p + 1] + 0.114 * src[p + 2];
    const a = lum >= cut ? 0 : Math.round((cut - lum) * 255 / cut);
    alpha[i] = a;
    out.data[p + 3] = a;                      // RGB stays black: ink on a transparent layer
  }
  state.alpha = alpha;
  lctx.putImageData(out, 0, 0);
}

function setPage(source, natural, item, restore) {
  endStroke();                                // a stroke in progress belongs to the page we are leaving
  flushSave(true);                            // keep the page we are leaving
  const k = natural.isSvg ? MAX_SIDE / Math.max(natural.w, natural.h)
                          : Math.min(1, MAX_SIDE / Math.max(natural.w, natural.h));
  state.w = Math.max(1, Math.round(natural.w * k));
  state.h = Math.max(1, Math.round(natural.h * k));
  state.source = source; state.item = item; state.title = item.title; state.key = item.key; state.dirty = false;
  if (!item.temporary) { lsSet('cb:last', item.key); rememberRecent(item.key); }
  hist.reset();
  for (const c of [colorCv, strokeCv, linesCv]) { c.width = state.w; c.height = state.h; }
  cctx.clearRect(0, 0, state.w, state.h);
  renderLines();
  $('guides').setAttribute('viewBox', `0 0 ${state.w} ${state.h}`);
  drawGuides();
  view.reset();
  view.layout(state.w, state.h);
  $('pageTitle').textContent = item.title;
  document.title = item.title + ' · Coloring Book';
  refreshChrome();
  if (restore && !item.temporary) restoreProgress(item.key);
}

// Only the most recent request may open a page, so a slow load can never replace a newer choice.
let loadId = 0;
function loadImage(url, item, isSvg, restore, revoke) {
  const id = ++loadId, img = new Image();
  const release = () => { if (revoke) URL.revokeObjectURL(url); };
  img.onload = () => {
    if (id === loadId) {
      // SVGs without a pixel size report 0; fall back to the page size the generators use.
      setPage(img, { w: img.naturalWidth || 1000, h: img.naturalHeight || 800, isSvg }, item, restore);
    }
    release();
  };
  img.onerror = () => {
    release();
    if (id !== loadId) return;
    toast('Could not open that picture');
    go('home', true);
  };
  img.src = url;
}

// Opens a library item. `temporary` items (an upload the browser would not store) are never saved.
export function openItem(item) {
  $('threshold').value = cutoffFor(item); $('thresholdVal').textContent = cutoffFor(item);
  if (item.rec) loadImage(URL.createObjectURL(item.rec.blob), item, item.rec.blob.type === 'image/svg+xml', true, true);
  else loadImage(item.src, item, /\.svg$/i.test(item.key), true, false);
}

// Called when the person leaves for another screen: finish any stroke and keep the coloring.
export function leaveEditor() { endStroke(); return flushSave(true); }

/* ---------- history + autosave ---------- */

function updateButtons() {
  $('undoBtn').disabled = !hist.canUndo;
  $('redoBtn').disabled = !hist.canRedo;
}
export function refreshChrome() {
  updateButtons();
  const cat = categoryOf(state.key);
  $('prevBtn').disabled = $('nextBtn').disabled = !cat || cat.items.length < 2;
  const fav = !!state.key && isFavorite(state.key);
  for (const b of [$('favBtn'), $('favBtn2')]) {
    b.setAttribute('aria-pressed', String(fav)); b.classList.toggle('on', fav);
    b.disabled = !state.key || !!(state.item && state.item.temporary);
  }
  $('favBtn2').querySelector('span').textContent = fav ? 'Remove from favorites' : 'Add to favorites';
}
const commit = (token) => { if (hist.commit(token)) { updateButtons(); scheduleSave(); } };
function undo() { if (!stroke && hist.undo()) { updateButtons(); scheduleSave(); } }
function redo() { if (!stroke && hist.redo()) { updateButtons(); scheduleSave(); } }

let saveTimer = 0, persistAsked = false;
function scheduleSave() {
  state.dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => flushSave(false), 600);
}
function isBlank() {
  const d = cctx.getImageData(0, 0, state.w, state.h).data;
  for (let i = 3; i < d.length; i += 4) if (d[i]) return false;
  return true;
}
// Only saves after an edit, so a page that is still restoring can never overwrite saved coloring with a blank.
function flushSave(silent) {
  clearTimeout(saveTimer);
  if (!state.key || !state.dirty || (state.item && state.item.temporary)) return Promise.resolve();
  const key = state.key;
  state.dirty = false;
  if (isBlank()) {                            // nothing left to keep: the page stops counting as colored
    setProgress(key, false);
    return db.del('progress', key).catch(() => {});
  }
  return new Promise((done) => {
    colorCv.toBlob((blob) => {                // toBlob copies the bitmap immediately
      if (!blob) return done();
      db.put('progress', blob, key).then(() => {
        setProgress(key, true);
        if (!silent) toast('Saved ✓');
        if (!persistAsked && navigator.storage && navigator.storage.persist) {   // ask the browser not to evict our data
          persistAsked = true;
          navigator.storage.persist().catch(() => {});
        }
      }).catch(() => toast('Could not save in this browser')).then(done);
    });
  });
}
window.addEventListener('pagehide', () => flushSave(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(true); });
window.cbFlush = () => flushSave(true);         // the Android shell calls this when the app goes to the background

async function restoreProgress(key) {
  let blob = null;
  try { blob = await db.get('progress', key); } catch (e) { /* storage unavailable */ }
  if (!blob) {                                // progress saved by the first version lived in localStorage
    try { const old = localStorage.getItem('cb:' + key); if (old) blob = await (await fetch(old)).blob(); } catch (e) { /* ignore */ }
  }
  if (!blob || state.key !== key) return;
  try {
    const bmp = await createImageBitmap(blob);
    if (state.key !== key) return;
    cctx.save();
    cctx.globalCompositeOperation = 'destination-over';   // anything drawn while loading stays on top
    cctx.drawImage(bmp, 0, 0, state.w, state.h);
    cctx.restore();
  } catch (e) { /* corrupt entry: start blank */ }
}

/* ---------- drawing ---------- */

function toCanvas(e) {
  const r = colorCv.getBoundingClientRect();
  return { x: (e.clientX - r.left) * state.w / r.width, y: (e.clientY - r.top) * state.h / r.height,
           k: state.w / r.width };
}
const sym = (ctx, draw) => withSymmetry(ctx, state.symmetry, state.w / 2, state.h / 2, draw);

let stroke = null;
const pressureOf = (e) => (e.pointerType === 'pen' && e.pressure > 0 ? 0.3 + 0.7 * e.pressure : 1);

colorCv.addEventListener('pointerdown', (e) => {
  // One finger draws; a second touch (or a resting palm) must not restart or corrupt the stroke.
  if (!state.w || e.button > 0 || !e.isPrimary || stroke || view.busy) return;
  const p = toCanvas(e), x = Math.floor(p.x), y = Math.floor(p.y);
  const tool = e.altKey && state.tool !== 'pan' ? 'pick' : state.tool;      // Alt+click is a quick color pick
  if (tool === 'fill') { bucketFill(x, y); return; }
  if (tool === 'pick') { pickColor(x, y, state.tool === 'pick'); return; }
  try { colorCv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
  const b = tool === 'eraser' ? null : BRUSHES[state.brush];
  const ctx = b ? sctx : cctx;
  stroke = { last: p, mid: p, b, ctx, token: hist.begin(), pointerId: e.pointerId };
  if (b) strokeCv.style.opacity = b.alpha || 1; else cctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = ctx.strokeStyle = state.color;
  ctx.lineCap = ctx.lineJoin = 'round';
  const w = Math.max(1, state.size * p.k), press = pressureOf(e);
  if (b && b.kind !== 'line') { sym(sctx, () => stamp(sctx, b, p.x, p.y, w, press, state.color)); return; }
  const d = w * press * ((b && b.widen) || 1);
  sym(ctx, () => { ctx.beginPath(); ctx.arc(p.x, p.y, d / 2, 0, Math.PI * 2); ctx.fill(); });   // a tap leaves a dot
});
colorCv.addEventListener('pointermove', (e) => {
  if (!stroke || e.pointerId !== stroke.pointerId) return;
  const { b, ctx } = stroke;
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (events.length ? events : [e])) {
    const p = toCanvas(ev), press = pressureOf(ev);
    const mid = { x: (stroke.last.x + p.x) / 2, y: (stroke.last.y + p.y) / 2 };
    const w = Math.max(1, state.size * p.k);
    if (b && b.kind !== 'line') {             // stamped brushes: dabs along the smoothed path
      const step = Math.max(1, w * b.width / 2 * b.spacing);
      sampleCurve(stroke.mid, stroke.last, mid, step, (x, y) => sym(sctx, () => stamp(sctx, b, x, y, w, press, state.color)));
    } else {
      ctx.lineWidth = w * press * ((b && b.widen) || 1);
      sym(ctx, () => {
        ctx.beginPath();
        ctx.moveTo(stroke.mid.x, stroke.mid.y);
        ctx.quadraticCurveTo(stroke.last.x, stroke.last.y, mid.x, mid.y);   // midpoint smoothing
        ctx.stroke();
      });
    }
    stroke.last = p; stroke.mid = mid;
  }
});
function endStroke() {
  if (!stroke) return;
  const s = stroke; stroke = null;
  if (s.b) {                                  // merge the stroke into the color layer at its overall opacity
    cctx.globalAlpha = s.b.alpha || 1;
    cctx.drawImage(strokeCv, 0, 0);
    cctx.globalAlpha = 1;
    sctx.clearRect(0, 0, strokeCv.width, strokeCv.height);
    strokeCv.style.opacity = 1;
  } else {
    cctx.globalCompositeOperation = 'source-over';
  }
  commit(s.token);
}
// Abandons the stroke as if it never happened (a second finger arrived, so it was a pinch, not a mark).
function cancelStroke() {
  if (!stroke) return;
  const s = stroke; stroke = null;
  sctx.clearRect(0, 0, strokeCv.width, strokeCv.height);
  strokeCv.style.opacity = 1;
  if (!s.b) { cctx.globalCompositeOperation = 'source-over'; hist.restore(s.token); }
}
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  colorCv.addEventListener(type, (e) => { if (stroke && e.pointerId === stroke.pointerId) endStroke(); });
}

/* ---------- fill ---------- */

function bucketFill(sx, sy) {
  const res = computeRegion(state.alpha, state.w, state.h, sx, sy, state.gap);
  if (!res) return;
  const { w, h } = state, token = hist.begin(), brush = BRUSHES[state.brush];
  if (brush.textured) texturedFill(res.region, brush);
  else {
    const img = new ImageData(new Uint8ClampedArray(token.before.data), w, h), d = img.data;
    const [r, g, b] = hexToRgb(state.color);
    for (let i = 0, p = 0; i < res.region.length; i++, p += 4) {
      if (res.region[i]) { d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255; }
    }
    cctx.putImageData(img, 0, 0);
  }
  commit(token);
}

// Pencil and crayon fills clear the region and lay the paper grain over it, so the page looks hand-colored.
function texturedFill(region, brush) {
  const { w, h } = state;
  const mask = document.createElement('canvas'); mask.width = w; mask.height = h;
  const mctx = mask.getContext('2d'), mi = mctx.createImageData(w, h);
  for (let i = 0; i < region.length; i++) if (region[i]) mi.data[i * 4 + 3] = 255;
  mctx.putImageData(mi, 0, 0);
  cctx.save(); cctx.globalCompositeOperation = 'destination-out'; cctx.drawImage(mask, 0, 0); cctx.restore();
  const tex = document.createElement('canvas'); tex.width = w; tex.height = h;
  const t = tex.getContext('2d');
  t.fillStyle = grainPattern(brush.grain, state.color);
  // Stretch the grain into diagonal strokes, twice at slightly different angles, like shading by hand.
  const big = (w + h) * 2, stretch = brush.grain === 'crayon' ? 3 : 2.2, angle = brush.grain === 'crayon' ? -0.55 : 0.7;
  [[angle, 0], [angle + 0.45, 61]].forEach(([a, off]) => {
    t.setTransform(Math.cos(a) * stretch, Math.sin(a) * stretch, -Math.sin(a), Math.cos(a), off, off);
    t.globalAlpha = off ? 0.7 : 1;
    t.fillRect(-big, -big, big * 2, big * 2);
  });
  t.globalAlpha = 1;
  t.setTransform(1, 0, 0, 1, 0, 0);
  t.globalCompositeOperation = 'destination-in';
  t.drawImage(mask, 0, 0);
  cctx.drawImage(tex, 0, 0);
}

function pickColor(x, y, leaveTool) {
  if (x < 0 || y < 0 || x >= state.w || y >= state.h) return;
  const d = cctx.getImageData(x, y, 1, 1).data;
  if (d[3] > 0) { const c = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join(''); setColor(c); rememberColor(c); }
  if (leaveTool) setTool('brush');
}

/* ---------- toolbar: tools, brushes, size, colors, symmetry ---------- */

function setTool(t) {
  state.tool = t;
  document.querySelectorAll('.tool').forEach((b) => { const on = b.dataset.tool === t; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
  stage.dataset.tool = t;
  updateCursor();
}
function setBrush(id) {
  if (!BRUSHES[id]) return;
  state.brush = id;
  document.querySelectorAll('.chip').forEach((c) => { const on = c.dataset.brush === id; c.classList.toggle('active', on); c.setAttribute('aria-pressed', String(on)); });
  if (state.tool === 'eraser' || state.tool === 'pick' || state.tool === 'pan') setTool('brush');
  lsSet('cb:brush', id);
  updateCursor();
}
function setSize(v) {
  state.size = Math.min(80, Math.max(1, Math.round(v) || 1));
  $('size').value = state.size; $('sizeVal').textContent = state.size;
  lsSet('cb:size', String(state.size));
  updateCursor();
}
function setColor(c) {
  state.color = c;
  $('customColor').value = c;
  document.querySelectorAll('.swatch').forEach((s) => { const on = s.dataset.c === c; s.classList.toggle('active', on); s.setAttribute('aria-pressed', String(on)); });
  if (state.tool === 'eraser' || state.tool === 'pan') setTool('brush');
  renderIdeas();
  lsSet('cb:color', c);
}
function setSymmetry(mode) {
  if (!SYMMETRY[mode]) return;
  state.symmetry = mode; lsSet('cb:sym', mode);
  const on = mode !== 'off';
  $('symBtn').classList.toggle('active', on); $('symBtn').setAttribute('aria-pressed', String(on));
  $('symLabel').textContent = on ? SYMMETRY[mode].label : 'Symmetry';
  drawGuides();
}
function cycleSymmetry() {
  const next = SYMMETRY_ORDER[(SYMMETRY_ORDER.indexOf(state.symmetry) + 1) % SYMMETRY_ORDER.length];
  setSymmetry(next);
  toast('Symmetry: ' + SYMMETRY[next].label);
}
function drawGuides() { $('guides').innerHTML = guideMarkup(state.symmetry, state.w, state.h); }

function swatch(c, parent) {
  const s = el('button', 'swatch');
  s.type = 'button'; s.dataset.c = c; s.style.background = c; s.title = c; s.setAttribute('aria-label', 'Color ' + c);
  s.addEventListener('click', () => setColor(c));
  parent.appendChild(s);
}
function renderPalette() {
  const box = $('palette');
  box.innerHTML = '';
  PALETTES[state.palette].colors.forEach((c) => swatch(c, box));
  setColor(state.color);
}
function renderIdeas() {
  const box = $('ideas');
  box.innerHTML = '';
  harmonies(state.color).forEach((c) => swatch(c, box));
  box.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
}

// Colors you pick or mix yourself are remembered, so a favourite shade is one tap away next time.
let recentColors = lsJson('cb:colors');
function renderRecentColors() {
  const box = $('recentColors');
  box.innerHTML = '';
  recentColors.forEach((c) => swatch(c, box));
  box.hidden = !recentColors.length;
  setColor(state.color);
}
function rememberColor(c) {
  if (Object.values(PALETTES).some((p) => p.colors.includes(c))) return;
  recentColors = [c, ...recentColors.filter((x) => x !== c)].slice(0, RECENT_COLORS);
  lsSetJson('cb:colors', recentColors);
  renderRecentColors();
}

// A ring that shows how big the brush is under the mouse or pen.
const cursor = $('brushCursor');
let lastPointer = null;
function updateCursor() {
  const show = lastPointer && (state.tool === 'brush' || state.tool === 'eraser') && !view.busy;
  cursor.hidden = !show;
  if (!show) return;
  const b = state.tool === 'eraser' ? null : BRUSHES[state.brush];
  const d = Math.max(4, state.size * ((b && (b.width || b.widen)) || 1));
  cursor.style.width = cursor.style.height = d + 'px';
  cursor.style.transform = `translate(${lastPointer.x - d / 2}px, ${lastPointer.y - d / 2}px)`;
}
stage.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') { lastPointer = null; return updateCursor(); }
  const r = stage.getBoundingClientRect();
  lastPointer = { x: e.clientX - r.left, y: e.clientY - r.top };
  updateCursor();
});
stage.addEventListener('pointerdown', () => document.body.classList.remove('menu'), true);   // tapping the page closes the phone's side panel
stage.addEventListener('pointerleave', () => { lastPointer = null; updateCursor(); });

document.querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
for (const [id, br] of Object.entries(BRUSHES)) {
  const c = el('button', 'chip');
  c.type = 'button'; c.dataset.brush = id; c.title = br.label;
  c.append(icon(id), el('small', '', br.label));
  c.addEventListener('click', () => setBrush(id));
  $('brushBtns').appendChild(c);
}
for (const [id, p] of Object.entries(PALETTES)) $('paletteSel').add(new Option(p.label, id));
$('paletteSel').addEventListener('change', (e) => { state.palette = e.target.value; lsSet('cb:palette', state.palette); renderPalette(); });
$('size').addEventListener('input', (e) => setSize(+e.target.value));
$('customColor').addEventListener('input', (e) => setColor(e.target.value));
$('customColor').addEventListener('change', (e) => rememberColor(e.target.value));   // fires once the picker closes
$('symBtn').addEventListener('click', cycleSymmetry);
$('gap').addEventListener('input', (e) => setGap(+e.target.value));
function setGap(v) {
  state.gap = Math.min(4, Math.max(0, v | 0));
  $('gap').value = state.gap; $('gapVal').textContent = GAP_NAMES[state.gap];
  lsSet('cb:gap', String(state.gap));
}
$('zoomIn').addEventListener('click', () => view.zoomBy(1.4));
$('zoomOut').addEventListener('click', () => view.zoomBy(1 / 1.4));
$('zoomLabel').addEventListener('click', () => view.reset());
$('zoomFit').addEventListener('click', () => view.reset());

// Restore the person's last settings.
state.palette = PALETTES[lsGet('cb:palette', '')] ? lsGet('cb:palette', '') : 'classic';
$('paletteSel').value = state.palette;
state.color = /^#[0-9a-f]{6}$/i.test(lsGet('cb:color', '')) ? lsGet('cb:color', '') : state.color;
setBrush(lsGet('cb:brush', state.brush));
setSize(+lsGet('cb:size', state.size));
setGap(+lsGet('cb:gap', state.gap));
setSymmetry(lsGet('cb:sym', 'off'));
setTool('brush');
renderPalette();
renderRecentColors();

/* ---------- header and sidebar actions ---------- */

$('undoBtn').addEventListener('click', undo);
$('redoBtn').addEventListener('click', redo);
$('clearBtn').addEventListener('click', async () => {
  if (!state.w || !(await confirmDialog('This removes all your coloring on this page. You can still undo it.', { title: 'Clear this page?', ok: 'Clear', danger: true }))) return;
  const token = hist.begin();
  cctx.clearRect(0, 0, state.w, state.h);
  commit(token);
});
const favToggle = () => { if (state.key) { const on = toggleFavorite(state.key); refreshChrome(); toast(on ? 'Added to favorites ♥' : 'Removed from favorites'); } };
$('favBtn').addEventListener('click', favToggle);
$('favBtn2').addEventListener('click', favToggle);
$('menuBtn').addEventListener('click', () => document.body.classList.toggle('menu'));
$('prevBtn').addEventListener('click', () => flip(-1));
$('nextBtn').addEventListener('click', () => flip(1));

// Previous / next picture in the same category, wrapping around.
function flip(step) {
  const cat = categoryOf(state.key);
  if (!cat) return;
  const i = cat.items.findIndex((it) => it.key === state.key);
  go('p/' + encodeURIComponent(cat.items[(i + step + cat.items.length) % cat.items.length].key), true);
}

// The finished picture: your coloring under the ink, on white paper (or just the ink, for printing blank).
function renderPng(withColor = true) {
  const out = document.createElement('canvas');
  out.width = state.w; out.height = state.h;
  const o = out.getContext('2d');
  o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height);
  if (withColor) o.drawImage(colorCv, 0, 0);
  o.drawImage(linesCv, 0, 0);
  return new Promise((ok) => out.toBlob(ok));
}
const pngName = () => (state.title || 'coloring').replace(/[^\w-]+/g, '-').toLowerCase() + '.png';

async function savePng() {
  if (!state.w) return;
  const blob = await renderPng(), name = pngName();
  if (window.AndroidBridge) {                  // inside the Android app: a WebView cannot download blobs itself
    const fr = new FileReader();
    fr.onload = () => window.AndroidBridge.saveImage(String(fr.result).split(',')[1], name);
    fr.readAsDataURL(blob);
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('saveBtn').addEventListener('click', savePng);

async function printPage(withColor) {
  if (!state.w) return;
  const img = $('printImg');
  img.src = URL.createObjectURL(await renderPng(withColor));
  try { await img.decode(); } catch (e) { /* print anyway */ }
  window.addEventListener('afterprint', () => { URL.revokeObjectURL(img.src); img.removeAttribute('src'); }, { once: true });
  window.print();
}
$('printBtn').addEventListener('click', () => printPage(true));
$('printBlankBtn').addEventListener('click', () => printPage(false));
if (window.AndroidBridge || typeof window.print !== 'function') document.querySelectorAll('.print-only-web').forEach((n) => { n.hidden = true; });

if (navigator.share && navigator.canShare && !window.AndroidBridge) {   // phones and some desktops: share to any app
  $('shareBtn').hidden = false;
  $('shareBtn').addEventListener('click', async () => {
    if (!state.w) return;
    const file = new File([await renderPng()], pngName(), { type: 'image/png' });
    if (!navigator.canShare({ files: [file] })) return toast('Sharing is not available here');
    try { await navigator.share({ files: [file], title: state.title }); } catch (e) { /* cancelled */ }
  });
}

/* ---------- line-art settings ---------- */

let cutFrame = 0, cutTimer = 0;
$('threshold').addEventListener('input', (e) => {
  const cutoff = +e.target.value;
  $('thresholdVal').textContent = cutoff;
  if (!cutFrame) cutFrame = requestAnimationFrame(() => { cutFrame = 0; if (state.source) renderLines(); });   // at most once per frame
  const item = state.item;
  if (item && !item.temporary) {              // remember the cut-off chosen for this picture
    clearTimeout(cutTimer);
    cutTimer = setTimeout(() => saveCutoff(item, cutoff), 400);
  }
});

/* ---------- keyboard ---------- */

const isTyping = (t) => t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t.tagName === 'INPUT' && !['range', 'checkbox', 'color'].includes(t.type));
window.addEventListener('keydown', (e) => {
  if (document.body.classList.contains('home') || document.querySelector('dialog[open]') || isTyping(e.target)) return;
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && k === 'y') { e.preventDefault(); redo(); }
  else if (mod && k === 's') { e.preventDefault(); savePng(); }
  else if (!mod && !e.altKey) {
    const t = { b: 'brush', f: 'fill', e: 'eraser', i: 'pick', h: 'pan' }[k];
    if (t) setTool(t);
    else if (k === '[') setSize(state.size - 4);
    else if (k === ']') setSize(state.size + 4);
    else if (k === '+' || k === '=') view.zoomBy(1.4);
    else if (k === '-' || k === '_') view.zoomBy(1 / 1.4);
    else if (k === '0') view.reset();
    else if (k === 'm') cycleSymmetry();
    else if (k === ' ' && !['BUTTON', 'INPUT'].includes(e.target.tagName)) { spaceDown = true; stage.classList.add('space'); e.preventDefault(); }
    else if (e.target === document.body && (k === 'arrowleft' || k === 'arrowright')) flip(k === 'arrowleft' ? -1 : 1);
  }
});
const releaseSpace = () => { spaceDown = false; stage.classList.remove('space'); };
window.addEventListener('keyup', (e) => { if (e.key === ' ') releaseSpace(); });
window.addEventListener('blur', releaseSpace);

/* ---------- own pictures that could not be stored ---------- */

// Colors an upload the browser refused to keep: it works for this visit only and is never saved.
export function openTemporary(file, title) {
  const item = { key: 'tmp:' + Date.now(), title, temporary: true };
  $('threshold').value = 200; $('thresholdVal').textContent = 200;
  loadImage(URL.createObjectURL(file), item, file.type === 'image/svg+xml', false, true);
}
