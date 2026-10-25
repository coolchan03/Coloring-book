# Coloring Book (web)

This folder is the whole app. It is published as the GitHub Pages site **and** bundled into the
Android APK (`../coloringbook`), so a change here updates both.

A browser coloring book: pick a page (or upload your own), and color it on a layer *under* the
line art, so the ink always stays on top. Pure static HTML/JS, no build step.

- Run locally: `cd web && python3 -m http.server`, then open http://localhost:8000
- Tools: brush, bucket fill (stops at the lines), eraser, color picker, undo/redo, PNG export.
- Uploads: pick a category (or make a new one), upload one or more images; white becomes transparent and the "White cut-off" slider tunes it. Uploads appear under "★ <category>" in the sidebar and can be deleted with ×.
- Saving: your uploads and your coloring (on every page) are autosaved in this browser (IndexedDB) and the last page you had open is reopened on reload. Nothing is sent anywhere. Clearing site data or using another browser/device starts fresh.
- The eraser and Clear only remove your colors; the line art is a separate layer and is never touched.
- Adding pages: see `pages/README.md`.
