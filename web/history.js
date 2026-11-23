// Undo / redo that stores only the rectangle each action changed, so 50 steps cost a few MB instead of
// a full-page bitmap each. begin() grabs the page before an action; commit() works out what changed.

export class History {
  constructor(ctx, { maxBytes = 64e6, maxSteps = 60 } = {}) {
    this.ctx = ctx; this.maxBytes = maxBytes; this.maxSteps = maxSteps;
    this.undoStack = []; this.redoStack = []; this.bytes = 0;
  }
  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  reset() { this.undoStack = []; this.redoStack = []; this.bytes = 0; }

  begin() { const { width, height } = this.ctx.canvas; return { before: this.ctx.getImageData(0, 0, width, height) }; }

  // Puts the page back the way it was at begin() (used when a stroke is abandoned).
  restore(token) { this.ctx.putImageData(token.before, 0, 0); }

  // Records what changed since begin(). Returns false (and records nothing) if the page is identical.
  commit(token) {
    const { width: w, height: h } = this.ctx.canvas;
    const a = new Uint32Array(token.before.data.buffer), b = new Uint32Array(this.ctx.getImageData(0, 0, w, h).data.buffer);
    let top = -1, bottom = -1, left = w, right = -1;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let first = -1, last = -1;
      for (let x = 0; x < w; x++) if (a[row + x] !== b[row + x]) { first = x; break; }
      if (first < 0) continue;
      for (let x = w - 1; x >= first; x--) if (a[row + x] !== b[row + x]) { last = x; break; }
      if (top < 0) top = y;
      bottom = y; if (first < left) left = first; if (last > right) right = last;
    }
    if (top < 0) return false;
    const rw = right - left + 1, rh = bottom - top + 1, img = new ImageData(rw, rh), dst = new Uint32Array(img.data.buffer);
    for (let y = 0; y < rh; y++) dst.set(a.subarray((top + y) * w + left, (top + y) * w + left + rw), y * rw);
    this.#push(this.undoStack, { x: left, y: top, img });
    this.#drop(this.redoStack);
    return true;
  }

  undo() { return this.#swap(this.undoStack, this.redoStack); }
  redo() { return this.#swap(this.redoStack, this.undoStack); }

  // Exchanges the stored rectangle with the same rectangle of the page and moves it to the other stack.
  #swap(from, to) {
    const patch = from.pop();
    if (!patch) return false;
    this.bytes -= patch.img.data.length;
    const { x, y, img } = patch;
    this.#push(to, { x, y, img: this.ctx.getImageData(x, y, img.width, img.height) }, false);
    this.ctx.putImageData(img, x, y);
    return true;
  }
  #push(stack, patch, trim = true) {
    stack.push(patch); this.bytes += patch.img.data.length;
    if (!trim) return;
    while (this.undoStack.length > 1 && (this.undoStack.length > this.maxSteps || this.bytes > this.maxBytes)) {
      this.bytes -= this.undoStack.shift().img.data.length;
    }
  }
  #drop(stack) { for (const p of stack) this.bytes -= p.img.data.length; stack.length = 0; }
}
