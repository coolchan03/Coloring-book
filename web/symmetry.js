// Symmetric drawing: every mark is repeated about the middle of the page, so mandalas draw themselves.
// A mode is a list of transforms; each is a rotation (in turns) and an optional left-right flip.

const rotations = (n, flip) => Array.from({ length: n }, (_, i) => i / n).flatMap((r) => (flip ? [[r, false], [r, true]] : [[r, false]]));

export const SYMMETRY = {
  off:    { label: 'Off',          copies: rotations(1, false) },
  mirror: { label: 'Mirror',       copies: rotations(1, true) },
  quad:   { label: 'Four-way',     copies: rotations(2, true) },
  rot6:   { label: '6-fold',     copies: rotations(6, false) },
  rot8:   { label: '8-fold',     copies: rotations(8, false) },
  mandala:{ label: 'Mandala', copies: rotations(8, true) }
};
export const SYMMETRY_ORDER = Object.keys(SYMMETRY);

// Runs draw() once per copy with the context transformed about (cx, cy).
export function withSymmetry(ctx, mode, cx, cy, draw) {
  const m = SYMMETRY[mode] || SYMMETRY.off;
  if (m.copies.length === 1 && !m.copies[0][1]) return draw();
  for (const [turn, flip] of m.copies) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(turn * Math.PI * 2);
    if (flip) ctx.scale(-1, 1);
    ctx.translate(-cx, -cy);
    draw();
    ctx.restore();
  }
}

// SVG lines that show where the mirrors are (drawn over the page; viewBox is the page size).
export function guideMarkup(mode, w, h) {
  const m = SYMMETRY[mode];
  if (!m || mode === 'off') return '';
  const cx = w / 2, cy = h / 2, R = Math.hypot(w, h);
  const line = (a) => `<line x1="${cx - Math.cos(a) * R}" y1="${cy - Math.sin(a) * R}" x2="${cx + Math.cos(a) * R}" y2="${cy + Math.sin(a) * R}"/>`;
  const axes = mode === 'mirror' ? [Math.PI / 2] : mode === 'quad' ? [0, Math.PI / 2]
    : Array.from({ length: mode === 'rot6' ? 3 : 4 }, (_, i) => (i * Math.PI) / (mode === 'rot6' ? 3 : 4));
  return axes.map(line).join('');
}
