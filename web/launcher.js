// The home screen and category screens: search, Continue, recent and seasonal rows, category tiles, favorites and gallery.
import { db, lsGet } from './storage.js';
import { icon } from './icons.js';
import { $, el, confirmDialog } from './ui.js';
import { allItems, catalogFailed, categories, hasProgress, isFavorite, recentKeys, removeUpload, toggleFavorite, virtualCategory, VIRTUAL } from './library.js';
import { leaveEditor } from './editor.js';
import { go } from './router.js';

let navId = 0;                                // lets a slow render notice the person has already moved on
export const cancelPendingRender = () => { navId++; };

// Pages worth suggesting by time of year: month (0-11) -> category ids.
const SEASONS = {
  0: ['christmas', 'easy'], 1: ['other-holidays', 'cute-animals'], 2: ['other-holidays', 'easter'], 3: ['easter', 'nature'],
  4: ['nature', 'cute-animals'], 5: ['ocean', 'food'], 6: ['ocean', 'vehicles'], 7: ['vehicles', 'space'],
  8: ['halloween', 'thanksgiving'], 9: ['halloween'], 10: ['thanksgiving'], 11: ['christmas']
};
const hueOf = (id) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const enc = encodeURIComponent;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// A page's picture with the person's coloring behind the ink, so "colored" pages look colored on the launcher.
async function composePreview(key, src) {
  const blob = await db.get('progress', key);
  if (!blob) return null;
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const w = 360, h = Math.round(w * (img.naturalHeight || 800) / (img.naturalWidth || 1000));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
  x.drawImage(await createImageBitmap(blob), 0, 0, w, h);
  x.globalCompositeOperation = 'multiply';    // white keeps the color, black ink stays black
  x.drawImage(img, 0, 0, w, h);
  return new Promise((ok) => c.toBlob((b) => ok(b && URL.createObjectURL(b))));
}
const previewUrls = [];
function withProgressPreview(img, item, id) {
  if (!hasProgress(item.key)) return;
  composePreview(item.key, item.src).then((u) => {
    if (!u) return;
    if (id !== navId) return URL.revokeObjectURL(u);      // the screen changed while this was rendering
    previewUrls.push(u); img.src = u;
  }).catch(() => {});
}

// A small round button laid over a card's corner.
function cornerButton(cls, iconName, label, onClick) {
  const b = el('button', 'cardbtn ' + cls);
  b.type = 'button'; b.title = label; b.setAttribute('aria-label', label);
  b.appendChild(icon(iconName));
  b.addEventListener('click', onClick);
  return b;
}

// A picture card: thumbnail (with your coloring if you have colored it), title, favorite heart and a badge.
function cardFor(it, id, mini) {
  const wrap = el('div', 'cardwrap' + (mini ? ' mini' : ''));
  const b = el('button', 'card');
  b.type = 'button';
  const img = el('img'); img.src = it.src; img.alt = ''; img.loading = 'lazy'; withProgressPreview(img, it, id);
  b.append(img, el('span', '', it.title));
  if (hasProgress(it.key)) { const badge = el('i', 'badge'); badge.title = 'You have colored this'; badge.appendChild(icon('palette')); b.appendChild(badge); }
  b.addEventListener('click', () => go('p/' + enc(it.key)));
  wrap.appendChild(b);
  const heart = cornerButton('fav', 'heart', 'Favorite', () => {
    const on = toggleFavorite(it.key);
    heart.classList.toggle('on', on); heart.setAttribute('aria-pressed', String(on));
  });
  heart.classList.toggle('on', isFavorite(it.key)); heart.setAttribute('aria-pressed', String(isFavorite(it.key)));
  wrap.appendChild(heart);
  if (it.rec) {
    wrap.appendChild(cornerButton('del', 'trash', 'Delete this picture and its coloring', async () => {
      if (await confirmDialog(`"${it.rec.name}" and everything you colored on it will be gone for good.`, { title: 'Delete this picture?', ok: 'Delete', danger: true })) {
        await removeUpload(it.rec);
        cancelPendingRender();
        go(location.hash.slice(1) || 'home', true);
      }
    }));
  }
  return wrap;
}
function strip(title, items, id) {
  const sec = el('section', 'band');
  sec.appendChild(el('h3', '', title));
  const row = el('div', 'strip');
  items.forEach((it) => row.appendChild(cardFor(it, id, true)));
  sec.appendChild(row);
  return sec;
}

function showView(title) {
  document.body.classList.add('home');
  document.body.classList.remove('menu');
  $('pageTitle').textContent = title;
  document.title = title === 'Coloring Book' ? title : title + ' · Coloring Book';
  previewUrls.splice(0).forEach((u) => URL.revokeObjectURL(u));
  $('home').scrollTop = 0;
}

function categoryTile(cat, count, glyph, hue) {
  const b = el('button', 'tile'); b.type = 'button'; b.style.setProperty('--h', hue);
  const collage = el('div', 'collage');
  for (const it of cat.items.slice(0, 4)) { const im = el('img'); im.src = it.src; im.alt = ''; im.loading = 'lazy'; collage.appendChild(im); }
  const head = el('div', 'tilehead'); head.append(el('span', 'ico', glyph), el('b', '', cat.name));
  b.append(collage, head, el('small', '', plural(count, 'picture')));
  return b;
}

export async function showHome() {
  const id = ++navId;
  showView('Coloring Book');
  await leaveEditor();                        // so "colored" badges and previews are current
  if (id !== navId) return;
  const box = $('home'); box.innerHTML = '';

  const cats = categories(), all = allItems();
  const byKey = new Map(all.map((it) => [it.key, it]));
  const coloredCount = all.filter((it) => hasProgress(it.key)).length;

  const hero = el('div', 'hero');
  const logo = el('img'); logo.src = 'icon.svg'; logo.alt = ''; logo.width = logo.height = 64;
  const words = el('div'); words.append(el('h2', '', 'Coloring Book'),
    el('p', '', `${plural(all.length, 'picture')} to color, plus your own${coloredCount ? ` · ${coloredCount} colored so far` : ''}`));
  hero.append(logo, words); box.appendChild(hero);
  if (catalogFailed()) box.appendChild(el('p', 'notice', 'The built-in pictures could not be loaded. If you opened this file directly, serve the folder over http (for example python3 -m http.server) or use the website. Your own pictures still work.'));

  const bar = el('div', 'homebar');
  const search = el('input', 'field pill'); search.type = 'search'; search.placeholder = 'Search pictures…'; search.setAttribute('aria-label', 'Search pictures');
  const surprise = el('button', 'btn pill', 'Surprise me'); surprise.type = 'button'; surprise.prepend(icon('dice'));
  surprise.addEventListener('click', () => {
    const fresh = all.filter((it) => !hasProgress(it.key));
    const pool = fresh.length ? fresh : all;
    if (pool.length) go('p/' + enc(pool[Math.floor(Math.random() * pool.length)].key));
  });
  bar.append(search, surprise); box.appendChild(bar);

  const browse = el('div'), results = el('div', 'cards'); results.hidden = true;
  box.append(browse, results);
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    results.hidden = !q; browse.hidden = !!q;
    if (!q) return;
    results.innerHTML = '';
    const hits = all.filter((it) => it.title.toLowerCase().includes(q) || it.cat.toLowerCase().includes(q));
    if (!hits.length) results.appendChild(el('p', 'hint', `Nothing found for "${search.value.trim()}".`));
    hits.slice(0, 60).forEach((it) => results.appendChild(cardFor(it, id)));
  });

  const last = lsGet('cb:last', null);
  const lastItem = byKey.get(last);
  if (lastItem) {
    const b = el('button', 'continue'); b.type = 'button';
    const img = el('img'); img.src = lastItem.src; img.alt = ''; withProgressPreview(img, lastItem, id);
    const t = el('div'); t.append(el('small', '', 'Continue coloring'), el('strong', '', lastItem.title), el('small', '', lastItem.cat));
    b.append(img, t, icon('chevron-right')); b.addEventListener('click', () => go('p/' + enc(lastItem.key)));
    browse.appendChild(b);
  }

  const recent = recentKeys().filter((k) => k !== last && hasProgress(k)).map((k) => byKey.get(k)).filter(Boolean).slice(0, 10);
  if (recent.length) browse.appendChild(strip('Pick up where you left off', recent, id));

  const favs = all.filter((it) => isFavorite(it.key)).slice(0, 10);
  if (favs.length) browse.appendChild(strip('♥ Your favorites', favs, id));

  const seasonCats = (SEASONS[new Date().getMonth()] || []).map((cid) => cats.find((c) => c.id === cid)).filter(Boolean);
  const seasonal = seasonCats.flatMap((c) => c.items.map((it) => ({ ...it, cat: c.name }))).filter((it) => !hasProgress(it.key)).slice(0, 10);
  if (seasonal.length) browse.appendChild(strip(`${seasonCats[0].icon || '✨'} Right now: ${seasonCats.map((c) => c.name).join(' & ')}`, seasonal, id));

  const band = el('section', 'band'); band.appendChild(el('h3', '', 'Pick a category'));
  const grid = el('div', 'tiles');
  const add = el('button', 'tile add'); add.type = 'button';
  const plus = el('span', 'plus'); plus.appendChild(icon('plus'));
  add.append(plus, el('b', '', 'Add your own picture'), el('small', '', 'Upload a photo or drawing'));
  add.addEventListener('click', () => $('fileInput').click());
  grid.appendChild(add);
  for (const v of Object.values(VIRTUAL)) {
    const cat = virtualCategory(v.id);
    if (!cat.items.length) continue;
    const t = categoryTile(cat, cat.items.length, v.icon, v.id === 'favorites' ? 340 : 140);
    t.addEventListener('click', () => go('c/' + enc(v.id)));
    grid.appendChild(t);
  }
  for (const cat of cats) {
    const t = categoryTile(cat, cat.items.length, cat.star ? '★' : cat.icon || '🎨', hueOf(cat.id));
    t.addEventListener('click', () => go('c/' + enc(cat.id)));
    grid.appendChild(t);
  }
  band.appendChild(grid); browse.appendChild(band);
}

// Returns false if there is no such category, so the router can fall back to the home screen.
export function showCategory(catId) {
  const cat = categories().find((c) => c.id === catId) || virtualCategory(catId);
  if (!cat) return false;
  const id = ++navId;
  showView(cat.name);
  leaveEditor().then(() => {
    if (id !== navId) return;
    const box = $('home'); box.innerHTML = '';
    const bar = el('div', 'catbar');
    const back = el('button', 'btn', 'All categories'); back.type = 'button'; back.prepend(icon('chevron-left'));
    back.addEventListener('click', () => go('home'));
    bar.append(back, el('h2', '', `${cat.star ? '★' : cat.icon || '🎨'} ${cat.name}`));
    box.appendChild(bar);
    if (!cat.items.length) {
      box.appendChild(el('p', 'hint', cat.id === 'favorites' ? 'Tap the heart on any picture to keep it here.' : 'Nothing here yet.'));
      return;
    }
    const grid = el('div', 'cards');
    cat.items.forEach((it) => grid.appendChild(cardFor(it, id)));
    box.appendChild(grid);
  });
  return true;
}
