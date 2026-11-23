// The picture library: the built-in catalog, the person's uploads, which pages have coloring, favorites and recents.
// Holds data only; screens read from here and ask it to change things.
import { db, lsJson, lsSetJson } from './storage.js';

export const DEFAULT_CAT = 'My Pictures';
const MAX_RECENT = 12;

const lib = {
  catalog: [], catalogError: false,
  mine: [],                                   // uploads: {id, name, cat, cutoff, blob, created}
  progress: new Set(),                        // keys of pages that have saved coloring
  favs: new Set(lsJson('cb:favs')),
  cuts: lsJson('cb:cuts', {})                 // white cut-off remembered per built-in page
};
const blobUrls = new Map();                   // upload id -> object URL for thumbnails
let cache = null;
const listeners = [];

export const onLibraryChange = (fn) => listeners.push(fn);
const changed = () => { cache = null; listeners.forEach((fn) => fn()); };

/* ---------- loading ---------- */

export async function loadLibrary() {
  try { lib.mine = (await db.all('uploads')).sort((a, b) => a.created - b.created); } catch (e) { lib.mine = []; }
  try { lib.progress = new Set(await db.keys('progress')); } catch (e) { lib.progress = new Set(); }
  try {
    const res = await fetch('pages/manifest.json');
    if (!res.ok) throw new Error(res.status);
    lib.catalog = (await res.json()).categories;
    lib.catalogError = false;
  } catch (e) { lib.catalogError = true; }
  changed();
}
export const catalogFailed = () => lib.catalogError;

/* ---------- categories and pictures ---------- */

const blobUrl = (rec) => {
  if (!blobUrls.has(rec.id)) blobUrls.set(rec.id, URL.createObjectURL(rec.blob));
  return blobUrls.get(rec.id);
};

// Your categories first, then the built-in ones; every picture is {key, title, src} (uploads also carry rec).
export function categories() {
  if (cache) return cache;
  const mineCats = [...new Set(lib.mine.map((r) => r.cat))].map((cat) => ({
    id: 'my:' + cat, name: cat, star: true,
    items: lib.mine.filter((r) => r.cat === cat).map((r) => ({ key: 'u:' + r.id, title: r.name, src: blobUrl(r), rec: r }))
  }));
  const builtIn = lib.catalog.map((c) => ({
    id: c.id, name: c.name, icon: c.icon,
    items: c.pages.map((p) => ({ key: p.file, title: p.title, src: 'pages/' + p.file }))
  }));
  return (cache = [...mineCats, ...builtIn]);
}
export const allItems = () => categories().flatMap((c) => c.items.map((it) => ({ ...it, cat: c.name })));
export const categoryOf = (key) => (key ? categories().find((c) => c.items.some((it) => it.key === key)) : null);
export const findItem = (key) => { const c = categoryOf(key); return c ? c.items.find((it) => it.key === key) : null; };
export const uploadCategories = () => [...new Set([DEFAULT_CAT, ...lib.mine.map((r) => r.cat)])];

// "My coloring" and "Favorites" gather pictures from every category.
export const VIRTUAL = {
  colored: { id: 'colored', name: 'My coloring', icon: '🎨', pick: (it) => lib.progress.has(it.key) },
  favorites: { id: 'favorites', name: 'Favorites', icon: '♥', pick: (it) => lib.favs.has(it.key) }
};
export function virtualCategory(id) {
  const v = VIRTUAL[id];
  return v ? { id: v.id, name: v.name, icon: v.icon, virtual: true, items: allItems().filter(v.pick) } : null;
}

/* ---------- uploads ---------- */

// Browsers cannot open every image format (HEIC, for one); find out before saving rather than keep a broken picture.
function canDecode(blob) {
  return new Promise((ok) => {
    const url = URL.createObjectURL(blob), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(true); };
    img.onerror = () => { URL.revokeObjectURL(url); ok(false); };
    img.src = url;
  });
}

// Returns {rec, saved}: saved is false when the browser would not store it (it can still be colored this session).
export async function addUpload(file, cat) {
  if (!(await canDecode(file))) throw new Error('unsupported');
  const rec = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: file.name.replace(/\.[^.]+$/, '') || 'Picture', cat: cat || DEFAULT_CAT,
    cutoff: 200,                              // a gentler cut-off suits photos and scans
    blob: file, created: Date.now()
  };
  try { await db.put('uploads', rec); lib.mine.push(rec); changed(); return { rec, saved: true }; }
  catch (e) { return { rec, saved: false }; }
}

export async function removeUpload(rec) {
  try { await db.del('uploads', rec.id); await db.del('progress', 'u:' + rec.id); } catch (e) { /* ignore */ }
  lib.mine = lib.mine.filter((r) => r !== rec);
  lib.progress.delete('u:' + rec.id);
  if (lib.favs.delete('u:' + rec.id)) lsSetJson('cb:favs', [...lib.favs]);
  if (blobUrls.has(rec.id)) { URL.revokeObjectURL(blobUrls.get(rec.id)); blobUrls.delete(rec.id); }
  changed();
}

/* ---------- per-page settings and state ---------- */

export const hasProgress = (key) => lib.progress.has(key);
export function setProgress(key, has) {
  if (lib.progress.has(key) === has) return;
  if (has) lib.progress.add(key); else lib.progress.delete(key);
  cache = null;
}

export const defaultCutoff = 235;
export const cutoffFor = (item) => (item.rec ? item.rec.cutoff : lib.cuts[item.key] ?? defaultCutoff);
export async function saveCutoff(item, cutoff) {
  if (item.rec) { item.rec.cutoff = cutoff; try { await db.put('uploads', item.rec); } catch (e) { /* ignore */ } }
  else { lib.cuts[item.key] = cutoff; lsSetJson('cb:cuts', lib.cuts); }
}

export const isFavorite = (key) => lib.favs.has(key);
export function toggleFavorite(key) {
  if (lib.favs.has(key)) lib.favs.delete(key); else lib.favs.add(key);
  lsSetJson('cb:favs', [...lib.favs]);
  changed();
  return lib.favs.has(key);
}

export const recentKeys = () => lsJson('cb:recent');
export const rememberRecent = (key) => lsSetJson('cb:recent', [key, ...recentKeys().filter((k) => k !== key)].slice(0, MAX_RECENT));

// Raw access for backup / restore.
export const rawUploads = () => lib.mine;
export const rawPrefs = () => ({ favs: [...lib.favs], cuts: lib.cuts, recent: recentKeys() });
export function applyPrefs(p) {
  if (!p || typeof p !== 'object') return;
  if (Array.isArray(p.favs)) { p.favs.forEach((k) => typeof k === 'string' && lib.favs.add(k)); lsSetJson('cb:favs', [...lib.favs]); }
  if (p.cuts && typeof p.cuts === 'object') { Object.assign(lib.cuts, p.cuts); lsSetJson('cb:cuts', lib.cuts); }
}
