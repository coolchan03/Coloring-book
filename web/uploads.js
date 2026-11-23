// Adding your own pictures: the sidebar panel, the home-screen tile and drag-and-drop.
import { $ } from './ui.js';
import { alertDialog, promptDialog, toast } from './ui.js';
import { DEFAULT_CAT, addUpload, onLibraryChange, uploadCategories } from './library.js';
import { openTemporary } from './editor.js';
import { go } from './router.js';

const NEW_CAT = '__new__';

function refreshCatSelect(selected) {
  const sel = $('uploadCat');
  const cats = uploadCategories();
  if (selected && !cats.includes(selected)) cats.push(selected);
  sel.innerHTML = '';
  for (const c of cats) sel.add(new Option(c, c));
  sel.add(new Option('+ New category…', NEW_CAT));
  sel.value = selected || DEFAULT_CAT;
  sel.dataset.prev = sel.value;
}

$('uploadCat').addEventListener('change', async (e) => {
  const sel = e.target;
  if (sel.value !== NEW_CAT) { sel.dataset.prev = sel.value; return; }
  const name = await promptDialog('Name for the new category', { ok: 'Create' });
  refreshCatSelect(name || sel.dataset.prev);
});

export async function addFiles(files) {
  const imgs = [...files].filter((f) => f.type.startsWith('image/'));
  if (!imgs.length) return toast('That is not a picture file');
  let cat = $('uploadCat').value;
  if (cat === NEW_CAT) cat = DEFAULT_CAT;
  let last = null, skipped = 0;
  for (const file of imgs) {
    try {
      const { rec, saved } = await addUpload(file, cat);
      if (saved) last = rec;
      else {                                   // storage blocked: still let them color it, just not keep it
        document.body.classList.remove('home');
        openTemporary(file, rec.name);
        await alertDialog('This browser would not let me save the picture, so it will be gone when you leave the page.');
      }
    } catch (e) { skipped++; }
  }
  refreshCatSelect(cat);
  if (skipped) toast(skipped === 1 ? 'One picture could not be opened (try PNG, JPG or SVG)' : `${skipped} pictures could not be opened`);
  if (last) go('p/' + encodeURIComponent('u:' + last.id));
}

$('fileInput').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
for (const area of [$('stage'), $('home')]) {
  area.addEventListener('dragover', (e) => e.preventDefault());
  area.addEventListener('drop', (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); });
}
onLibraryChange(() => refreshCatSelect($('uploadCat').value === NEW_CAT ? DEFAULT_CAT : $('uploadCat').value));
refreshCatSelect(DEFAULT_CAT);
