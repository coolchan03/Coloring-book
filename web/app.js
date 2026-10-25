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
    undo: [], redo: []
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
    const k = natural.isSvg ? MAX_SIDE / Math.max(natural.w, natural.h)
                            : Math.min(1, MAX_SIDE / Math.max(natural.w, natural.h));
    state.w = Math.max(1, Math.round(natural.w * k));
    state.h = Math.max(1, Math.round(natural.h * k));
    state.source = source; state.title = title; state.key = key;
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

  let saveTimer = 0;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (!state.key) return;                   // uploads are not stored
      try { localStorage.setItem('cb:' + state.key, colorCv.toDataURL('image/png')); } catch (e) { /* quota/private mode */ }
    }, 600);
  }
  function restoreProgress(key) {
    let data = null;
    try { data = localStorage.getItem('cb:' + key); } catch (e) { /* ignore */ }
    if (!data) return;
    const img = new Image();
    img.onload = () => { if (state.key === key) cctx.drawImage(img, 0, 0, state.w, state.h); };
    img.src = data;
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
    out.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (state.title || 'coloring').replace(/[^\w-]+/g, '-').toLowerCase() + '.png';
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  });
  $('menuBtn').addEventListener('click', () => document.body.classList.toggle('menu'));

  $('threshold').addEventListener('input', (e) => {
    $('thresholdVal').textContent = e.target.value;
    if (state.source) renderLines();
  });

  function openFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    $('threshold').value = 200; $('thresholdVal').textContent = '200';   // gentler default for photos/scans
    loadImage(URL.createObjectURL(file), file.name.replace(/\.[^.]+$/, ''), null, file.type === 'image/svg+xml', false, true);
    document.body.classList.remove('menu');
    document.querySelectorAll('.thumb.active').forEach((t) => t.classList.remove('active'));
  }
  $('fileInput').addEventListener('change', (e) => { openFile(e.target.files[0]); e.target.value = ''; });
  $('stage').addEventListener('dragover', (e) => e.preventDefault());
  $('stage').addEventListener('drop', (e) => { e.preventDefault(); openFile(e.dataTransfer.files[0]); });

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
        b.className = 'thumb'; b.title = pg.title;
        b.innerHTML = '<img loading="lazy" alt=""><span></span>';
        b.firstChild.src = 'pages/' + pg.file;
        b.lastChild.textContent = pg.title;
        const open = () => {
          document.querySelectorAll('.thumb.active').forEach((t) => t.classList.remove('active'));
          b.classList.add('active'); section.open = true;
          $('threshold').value = 235; $('thresholdVal').textContent = '235';
          loadImage('pages/' + pg.file, pg.title, pg.file, /\.svg$/i.test(pg.file), true, false);
          document.body.classList.remove('menu');
        };
        b.addEventListener('click', open);
        first = first || open;
        grid.appendChild(b);
      }
    }
    return first;
  }

  buildLibrary().then((openFirst) => { if (openFirst) openFirst(); });
})();
