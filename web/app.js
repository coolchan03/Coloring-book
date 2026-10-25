(() => {
  'use strict';

  const MAX_SIDE = 1400;       // longest edge of the working canvas, in pixels
  const UNDO_LIMIT = 15;
  const BARRIER = 128;         // line alpha above this blocks the bucket fill
  const COLORS = [
    '#000000', '#555555', '#9a9a9a', '#ffffff', '#7b3f00', '#c68642', '#f1c27d', '#ffdbac',
    '#e63946', '#ff6b6b', '#f4a261', '#ff9f1c', '#ffd60a', '#e9ed6b', '#80b918', '#2a9d8f',
    '#1b7f3b', '#00b4d8', '#4cc9f0', '#3a6ea5', '#1d3557', '#7b2cbf', '#c77dff', '#ff7eb6'
  ];

  const $ = (id) => document.getElementById(id);
  const board = $('board'), colorCv = $('color'), linesCv = $('lines');
  const cctx = colorCv.getContext('2d', { willReadFrequently: true });
  const lctx = linesCv.getContext('2d');

  const state = {
    tool: 'brush', color: '#e63946', size: 14,
    w: 0, h: 0, alpha: null,           // alpha: line-art opacity per pixel
    source: null, key: null, title: '',// source: {img,isSvg} kept so the cut-off can be re-applied
    undo: [], redo: [], dirty: false
  };

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
    flushSave();                                // keep the page we are leaving
    const k = natural.isSvg ? MAX_SIDE / Math.max(natural.w, natural.h)
                            : Math.min(1, MAX_SIDE / Math.max(natural.w, natural.h));
    state.w = Math.max(1, Math.round(natural.w * k));
    state.h = Math.max(1, Math.round(natural.h * k));
    state.source = source; state.title = title; state.key = key; state.dirty = false;
    try { if (key) localStorage.setItem('cb:last', key); } catch (e) { /* ignore */ }
    markActive(key);
    state.undo = []; state.redo = [];
    for (const c of [colorCv, linesCv]) { c.width = state.w; c.height = state.h; }
    cctx.clearRect(0, 0, state.w, state.h);
    renderLines();
    layout();
    $('pageTitle').textContent = title;
    updateButtons();
    if (restore && key) restoreProgress(key);
  }

  function loadImage(url, title, key, isSvg, restore, revoke) {
    const img = new Image();
    img.onload = () => {
      // SVGs without a pixel size report 0; fall back to the viewBox-ish default.
      const natural = { w: img.naturalWidth || 1000, h: img.naturalHeight || 800, isSvg };
      setPage(img, natural, title, key, restore);
      if (revoke) URL.revokeObjectURL(url);
    };
    img.onerror = () => alert('Could not load that image.');
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
  }

  /* ---------- storage (IndexedDB): uploads and progress ---------- */

  const db = (() => {
    let opened = null;
    const open = () => opened || (opened = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('IndexedDB unavailable'));
      const r = indexedDB.open('coloring-book', 1);
      r.onupgradeneeded = () => { r.result.createObjectStore('uploads', { keyPath: 'id' }); r.result.createObjectStore('progress'); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
    const run = (store, mode, fn) => open().then((d) => new Promise((res, rej) => {
      const tx = d.transaction(store, mode), req = fn(tx.objectStore(store));
      tx.oncomplete = () => res(req && req.result);
      tx.onerror = tx.onabort = () => rej(tx.error);
    }));
    return {
      get: (store, key) => run(store, 'readonly', (o) => o.get(key)),
      all: (store) => run(store, 'readonly', (o) => o.getAll()),
      put: (store, val, key) => run(store, 'readwrite', (o) => (key === undefined ? o.put(val) : o.put(val, key))),
      del: (store, key) => run(store, 'readwrite', (o) => o.delete(key))
    };
  })();

  let saveTimer = 0;
  function scheduleSave() {
    state.dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 600);
  }
  // Only saves after an edit, so a page that is still restoring can never overwrite saved coloring with a blank.
  function flushSave() {
    clearTimeout(saveTimer);
    if (!state.key || !state.dirty) return;
    const key = state.key;
    state.dirty = false;
    colorCv.toBlob((blob) => { if (blob) db.put('progress', blob, key).catch(() => {}); });   // toBlob copies the bitmap immediately
  }
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });

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

  /* ---------- tools ---------- */

  function toCanvas(e) {
    const r = colorCv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * state.w / r.width, y: (e.clientY - r.top) * state.h / r.height,
             k: state.w / r.width };
  }

  let stroke = null;
  colorCv.addEventListener('pointerdown', (e) => {
    if (!state.w || e.button > 0) return;
    const p = toCanvas(e);
    if (state.tool === 'fill') { bucketFill(Math.floor(p.x), Math.floor(p.y)); return; }
    if (state.tool === 'pick') { pickColor(Math.floor(p.x), Math.floor(p.y)); return; }
    colorCv.setPointerCapture(e.pointerId);
    snapshot();
    stroke = { last: p, mid: p };
    cctx.globalCompositeOperation = state.tool === 'eraser' ? 'destination-out' : 'source-over';
    cctx.fillStyle = cctx.strokeStyle = state.color;
    cctx.lineCap = cctx.lineJoin = 'round';
    const w = brushWidth(e, p);
    cctx.beginPath(); cctx.arc(p.x, p.y, w / 2, 0, Math.PI * 2); cctx.fill();   // a tap leaves a dot
  });
  colorCv.addEventListener('pointermove', (e) => {
    if (!stroke) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (events.length ? events : [e])) {
      const p = toCanvas(ev);
      const mid = { x: (stroke.last.x + p.x) / 2, y: (stroke.last.y + p.y) / 2 };
      cctx.lineWidth = brushWidth(ev, p);
      cctx.beginPath();
      cctx.moveTo(stroke.mid.x, stroke.mid.y);
      cctx.quadraticCurveTo(stroke.last.x, stroke.last.y, mid.x, mid.y);   // midpoint smoothing
      cctx.stroke();
      stroke.last = p; stroke.mid = mid;
    }
  });
  const endStroke = () => {
    if (!stroke) return;
    stroke = null; cctx.globalCompositeOperation = 'source-over'; scheduleSave();
  };
  colorCv.addEventListener('pointerup', endStroke);
  colorCv.addEventListener('pointercancel', endStroke);

  function brushWidth(e, p) {
    const pressure = e.pointerType === 'pen' && e.pressure > 0 ? 0.3 + 0.7 * e.pressure : 1;
    return Math.max(1, state.size * p.k * pressure);
  }

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
      let i = stack.pop();
      if (region[i] || alpha[i] > BARRIER) continue;
      let x = i % w; const row = i - x;
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
    const img = cctx.getImageData(0, 0, w, h), d = img.data;
    const [r, g, b] = hexToRgb(state.color);
    for (let i = 0, p = 0; i < region.length; i++, p += 4) {
      if (region[i]) { d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = 255; }
    }
    cctx.putImageData(img, 0, 0);
    scheduleSave();
  }

  function pickColor(x, y) {
    if (x < 0 || y < 0 || x >= state.w || y >= state.h) return;
    const d = cctx.getImageData(x, y, 1, 1).data;
    if (d[3] > 0) setColor('#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join(''));
    setTool('brush');
  }

  /* ---------- UI wiring ---------- */

  const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

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

  document.querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
  $('size').addEventListener('input', (e) => { state.size = +e.target.value; });
  $('customColor').addEventListener('input', (e) => setColor(e.target.value));
  COLORS.forEach((c) => {
    const s = document.createElement('button');
    s.className = 'swatch'; s.dataset.c = c; s.style.background = c; s.title = c;
    s.addEventListener('click', () => setColor(c));
    $('palette').appendChild(s);
  });
  setColor(state.color);

  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  $('clearBtn').addEventListener('click', () => {
    if (!state.w || !confirm('Clear all your coloring on this page?')) return;
    snapshot(); cctx.clearRect(0, 0, state.w, state.h); scheduleSave();
  });
  $('saveBtn').addEventListener('click', () => {
    if (!state.w) return;
    const out = document.createElement('canvas');
    out.width = state.w; out.height = state.h;
    const o = out.getContext('2d');
    o.fillStyle = '#fff'; o.fillRect(0, 0, out.width, out.height);
    o.drawImage(colorCv, 0, 0); o.drawImage(linesCv, 0, 0);
    const name = (state.title || 'coloring').replace(/[^\w-]+/g, '-').toLowerCase() + '.png';
    out.toBlob((blob) => {
      if (window.AndroidBridge) {                // inside the Android app: a WebView cannot download blobs itself
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
  });
  $('menuBtn').addEventListener('click', () => document.body.classList.toggle('menu'));

  $('threshold').addEventListener('input', (e) => {
    $('thresholdVal').textContent = e.target.value;
    if (state.source) renderLines();
    if (state.key && state.key.startsWith('u:')) {
      const id = state.key.slice(2), cutoff = +e.target.value;
      clearTimeout(cutTimer);
      cutTimer = setTimeout(async () => {
        const rec = mine.find((r) => r.id === id);
        if (rec) { rec.cutoff = cutoff; try { await db.put('uploads', rec); } catch (err) { /* ignore */ } }
      }, 400);
    }
  });
  let cutTimer = 0;

  /* ---------- my pictures ---------- */

  const DEFAULT_CAT = 'My Pictures';
  const NEW_CAT = '__new__';
  let mine = [];                                // uploaded pictures: {id, name, cat, cutoff, blob, created}
  let thumbUrls = [];
  const openers = new Map();                    // page key -> function that opens it

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

  function renderMine() {
    thumbUrls.forEach((u) => URL.revokeObjectURL(u)); thumbUrls = [];
    const box = $('mine');
    box.innerHTML = '';
    const cats = [...new Set(mine.map((r) => r.cat))];
    for (const cat of cats) {
      const items = mine.filter((r) => r.cat === cat);
      const section = document.createElement('details'); section.open = true;
      const h = document.createElement('summary'); h.textContent = `★ ${cat} (${items.length})`; section.appendChild(h);
      const grid = document.createElement('div'); grid.className = 'thumbs'; section.appendChild(grid); box.appendChild(section);
      for (const rec of items) {
        const wrap = document.createElement('div'); wrap.className = 'thumbwrap';
        const b = document.createElement('button');
        b.className = 'thumb'; b.title = rec.name; b.dataset.key = 'u:' + rec.id;
        b.innerHTML = '<img alt=""><span></span>';
        const url = URL.createObjectURL(rec.blob); thumbUrls.push(url);
        b.firstChild.src = url; b.lastChild.textContent = rec.name;
        const open = () => {
          $('threshold').value = rec.cutoff; $('thresholdVal').textContent = rec.cutoff;
          loadImage(URL.createObjectURL(rec.blob), rec.name, 'u:' + rec.id, rec.blob.type === 'image/svg+xml', true, true);
          document.body.classList.remove('menu');
        };
        b.addEventListener('click', open);
        openers.set(b.dataset.key, open);
        const del = document.createElement('button');
        del.className = 'del'; del.title = 'Delete this picture and its coloring'; del.textContent = '×';
        del.addEventListener('click', () => removeUpload(rec));
        wrap.append(b, del); grid.appendChild(wrap);
      }
    }
    for (const k of [...openers.keys()]) if (k.startsWith('u:') && !mine.some((r) => 'u:' + r.id === k)) openers.delete(k);
    markActive(state.key);
  }

  async function removeUpload(rec) {
    if (!confirm(`Delete "${rec.name}" and everything you colored on it?`)) return;
    try { await db.del('uploads', rec.id); await db.del('progress', 'u:' + rec.id); } catch (e) { /* ignore */ }
    mine = mine.filter((r) => r !== rec);
    if (state.key === 'u:' + rec.id) { state.key = null; state.dirty = false; }
    refreshCatSelect($('uploadCat').value === NEW_CAT ? DEFAULT_CAT : $('uploadCat').value);
    renderMine();
  }

  function markActive(key) {
    document.querySelectorAll('.thumb').forEach((t) => {
      const on = !!key && t.dataset.key === key;
      t.classList.toggle('active', on);
      if (on) { const d = t.closest('details'); if (d) d.open = true; }
    });
  }

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
        $('threshold').value = 200; $('thresholdVal').textContent = '200';
        loadImage(URL.createObjectURL(file), rec.name, null, file.type === 'image/svg+xml', false, true);
        alert('This browser would not let me save the picture, so it will be gone when you leave the page.');
      }
    }
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    refreshCatSelect(cat);
    renderMine();
    if (last) openers.get('u:' + last.id)();
  }
  $('fileInput').addEventListener('change', (e) => { addUploads(e.target.files); e.target.value = ''; });
  $('stage').addEventListener('dragover', (e) => e.preventDefault());
  $('stage').addEventListener('drop', (e) => { e.preventDefault(); addUploads(e.dataTransfer.files); });

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); }
    else if (!e.ctrlKey && !e.metaKey) {
      const t = { b: 'brush', f: 'fill', e: 'eraser', i: 'pick' }[k];
      if (t) setTool(t);
    }
  });

  /* ---------- library ---------- */

  async function buildLibrary() {
    const lib = $('library');
    let manifest;
    try {
      manifest = await (await fetch('pages/manifest.json')).json();
    } catch (e) {
      lib.innerHTML = '<p class="hint">Could not load the page library. If you opened this file directly, serve the folder over http (for example <code>python3 -m http.server</code>) or use the GitHub Pages site. Uploading your own image still works.</p>';
      return null;
    }
    let first = null;
    for (const cat of manifest.categories) {
      const section = document.createElement('details'); section.open = cat.pages.length <= 12;
      const h = document.createElement('summary'); h.textContent = `${cat.name} (${cat.pages.length})`; section.appendChild(h);
      const grid = document.createElement('div'); grid.className = 'thumbs'; section.appendChild(grid); lib.appendChild(section);
      for (const pg of cat.pages) {
        const b = document.createElement('button');
        b.className = 'thumb'; b.title = pg.title; b.dataset.key = pg.file;
        b.innerHTML = '<img loading="lazy" alt=""><span></span>';
        b.firstChild.src = 'pages/' + pg.file;
        b.lastChild.textContent = pg.title;
        const open = () => {
          $('threshold').value = 235; $('thresholdVal').textContent = '235';
          loadImage('pages/' + pg.file, pg.title, pg.file, /\.svg$/i.test(pg.file), true, false);
          document.body.classList.remove('menu');
        };
        b.addEventListener('click', open);
        openers.set(pg.file, open);
        first = first || open;
        grid.appendChild(b);
      }
    }
    return first;
  }

  (async () => {
    try { mine = (await db.all('uploads')).sort((a, b) => a.created - b.created); } catch (e) { mine = []; }
    refreshCatSelect(DEFAULT_CAT);
    renderMine();
    const openFirst = await buildLibrary();
    let last = null;
    try { last = localStorage.getItem('cb:last'); } catch (e) { /* ignore */ }
    const open = openers.get(last) || openFirst;
    if (open) open();
  })();
})();
