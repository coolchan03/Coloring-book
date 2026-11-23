# Coloring Book (web)

This folder is the whole app. It is published as the GitHub Pages site **and** bundled into the
Android APK (`../coloringbook`), so a change here updates both.

A browser coloring book: pick a page (or upload your own), and color it on a layer *under* the
line art, so the ink always stays on top. Pure static HTML/JS, no build step.

- Run locally: `cd web && python3 -m http.server`, then open http://localhost:8000
- Launcher: the app opens on a home screen with search, "Surprise me", Continue, recently colored pages, favorites, seasonal picks, "My coloring" and category tiles. Browser (and Android) Back steps through the screens.
- Brushes: pen, marker, pencil, crayon, paint, spray and sparkle. Pencil and crayon use a fixed paper grain, and the bucket fill gives them a hand-shaded look.
- Tools: bucket fill (stops at the lines, with adjustable *gap closing* so small breaks in an outline do not leak), eraser, color picker (or Alt+click), hand, undo/redo, PNG export, print (colored or blank).
- Zoom and pan: mouse wheel, trackpad or two-finger pinch zoom at the pointer; the hand tool, Space+drag or the middle mouse button pan. The zoom bar has +, -, and fit.
- Symmetry: mirror, four-way, 6-fold, 8-fold and mandala modes repeat everything you draw (and erase) around the middle of the page; dashed guides show the mirrors. Press `M` to cycle.
- Colors: five palettes (classic, pastel, earth, neon, skin & hair), "goes well with this color" suggestions, and your recent custom colors.
- Uploads: pick a category (or make a new one), upload one or more images; white becomes transparent and the "White cut-off" slider tunes it (remembered per picture). Pictures the browser cannot open are rejected up front instead of being saved broken.
- Saving: your uploads and your coloring (on every page) are autosaved in this browser (IndexedDB) and the last page you had open is reopened on reload. Nothing is sent anywhere. Clearing a page un-marks it as colored. *Back up everything* writes one `.cbbackup` file you can restore later, here or in another browser.
- The eraser and Clear only remove your colors; the line art is a separate layer and is never touched.
- Appearance: Auto / Light / Dark theme. Press `?` for the keyboard shortcut list.
- Also: previous/next arrows flip through a category, favorites (the heart), a "Saved" toast confirms autosave, `[` and `]` change the brush size, and the website can be shared from, installed to a home screen and used offline.
- Adding pages: see `pages/README.md`.

## Code layout
Plain ES modules, no build step.
- `app.js` - starts everything: header, theme, backup / restore, keyboard help, routes.
- `router.js` - `#home`, `#c/<category>`, `#p/<page>` navigation (safe against bad addresses).
- `library.js` - the picture catalog, your uploads, favorites, recents and which pages have coloring.
- `launcher.js` - the home and category screens. `uploads.js` - adding your own pictures.
- `editor.js` - the coloring screen: tools, drawing, autosave, export, keyboard.
- `view.js` - zoom and pan. `history.js` - undo/redo that stores only the changed rectangle. `fill.js` - bucket fill with gap closing. `symmetry.js` - symmetric drawing.
- `brushes.js` - brush types and textures. `colors.js` - palettes and color math.
- `ui.js` - toast, modal dialogs and the theme. `icons.js` - the one icon set. `style.css` - the design system (tokens, components, layout).
- `storage.js` - IndexedDB wrapper and guarded localStorage helpers. `backup.js` - backup file format.
- `sw.js`, `manifest.webmanifest`, `icon*.png` - offline use and installing the website. When you add a module, add it to the `SHELL` list in `sw.js` and bump `CACHE`.
- `../tests/smoke.cjs` - end-to-end test in headless Chromium (`npm i playwright`, then `node tests/smoke.cjs`).
