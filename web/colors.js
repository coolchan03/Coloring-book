// Palettes and color math. Pure functions, no DOM.

export const PALETTES = {
  classic: { label: 'Classic', colors: [
    '#000000', '#555555', '#9a9a9a', '#ffffff', '#7b3f00', '#c68642', '#f1c27d', '#ffdbac',
    '#e63946', '#ff6b6b', '#f4a261', '#ff9f1c', '#ffd60a', '#e9ed6b', '#80b918', '#2a9d8f',
    '#1b7f3b', '#00b4d8', '#4cc9f0', '#3a6ea5', '#1d3557', '#7b2cbf', '#c77dff', '#ff7eb6'] },
  pastel: { label: 'Pastel', colors: [
    '#ffffff', '#d9d9d9', '#ffd6e0', '#ffc8dd', '#ffafcc', '#ffadad', '#ffd6a5', '#fdffb6',
    '#fbf8cc', '#caffbf', '#b9fbc0', '#9bf6ff', '#bde0fe', '#a2d2ff', '#cdb4db', '#cfbaf0'] },
  earth: { label: 'Earth', colors: [
    '#2b1d14', '#5c4033', '#7b3f00', '#a0522d', '#a9714b', '#c68642', '#d2b48c', '#e1c699',
    '#f5deb3', '#b0a090', '#708090', '#2f4f4f', '#556b2f', '#6b8e23', '#8f9779', '#c2b280'] },
  neon: { label: 'Neon', colors: [
    '#000000', '#ffffff', '#ff073a', '#ff5f1f', '#ffe700', '#ccff00', '#39ff14', '#00ff9f',
    '#00f0ff', '#00b3ff', '#1f51ff', '#7d00ff', '#bc13fe', '#ff00c8', '#ff6ec7', '#fdfd96'] },
  skin: { label: 'Skin & hair', colors: [
    '#ffe0bd', '#ffcd94', '#eac086', '#d8a47f', '#c68642', '#a1665e', '#8d5524', '#6f4518',
    '#4a2c17', '#2b1b10', '#090806', '#3b3024', '#6a4e42', '#a56b46', '#b89778', '#dcd0ba',
    '#e6cea8', '#b55239', '#8d4a43', '#cb410b', '#bfbfbf', '#ffffff'] }
};

export const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export const rgbToHex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
export const isHex = (s) => /^#[0-9a-f]{6}$/i.test(s);

export function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [h, s, l];
}
export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.min(1, Math.max(0, s)); l = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

// Colors that look good next to `hex`: neighbours, the opposite, the other two corners of a triangle, a tint and a shade.
// Greys have no hue to rotate, so they get lighter and darker steps instead.
export function harmonies(hex) {
  const [h, s, l] = hexToHsl(hex);
  if (s < 0.08) return [0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((v) => hslToHex(0, 0, v));
  return [
    { name: 'Neighbour', c: hslToHex(h - 30, s, l) }, { name: 'Neighbour', c: hslToHex(h + 30, s, l) },
    { name: 'Opposite', c: hslToHex(h + 180, s, l) },
    { name: 'Triad', c: hslToHex(h + 120, s, l) }, { name: 'Triad', c: hslToHex(h - 120, s, l) },
    { name: 'Tint', c: hslToHex(h, s, l + (1 - l) * 0.45) }, { name: 'Shade', c: hslToHex(h, s, l * 0.6) }
  ].map((x) => x.c);
}
