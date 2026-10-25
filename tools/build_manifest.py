#!/usr/bin/env python3
"""Rebuilds web/pages/manifest.json from the folders in web/pages/.

Each sub-folder is a category; each .svg/.png/.jpg/.webp inside is a page.
Titles come from file names ("big-red-barn.png" -> "Big Red Barn").
Run from the repo root:  python3 tools/build_manifest.py
"""
import json
import os

PAGES = os.path.join(os.path.dirname(__file__), "..", "web", "pages")
EXT = {".svg", ".png", ".jpg", ".jpeg", ".webp"}
# Categories listed here come first, in this order; any others follow alphabetically.
ORDER = ["easy", "halloween", "thanksgiving", "christmas", "easter", "other-holidays"]


def title(name):
    return os.path.splitext(name)[0].replace("-", " ").replace("_", " ").title()


cats = []
for cat in sorted(os.listdir(PAGES), key=lambda c: (ORDER.index(c) if c in ORDER else len(ORDER), c)):
    folder = os.path.join(PAGES, cat)
    if not os.path.isdir(folder):
        continue
    files = sorted(f for f in os.listdir(folder) if os.path.splitext(f)[1].lower() in EXT)
    if files:
        cats.append({"id": cat, "name": title(cat),
                     "pages": [{"title": title(f), "file": f"{cat}/{f}"} for f in files]})

with open(os.path.join(PAGES, "manifest.json"), "w") as fh:
    json.dump({"categories": cats}, fh, indent=2)
    fh.write("\n")
print(f"{sum(len(c['pages']) for c in cats)} pages in {len(cats)} categories")
