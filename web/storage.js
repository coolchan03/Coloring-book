// Everything the app keeps in the browser.
//  - IndexedDB ('coloring-book'): 'uploads' (the person's own pictures) and 'progress' (the coloring for each page, as PNG blobs).
//  - localStorage ('cb:*'): small preferences. Both can be missing, blocked or full, so every access is guarded.

export const db = (() => {
  let opened = null;
  const open = () => opened || (opened = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('IndexedDB unavailable'));
    const r = indexedDB.open('coloring-book', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('uploads', { keyPath: 'id' }); r.result.createObjectStore('progress'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => { opened = null; rej(r.error); };
  }));
  const run = (store, mode, fn) => open().then((d) => new Promise((res, rej) => {
    const tx = d.transaction(store, mode), req = fn(tx.objectStore(store));
    tx.oncomplete = () => res(req && req.result);
    tx.onerror = tx.onabort = () => rej(tx.error);
  }));
  return {
    get: (store, key) => run(store, 'readonly', (o) => o.get(key)),
    all: (store) => run(store, 'readonly', (o) => o.getAll()),
    keys: (store) => run(store, 'readonly', (o) => o.getAllKeys()),
    put: (store, val, key) => run(store, 'readwrite', (o) => (key === undefined ? o.put(val) : o.put(val, key))),
    del: (store, key) => run(store, 'readwrite', (o) => o.delete(key))
  };
})();

export const lsGet = (k, fallback) => { try { const v = localStorage.getItem(k); return v === null ? fallback : v; } catch (e) { return fallback; } };
export const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage full or blocked */ } };
export const lsDel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };
// JSON values; anything unreadable (or of the wrong shape) falls back to `fallback`.
export const lsJson = (k, fallback = []) => {
  try {
    const v = JSON.parse(lsGet(k, 'null'));
    return v !== null && typeof v === typeof fallback && Array.isArray(v) === Array.isArray(fallback) ? v : fallback;
  } catch (e) { return fallback; }
};
export const lsSetJson = (k, v) => lsSet(k, JSON.stringify(v));
