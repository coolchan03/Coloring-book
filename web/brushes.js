// Brush types and their textures. Everything here is pure drawing code: it knows nothing about pages or the UI.

export const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));


// width: stamp diameter relative to the size slider; flow: opacity of one stamp; spacing: gap between stamps
// as a fraction of the radius; alpha: opacity of the whole stroke; textured: the bucket fill gets the same grain.
export const BRUSHES = {
  pen:     { label: 'Pen',     icon: '✒️', kind: 'line', alpha: 1 },
  marker:  { label: 'Marker',  icon: '🖊️', kind: 'line', alpha: 0.78, widen: 1.5 },
  pencil:  { label: 'Pencil',  icon: '✏️', kind: 'grain', grain: 'pencil', width: 0.7, flow: 0.4, spacing: 0.3, textured: true },
  crayon:  { label: 'Crayon',  icon: '🖍️', kind: 'grain', grain: 'crayon', width: 1, flow: 0.6, spacing: 0.28, jitter: true, textured: true },
  paint:   { label: 'Paint',   icon: '🖌️', kind: 'soft', width: 1.5, flow: 0.3, spacing: 0.18 },
  spray:   { label: 'Spray',   icon: '💨', kind: 'spray', width: 2, spacing: 0.3 },
  sparkle: { label: 'Sparkle', icon: '✨', kind: 'sparkle', width: 2, spacing: 0.7 }
};

// Paper grain: a fixed, repeating pattern in canvas coordinates, so the texture stays put as strokes overlap.
const TILE = 256;
const grainCache = new Map(), patternCache = new Map(), tipCache = new Map();
const seeded = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
function blur3(src) {                         // 3x3 box blur that wraps, so the tile repeats without seams
  const out = new Float32Array(src.length);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    let sum = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += src[((y + dy + TILE) % TILE) * TILE + ((x + dx + TILE) % TILE)];
    out[y * TILE + x] = sum / 9;
  }
  return out;
}
function grainValues(kind) {
  if (!grainCache.has(kind)) {
    const rand = seeded(kind === 'pencil' ? 11 : 29);
    let v = blur3(Float32Array.from({ length: TILE * TILE }, rand));
    if (kind === 'crayon') v = blur3(blur3(v));           // bigger, waxier clumps
    let lo = 1, hi = 0;
    for (const x of v) { if (x < lo) lo = x; if (x > hi) hi = x; }
    const gain = kind === 'pencil' ? 2.4 : 1.9;
    grainCache.set(kind, v.map((x) => Math.min(1, Math.max(0, ((x - lo) / (hi - lo) - 0.25) * gain))));
  }
  return grainCache.get(kind);
}
const patternCtx = document.createElement('canvas').getContext('2d');
export function grainPattern(kind, color) {
  const key = kind + color;
  if (!patternCache.has(key)) {
    const cv = document.createElement('canvas'); cv.width = cv.height = TILE;
    const x = cv.getContext('2d'), img = x.createImageData(TILE, TILE);
    const [r, g, b] = hexToRgb(color), cov = grainValues(kind);
    for (let i = 0, p = 0; i < cov.length; i++, p += 4) { img.data[p] = r; img.data[p + 1] = g; img.data[p + 2] = b; img.data[p + 3] = cov[i] * 255; }
    x.putImageData(img, 0, 0);
    patternCache.set(key, patternCtx.createPattern(cv, 'repeat'));
    if (patternCache.size > 48) patternCache.delete(patternCache.keys().next().value);
  }
  return patternCache.get(key);
}
function softTip(color, r) {                  // a round dab that fades to nothing at the edge
  const size = Math.max(2, Math.ceil(r / 4) * 8), key = color + size;
  if (!tipCache.has(key)) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const x = cv.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    const [cr, cg, cb] = hexToRgb(color);
    g.addColorStop(0, `rgba(${cr},${cg},${cb},1)`); g.addColorStop(0.55, `rgba(${cr},${cg},${cb},0.55)`); g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    tipCache.set(key, cv);
    if (tipCache.size > 64) tipCache.delete(tipCache.keys().next().value);
  }
  return tipCache.get(key);
}
function shade(hex, f) {                      // f > 0 lightens, f < 0 darkens
  return '#' + hexToRgb(hex).map((c) => Math.round(f > 0 ? c + (255 - c) * f : c * (1 + f)).toString(16).padStart(2, '0')).join('');
}

// One dab of a stamped brush at (x, y) on ctx; w is the slider size in canvas pixels, press is 0..1.
export function stamp(ctx, b, x, y, w, press, color) {
  const r = Math.max(1, w * b.width / 2);
  ctx.globalAlpha = 1;
  if (b.kind === 'grain') {
    const jr = b.jitter ? r * (0.85 + Math.random() * 0.3) : r;
    const jx = b.jitter ? (Math.random() - 0.5) * r * 0.3 : 0, jy = b.jitter ? (Math.random() - 0.5) * r * 0.3 : 0;
    ctx.globalAlpha = Math.min(1, b.flow * press);
    ctx.fillStyle = grainPattern(b.grain, color);
    ctx.beginPath(); ctx.arc(x + jx, y + jy, jr, 0, Math.PI * 2); ctx.fill();
  } else if (b.kind === 'soft') {
    ctx.globalAlpha = Math.min(1, b.flow * press);
    ctx.drawImage(softTip(color, r), x - r, y - r, r * 2, r * 2);
  } else if (b.kind === 'spray') {
    ctx.fillStyle = color;
    const dots = Math.ceil(r * r * 0.32), s = Math.max(1.5, r * 0.07);
    for (let i = 0; i < dots; i++) {
      const a = Math.random() * Math.PI * 2, d = r * Math.sqrt(Math.random());
      ctx.globalAlpha = 0.6 + Math.random() * 0.4;
      ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, s, s);
    }
  } else if (b.kind === 'sparkle') {
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2, d = r * Math.sqrt(Math.random()), size = r * (0.15 + Math.random() * 0.45);
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
      ctx.globalAlpha = 0.65 + Math.random() * 0.35;
      ctx.fillStyle = shade(color, (Math.random() - 0.5) * 0.7);
      ctx.beginPath();                       // a four-pointed star
      for (let k = 0; k < 8; k++) {
        const ang = k * Math.PI / 4, rad = k % 2 === 0 ? size : size * 0.28;
        ctx[k ? 'lineTo' : 'moveTo'](px + Math.cos(ang) * rad, py + Math.sin(ang) * rad);
      }
      ctx.closePath(); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// Walks a quadratic curve and calls fn(x, y) about every `step` pixels.
export function sampleCurve(p0, c, p1, step, fn) {
  const len = Math.hypot(c.x - p0.x, c.y - p0.y) + Math.hypot(p1.x - c.x, p1.y - c.y);
  const n = Math.max(1, Math.ceil(len / step));
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    fn(u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, u * u * p0.y + 2 * u * t * c.y + t * t * p1.y);
  }
}
