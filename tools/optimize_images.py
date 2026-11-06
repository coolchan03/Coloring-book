#!/usr/bin/env python3
"""Shrinks raster coloring pages (PNG/JPG) in web/pages/ to what the app actually uses.

Line art needs no color: each image becomes 8-bit grayscale limited to 1100px on its longest side
(the coloring canvas is 1400px but a phone shows far less), saved as an optimized 64-level PNG.
Safe to run again; already small files are left alone.
Run from the repo root:  python3 tools/optimize_images.py
"""
import os
import sys

from PIL import Image

PAGES = os.path.join(os.path.dirname(__file__), "..", "web", "pages")
MAX_SIDE = 1100

before = after = 0
for root, _, files in os.walk(PAGES):
    for name in sorted(files):
        if not name.lower().endswith((".png", ".jpg", ".jpeg")):
            continue
        path = os.path.join(root, name)
        size = os.path.getsize(path)
        im = Image.open(path).convert("L")
        im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        im = im.point(lambda v: (v // 4) * 4 + 2)             # 64 gray levels compress far better than 256
        out = os.path.splitext(path)[0] + ".png"
        im.save(out, optimize=True)
        if out != path:
            os.remove(path)
        new = os.path.getsize(out)
        before += size
        after += min(size, new) if out == path else new
        print(f"{os.path.relpath(out, PAGES)}: {size // 1024} KB -> {new // 1024} KB")
print(f"total {before // 1024} KB -> {after // 1024} KB", file=sys.stderr)
