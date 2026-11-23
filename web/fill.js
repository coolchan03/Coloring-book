// Bucket fill: works out which pixels a tap should color. Pure functions on the line-art alpha map.

export const BARRIER = 128;               // line alpha above this blocks the fill

// Grows a 0/1 mask by one pixel (up, down, left, right), only into pixels where allowed(i) is true.
function grow(mask, w, h, allowed) {
  const add = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] || !allowed(i)) continue;
    const x = i % w;
    if ((x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) || (i >= w && mask[i - w]) || (i < mask.length - w && mask[i + w])) add.push(i);
  }
  for (const i of add) mask[i] = 1;
}

// Scanline flood fill, 4-connected, through pixels where open[i] === 1.
function flood(open, w, h, seed) {
  const region = new Uint8Array(w * h), stack = [seed];
  while (stack.length) {
    const i = stack.pop();
    if (region[i] || !open[i]) continue;
    const x = i % w, row = i - x;
    let l = x; while (l > 0 && !region[row + l - 1] && open[row + l - 1]) l--;
    let r = x; while (r < w - 1 && !region[row + r + 1] && open[row + r + 1]) r++;
    for (let c = l; c <= r; c++) region[row + c] = 1;
    for (const nr of [row - w, row + w]) {
      if (nr < 0 || nr >= w * h) continue;
      let inRun = false;
      for (let c = l; c <= r; c++) {
        const ok = !region[nr + c] && open[nr + c];
        if (ok && !inRun) stack.push(nr + c);
        inRun = ok;
      }
    }
  }
  return region;
}

// The nearest open pixel to (sx, sy) within `reach` pixels, or -1.
function nearestOpen(open, w, h, sx, sy, reach) {
  for (let d = 0; d <= reach; d++)
    for (let dy = -d; dy <= d; dy++)
      for (let dx = -d; dx <= d; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
        const x = sx + dx, y = sy + dy;
        if (x >= 0 && y >= 0 && x < w && y < h && open[y * w + x]) return y * w + x;
      }
  return -1;
}

// Returns {region, count} for a tap at (sx, sy), or null if there is nothing to fill there.
// gap: how many pixels of gap in the outline to bridge (0 = none), so a small break in a drawing does not flood the page.
// The result also reaches 2 pixels under the ink so no halo shows where the line is anti-aliased.
export function computeRegion(alpha, w, h, sx, sy, gap = 0) {
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
  const open = new Uint8Array(w * h);
  for (let i = 0; i < open.length; i++) open[i] = alpha[i] <= BARRIER ? 1 : 0;
  const sealed = open.slice();
  if (gap > 0) {                                   // thicken every line so narrow gaps close
    const barrier = new Uint8Array(w * h);
    for (let i = 0; i < barrier.length; i++) barrier[i] = open[i] ? 0 : 1;
    for (let p = 0; p < gap; p++) grow(barrier, w, h, () => true);
    for (let i = 0; i < sealed.length; i++) sealed[i] = barrier[i] ? 0 : 1;
  }
  let seed = nearestOpen(sealed, w, h, sx, sy, 4 + gap);
  if (seed < 0 && gap > 0) { sealed.set(open); seed = nearestOpen(sealed, w, h, sx, sy, 4); }   // tapped inside a thin pocket
  if (seed < 0) return null;
  const region = flood(sealed, w, h, seed);
  for (let p = 0; p < gap; p++) grow(region, w, h, (i) => open[i] === 1);        // give back the pixels the thickening took
  for (let p = 0; p < 2; p++) grow(region, w, h, (i) => open[i] === 0);          // tuck under the ink
  let count = 0; for (let i = 0; i < region.length; i++) count += region[i];
  return { region, count };
}
