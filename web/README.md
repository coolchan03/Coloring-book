# Coloring Book (web)

This folder is the whole app. It is published as the GitHub Pages site **and** bundled into the
Android APK (`../coloringbook`), so a change here updates both.

A browser coloring book: pick a page (or upload your own), and color it on a layer *under* the
line art, so the ink always stays on top. Pure static HTML/JS, no build step.

- Run locally: `cd web && python3 -m http.server`, then open http://localhost:8000
- Launcher: the app opens on a home screen with search, "Surprise me", Continue, recently colored pages, seasonal picks and category tiles. Browser (and Android) Back steps through the screens.
- Brushes: pen, marker, pencil, crayon, paint, spray and sparkle. Pencil and crayon use a fixed paper grain, and the bucket fill gives them a hand-shaded look.
- Tools: bucket fill (stops at the lines), eraser, color picker, undo/redo, PNG export.
- Uploads: pick a category (or make a new one), upload one or more images; white becomes transparent and the "White cut-off" slider tunes it. Uploads appear under "★ <category>" in the sidebar and can be deleted with ×.
- Saving: your uploads and your coloring (on every page) are autosaved in this browser (IndexedDB) and the last page you had open is reopened on reload. Nothing is sent anywhere. Clearing site data or using another browser/device starts fresh.
- The eraser and Clear only remove your colors; the line art is a separate layer and is never touched.
- Quality of life: previous/next arrows flip through a category, recently used custom colors are remembered, a "Saved" toast confirms autosave, `[` and `]` change the brush size, and the website can be shared from, installed to a home screen and used offline.
- Adding pages: see `pages/README.md`.

## Code layout
- `app.js` – the app: pages, drawing, saving, launcher and navigation.
- `brushes.js` – brush types and textures (pure drawing code).
- `storage.js` – the IndexedDB wrapper for your pictures and coloring.
- `sw.js`, `manifest.webmanifest`, `icon*.png` – offline use and installing the website.
- `../tests/smoke.cjs` – end-to-end test in headless Chromium (`npm i playwright`, then `node tests/smoke.cjs`).
