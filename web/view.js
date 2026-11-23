// Zoom and pan for the page. The board is laid out to fit the stage ("fit" = zoom 1) and then moved with a CSS
// transform, so drawing code keeps working: it always maps pointer positions through getBoundingClientRect().
//
// Ways in: mouse wheel / trackpad pinch (zoom at the pointer), two-finger pinch and drag, middle-mouse or
// space+drag or the hand tool (pan), and the +/-/fit buttons and keys.

const MIN_ZOOM = 1, MAX_ZOOM = 10, KEEP_VISIBLE = 80;

export function createView(stage, board, hooks) {
  // hooks: { panMode(): bool  -> a plain drag should pan, cancelStroke(): abandon a stroke in progress, onChange(zoom) }
  const v = { z: 1, x: 0, y: 0, baseW: 0, baseH: 0, left: 0, top: 0 };
  const touches = new Map();
  let gesture = null, drag = null, busy = false;

  const clamp = () => {
    const sw = stage.clientWidth, sh = stage.clientHeight, w = v.baseW * v.z, h = v.baseH * v.z;
    v.x = Math.min(sw - KEEP_VISIBLE - v.left, Math.max(KEEP_VISIBLE - w - v.left, v.x));
    v.y = Math.min(sh - KEEP_VISIBLE - v.top, Math.max(KEEP_VISIBLE - h - v.top, v.y));
    if (v.z === MIN_ZOOM) { v.x = 0; v.y = 0; }                // fully fitted always sits centered
  };
  const apply = () => {
    clamp();
    board.style.transform = v.z === 1 && !v.x && !v.y ? '' : `translate(${v.x}px, ${v.y}px) scale(${v.z})`;
    hooks.onChange(v.z);
  };

  // Sizes the board to fit the stage for a page of (w x h) pixels; keeps the current zoom.
  function layout(w, h) {
    if (!w || !stage.clientWidth) return;                       // the stage is hidden (home screen)
    const aw = Math.max(40, stage.clientWidth - 20), ah = Math.max(40, stage.clientHeight - 20), s = Math.min(aw / w, ah / h);
    v.baseW = Math.max(1, Math.floor(w * s)); v.baseH = Math.max(1, Math.floor(h * s));
    v.left = Math.round((stage.clientWidth - v.baseW) / 2); v.top = Math.round((stage.clientHeight - v.baseH) / 2);
    Object.assign(board.style, { width: v.baseW + 'px', height: v.baseH + 'px', left: v.left + 'px', top: v.top + 'px' });
    apply();
  }
  const reset = () => { v.z = 1; v.x = v.y = 0; apply(); };

  // Zooms by `factor`, keeping the stage point (cx, cy) (client coordinates) still.
  function zoomAt(factor, clientX, clientY) {
    const r = stage.getBoundingClientRect(), px = clientX - r.left, py = clientY - r.top;
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.z * factor));
    if (z === v.z) return;
    const bx = (px - v.left - v.x) / v.z, by = (py - v.top - v.y) / v.z;
    v.z = z; v.x = px - v.left - bx * z; v.y = py - v.top - by * z;
    apply();
  }
  const zoomBy = (factor) => { const r = stage.getBoundingClientRect(); zoomAt(factor, r.left + r.width / 2, r.top + r.height / 2); };
  const panBy = (dx, dy) => { v.x += dx; v.y += dy; apply(); };

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : 1;                    // lines -> pixels
    zoomAt(Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX, e.clientY);
  }, { passive: false });

  const mid = () => { const [a, b] = [...touches.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 }; };

  // Capture phase: runs before the drawing handlers on the canvas, so panning can claim the pointer first.
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.zoombar')) return;
    if (e.pointerType !== 'touch') touches.clear();             // a mouse or pen means no fingers are really down
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {                                  // a second finger: this is a pinch, not a stroke
        hooks.cancelStroke();
        const m = mid();
        gesture = { d: m.d, x: m.x, y: m.y };
        busy = true;
      }
      if (touches.size >= 2) { e.stopPropagation(); e.preventDefault(); return; }
    }
    if (!busy && (e.button === 1 || (e.button === 0 && hooks.panMode()))) {
      e.stopPropagation(); e.preventDefault();
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('panning');
    }
  }, true);

  stage.addEventListener('pointermove', (e) => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture && touches.size >= 2) {
      const m = mid();
      zoomAt(m.d / gesture.d, m.x, m.y);
      panBy(m.x - gesture.x, m.y - gesture.y);
      gesture = { d: m.d, x: m.x, y: m.y };
    } else if (drag && drag.id === e.pointerId) {
      panBy(e.clientX - drag.x, e.clientY - drag.y);
      drag.x = e.clientX; drag.y = e.clientY;
    }
  });

  const release = (e) => {
    touches.delete(e.pointerId);
    if (touches.size < 2) gesture = null;
    if (!touches.size) busy = false;
    if (drag && drag.id === e.pointerId) { drag = null; stage.classList.remove('panning'); }
  };
  for (const t of ['pointerup', 'pointercancel']) stage.addEventListener(t, release);

  return { layout, reset, zoomBy, zoomAt, panBy, get zoom() { return v.z; }, get busy() { return busy || !!drag; } };
}
