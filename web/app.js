import { db } from './storage.js';
import { BRUSHES, grainPattern, hexToRgb, sampleCurve, stamp } from './brushes.js';

const MAX_SIDE = 1400;       // longest edge of the working canvas, in pixels
const UNDO_LIMIT = 12;
const BARRIER = 128;         // line alpha above this blocks the bucket fill
const DEFAULT_CAT = 'My Pictures';
const NEW_CAT = '__new__';
const COLORS = [
  '#000000', '#555555', '#9a9a9a', '#ffffff', '#7b3f00', '#c68642', '#f1c27d', '#ffdbac',
  '#e63946', '#ff6b6b', '#f4a261', '#ff9f1c', '#ffd60a', '#e9ed6b', '#80b918', '#2a9d8f',
  '#1b7f3b', '#00b4d8', '#4cc9f0', '#3a6ea5', '#1d3557', '#7b2cbf', '#c77dff', '#ff7eb6'
];

const $ = (id) => document.getElementById(id);
const enc = encodeURIComponent;
const board = $('board'), colorCv = $('color'), strokeCv = $('stroke'), linesCv = $('lines');
const cctx = colorCv.getContext('2d', { willReadFrequently: true });
const sctx = strokeCv.getContext('2d');          // the stroke being drawn; merged into the color layer when you lift
const lctx = linesCv.getContext('2d');

const state = {
  tool: 'brush', brush: 'pencil', color: '#e63946', size: 14,
  w: 0, h: 0, alpha: null,           // alpha: line-art opacity per pixel
  source: null, key: null, title: '',// source: the loaded image, kept so the cut-off can be re-applied
  undo: [], redo: [], dirty: false
};

// Small helpers for things stored in localStorage, which can be missing or full.
const lsGet = (k, fallback) => { try { const v = localStorage.getItem(k); return v === null ? fallback : v; } catch (e) { return fallback; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };
const lsJson = (k) => { try { return JSON.parse(lsGet(k, '[]')) || []; } catch (e) { return []; } };

let toastTimer = 0;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
}

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

function setPage(source, natural, title, key, restore) {
  endStroke();                                // a stroke in progress belongs to the page we are leaving
  flushSave(true);                            // keep the page we are leaving
  const k = natural.isSvg ? MAX_SIDE / Math.max(natural.w, natural.h)
                          : Math.min(1, MAX_SIDE / Math.max(natural.w, natural.h));
  state.w = Math.max(1, Math.round(natural.w * k));
  state.h = Math.max(1, Math.round(natural.h * k));
  state.source = source; state.title = title; state.key = key; state.dirty = false;
  if (key) { lsSet('cb:last', key); rememberRecent(key); }
  state.undo = []; state.redo = [];
  for (const c of [colorCv, strokeCv, linesCv]) { c.width = state.w; c.height = state.h; }
  cctx.clearRect(0, 0, state.w, state.h);
  renderLines();
  layout();
  $('pageTitle').textContent = title;
  updateButtons();
  if (restore && key) restoreProgress(key);
}

// Only the most recent request may open a page, so a slow load can never replace a newer choice.
let loadId = 0;
function loadImage(url, title, key, isSvg, restore, revoke) {
  const id = ++loadId, img = new Image();
  const release = () => { if (revoke) URL.revokeObjectURL(url); };
  img.onload = () => {
    if (id === loadId) {
      // SVGs without a pixel size report 0; fall back to the page size the generators use.
      setPage(img, { w: img.naturalWidth || 1000, h: img.naturalHeight || 800, isSvg }, title, key, restore);
    }
    release();
  };
  img.onerror = () => {
    release();
    if (id !== loadId) return;
    toast('Could not open that picture');
    history.replaceState(null, '', '#home');
    route();
  };
  img.src = url;
}

/* ---------- layout ---------- */

function layout() {
  if (!state.w) return;
  const stage = $('stage');
  const aw = stage.clientWidth - 20, ah = stage.clientHeight - 20;
  const s = Math.min(aw / state.w, ah / state.h);
  board.style.width = Math.floor(state.w * s) + 'px';
  board.style.height = Math.floor(state.h * s) + 'px';
}
new ResizeObserver(layout).observe($('stage'));

/* ---------- history + autosave ---------- */

function snapshot() {
  state.undo.push(cctx.getImageData(0, 0, state.w, state.h));
  if (state.undo.length > UNDO_LIMIT) state.undo.shift();
  state.redo = [];
  updateButtons();
}
function undo() {
  if (!state.undo.length) return;
  state.redo.push(cctx.getImageData(0, 0, state.w, state.h));
  cctx.putImageData(state.undo.pop(), 0, 0);
  updateButtons(); scheduleSave();
}
function redo() {
  if (!state.redo.length) return;
  state.undo.push(cctx.getImageData(0, 0, state.w, state.h));
  cctx.putImageData(state.redo.pop(), 0, 0);
  updateButtons(); scheduleSave();
}
function updateButtons() {
  $('undoBtn').disabled = !state.undo.length;
  $('redoBtn').disabled = !state.redo.length;
  const cat = categoryOf(state.key);
  $('prevBtn').disabled = $('nextBtn').disabled = !cat || cat.items.length < 2;
}

let saveTimer = 0, persistAsked = false;
function scheduleSave() {
  state.dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => flushSave(false), 600);
}
// Only saves after an edit, so a page that is still restoring can never overwrite saved coloring with a blank.
function flushSave(silent) {
  clearTimeout(saveTimer);
  if (!state.key || !state.dirty) return Promise.resolve();
  const key = state.key;
  state.dirty = false;
  return new Promise((done) => {
    colorCv.toBlob((blob) => {                // toBlob copies the bitmap immediately
      if (!blob) return done();
      db.put('progress', blob, key).then(() => {
        progressKeys.add(key);
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

let stroke = null;
const pressureOf = (e) => (e.pointerType === 'pen' && e.pressure > 0 ? 0.3 + 0.7 * e.pressure : 1);
colorCv.addEventListener('pointerdown', (e) => {
  // One finger draws; a second touch (or a resting palm) must not restart or corrupt the stroke.
  if (!state.w || e.button > 0 || !e.isPrimary || stroke) return;
  const p = toCanvas(e);
  if (state.tool === 'fill') { bucketFill(Math.floor(p.x), Math.floor(p.y)); return; }
  if (state.tool === 'pick') { pickColor(Math.floor(p.x), Math.floor(p.y)); return; }
  colorCv.setPointerCapture(e.pointerId);
  snapshot();
  const b = state.tool === 'eraser' ? null : BRUSHES[state.brush];
  const ctx = b ? sctx : cctx;
  stroke = { last: p, mid: p, b, ctx };
  if (b) strokeCv.style.opacity = b.alpha || 1; else cctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = ctx.strokeStyle = state.color;
  ctx.lineCap = ctx.lineJoin = 'round';
  const w = Math.max(1, state.size * p.k), press = pressureOf(e);
  if (b && b.kind !== 'line') { stamp(sctx, b, p.x, p.y, w, press, state.color); return; }
  const d = w * press * ((b && b.widen) || 1);
  ctx.beginPath(); ctx.arc(p.x, p.y, d / 2, 0, Math.PI * 2); ctx.fill();   // a tap leaves a dot
});
colorCv.addEventListener('pointermove', (e) => {
  if (!stroke) return;
  const { b, ctx } = stroke;
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (events.length ? events : [e])) {
    const p = toCanvas(ev), press = pressureOf(ev);
    const mid = { x: (stroke.last.x + p.x) / 2, y: (stroke.last.y + p.y) / 2 };
    const w = Math.max(1, state.size * p.k);
    if (b && b.kind !== 'line') {             // stamped brushes: dabs along the smoothed path
      const step = Math.max(1, w * b.width / 2 * b.spacing);
      sampleCurve(stroke.mid, stroke.last, mid, step, (x, y) => stamp(sctx, b, x, y, w, press, state.color));
    } else {
      ctx.lineWidth = w * press * ((b && b.widen) || 1);
      ctx.beginPath();
      ctx.moveTo(stroke.mid.x, stroke.mid.y);
      ctx.quadraticCurveTo(stroke.last.x, stroke.last.y, mid.x, mid.y);   // midpoint smoothing
      ctx.stroke();
    }
    stroke.last = p; stroke.mid = mid;
  }
});
function endStroke() {
  if (!stroke) return;
  if (stroke.b) {                             // merge the stroke into the color layer at its overall opacity
    cctx.globalAlpha = stroke.b.alpha || 1;
    cctx.drawImage(strokeCv, 0, 0);
    cctx.globalAlpha = 1;
    sctx.clearRect(0, 0, strokeCv.width, strokeCv.height);
    strokeCv.style.opacity = 1;
  } else {
    cctx.globalCompositeOperation = 'source-over';
  }
  stroke = null; scheduleSave();
}
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) colorCv.addEventListener(type, endStroke);

// Fill is bounded by the line art alone, so it works the same on any existing coloring.
function bucketFill(sx, sy) {
  const { w, h, alpha } = state;
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;
  let seed = sy * w + sx;
  if (alpha[seed] > BARRIER) {                // clicked on a line: nudge to a neighbouring open pixel
    seed = -1;
    for (let d = 1; d <= 4 && seed < 0; d++)
      for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
        const x = sx + dx, y = sy + dy;
        if (x >= 0 && y >= 0 && x < w && y < h && alpha[y * w + x] <= BARRIER) { seed = y * w + x; break; }
      }
    if (seed < 0) return;
  }
  const region = new Uint8Array(w * h);
  const stack = [seed];
  while (stack.length) {                       // scanline flood fill, 4-connected
    const i = stack.pop();
    if (region[i] || alpha[i] > BARRIER) continue;
    const x = i % w, row = i - x;
    let l = x; while (l > 0 && !region[row + l - 1] && alpha[row + l - 1] <= BARRIER) l--;
    let r = x; while (r < w - 1 && !region[row + r + 1] && alpha[row + r + 1] <= BARRIER) r++;
    for (let c = l; c <= r; c++) region[row + c] = 1;
    for (const nr of [row - w, row + w]) {
      if (nr < 0 || nr >= w * h) continue;
      let inRun = false;
      for (let c = l; c <= r; c++) {
        const open = !region[nr + c] && alpha[nr + c] <= BARRIER;
        if (open && !inRun) stack.push(nr + c);
        inRun = open;
      }
    }
  }
  // Grow two pixels into the line itself so no halo shows where the ink is anti-aliased.
  for (let pass = 0; pass < 2; pass++) {
    const add = [];
    for (let i = 0; i < region.length; i++) {
      if (region[i] || alpha[i] <= BARRIER) continue;
      const x = i % w;
      if ((x > 0 && region[i - 1] === 1) || (x < w - 1 && region[i + 1] === 1) ||
          (i >= w && region[i - w] === 1) || (i < region.length - w && region[i + w] === 1)) add.push(i);
    }
    for (const i of add) region[i] = 1;
  }
  snapshot();
  const brush = BRUSHES[state.brush];
  if (brush.textured) { texturedFill(region, brush); scheduleSave(); return; }
  const img = cctx.getImageData(0, 0, w, h), d = img.data;
  const [r, g, b] = hexToRgb(state.color);
  for (let i = 0, p = 0; i < region.length; i++, p += 4) {
    if (region[i]) { d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255; }
  }
  cctx.putImageData(img, 0, 0);
  scheduleSave();
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

function pickColor(x, y) {
  if (x < 0 || y < 0 || x >= state.w || y >= state.h) return;
  const d = cctx.getImageData(x, y, 1, 1).data;
  if (d[3] > 0) { const c = '#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join(''); setColor(c); rememberColor(c); }
  setTool('brush');
}

/* ---------- toolbar ---------- */

function setTool(t) {
  state.tool = t;
  document.querySelectorAll('.tool').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
  colorCv.style.cursor = t === 'fill' || t === 'pick' ? 'pointer' : 'crosshair';
}
function setColor(c) {
  state.color = c;
  $('customColor').value = c;
  document.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('active', s.dataset.c === c));
  if (state.tool === 'eraser') setTool('brush');
}
function setBrush(id) {
  if (!BRUSHES[id]) return;
  state.brush = id;
  document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.brush === id));
  if (state.tool === 'eraser' || state.tool === 'pick') setTool('brush');
  lsSet('cb:brush', id);
}
function setSize(v) {
  state.size = Math.min(80, Math.max(1, v));
  $('size').value = state.size;
}
function swatch(c, parent) {
  const s = document.createElement('button');
  s.className = 'swatch'; s.dataset.c = c; s.style.background = c; s.title = c;
  s.addEventListener('click', () => setColor(c));
  parent.appendChild(s);
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
  if (COLORS.includes(c)) return;
  recentColors = [c, ...recentColors.filter((x) => x !== c)].slice(0, 6);
  lsSet('cb:colors', JSON.stringify(recentColors));
  renderRecentColors();
}

document.querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
for (const [id, br] of Object.entries(BRUSHES)) {
  const c = document.createElement('button');
  c.className = 'chip'; c.dataset.brush = id; c.title = br.label; c.innerHTML = `<span>${br.icon}</span><small>${br.label}</small>`;
  c.addEventListener('click', () => setBrush(id));
  $('brushBtns').appendChild(c);
}
COLORS.forEach((c) => swatch(c, $('palette')));
$('size').addEventListener('input', (e) => setSize(+e.target.value));
$('customColor').addEventListener('input', (e) => setColor(e.target.value));
$('customColor').addEventListener('change', (e) => rememberColor(e.target.value));   // fires once the picker closes
setBrush(lsGet('cb:brush', state.brush));
renderRecentColors();

$('undoBtn').addEventListener('click', undo);
$('redoBtn').addEventListener('click', redo);
$('clearBtn').addEventListener('click', () => {
  if (!state.w || !confirm('Clear all your coloring on this page?')) return;
  snapshot(); cctx.clearRect(0, 0, state.w, state.h); scheduleSave();
});
$('menuBtn').addEventListener('click', () => document.body.classList.toggle('menu'));
$('homeBtn').addEventListener('click', () => go('home'));
$('prevBtn').addEventListener('click', () => flip(-1));
$('nextBtn').addEventListener('click', () => flip(1));

// The finished picture: your coloring under the ink, on white paper.
function renderPng() {
  const out = document.createElement('canvas');
  out.width = state.w; out.height = state.h;
  const o = out.getContext('2d');
  o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height);
  o.drawImage(colorCv, 0, 0); o.drawImage(linesCv, 0, 0);
  return new Promise((ok) => out.toBlob(ok));
}
const pngName = () => (state.title || 'coloring').replace(/[^\w-]+/g, '-').toLowerCase() + '.png';

$('saveBtn').addEventListener('click', async () => {
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
});

if (navigator.share && navigator.canShare && !window.AndroidBridge) {   // phones and some desktops: share to any app
  $('shareBtn').hidden = false;
  $('shareBtn').addEventListener('click', async () => {
    if (!state.w) return;
    const file = new File([await renderPng()], pngName(), { type: 'image/png' });
    if (!navigator.canShare({ files: [file] })) return toast('Sharing is not available here');
    try { await navigator.share({ files: [file], title: state.title }); } catch (e) { /* cancelled */ }
  });
}

let cutFrame = 0, cutTimer = 0;
function setThreshold(v) { $('threshold').value = v; $('thresholdVal').textContent = v; }
$('threshold').addEventListener('input', (e) => {
  $('thresholdVal').textContent = e.target.value;
  if (!cutFrame) cutFrame = requestAnimationFrame(() => { cutFrame = 0; if (state.source) renderLines(); });   // at most once per frame
  if (state.key && state.key.startsWith('u:')) {   // remember the cut-off chosen for an uploaded picture
    const id = state.key.slice(2), cutoff = +e.target.value;
    clearTimeout(cutTimer);
    cutTimer = setTimeout(async () => {
      const rec = mine.find((r) => r.id === id);
      if (rec) { rec.cutoff = cutoff; try { await db.put('uploads', rec); } catch (err) { /* ignore */ } }
    }, 400);
  }
});

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); }
  else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    const t = { b: 'brush', f: 'fill', e: 'eraser', i: 'pick' }[k];
    if (t) setTool(t);
    else if (k === '[') setSize(state.size - 4);
    else if (k === ']') setSize(state.size + 4);
  }
});

/* ---------- the person's own pictures ---------- */

let mine = [];                                // uploaded pictures: {id, name, cat, cutoff, blob, created}

function refreshCatSelect(selected) {
  const sel = $('uploadCat');
  const cats = [...new Set([DEFAULT_CAT, ...mine.map((r) => r.cat)])];
  if (selected && !cats.includes(selected)) cats.push(selected);
  sel.innerHTML = '';
  for (const c of cats) sel.add(new Option(c, c));
  sel.add(new Option('+ New category…', NEW_CAT));
  sel.value = selected || DEFAULT_CAT;
  sel.dataset.prev = sel.value;
}
$('uploadCat').addEventListener('change', (e) => {
  const sel = e.target;
  if (sel.value !== NEW_CAT) { sel.dataset.prev = sel.value; return; }
  const name = (prompt('Name for the new category:') || '').trim().slice(0, 40);
  refreshCatSelect(name || sel.dataset.prev);
});

async function addUploads(files) {
  const imgs = [...files].filter((f) => f.type.startsWith('image/'));
  if (!imgs.length) return;
  let cat = $('uploadCat').value;
  if (cat === NEW_CAT) cat = DEFAULT_CAT;
  let last = null;
  for (const file of imgs) {
    const rec = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                  name: file.name.replace(/\.[^.]+$/, '') || 'Picture', cat, cutoff: 200,   // gentler cut-off suits photos and scans
                  blob: file, created: Date.now() };
    try { await db.put('uploads', rec); mine.push(rec); last = rec; }
    catch (e) {                               // storage blocked: still let them color it, just not keep it
      setThreshold(200);
      loadImage(URL.createObjectURL(file), rec.name, null, file.type === 'image/svg+xml', false, true);
      alert('This browser would not let me save the picture, so it will be gone when you leave the page.');
    }
  }
  refreshCatSelect(cat);
  if (last) go('p/' + enc('u:' + last.id));
}
async function removeUpload(rec) {
  if (!confirm(`Delete "${rec.name}" and everything you colored on it?`)) return;
  try { await db.del('uploads', rec.id); await db.del('progress', 'u:' + rec.id); } catch (e) { /* ignore */ }
  mine = mine.filter((r) => r !== rec);
  progressKeys.delete('u:' + rec.id);
  if (blobUrls.has(rec.id)) { URL.revokeObjectURL(blobUrls.get(rec.id)); blobUrls.delete(rec.id); }
  refreshCatSelect($('uploadCat').value === NEW_CAT ? DEFAULT_CAT : $('uploadCat').value);
  route();
}
$('fileInput').addEventListener('change', (e) => { addUploads(e.target.files); e.target.value = ''; });
for (const area of [$('stage'), $('home')]) {
  area.addEventListener('dragover', (e) => e.preventDefault());
  area.addEventListener('drop', (e) => { e.preventDefault(); addUploads(e.dataTransfer.files); });
}

/* ---------- pictures: built-in catalog + yours ---------- */

let catalog = [];                             // built-in categories from pages/manifest.json
let catalogError = false;
let progressKeys = new Set();                 // pages that have saved coloring
const blobUrls = new Map();                   // upload id -> object URL used for thumbnails

async function loadCatalog() {
  try {
    const res = await fetch('pages/manifest.json');
    if (!res.ok) throw new Error(res.status);
    catalog = (await res.json()).categories;
  } catch (e) { catalogError = true; }
}
function blobUrl(rec) {
  if (!blobUrls.has(rec.id)) blobUrls.set(rec.id, URL.createObjectURL(rec.blob));
  return blobUrls.get(rec.id);
}
// Your categories first, then the built-in ones; every picture is {key, title, src} (uploads also carry rec).
function launcherCategories() {
  const mineCats = [...new Set(mine.map((r) => r.cat))].map((cat) => ({
    id: 'my:' + cat, name: cat, star: true,
    items: mine.filter((r) => r.cat === cat).map((r) => ({ key: 'u:' + r.id, title: r.name, src: blobUrl(r), rec: r }))
  }));
  const builtIn = catalog.map((c) => ({
    id: c.id, name: c.name, icon: c.icon,
    items: c.pages.map((p) => ({ key: p.file, title: p.title, src: 'pages/' + p.file }))
  }));
  return [...mineCats, ...builtIn];
}
const categoryOf = (key) => (key ? launcherCategories().find((c) => c.items.some((it) => it.key === key)) : null);
const findItem = (key) => { const c = categoryOf(key); return c && c.items.find((it) => it.key === key); };

function openItem(it) {
  if (it.rec) {
    setThreshold(it.rec.cutoff);
    loadImage(URL.createObjectURL(it.rec.blob), it.title, it.key, it.rec.blob.type === 'image/svg+xml', true, true);
  } else {
    setThreshold(235);
    loadImage(it.src, it.title, it.key, /\.svg$/i.test(it.key), true, false);
  }
}
// Previous / next picture in the same category, wrapping around.
function flip(step) {
  const cat = categoryOf(state.key);
  if (!cat) return;
  const i = cat.items.findIndex((it) => it.key === state.key);
  go('p/' + enc(cat.items[(i + step + cat.items.length) % cat.items.length].key), true);
}

/* ---------- launcher (home screen) and navigation ---------- */

let navId = 0;                                // lets a slow render notice the person has already moved on

// Pages worth suggesting by time of year: month (0-11) -> category ids.
const SEASONS = {
  0: ['christmas', 'easy'], 1: ['other-holidays', 'cute-animals'], 2: ['other-holidays', 'easter'], 3: ['easter', 'nature'],
  4: ['nature', 'cute-animals'], 5: ['ocean', 'food'], 6: ['ocean', 'vehicles'], 7: ['vehicles', 'space'],
  8: ['halloween', 'thanksgiving'], 9: ['halloween'], 10: ['thanksgiving'], 11: ['christmas']
};
const recentKeys = () => lsJson('cb:recent');
const rememberRecent = (key) => lsSet('cb:recent', JSON.stringify([key, ...recentKeys().filter((k) => k !== key)].slice(0, 12)));
const hueOf = (id) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

// A page's picture with the person's coloring behind the ink, so "colored" pages look colored on the launcher.
async function composePreview(key, src) {
  const blob = await db.get('progress', key);
  if (!blob) return null;
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const w = 360, h = Math.round(w * (img.naturalHeight || 800) / (img.naturalWidth || 1000));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
  x.drawImage(await createImageBitmap(blob), 0, 0, w, h);
  x.globalCompositeOperation = 'multiply';    // white keeps the color, black ink stays black
  x.drawImage(img, 0, 0, w, h);
  return new Promise((ok) => c.toBlob((b) => ok(b && URL.createObjectURL(b))));
}
const previewUrls = [];
function withProgressPreview(img, item, id) {
  if (!progressKeys.has(item.key)) return;
  composePreview(item.key, item.src).then((u) => {
    if (!u) return;
    if (id !== navId) return URL.revokeObjectURL(u);      // the screen changed while this was rendering
    previewUrls.push(u); img.src = u;
  }).catch(() => {});
}

// A picture card: thumbnail (with your coloring if you have colored it), title, and a badge.
function cardFor(it, id, mini) {
  const wrap = el('div', 'cardwrap' + (mini ? ' mini' : ''));
  const b = el('button', 'card');
  const img = el('img'); img.src = it.src; img.alt = ''; img.loading = 'lazy'; withProgressPreview(img, it, id);
  b.append(img, el('span', '', it.title));
  if (progressKeys.has(it.key)) b.appendChild(el('i', 'badge', '🎨'));
  b.addEventListener('click', () => go('p/' + enc(it.key)));
  wrap.appendChild(b);
  if (it.rec) {
    const del = el('button', 'del', '×'); del.title = 'Delete this picture and its coloring';
    del.addEventListener('click', () => removeUpload(it.rec));
    wrap.appendChild(del);
  }
  return wrap;
}
function strip(title, items, id) {
  const sec = el('section', 'band');
  sec.appendChild(el('h3', '', title));
  const row = el('div', 'strip');
  items.forEach((it) => row.appendChild(cardFor(it, id, true)));
  sec.appendChild(row);
  return sec;
}

function showView(title) {
  document.body.classList.add('home');
  document.body.classList.remove('menu');
  $('pageTitle').textContent = title;
  previewUrls.splice(0).forEach((u) => URL.revokeObjectURL(u));
  $('home').scrollTop = 0;
}

async function showHome() {
  const id = ++navId;
  showView('Coloring Book');
  await flushSave(true);                      // so "colored" badges and previews are current
  if (id !== navId) return;
  const box = $('home'); box.innerHTML = '';
  document.title = 'Coloring Book';

  const cats = launcherCategories();
  const all = cats.flatMap((c) => c.items.map((it) => ({ ...it, cat: c.name })));
  const byKey = new Map(all.map((it) => [it.key, it]));

  const hero = el('div', 'hero');
  const logo = el('img'); logo.src = 'icon.svg'; logo.alt = ''; logo.width = logo.height = 64;
  const words = el('div'); words.append(el('h2', '', 'Coloring Book'), el('p', '', `${all.length} pictures to color, plus your own`));
  hero.append(logo, words); box.appendChild(hero);
  if (catalogError) box.appendChild(el('p', 'hint', 'The built-in pictures could not be loaded. If you opened this file directly, serve the folder over http (for example python3 -m http.server) or use the website. Your own pictures still work.'));

  const bar = el('div', 'homebar');
  const search = el('input'); search.type = 'search'; search.placeholder = 'Search pictures…'; search.setAttribute('aria-label', 'Search pictures');
  const surprise = el('button', 'surprise', '🎲 Surprise me');
  surprise.addEventListener('click', () => {
    const fresh = all.filter((it) => !progressKeys.has(it.key));
    const pool = fresh.length ? fresh : all;
    if (pool.length) go('p/' + enc(pool[Math.floor(Math.random() * pool.length)].key));
  });
  bar.append(search, surprise); box.appendChild(bar);

  const browse = el('div'), results = el('div', 'cards'); results.hidden = true;
  box.append(browse, results);
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    results.hidden = !q; browse.hidden = !!q;
    if (!q) return;
    results.innerHTML = '';
    const hits = all.filter((it) => it.title.toLowerCase().includes(q) || it.cat.toLowerCase().includes(q));
    if (!hits.length) results.appendChild(el('p', 'hint', `Nothing found for "${search.value.trim()}".`));
    hits.slice(0, 60).forEach((it) => results.appendChild(cardFor(it, id)));
  });

  const last = lsGet('cb:last', null);
  const lastItem = byKey.get(last);
  if (lastItem) {
    const b = el('button', 'continue');
    const img = el('img'); img.src = lastItem.src; img.alt = ''; withProgressPreview(img, lastItem, id);
    const t = el('div'); t.append(el('small', '', 'Continue coloring'), el('strong', '', lastItem.title), el('small', '', lastItem.cat));
    b.append(img, t); b.addEventListener('click', () => go('p/' + enc(lastItem.key)));
    browse.appendChild(b);
  }

  const recent = recentKeys().filter((k) => k !== last && progressKeys.has(k)).map((k) => byKey.get(k)).filter(Boolean).slice(0, 10);
  if (recent.length) browse.appendChild(strip('🖍️ Pick up where you left off', recent, id));

  const seasonIds = SEASONS[new Date().getMonth()] || [];
  const seasonCats = seasonIds.map((cid) => cats.find((c) => c.id === cid)).filter(Boolean);
  const seasonal = seasonCats.flatMap((c) => c.items.map((it) => ({ ...it, cat: c.name }))).filter((it) => !progressKeys.has(it.key)).slice(0, 10);
  if (seasonal.length) browse.appendChild(strip(`${seasonCats[0].icon || '✨'} Right now: ${seasonCats.map((c) => c.name).join(' & ')}`, seasonal, id));

  const band = el('section', 'band'); band.appendChild(el('h3', '', 'Pick a category'));
  const grid = el('div', 'tiles');
  const add = el('button', 'tile add');
  add.append(el('span', 'plus', '+'), el('b', '', 'Add your own picture'), el('small', '', 'Upload a photo or drawing'));
  add.addEventListener('click', () => $('fileInput').click());
  grid.appendChild(add);
  for (const cat of cats) {
    const b = el('button', 'tile'); b.style.setProperty('--h', hueOf(cat.id));
    const collage = el('div', 'collage');
    for (const it of cat.items.slice(0, 4)) { const im = el('img'); im.src = it.src; im.alt = ''; im.loading = 'lazy'; collage.appendChild(im); }
    const head = el('div', 'tilehead'); head.append(el('span', 'ico', cat.star ? '★' : cat.icon || '🎨'), el('b', '', cat.name));
    b.append(collage, head, el('small', '', `${cat.items.length} ${cat.items.length === 1 ? 'picture' : 'pictures'}`));
    b.addEventListener('click', () => go('c/' + enc(cat.id)));
    grid.appendChild(b);
  }
  band.appendChild(grid); browse.appendChild(band);
}

async function showCategory(catId) {
  const cat = launcherCategories().find((c) => c.id === catId);
  if (!cat) return showHome();
  const id = ++navId;
  showView(cat.name);
  await flushSave(true);
  if (id !== navId) return;
  const box = $('home'); box.innerHTML = '';
  const bar = el('div', 'catbar');
  const back = el('button', '', '← All categories'); back.addEventListener('click', () => go('home'));
  bar.append(back, el('h2', '', `${cat.star ? '★' : cat.icon || '🎨'} ${cat.name}`));
  box.appendChild(bar);
  const grid = el('div', 'cards');
  cat.items.forEach((it) => grid.appendChild(cardFor(it, id)));
  box.appendChild(grid);
}

// The address bar (and so the browser's and Android's Back button) follows the screens:
// #home, #c/<category>, #p/<page>.
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith('p/')) {
    const it = findItem(h.slice(2));
    if (it) { navId++; document.body.classList.remove('home'); openItem(it); return; }
  }
  if (h.startsWith('c/')) return showCategory(h.slice(2));
  return showHome();
}
function go(h, replace) {
  if (location.hash.slice(1) !== h) history[replace ? 'replaceState' : 'pushState'](null, '', '#' + h);
  route();
}
window.addEventListener('popstate', route);

(async () => {
  try { mine = (await db.all('uploads')).sort((a, b) => a.created - b.created); } catch (e) { mine = []; }
  try { progressKeys = new Set(await db.keys('progress')); } catch (e) { /* ignore */ }
  refreshCatSelect(DEFAULT_CAT);
  await loadCatalog();
  route();                                    // reloading while coloring reopens that page; otherwise the launcher
})();

// Offline use and "Add to Home screen" for the website (the Android app already bundles everything).
if ('serviceWorker' in navigator && !window.AndroidBridge) navigator.serviceWorker.register('sw.js').catch(() => {});
