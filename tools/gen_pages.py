#!/usr/bin/env python3
"""Generates the original starter coloring pages (CC0) into web/pages/<category>/.

Run from the repo root:  python3 tools/gen_pages.py
"""
import math
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "web", "pages")
W, H = 1000, 800
CX, CY = W / 2, H / 2


def svg(body, w=W, h=H):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n'
        f'<rect width="{w}" height="{h}" fill="#fff"/>\n'
        '<g fill="none" stroke="#000" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">\n'
        f"{body}\n</g>\n</svg>\n"
    )


def rot(n, inner, cx=CX, cy=CY):
    return "".join(
        f'<g transform="rotate({360 * i / n:.3f} {cx} {cy})">{inner}</g>\n' for i in range(n)
    )


def petal(cx, cy, r0, r1, wid):
    return (f'<path d="M{cx} {cy - r0} C{cx + wid} {cy - (r0 + r1) / 2} {cx + wid} {cy - r1 + 20} {cx} {cy - r1} '
            f'C{cx - wid} {cy - r1 + 20} {cx - wid} {cy - (r0 + r1) / 2} {cx} {cy - r0}Z"/>')


def star(n, k, r, cx=CX, cy=CY):
    pts = [(cx + r * math.sin(2 * math.pi * i * k / n), cy - r * math.cos(2 * math.pi * i * k / n)) for i in range(n)]
    return '<path d="M' + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + 'Z"/>'


pages = {}

# ---- mandalas -------------------------------------------------------------
m = '<circle cx="500" cy="400" r="30"/><circle cx="500" cy="400" r="55"/>\n'
m += rot(12, petal(CX, CY, 55, 150, 28))
m += '<circle cx="500" cy="400" r="160"/>\n'
m += rot(12, petal(CX, CY, 160, 260, 36))
m += rot(24, f'<circle cx="{CX}" cy="{CY - 285}" r="22"/>')
m += '<circle cx="500" cy="400" r="320"/><circle cx="500" cy="400" r="345"/>\n'
m += rot(36, f'<path d="M{CX} {CY - 345} l-14 -26 l28 0z"/>')
pages["mandalas/blossom-mandala"] = svg(m)

m = star(16, 3, 330) + star(16, 5, 330) + "\n"
m += '<circle cx="500" cy="400" r="330"/><circle cx="500" cy="400" r="150"/><circle cx="500" cy="400" r="70"/>\n'
m += rot(8, petal(CX, CY, 70, 150, 22))
m += rot(16, f'<circle cx="{CX}" cy="{CY - 365}" r="16"/>')
m += '<circle cx="500" cy="400" r="385"/>\n'
pages["mandalas/star-mandala"] = svg(m)

m = ""
for i in range(6):
    a = math.radians(60 * i)
    m += f'<circle cx="{CX + 130 * math.sin(a):.1f}" cy="{CY - 130 * math.cos(a):.1f}" r="130"/>\n'
m += '<circle cx="500" cy="400" r="130"/><circle cx="500" cy="400" r="260"/><circle cx="500" cy="400" r="385"/>\n'
m += rot(6, f'<circle cx="{CX}" cy="{CY - 322}" r="62"/>')
pages["mandalas/flower-of-life"] = svg(m)

# ---- nature ---------------------------------------------------------------
f = '<path d="M500 470 C490 560 520 640 500 780"/><path d="M510 470 C500 560 530 640 510 780"/>\n'
f += '<path d="M505 640 C420 600 380 640 360 590 C430 560 480 590 505 640Z"/>\n'
f += '<path d="M507 700 C590 660 640 700 660 650 C590 620 530 650 507 700Z"/>\n'
f += rot(10, petal(500, 330, 70, 220, 55), 500, 330)
f += '<circle cx="500" cy="330" r="70"/><circle cx="500" cy="330" r="40"/>\n'
f += '<path d="M60 780 H940"/>\n'
pages["nature/flower"] = svg(f)

t = '<path d="M450 780 C455 640 465 560 440 470 M550 780 C545 640 535 560 560 470"/>\n'
t += '<path d="M440 470 C300 480 220 400 270 320 C200 250 280 150 380 170 C420 90 580 90 620 170 C720 150 800 250 730 320 C780 400 700 480 560 470"/>\n'
t += '<path d="M360 330 C380 290 430 300 440 340"/><path d="M560 250 C590 220 640 240 640 290"/><path d="M470 200 C490 170 530 180 535 215"/>\n'
t += '<circle cx="400" cy="400" r="26"/><circle cx="600" cy="410" r="26"/><circle cx="500" cy="340" r="26"/>\n'
t += '<path d="M60 780 H940"/><path d="M110 780 q15 -50 30 0 M160 780 q10 -35 20 0 M820 780 q15 -50 30 0"/>\n'
t += '<path d="M130 120 a40 40 0 0 1 20 -75 a55 55 0 0 1 105 10 a35 35 0 0 1 5 65Z"/>\n'
pages["nature/apple-tree"] = svg(t)

# ---- animals --------------------------------------------------------------
fish = '<path d="M150 400 C250 230 520 220 700 400 C520 580 250 570 150 400Z"/>\n'
fish += '<path d="M700 400 L880 270 C850 350 850 450 880 530Z"/>\n'
fish += '<path d="M380 260 C420 190 520 190 560 270"/><path d="M430 560 C450 620 520 630 560 545"/>\n'
fish += '<circle cx="260" cy="375" r="26"/><circle cx="260" cy="375" r="9"/><path d="M200 440 q30 20 60 10"/>\n'
for r in range(3):
    for c in range(4):
        x, y = 340 + c * 80 + (r % 2) * 40, 340 + r * 50
        fish += f'<path d="M{x - 30} {y} a30 30 0 0 0 60 0"/>'
fish += '\n<circle cx="900" cy="150" r="14"/><circle cx="840" cy="100" r="22"/><circle cx="780" cy="165" r="10"/>\n'
pages["animals/fish"] = svg(fish)

wing = ('<path d="M495 380 C400 150 160 120 120 260 C90 380 300 420 495 410Z"/>\n'
        '<path d="M495 420 C380 430 190 520 230 650 C270 740 440 640 495 470Z"/>\n'
        '<circle cx="300" cy="270" r="55"/><circle cx="300" cy="270" r="22"/><circle cx="330" cy="590" r="38"/>\n'
        '<path d="M200 220 q40 -30 90 -20 M170 320 q60 30 140 10"/>\n')
b = wing + f'<g transform="translate(1000 0) scale(-1 1)">{wing}</g>\n'
b += '<ellipse cx="500" cy="420" rx="16" ry="150"/>\n<circle cx="500" cy="250" r="26"/>\n'
b += '<path d="M492 228 C470 160 430 130 400 130 M508 228 C530 160 570 130 600 130"/><circle cx="400" cy="130" r="8"/><circle cx="600" cy="130" r="8"/>\n'
pages["animals/butterfly"] = svg(b)

c = '<path d="M300 330 L270 130 L440 240 M700 330 L730 130 L560 240"/>\n'
c += '<path d="M300 330 C240 460 300 640 500 650 C700 640 760 460 700 330 C640 220 360 220 300 330Z"/>\n'
c += '<ellipse cx="410" cy="400" rx="38" ry="48"/><ellipse cx="590" cy="400" rx="38" ry="48"/>\n'
c += '<ellipse cx="410" cy="405" rx="12" ry="30"/><ellipse cx="590" cy="405" rx="12" ry="30"/>\n'
c += '<path d="M470 480 H530 L500 515Z"/><path d="M500 515 V545 M500 545 C480 575 440 570 430 545 M500 545 C520 575 560 570 570 545"/>\n'
c += '<path d="M180 470 L370 495 M180 540 L370 535 M820 470 L630 495 M820 540 L630 535"/>\n'
c += '<path d="M310 290 L330 190 L400 245 M690 290 L670 190 L600 245"/>\n'
pages["animals/cat"] = svg(c)

# ---- patterns -------------------------------------------------------------
g = ""
for r in range(8):
    for col in range(10):
        x, y = 50 + col * 100, 50 + r * 100
        k = (r + col) % 3
        if k == 0:
            g += f'<circle cx="{x}" cy="{y}" r="40"/><circle cx="{x}" cy="{y}" r="20"/>'
        elif k == 1:
            g += f'<rect x="{x - 38}" y="{y - 38}" width="76" height="76"/><path d="M{x - 38} {y} L{x} {y - 38} L{x + 38} {y} L{x} {y + 38}Z"/>'
        else:
            g += f'<path d="M{x} {y - 42} L{x + 12} {y - 12} L{x + 42} {y} L{x + 12} {y + 12} L{x} {y + 42} L{x - 12} {y + 12} L{x - 42} {y} L{x - 12} {y - 12}Z"/>'
    g += "\n"
pages["patterns/geometric-tiles"] = svg(g)

w = ""
for i in range(9):
    y = 60 + i * 85
    w += f'<path d="M0 {y} q62.5 -60 125 0 t125 0 t125 0 t125 0 t125 0 t125 0 t125 0 t125 0"/>\n'
pages["patterns/waves"] = svg(w)

# ---- scenes ---------------------------------------------------------------
s = '<path d="M60 780 H940"/>\n'
s += '<path d="M260 780 V430 H700 V780"/><path d="M220 430 L480 220 L740 430Z"/>\n'
s += '<rect x="440" y="580" width="110" height="200"/><circle cx="530" cy="685" r="7"/>\n'
s += '<rect x="305" y="500" width="95" height="95"/><path d="M352 500 V595 M305 547 H400"/>\n'
s += '<rect x="590" y="500" width="75" height="95"/><path d="M627 500 V595 M590 547 H665"/>\n'
s += '<rect x="580" y="260" width="55" height="110"/><path d="M570 260 H645"/>\n'
s += '<circle cx="850" cy="130" r="55"/>' + rot(12, '<path d="M850 55 V30"/>', 850, 130) + "\n"
s += '<path d="M90 160 a35 35 0 0 1 15 -65 a50 50 0 0 1 95 10 a32 32 0 0 1 4 55Z"/>\n'
s += '<path d="M120 780 V700 M100 780 q20 -50 20 -80 q20 30 20 80"/>\n'
pages["scenes/little-house"] = svg(s)

for rel, content in pages.items():
    path = os.path.join(OUT, rel + ".svg")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        fh.write(content)
print(f"wrote {len(pages)} pages")
