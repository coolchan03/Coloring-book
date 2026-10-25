# Coloring Book (web)

A browser coloring book: pick a page (or upload your own), and color it on a layer *under* the
line art, so the ink always stays on top. Pure static HTML/JS, no build step.

- Run locally: `cd web && python3 -m http.server`, then open http://localhost:8000
- Tools: brush, bucket fill (stops at the lines), eraser, color picker, undo/redo, PNG export.
- Uploads: white becomes transparent; the "White cut-off" slider tunes it.
- Progress on built-in pages is autosaved in your browser (localStorage).
- Adding pages: see `pages/README.md`.
