// End-to-end smoke test for the coloring book (the web/ folder), run in a real headless Chromium.
//
//   npm install playwright && npx playwright install chromium     (once)
//   node tests/smoke.cjs                                          (from the repo root)
//
// It serves web/ itself, drives the app like a person would, and exits non-zero if anything fails.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', 'web');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + detail}`);
};

(async () => {
  await new Promise((ok) => server.listen(0, ok));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('dialog', (d) => d.accept('Pets'));

  const hash = () => page.evaluate(() => location.hash);
  const isHome = () => page.evaluate(() => document.body.classList.contains('home'));
  const title = () => page.textContent('#pageTitle');
  const pixels = (id) => page.evaluate((i) => {
    const c = document.getElementById(i), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let k = 3; k < d.length; k += 4) if (d[k] > 0) n++; return n;
  }, id);
  const box = () => page.locator('#color').boundingBox();
  const at = (r, fx, fy) => [r.x + r.width * fx, r.y + r.height * fy];
  const openPage = async (cat, card) => {
    await page.click(`.tile:has-text("${cat}")`); await page.click(`.card:has-text("${card}")`);
    await page.waitForFunction(() => !document.body.classList.contains('home')); await page.waitForTimeout(500);
  };
  const goHome = async () => { await page.click('#homeBtn'); await page.waitForTimeout(700); };

  // ----- launcher -----
  await page.goto(base); await page.waitForTimeout(1500);
  check('opens on the launcher', await isHome() && await title() === 'Coloring Book');
  check('has a tile per category plus "add"', (await page.locator('.tile').count()) >= 19);
  check('shows the seasonal row', (await page.locator('.band h3').allTextContents()).some((t) => t.includes('Right now')));
  await page.fill('input[type=search]', 'whale');
  check('search finds a picture', (await page.locator('.cards .card').count()) === 1);
  await page.fill('input[type=search]', 'zzzz');
  check('search says when nothing matches', (await page.textContent('#home .hint')).includes('Nothing found'));
  await page.fill('input[type=search]', '');

  // ----- open, color, fill -----
  await openPage('Halloween', 'Ghost');
  check('opening a picture updates title and address', await title() === 'Ghost' && (await hash()).startsWith('#p/'));
  check('line art has ink and transparent paper', (await pixels('lines')) > 1000 &&
    await page.evaluate(() => document.getElementById('lines').getContext('2d').getImageData(2, 2, 1, 1).data[3]) === 0);
  let r = await box();
  await page.click('[data-tool=fill]'); await page.click('.chip[data-brush=marker]'); await page.click('.swatch[data-c="#c77dff"]');
  await page.mouse.click(...at(r, 0.5, 0.7));
  const filled = await pixels('color');
  check('bucket fill colors the body', filled > 20000, `pixels=${filled}`);
  check('bucket fill stays inside the lines', filled < 400000, `pixels=${filled}`);

  // ----- every brush leaves a mark, and undo removes it -----
  await page.click('[data-tool=brush]');
  for (const brush of ['pen', 'marker', 'pencil', 'crayon', 'paint', 'spray', 'sparkle']) {
    await page.click('#clearBtn'); await page.waitForTimeout(100);
    await page.click(`.chip[data-brush=${brush}]`); await page.click('.swatch[data-c="#3a6ea5"]');
    await page.mouse.move(...at(r, 0.1, 0.9)); await page.mouse.down();
    for (let k = 1; k <= 12; k++) await page.mouse.move(...at(r, 0.1 + k * 0.03, 0.9 - 0.02 * Math.sin(k)));
    await page.mouse.up();
    const marked = await pixels('color');
    await page.click('#undoBtn');
    check(`${brush} brush draws and undo removes it`, marked > 150 && (await pixels('color')) === 0, `marked=${marked}`);
  }
  // ----- the eraser only removes color -----
  await page.click('.chip[data-brush=pen]'); await page.click('[data-tool=fill]'); await page.mouse.click(...at(r, 0.5, 0.7));
  const ink = await pixels('lines');
  await page.click('[data-tool=eraser]');
  await page.mouse.move(...at(r, 0.05, 0.05)); await page.mouse.down(); await page.mouse.move(...at(r, 0.95, 0.95), { steps: 20 }); await page.mouse.up();
  check('eraser removes color but never the line art', (await pixels('lines')) === ink && (await pixels('color')) < filled);

  // ----- stability: a second finger must not break a stroke -----
  await page.click('#clearBtn'); await page.click('[data-tool=brush]'); await page.click('.chip[data-brush=pen]'); await page.click('.swatch[data-c="#e63946"]');
  await page.mouse.move(...at(r, 0.2, 0.3)); await page.mouse.down();
  await page.mouse.move(...at(r, 0.3, 0.35), { steps: 5 });
  await page.evaluate(() => {
    const c = document.getElementById('color');
    c.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 99, isPrimary: false, clientX: 300, clientY: 300, bubbles: true, pointerType: 'touch' }));
  });
  await page.mouse.move(...at(r, 0.5, 0.4), { steps: 5 }); await page.mouse.up();
  await page.click('#undoBtn');
  check('a second pointer is ignored (one undo removes the whole stroke)', (await pixels('color')) === 0);

  // ----- stability: changing page mid-stroke never paints on the wrong page -----
  await page.mouse.move(...at(r, 0.2, 0.3)); await page.mouse.down(); await page.mouse.move(...at(r, 0.4, 0.4), { steps: 5 });
  await page.evaluate(() => { location.hash = '#p/' + encodeURIComponent('halloween/bat.svg'); });
  await page.waitForTimeout(700); await page.mouse.up();
  check('mid-stroke page change leaves the new page clean', await title() === 'Bat' && (await pixels('color')) === 0 && (await pixels('stroke')) === 0);

  // ----- pager, recent colors, saved toast -----
  await page.click('#nextBtn'); await page.waitForTimeout(500);
  const afterNext = await title();
  await page.click('#prevBtn'); await page.waitForTimeout(500); await page.click('#prevBtn'); await page.waitForTimeout(500);
  check('next/previous flip through the category', afterNext !== 'Bat' && (await title()) !== 'Bat');
  await page.evaluate(() => {
    const i = document.getElementById('customColor'); i.value = '#123456';
    i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true }));
  });
  check('a custom color is remembered', (await page.locator('#recentColors .swatch').count()) === 1);
  await page.click('[data-tool=fill]'); r = await box(); await page.mouse.click(...at(r, 0.5, 0.5));
  const saved = await page.waitForFunction(() => document.getElementById('toast').textContent.includes('Saved'), null, { timeout: 15000 }).then(() => true, () => false);
  check('autosave shows a "Saved" toast', saved);   // textured pages take a couple of seconds to encode

  // ----- navigation and persistence -----
  await goHome();
  check('home shows Continue and a colored badge after coloring', (await page.locator('.continue').count()) === 1);
  await page.goBack(); await page.waitForTimeout(500);
  check('Back returns to the picture', !(await isHome()));
  await page.reload(); await page.waitForTimeout(1500);
  check('reloading keeps the picture open', !(await isHome()) && (await pixels('color')) > 0);

  // ----- uploads -----
  await goHome();
  const png = path.join(os.tmpdir(), 'cb-smoke.png');
  fs.writeFileSync(png, Buffer.from(await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 300; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, 400, 300); x.strokeStyle = '#000'; x.lineWidth = 6; x.strokeRect(40, 40, 320, 220);
    return c.toDataURL().split(',')[1];
  }), 'base64'));
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('.tile.add')]);
  await chooser.setFiles(png); await page.waitForTimeout(1000);
  check('upload opens the new picture', (await hash()).startsWith('#p/u%3A') && await title() === 'cb-smoke');
  await page.click('[data-tool=fill]'); r = await box(); await page.mouse.click(...at(r, 0.5, 0.5)); await page.waitForTimeout(900);
  await goHome();
  check('uploads get their own starred category', (await page.locator('.tile:has-text("★")').count()) === 1);
  await page.click('.tile:has-text("★")'); await page.waitForTimeout(500);
  await page.click('.cardwrap .del'); await page.waitForTimeout(500);
  await page.waitForTimeout(500);
  check('an upload can be deleted', (await page.locator('.tile:has-text("★")').count()) === 0);

  // ----- offline -----
  await page.goto(base); await page.waitForTimeout(1500);
  await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForTimeout(800);
  await context.setOffline(true);
  await page.reload(); await page.waitForTimeout(1500);
  check('works offline once loaded', await isHome() && (await page.locator('.tile').count()) >= 19);
  await context.setOffline(false);

  check('no console or page errors', errors.length === 0, errors.join(' | '));
  await browser.close(); server.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
