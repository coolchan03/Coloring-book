// A tiny promise wrapper around IndexedDB with two stores: 'uploads' (the person's own pictures)
// and 'progress' (the coloring for each page, as PNG blobs).
export const db = (() => {
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
    keys: (store) => run(store, 'readonly', (o) => o.getAllKeys()),
    put: (store, val, key) => run(store, 'readwrite', (o) => (key === undefined ? o.put(val) : o.put(val, key))),
    del: (store, key) => run(store, 'readwrite', (o) => o.delete(key))
  };
})();
