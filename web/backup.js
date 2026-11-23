// Backup and restore: everything kept in this browser (your pictures, your coloring, favorites) in one file.
// Layout: "CBBACKUP1\n", a 4-byte length, a JSON header describing the parts, then the parts' bytes back to back.
import { db } from './storage.js';
import { rawUploads, rawPrefs, applyPrefs } from './library.js';

const MAGIC = 'CBBACKUP1\n';

export async function createBackup() {
  const uploads = rawUploads();
  const keys = await db.keys('progress');
  const progress = [];
  for (const key of keys) { const blob = await db.get('progress', key); if (blob) progress.push({ key, blob }); }
  const header = {
    version: 1, created: Date.now(), prefs: rawPrefs(),
    uploads: uploads.map((r) => ({ id: r.id, name: r.name, cat: r.cat, cutoff: r.cutoff, created: r.created, type: r.blob.type, size: r.blob.size })),
    progress: progress.map((p) => ({ key: p.key, size: p.blob.size }))
  };
  const head = new TextEncoder().encode(JSON.stringify(header));
  const len = new Uint8Array(4); new DataView(len.buffer).setUint32(0, head.length);
  const blob = new Blob([MAGIC, len, head, ...uploads.map((r) => r.blob), ...progress.map((p) => p.blob)], { type: 'application/octet-stream' });
  return { blob, uploads: uploads.length, progress: progress.length };
}

// Reads a backup and merges it in: pictures are added, coloring for the same page is replaced.
export async function restoreBackup(file) {
  const magic = await file.slice(0, MAGIC.length).text();
  if (magic !== MAGIC) throw new Error('not a backup');
  const at = MAGIC.length;
  const headLen = new DataView(await file.slice(at, at + 4).arrayBuffer()).getUint32(0);
  const header = JSON.parse(await file.slice(at + 4, at + 4 + headLen).text());
  if (header.version !== 1 || !Array.isArray(header.uploads) || !Array.isArray(header.progress)) throw new Error('unsupported backup');
  let pos = at + 4 + headLen, pictures = 0, colored = 0;
  const existing = new Set(rawUploads().map((r) => r.id));
  for (const u of header.uploads) {
    const blob = file.slice(pos, pos + u.size, u.type); pos += u.size;
    if (existing.has(u.id)) continue;
    await db.put('uploads', { id: u.id, name: u.name, cat: u.cat, cutoff: u.cutoff, created: u.created, blob });
    pictures++;
  }
  for (const p of header.progress) {
    const blob = file.slice(pos, pos + p.size, 'image/png'); pos += p.size;
    await db.put('progress', blob, p.key);
    colored++;
  }
  applyPrefs(header.prefs);
  return { pictures, colored };
}
