#!/usr/bin/env python3
"""Generates simple, bold-outline starter pages (CC0): easy shapes and holidays.

Run from the repo root:  python3 tools/gen_simple_pages.py
Output goes to web/pages/<category>/. Re-run tools/build_manifest.py afterwards.
"""
import math
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "web", "pages")
W, H = 1000, 800
_clip = [0]


def svg(body, sw=7):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">\n'
        f'<rect width="{W}" height="{H}" fill="#fff"/>\n'
        f'<g fill="none" stroke="#000" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">\n'
        f"{body}\n</g>\n</svg>\n"
    )


def E(cx, cy, rx, ry=None, fill=True):
    ry = rx if ry is None else ry
    f = ' fill="#fff"' if fill else ""
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"{f}/>\n'


def P(d, fill=True):
    f = ' fill="#fff"' if fill else ""
    return f'<path d="{d}"{f}/>\n'


def dot(cx, cy, r=9):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#000"/>\n'


def mirror(inner, axis=500):
    return f'<g transform="translate({2 * axis} 0) scale(-1 1)">{inner}</g>\n'


def rot(n, inner, cx, cy, start=0.0):
    return "".join(
        f'<g transform="rotate({start + 360 * i / n:.3f} {cx} {cy})">{inner}</g>\n' for i in range(n)
    )


def clipped(shape_d, inner):
    _clip[0] += 1
    cid = f"c{_clip[0]}"
    return f'<clipPath id="{cid}"><path d="{shape_d}"/></clipPath><g clip-path="url(#{cid})">{inner}</g>\n'


def star_d(cx, cy, ro, ri, n=5, rot0=-90):
    pts = []
    for i in range(n * 2):
        r = ro if i % 2 == 0 else ri
        a = math.radians(rot0 + i * 180 / n)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z"


HEART = "M500 380 C400 300 330 250 360 180 C390 120 470 130 500 190 C530 130 610 120 640 180 C670 250 600 300 500 380Z"
BIG_HEART = "M500 740 C150 500 110 250 280 160 C400 100 480 170 500 240 C520 170 600 100 720 160 C890 250 850 500 500 740Z"
EGG = "M500 90 C680 90 780 400 780 520 C780 680 660 740 500 740 C340 740 220 680 220 520 C220 400 320 90 500 90Z"

pages = {}

# ================= EASY =================
b = E(500, 400, 170) + rot(12, P("M500 190 L460 110 L540 110Z"), 500, 400)
b += E(440, 370, 18, fill=False) + dot(440, 370, 14) + dot(560, 370, 14)
b += P("M420 450 Q500 530 580 450", fill=False)
pages["easy/sun"] = svg(b, 9)

b = P("M500 250 C420 190 230 200 220 420 C215 600 330 720 420 700 C460 690 480 680 500 680 C520 680 540 690 580 700 C670 720 785 600 780 420 C770 200 580 190 500 250Z")
b += P("M500 250 C500 200 510 150 540 110", fill=False)
b += P("M540 150 C620 90 720 110 740 170 C660 220 580 200 540 150Z")
b += P("M320 400 C310 470 340 540 380 570", fill=False)
pages["easy/apple"] = svg(b, 9)

b = ""
for cx, cy, r in ((330, 330, 150), (650, 300, 150)):
    b += E(cx, cy, r * 0.88, r) + P(f"M{cx - 20} {cy + r + 25} L{cx} {cy + r} L{cx + 20} {cy + r + 25}Z")
    b += P(f"M{cx} {cy + r + 25} C{cx - 40} {cy + r + 130} {cx + 40} {cy + r + 200} {cx} 780", fill=False)
b += P("M330 210 C280 230 260 290 275 330", fill=False) + P("M650 180 C600 200 580 260 595 300", fill=False)
pages["easy/balloons"] = svg(b, 9)

pages["easy/star"] = svg(P(star_d(500, 420, 340, 140)) + P(star_d(500, 420, 200, 82)) + E(500, 420, 28, fill=False), 9)

b = P("M200 760 V400 L500 140 L800 400 V760Z") + P("M150 420 L500 110 L850 420", fill=False)
b += P("M420 760 V560 H580 V760", fill=False) + dot(555, 665, 8)
b += P("M250 480 H370 V580 H250Z") + P("M630 480 H750 V580 H630Z") + P("M310 480 V580 M250 530 H370 M690 480 V580 M630 530 H750", fill=False)
b += P("M700 250 V150 H770 V310", fill=False)
pages["easy/house"] = svg(b, 9)

b = P("M200 400 C330 200 600 200 740 400 C600 600 330 600 200 400Z")
b += P("M740 400 L900 270 C860 360 860 440 900 530Z") + E(330, 370, 28, fill=False) + dot(330, 370, 12)
b += P("M470 250 C500 180 580 180 610 270", fill=False) + P("M440 520 C470 600 540 600 600 540", fill=False)
b += P("M250 450 Q290 480 330 450", fill=False)
b += E(130, 160, 30) + E(200, 90, 20) + E(110, 80, 14)
pages["easy/fish"] = svg(b, 9)

b = P("M500 450 C500 560 490 660 480 790", fill=False)
b += P("M490 650 C400 620 360 560 380 520 C450 520 490 580 490 650Z") + P("M495 600 C580 560 630 500 610 470 C540 480 500 540 495 600Z")
b += rot(5, E(500, 250, 70, 100), 500, 380) + E(500, 380, 70)
pages["easy/flower"] = svg(b, 9)

b = P("M240 450 L300 720 H700 L760 450Z") + P("M330 450 L360 720 M430 450 L440 720 M570 450 L560 720 M670 450 L640 720", fill=False)
b += P("M200 450 C180 330 330 300 380 330 C400 220 600 220 620 330 C670 300 820 330 800 450Z")
b += E(500, 175, 38) + P("M500 140 C500 100 520 80 550 70", fill=False)
pages["easy/cupcake"] = svg(b, 9)

b = P("M330 380 L500 760 L670 380Z") + P("M390 470 L610 470 M430 560 L570 560 M470 650 L530 650", fill=False)
b += E(500, 330, 190, 100) + E(500, 250, 140, 90) + E(500, 150, 90, 70) + E(510, 85, 24)
pages["easy/ice-cream"] = svg(b, 9)

b = ""
for i, (r) in enumerate((380, 300, 220, 140)):
    b += P(f"M{500 - r} 620 A{r} {r} 0 0 1 {500 + r} 620")
b += P("M120 620 H220 M780 620 H880 M280 620 H360 M640 620 H720", fill=False)
b += P("M100 700 C60 700 60 640 110 640 C110 590 190 590 200 640 C250 640 250 700 200 700Z")
b += P("M800 700 C760 700 760 640 810 640 C810 590 890 590 900 640 C950 640 950 700 900 700Z")
pages["easy/rainbow"] = svg(b, 9)

b = P("M500 60 C610 160 620 360 590 560 H410 C380 360 390 160 500 60Z")
b += E(500, 300, 55) + P("M410 560 L300 680 L350 480 L430 430", fill=False) + P("M590 560 L700 680 L650 480 L570 430", fill=False)
b += P("M440 560 L500 700 L560 560", fill=False) + P("M470 600 L500 760 L530 600", fill=False)
b += P("M300 680 L350 480 C360 400 410 420 430 430 L410 560Z", fill=False)
pages["easy/rocket"] = svg(b, 9)

b = P("M120 560 V460 C120 420 150 400 190 395 L300 280 C320 260 340 250 370 250 H640 C670 250 690 260 710 280 L800 395 C860 405 890 430 890 470 V560Z")
b += P("M290 395 L350 300 H490 V395Z") + P("M530 395 V300 H640 L710 395Z")
b += P("M120 560 H890", fill=False)
for cx in (300, 700):
    b += E(cx, 570, 85) + E(cx, 570, 35)
b += P("M880 440 H850", fill=False) + P("M140 450 H175", fill=False)
pages["easy/car"] = svg(b, 9)

# ================= HALLOWEEN =================
b = E(320, 430, 200, 230) + E(680, 430, 200, 230) + E(500, 430, 185, 250)
b += P("M470 195 C470 140 480 110 470 70 H545 C535 110 550 150 540 195Z")
b += P("M370 400 H450 L410 330Z") + P("M550 400 H630 L590 330Z") + P("M500 440 L465 495 H535Z")
b += P("M375 545 L420 590 L460 548 L500 592 L540 548 L580 590 L625 545 C590 650 410 650 375 545Z")
pages["halloween/jack-o-lantern"] = svg(b)

b = P("M300 700 V330 C300 180 380 110 500 110 C620 110 700 180 700 330 V700 q-40 60 -80 0 t-80 0 t-80 0 t-80 0 t-80 0 Z")
b += P("M300 460 C210 430 180 540 300 570", fill=False) + P("M700 460 C790 430 820 540 700 570", fill=False)
b += E(430, 320, 30, 48) + E(570, 320, 30, 48) + dot(440, 330, 14) + dot(580, 330, 14) + E(500, 460, 42, 58)
pages["halloween/ghost"] = svg(b)

wing = P("M455 390 C390 250 230 220 90 300 C140 330 150 360 160 410 C195 385 235 395 255 450 C290 420 335 435 350 490 C395 470 430 470 455 455Z")
wing += P("M455 390 C380 340 300 330 255 450", fill=False) + P("M455 390 C410 380 350 410 350 490", fill=False)
b = wing + mirror(wing) + E(500, 450, 55, 105) + E(500, 300, 55)
b += P("M465 265 L450 190 L495 245Z") + P("M535 265 L550 190 L505 245Z")
b += E(480, 295, 14) + E(520, 295, 14) + dot(482, 298, 7) + dot(518, 298, 7)
b += P("M485 335 L492 365 L500 340 L508 365 L515 335", fill=False)
pages["halloween/bat"] = svg(b)

b = E(500, 600, 340, 80) + P("M300 590 C330 450 420 250 480 150 C500 100 560 80 600 120 C640 150 600 180 590 200 C570 260 660 470 700 590 C600 650 400 650 300 590Z")
b += P("M355 470 C440 520 570 520 650 470", fill=False) + P("M340 550 C430 600 580 600 660 550", fill=False)
b += P("M470 480 H540 V540 H470Z", fill=False) + P("M490 495 H520 V525 H490Z", fill=False)
pages["halloween/witch-hat"] = svg(b)

b = P("M500 100 C400 100 300 200 260 380 L180 640 C170 700 220 730 280 730 H720 C780 730 830 700 820 640 L740 380 C700 200 600 100 500 100Z")
b += P("M290 400 C400 440 600 440 710 400", fill=False) + P("M230 560 C400 600 600 600 770 560", fill=False)
pages["halloween/candy-corn"] = svg(b)

web = P("M500 400 L500 60 M500 400 L780 120 M500 400 L940 400 M500 400 L780 680 M500 400 L500 750 M500 400 L220 680 M500 400 L60 400 M500 400 L220 120", fill=False)
for r in (90, 180, 280, 380):
    pts = [(500 + r * math.cos(math.radians(a)), 400 + r * math.sin(math.radians(a))) for a in range(-90, 270, 45)]
    cx = [(500 + r * 0.82 * math.cos(math.radians(a + 22.5)), 400 + r * 0.82 * math.sin(math.radians(a + 22.5))) for a in range(-90, 270, 45)]
    d = f"M{pts[0][0]:.0f} {pts[0][1]:.0f}"
    for i in range(1, 9):
        p = pts[i % 8]
        c = cx[i - 1]
        d += f" Q{c[0]:.0f} {c[1]:.0f} {p[0]:.0f} {p[1]:.0f}"
    web += P(d, fill=False)
web += E(700, 520, 36, 30) + E(700, 565, 24, 22) + P("M680 540 L650 600 M690 560 L665 625 M720 560 L735 625 M730 540 L760 600", fill=False)
pages["halloween/spider-web"] = svg(web, 6)

# ================= THANKSGIVING =================
def feather(angle):
    return f'<g transform="rotate({angle} 500 470)">' + P("M500 350 C560 330 580 130 500 70 C420 130 440 330 500 350Z") + P("M500 320 C530 300 540 170 500 130 C460 170 470 300 500 320Z", fill=False) + "</g>\n"


b = "".join(feather(a) for a in (-72, -48, -24, 0, 24, 48, 72))
b += E(500, 540, 150, 175) + P("M395 480 C350 560 390 650 450 660", fill=False) + P("M605 480 C650 560 610 650 550 660", fill=False)
b += E(500, 360, 62, 68) + P("M485 365 H515 L500 405Z") + P("M500 405 C490 450 520 450 510 405", fill=False)
b += E(478, 340, 14) + E(522, 340, 14) + dot(480, 342, 7) + dot(520, 342, 7)
b += P("M455 715 V770 M455 770 l-30 15 M455 770 l0 20 M455 770 l30 15 M545 715 V770 M545 770 l-30 15 M545 770 l0 20 M545 770 l30 15", fill=False)
pages["thanksgiving/turkey"] = svg(b)

b = P("M500 110 C720 200 790 450 500 690 C210 450 280 200 500 110Z") + P("M500 690 V770", fill=False)
b += P("M500 150 V690", fill=False) + P("M500 300 L400 220 M500 300 L600 220 M500 410 L380 320 M500 410 L620 320 M500 520 L400 440 M500 520 L600 440", fill=False)
pages["thanksgiving/autumn-leaf"] = svg(b)

b = P("M500 235 V170 C500 130 560 120 580 160", fill=False)
b += P("M320 360 C320 600 440 700 500 740 C560 700 680 600 680 360Z") + P("M290 360 C280 230 720 230 710 360Z")
b += P("M360 330 C420 280 580 280 640 330 M330 290 C420 240 580 240 670 290", fill=False)
b += P("M390 280 V340 M450 270 V345 M510 268 V345 M570 270 V345 M630 280 V340", fill=False)
pages["thanksgiving/acorn"] = svg(b)

b = E(500, 590, 320, 85) + P("M335 600 L385 190 C390 170 410 160 430 160 H570 C590 160 610 170 615 190 L665 600 C600 650 400 650 335 600Z")
b += P("M355 500 C440 540 560 540 645 500 L650 560 C560 600 440 600 350 560Z") + P("M455 515 H545 V580 H455Z", fill=False) + P("M475 530 H525 V565 H475Z", fill=False)
b += P("M395 240 C450 270 550 270 605 240", fill=False)
pages["thanksgiving/pilgrim-hat"] = svg(b)

b = E(330, 440, 195, 230) + E(670, 440, 195, 230) + E(500, 440, 160, 250) + P("M480 200 C480 150 500 120 480 80 H540 C525 120 545 160 530 200Z")
b += P("M530 130 C620 90 700 110 720 170 C650 200 570 190 530 130Z")
pages["thanksgiving/pumpkin"] = svg(b)

b = P("M470 740 C390 600 380 330 440 160 C470 90 560 110 580 180 C640 330 620 600 530 740Z")
b += P("M500 700 V150 M440 640 C470 520 470 340 460 180 M580 640 C560 520 570 340 560 180", fill=False)
b += P("M470 740 C300 700 220 560 250 380 C330 440 400 560 470 740Z") + P("M530 740 C700 700 780 560 750 380 C670 440 600 560 530 740Z")
pages["thanksgiving/corn"] = svg(b)

# ================= CHRISTMAS =================
b = P(star_d(500, 95, 62, 28))
b += P("M500 150 L380 300 H440 L310 470 H390 L240 660 H760 L610 470 H690 L560 300 H620Z") + P("M450 660 H550 V750 H450Z")
for x, y in ((470, 260), (560, 390), (420, 520), (590, 570), (350, 620), (500, 460)):
    b += E(x, y, 22)
b += P("M410 330 Q500 380 590 330", fill=False) + P("M360 490 Q500 560 640 490", fill=False)
pages["christmas/christmas-tree"] = svg(b)

b = E(500, 620, 150) + E(500, 410, 115) + E(500, 225, 80)
b += P("M430 150 H570 L560 60 H440Z") + E(500, 155, 105, 16) + P("M440 125 H560", fill=False)
b += dot(470, 215, 10) + dot(530, 215, 10) + P("M500 240 L590 255 L500 268Z")
b += P("M455 275 Q500 300 545 275", fill=False)
b += P("M405 300 Q500 345 595 300 V345 Q500 390 405 345Z") + P("M565 345 L590 450 H540 L535 360", fill=False)
b += dot(500, 440, 11) + dot(500, 495, 11) + dot(500, 550, 11)
b += P("M390 400 L260 330 M260 330 l-30 -35 M260 330 l-40 10", fill=False) + P("M610 400 L740 330 M740 330 l30 -35 M740 330 l40 10", fill=False)
pages["christmas/snowman"] = svg(b)

ball = "M500 270 a230 230 0 1 0 0.01 0Z"
b = P("M500 215 V160", fill=False) + E(500, 130, 28, fill=False) + P("M445 215 H555 V275 H445Z")
b += E(500, 500, 230)
deco = P("M250 420 Q500 520 750 420 M250 520 Q500 620 750 520", fill=False)
deco += P(star_d(500, 460, 40, 18), fill=False) + E(380, 400, 14, fill=False) + E(620, 400, 14, fill=False)
deco += E(500, 600, 16, fill=False) + P("M270 640 l30 -30 l30 30 l30 -30 l30 30 l30 -30 l30 30 l30 -30 l30 30 l30 -30 l30 30 l30 -30", fill=False)
b += clipped("M500 270 A230 230 0 1 0 500.1 270Z", deco)
pages["christmas/ornament"] = svg(b)

b = P("M250 400 H750 V740 H250Z") + P("M215 300 H785 V400 H215Z") + P("M450 300 V740 M550 300 V740", fill=False)
b += P("M500 300 C400 150 290 190 340 260 C370 300 450 300 500 300Z") + mirror(P("M500 300 C400 150 290 190 340 260 C370 300 450 300 500 300Z")) + E(500, 300, 28, 22)
pages["christmas/gift"] = svg(b)

arm = P("M500 400 V90", fill=False) + P("M500 250 L420 170 M500 250 L580 170 M500 140 L450 90 M500 140 L550 90", fill=False)
b = rot(6, arm, 500, 400) + P(star_d(500, 400, 55, 55, 6), fill=False)
b += rot(6, E(500, 400 - 310, 14), 500, 400, 0)
pages["christmas/snowflake"] = svg(b, 9)

# ================= EASTER =================
b = P(EGG)
deco = P("M200 280 l45 -40 l45 40 l45 -40 l45 40 l45 -40 l45 40 l45 -40 l45 40 l45 -40 l45 40 l45 -40 l45 40", fill=False)
deco += P("M200 360 H800 M200 400 H800", fill=False) + P("M200 560 Q350 500 500 560 T800 560", fill=False) + P("M200 620 Q350 560 500 620 T800 620", fill=False)
for x in range(280, 760, 90):
    deco += E(x, 480, 18, fill=False)
b += clipped(EGG, deco)
pages["easter/easter-egg"] = svg(b)

ear = P("M430 260 C380 140 390 50 440 60 C490 70 490 190 480 260Z") + P("M440 230 C415 150 425 100 445 105 C465 110 465 170 462 230Z", fill=False)
b = ear + mirror(ear) + E(500, 610, 175, 170) + E(500, 650, 105, 110, fill=False) + E(500, 345, 125, 110)
b += E(445, 330, 18) + E(555, 330, 18) + dot(448, 333, 9) + dot(552, 333, 9) + P("M485 365 H515 L500 385Z")
b += P("M500 385 V405 M500 405 Q475 430 450 410 M500 405 Q525 430 550 410", fill=False)
b += P("M390 370 L300 355 M390 390 L300 400 M610 370 L700 355 M610 390 L700 400", fill=False)
b += E(430, 765, 55, 28) + E(570, 765, 55, 28)
pages["easter/bunny"] = svg(b)

b = E(500, 290, 160, 145) + E(350, 390, 45, 65) + E(650, 390, 45, 65)
b += P("M500 150 C480 100 440 90 430 120 M500 150 C500 90 540 70 560 100 M500 150 C520 110 570 115 575 140", fill=False)
b += E(430, 260, 20) + E(570, 260, 20) + dot(434, 263, 10) + dot(566, 263, 10) + P("M465 300 H535 L500 350Z")
b += P("M240 480 l65 -55 l65 55 l65 -55 l65 55 l65 -55 l65 55 l65 -55 l65 55 V560 C760 680 650 750 500 750 C350 750 240 680 240 560Z")
b += clipped("M240 480 H760 V560 C760 680 650 750 500 750 C350 750 240 680 240 560Z", P("M200 600 Q350 540 500 600 T800 600 M200 670 Q350 610 500 670 T800 670", fill=False))
pages["easter/baby-chick"] = svg(b)

egg1 = lambda x, y: E(x, y, 68, 88)
b = P("M200 450 C200 100 800 100 800 450", fill=False) + P("M255 450 C255 170 745 170 745 450", fill=False)
for x, y in ((370, 395), (500, 365), (630, 395)):
    b += egg1(x, y) + P(f"M{x - 66} {y - 10} Q{x} {y + 25} {x + 66} {y - 10}", fill=False) + E(x, y + 40, 12, fill=False)
b += P("M170 450 H830 L770 740 H230Z")
b += P("M215 540 H785 M232 640 H768", fill=False) + P("M300 450 L320 740 M400 450 L410 740 M500 450 V740 M600 450 L590 740 M700 450 L680 740", fill=False)
b += P("M150 430 H850 V470 H150Z")
pages["easter/easter-basket"] = svg(b)

b = P("M500 740 V420", fill=False) + P("M500 650 C400 640 360 560 380 500 C450 520 500 580 500 650Z") + P("M500 600 C600 590 640 510 620 460 C550 480 500 540 500 600Z")
b += P("M500 420 C380 400 330 250 380 130 C420 190 460 200 500 230 C540 200 580 190 620 130 C670 250 620 400 500 420Z")
b += P("M500 230 V420", fill=False)
pages["easter/tulip"] = svg(b)

# ================= OTHER HOLIDAYS =================
b = P(BIG_HEART) + '<g transform="translate(500 450) scale(.66) translate(-500 -450)">' + P(BIG_HEART) + "</g>\n"
b += P("M500 300 C440 240 380 290 420 340 C450 380 500 400 500 400 C500 400 550 380 580 340 C620 290 560 240 500 300Z")
pages["other-holidays/valentine-heart"] = svg(b)

b = P("M120 200 H880 V640 H120Z") + P("M120 200 L500 470 L880 200", fill=False) + P("M120 640 L400 400 M880 640 L600 400", fill=False)
b += '<g transform="translate(500 470) scale(.28) translate(-500 -380)">' + P(HEART) + "</g>\n"
for x, y, s in ((200, 120, .18), (800, 110, .22), (880, 730, .15)):
    b += f'<g transform="translate({x} {y}) scale({s}) translate(-500 -380)">' + P(HEART) + "</g>\n"
pages["other-holidays/love-letter"] = svg(b)

leaf = f'<g transform="translate(0 100)">{P(HEART)}{P("M500 380 V210", fill=False)}</g>'
b = "".join(f'<g transform="rotate({a} 500 480)">{leaf}</g>\n' for a in (0, 120, 240))
b += P("M500 480 C505 560 480 650 420 720", fill=False)
pages["other-holidays/shamrock"] = svg(b)

for rel, content in pages.items():
    path = os.path.join(OUT, rel + ".svg")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        fh.write(content)
print(f"wrote {len(pages)} pages")
