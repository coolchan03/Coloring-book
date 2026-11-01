#!/usr/bin/env python3
"""Generates more simple, bold-outline starter pages (CC0): animals, ocean, space, food,
vehicles, birthday and extras for existing categories.

Run from the repo root:  python3 tools/gen_more_pages.py   (then tools/build_manifest.py)
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from pagelib import E, P, dot, mirror, rot, clipped, star_d, petal, svg  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), "..", "web", "pages")
pages = {}

# ================= CUTE ANIMALS =================
ear = P("M335 300 C240 250 185 390 235 520 C290 545 335 480 340 400Z")
b = E(500, 700, 170, 110) + ear + mirror(ear) + E(500, 420, 205, 185)
b += E(425, 390, 26, fill=False) + dot(432, 395, 13) + E(575, 390, 26, fill=False) + dot(568, 395, 13)
b += E(500, 475, 48, 34) + P("M500 510 V545 M500 545 Q465 585 425 550 M500 545 Q535 585 575 550", fill=False)
b += P("M470 565 Q500 650 530 565Z") + E(410, 770, 48, 26) + E(590, 770, 48, 26)
pages["cute-animals/dog"] = svg(b)

b = E(500, 450, 235, 295)
belly = "".join(f'<path d="M{x} {y} q25 30 50 0"/>' for y in range(430, 700, 55) for x in range(400 + (y // 55 % 2) * 25, 620, 50))
b += clipped("M500 250 C650 250 640 700 500 700 C360 700 350 250 500 250Z", belly)
b += E(410, 330, 78) + E(590, 330, 78) + E(410, 330, 32) + E(590, 330, 32) + dot(418, 338, 14) + dot(582, 338, 14)
b += P("M468 400 H532 L500 455Z") + P("M320 190 L360 275 L415 215Z") + P("M680 190 L640 275 L585 215Z")
b += P("M270 480 C210 560 240 650 300 680", fill=False) + P("M730 480 C790 560 760 650 700 680", fill=False)
b += P("M150 745 H850", fill=False) + E(430, 735, 45, 20) + E(570, 735, 45, 20)
pages["cute-animals/owl"] = svg(b)

leg = E(350, 270, 60, 40, rot=-30)
b = leg + mirror(leg) + E(350, 590, 60, 40, rot=30) + mirror(E(350, 590, 60, 40, rot=30))
b += P("M270 420 L170 440 L270 470Z") + E(760, 420, 80, 65) + E(790, 405, 12, fill=False) + dot(792, 407, 6)
b += P("M790 450 Q815 462 835 445", fill=False) + E(500, 420, 245, 200)
b += P("M500 345 L565 383 V457 L500 495 L435 457 V383Z")
for ang in range(30, 360, 60):
    a = math.radians(ang)
    b += P(f"M{500 + 65 * math.cos(a):.0f} {420 + 75 * math.sin(a):.0f} L{500 + 230 * math.cos(a):.0f} {420 + 188 * math.sin(a):.0f}", fill=False)
pages["cute-animals/turtle"] = svg(b)

b = P("M240 480 L150 420 L250 570Z") + E(480, 520, 270, 175) + E(700, 300, 115)
b += P("M790 300 L920 325 L800 375Z") + E(725, 275, 20, fill=False) + dot(730, 278, 9)
b += P("M370 500 C430 430 570 450 590 540 C520 600 420 590 370 500Z")
b += P("M80 730 q40 -35 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0", fill=False)
pages["cute-animals/duck"] = svg(b)

ear = P("M335 270 L290 130 L450 215Z")
b = ear + mirror(ear) + E(500, 420, 235, 205) + E(500, 480, 105, 78) + E(465, 480, 13) + E(535, 480, 13)
b += dot(415, 385, 14) + dot(585, 385, 14) + P("M440 580 Q500 625 560 580", fill=False)
b += P("M300 330 Q320 305 345 325", fill=False) + P("M700 330 Q680 305 655 325", fill=False)
pages["cute-animals/pig"] = svg(b)

b = E(330, 265, 75) + E(330, 265, 36, fill=False) + mirror(E(330, 265, 75) + E(330, 265, 36, fill=False))
b += E(500, 440, 225, 205) + E(500, 510, 100, 80) + E(500, 478, 34, 24) + P("M500 500 V535 M500 535 Q470 565 440 545 M500 535 Q530 565 560 545", fill=False)
b += E(415, 395, 24, fill=False) + dot(420, 399, 12) + E(585, 395, 24, fill=False) + dot(580, 399, 12)
pages["cute-animals/bear"] = svg(b)

b = E(500, 745, 360, 48) + P("M200 520 C200 380 300 320 500 320 C700 320 800 380 800 520 C800 640 650 700 500 700 C350 700 200 640 200 520Z")
b += E(325, 305, 78) + E(325, 305, 32, fill=False) + dot(330, 308, 14) + mirror(E(325, 305, 78) + E(325, 305, 32, fill=False) + dot(330, 308, 14))
b += P("M280 550 Q500 680 720 550", fill=False) + dot(460, 445, 8) + dot(540, 445, 8)
pages["cute-animals/frog"] = svg(b)

fin = P("M315 385 C245 445 265 545 325 565 C345 505 335 445 315 385Z")
b = E(500, 440, 205, 295) + E(500, 510, 135, 215) + fin + mirror(fin)
b += E(435, 255, 28, fill=False) + dot(440, 258, 12) + E(565, 255, 28, fill=False) + dot(560, 258, 12)
b += P("M468 300 H532 L500 345Z") + E(430, 745, 62, 24) + E(570, 745, 62, 24)
pages["cute-animals/penguin"] = svg(b)

b = P("M450 180 Q430 110 390 100 M550 180 Q570 110 610 100", fill=False)
b += E(500, 440, 235, 235) + P("M385 235 C385 150 615 150 615 235Z") + P("M500 215 V675", fill=False)
b += E(395, 390, 40) + E(605, 390, 40) + E(410, 535, 34) + E(590, 535, 34) + E(380, 460, 22) + E(620, 460, 22)
pages["cute-animals/ladybug"] = svg(b)

wing = E(430, 290, 70, 145, rot=-25)
b = wing + E(560, 280, 70, 145, rot=25)
b += P("M300 440 L225 440 L300 415Z") + E(500, 450, 205, 150)
b += clipped("M295 450 C295 300 705 300 705 450 C705 600 295 600 295 450Z", P("M430 300 C470 400 470 500 430 600", fill=False) + P("M530 300 C570 400 570 500 530 600", fill=False))
b += E(720, 420, 100) + E(745, 395, 18, fill=False) + dot(748, 398, 8) + P("M730 460 Q765 480 790 455", fill=False)
b += P("M690 335 Q670 270 625 255 M760 335 Q790 270 835 262", fill=False)
pages["cute-animals/bee"] = svg(b)

ears = E(285, 430, 135, 185) + E(285, 430, 80, 120, fill=False)
b = ears + mirror(ears) + E(500, 400, 205, 215)
b += P("M445 520 C430 650 455 730 515 748 C565 758 580 700 545 692 C520 685 535 610 555 520Z")
b += E(415, 355, 24, fill=False) + dot(420, 358, 12) + E(585, 355, 24, fill=False) + dot(580, 358, 12)
b += P("M410 520 Q380 560 400 600 M590 520 Q620 560 600 600", fill=False)
pages["cute-animals/elephant"] = svg(b)

b = rot(14, E(500, 190, 62), 500, 410) + E(500, 410, 165, 175)
b += E(430, 385, 22, fill=False) + dot(434, 388, 11) + E(570, 385, 22, fill=False) + dot(566, 388, 11)
b += P("M468 450 H532 L500 485Z") + P("M500 485 V520 M500 520 Q465 560 430 535 M500 520 Q535 560 570 535", fill=False)
b += P("M300 280 L270 200 L360 245Z") + P("M700 280 L730 200 L640 245Z")
pages["cute-animals/lion"] = svg(b)


# ================= OCEAN =================
tent = lambda x: P(f"M{x} 440 C{x - 60} 540 {x - 130} 560 {x - 115} 655 C{x - 105} 715 {x - 40} 715 {x - 30} 655 C{x - 20} 595 {x + 10} 545 {x + 60} 470Z")
b = tent(330) + mirror(tent(330)) + tent(440) + mirror(tent(440)) + E(500, 300, 195, 175)
b += E(425, 300, 38) + E(575, 300, 38) + dot(432, 306, 15) + dot(568, 306, 15) + P("M440 390 Q500 435 560 390", fill=False)
b += E(500, 180, 18, fill=False) + E(400, 200, 14, fill=False) + E(600, 200, 14, fill=False)
pages["ocean/octopus"] = svg(b)

b = P("M120 480 C120 300 400 240 600 310 C690 340 750 400 800 400 L905 290 C905 380 890 450 850 500 C880 520 900 550 920 600 L820 560 C770 610 670 660 500 660 C290 660 120 620 120 480Z")
b += P("M200 560 C320 600 520 620 700 560", fill=False) + P("M240 600 C350 625 480 635 600 610", fill=False) + E(250, 430, 18, fill=False) + dot(253, 432, 9)
b += P("M380 262 C380 190 345 170 310 160 M380 262 C380 190 415 170 450 160 M380 262 V180", fill=False)
b += P("M80 735 q40 -35 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0", fill=False)
pages["ocean/whale"] = svg(b)

b = P(star_d(500, 410, 340, 140)) + rot(5, P("M500 320 V240", fill=False) + dot(500, 270, 9) + dot(500, 215, 9) + dot(500, 330, 9), 500, 410)
b += E(500, 410, 45, fill=False)
pages["ocean/starfish"] = svg(b)

b = P("M280 430 C280 150 720 150 720 430 q-27.5 38 -55 0 t-55 0 t-55 0 t-55 0 t-55 0 t-55 0 t-55 0 t-55 0Z")
for i, x in enumerate((340, 420, 500, 580, 660)):
    b += P(f"M{x} 470 q-25 60 0 120 t0 120", fill=False) if i % 2 == 0 else P(f"M{x} 470 q25 60 0 120 t0 120", fill=False)
b += E(400, 300, 28, fill=False) + E(520, 250, 24, fill=False) + E(600, 340, 30, fill=False) + E(470, 360, 20, fill=False)
pages["ocean/jellyfish"] = svg(b)

claw = P("M220 345 C130 335 100 220 170 180 C190 230 230 230 250 190 C310 255 285 335 220 345Z")
b = P("M300 470 L170 560 M310 520 L190 640 M340 560 L240 700", fill=False) + mirror(P("M300 470 L170 560 M310 520 L190 640 M340 560 L240 700", fill=False))
b += P("M320 440 L230 345", fill=False) + claw + mirror(P("M320 440 L230 345", fill=False) + claw)
b += E(500, 500, 235, 150) + P("M440 355 V310", fill=False) + P("M560 355 V310", fill=False) + E(440, 290, 28) + E(560, 290, 28) + dot(442, 293, 11) + dot(558, 293, 11)
b += P("M440 550 Q500 600 560 550", fill=False)
pages["ocean/crab"] = svg(b)

fan = ""
for i in range(7):
    a = math.radians(-160 + i * 20)
    fan += P(f"M500 700 L{500 + 330 * math.cos(a):.0f} {700 + 480 * math.sin(a):.0f}", fill=False)
b = P("M500 700 C260 600 200 400 260 300 C340 180 660 180 740 300 C800 400 740 600 500 700Z") + clipped("M500 700 C260 600 200 400 260 300 C340 180 660 180 740 300 C800 400 740 600 500 700Z", fan)
b += P("M430 700 H570 L555 750 H445Z")
pages["ocean/shell"] = svg(b)

# ================= SPACE =================
back = P("M170 400 A330 80 0 0 1 830 400", fill=False) + P("M230 400 A270 62 0 0 1 770 400", fill=False)
front = P("M170 400 A330 80 0 0 0 830 400", fill=False) + P("M230 400 A270 62 0 0 0 770 400", fill=False)
b = f'<g transform="rotate(-18 500 400)">{back}{E(500, 400, 190)}{clipped("M310 400 A190 190 0 1 0 690 400 A190 190 0 1 0 310 400Z", P("M300 330 Q500 370 700 330 M300 450 Q500 490 700 450", fill=False))}{front}</g>'
b += P(star_d(150, 150, 40, 18), fill=False) + P(star_d(860, 140, 30, 13), fill=False) + P(star_d(820, 660, 36, 16), fill=False) + P(star_d(140, 650, 28, 12), fill=False)
pages["space/ringed-planet"] = svg(b)

b = P("M330 470 L260 760 H740 L670 470Z") + P("M360 380 C360 190 640 190 640 380Z") + E(500, 420, 330, 85)
for x in range(240, 780, 90):
    b += E(x, 425, 18)
b += E(500, 275, 24, fill=False) + P(star_d(150, 150, 36, 16), fill=False) + P(star_d(860, 200, 30, 13), fill=False)
pages["space/ufo"] = svg(b)

eye = E(405, 330, 68, 100, rot=25) + dot(400, 345, 26)
b = P("M440 560 V720 H560 V560") + P("M500 120 C720 120 780 300 700 440 C650 530 570 560 500 560 C430 560 350 530 300 440 C220 300 280 120 500 120Z")
b += eye + mirror(eye) + P("M455 470 Q500 500 545 470", fill=False) + P("M420 130 L380 60 M580 130 L620 60", fill=False) + E(375, 55, 20) + E(625, 55, 20)
b += P("M440 640 L360 720 M560 640 L640 720", fill=False)
pages["space/alien"] = svg(b)

b = P("M600 140 A270 270 0 1 0 600 660 A300 300 0 0 1 600 140Z")
for x, y, r in ((780, 220, 55), (850, 480, 40), (720, 650, 34), (140, 140, 34)):
    b += P(star_d(x, y, r, r * 0.42), fill=False)
b += E(290, 400, 18, fill=False) + dot(293, 403, 8) + P("M240 470 Q290 500 330 465", fill=False)
pages["space/moon-and-stars"] = svg(b)

# ================= FOOD =================
b = P("M500 745 L170 230 C340 165 660 165 830 230Z") + P("M170 230 C340 150 660 150 830 230 L808 295 C660 225 340 225 192 295Z")
for x, y in ((430, 380), (580, 340), (510, 500), (445, 590), (575, 560)):
    b += E(x, y, 46) + E(x - 10, y - 8, 10, fill=False)
pages["food/pizza"] = svg(b)

b = E(500, 410, 340, 265) + E(500, 395, 295, 225) + E(500, 395, 98, 72)
for x, y, a in ((330, 330, 20), (440, 250, -40), (570, 255, 30), (690, 330, -20), (700, 480, 60), (330, 500, -50), (460, 550, 10), (600, 550, -35), (540, 320, 70)):
    b += f'<g transform="rotate({a} {x} {y})"><path d="M{x - 22} {y} h44" stroke-width="12"/></g>'
pages["food/donut"] = svg(b)

b = P("M375 440 C400 300 480 230 560 170 M625 420 C600 300 570 230 560 170", fill=False)
b += P("M560 170 C640 105 745 130 765 185 C700 230 610 220 560 170Z") + E(375, 575, 120) + E(625, 560, 120)
b += P("M300 560 C290 520 310 490 340 480", fill=False) + P("M550 545 C540 505 560 475 590 465", fill=False)
pages["food/cherries"] = svg(b)

b = P("M110 360 A390 390 0 0 0 890 360Z") + P("M165 360 A335 335 0 0 0 835 360Z")
for x, y, a in ((400, 450, 20), (500, 520, -10), (600, 450, -20), (330, 400, 40), (670, 400, -40), (500, 410, 0), (440, 560, 10), (560, 570, -10)):
    b += E(x, y, 11, 22, rot=a)
pages["food/watermelon"] = svg(b)

seeds = "".join(E(x, 245, 10, 17, rot=r) for x, r in ((380, 20), (450, -15), (520, 15), (590, -20), (650, 10)))
b = P("M200 340 C200 170 800 170 800 340Z") + seeds + P("M160 360 H840 q0 40 -45 40 q-38 35 -76 0 t-76 0 t-76 0 t-76 0 t-76 0 t-76 0 q-45 0 -45 -40Z")
b += P("M220 520 H780 V450 H220Z", fill=True) + P("M250 520 L500 610 L750 520Z") + P("M200 610 H800 C800 700 730 720 650 720 H350 C270 720 200 700 200 610Z")
pages["food/burger"] = svg(b)

b = P("M500 745 C300 665 225 440 255 315 C285 205 400 190 500 235 C600 190 715 205 745 315 C775 440 700 665 500 745Z")
b += P("M500 240 L410 160 L465 205 L500 115 L535 205 L590 160Z")
for x, y in ((390, 380), (500, 340), (610, 380), (440, 470), (560, 470), (350, 500), (650, 500), (500, 560), (430, 620), (570, 620)):
    b += E(x, y, 10, 17, rot=0)
pages["food/strawberry"] = svg(b)

# ================= VEHICLES =================
b = P("M80 650 H920", fill=False) + P("M600 620 L710 660 H600Z") + P("M200 300 H340 V420 H200Z") + P("M180 285 H360 V310 H180Z")
b += P("M340 345 H620 V560 H340Z") + P("M200 420 H620 V560 H200Z") + P("M525 345 L515 255 H595 L585 345Z")
b += P("M235 335 H305 V400 H235Z", fill=False)
b += E(560, 215, 32) + E(610, 160, 42) + E(675, 100, 52)
for x in (290, 420, 540):
    b += E(x, 590, 62) + E(x, 590, 24, fill=False)
pages["vehicles/train"] = svg(b)

b = P("M170 520 H830 L730 690 H270Z") + P("M500 520 V160", fill=False) + P("M500 175 L500 490 L740 490Z") + P("M470 230 V490 H290Z")
b += P("M500 160 L585 185 L500 210", fill=True) + P("M215 580 H785 M250 640 H750", fill=False)
b += P("M60 740 q40 -35 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0", fill=False)
pages["vehicles/boat"] = svg(b)

b = P("M310 395 L195 250 H295 L450 380Z") + P("M150 400 C150 330 350 325 700 335 C800 340 880 375 880 400 C880 425 800 460 700 465 C350 475 150 465 150 400Z")
b += P("M420 430 L330 650 H440 L610 440Z")
for x in range(260, 620, 60):
    b += E(x, 395, 20)
b += P("M740 355 C790 360 820 375 840 395 H740Z")
pages["vehicles/airplane"] = svg(b)

b = P("M500 100 C720 100 800 290 720 410 C690 455 640 485 600 505 H400 C360 485 310 455 280 410 C200 290 280 100 500 100Z")
b += clipped("M500 100 C720 100 800 290 720 410 C690 455 640 485 600 505 H400 C360 485 310 455 280 410 C200 290 280 100 500 100Z", P("M500 90 C420 200 420 400 450 520", fill=False) + P("M500 90 C580 200 580 400 550 520", fill=False) + P("M280 280 Q500 330 720 280", fill=False))
b += P("M405 505 L435 575 M595 505 L565 575", fill=False) + P("M430 575 H570 V690 H430Z") + P("M430 620 H570", fill=False)
b += P(star_d(150, 150, 36, 16), fill=False) + P(star_d(860, 200, 30, 13), fill=False) + E(160, 620, 70, 35) + E(240, 640, 60, 30) + E(850, 600, 80, 38)
pages["vehicles/hot-air-balloon"] = svg(b)

# ================= BIRTHDAY =================
b = E(500, 720, 400, 38) + P("M230 620 V500 H770 V620 C770 665 700 690 500 690 C300 690 230 665 230 620Z") + P("M300 500 V380 H700 V500Z")
b += P("M300 380 q31 45 62 0 t62 0 t62 0 t62 0 t62 0 t62 0 V345 H300Z", fill=True)
b += "".join(P(f"M{x} 380 V300 H{x + 28} V380") + P(f"M{x + 14} 295 C{x - 8} 265 {x + 14} 240 {x + 14} 225 C{x + 18} 245 {x + 36} 265 {x + 14} 295Z") for x in (390, 486, 582))
b += P("M230 540 q30 30 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0", fill=False)
pages["birthday/birthday-cake"] = svg(b)

hat = "M500 120 L260 700 H740Z"
deco = P("M200 610 l35 -35 l35 35 l35 -35 l35 35 l35 -35 l35 35 l35 -35 l35 35 l35 -35 l35 35 l35 -35 l35 35", fill=False)
deco += P("M200 470 q40 -45 80 0 t80 0 t80 0 t80 0 t80 0", fill=False) + E(440, 660, 18, fill=False) + E(570, 540, 18, fill=False) + E(500, 380, 18, fill=False) + E(480, 290, 14, fill=False)
b = P(hat) + clipped(hat, deco) + E(500, 110, 45) + P("M200 700 H800", fill=False) + P(star_d(150, 220, 34, 15), fill=False) + P(star_d(860, 260, 28, 12), fill=False)
pages["birthday/party-hat"] = svg(b)

# ================= NATURE EXTRAS =================
b = P("M500 460 C495 560 515 650 500 780", fill=False) + P("M505 640 C420 600 380 640 350 585 C430 555 480 590 505 640Z") + P("M507 700 C590 660 640 700 665 645 C590 615 530 650 507 700Z")
b += rot(18, petal(500, 330, 95, 270, 45), 500, 330) + E(500, 330, 100) + E(500, 330, 70, fill=False)
b += "".join(dot(500 + r * math.cos(a), 330 + r * math.sin(a), 6) for r in (20, 45) for a in [i * 2 * math.pi / (6 if r == 20 else 10) for i in range(6 if r == 20 else 10)])
pages["nature/sunflower"] = svg(b)

b = P("M390 420 V630 C390 700 610 700 610 630 V420Z") + P("M180 430 C180 230 820 230 820 430Z")
for x, y, r in ((330, 340, 38), (500, 295, 44), (670, 340, 38), (420, 395, 22), (590, 395, 22)):
    b += E(x, y, r)
b += P("M100 745 H900", fill=False) + P("M170 745 q20 -45 40 0 M780 745 q20 -45 40 0", fill=False)
pages["nature/mushroom"] = svg(b)

b = P("M400 745 V300 C400 190 600 190 600 300 V745Z") + P("M400 520 H330 C285 520 285 450 285 400 C285 365 340 365 340 400 V440 H400", fill=True)
b += P("M600 450 H670 C715 450 715 380 715 330 C715 295 660 295 660 330 V370 H600", fill=True)
b += P("M450 300 V700 M550 300 V700", fill=False) + P("M500 190 q-30 -40 0 -70 q30 30 0 70Z") + P("M200 745 H800", fill=False)
pages["nature/cactus"] = svg(b)

b = P("M500 100 V170", fill=False) + P("M140 400 C140 230 330 170 500 170 C670 170 860 230 860 400 q-36 -45 -72 0 t-72 0 t-72 0 t-72 0 t-72 0 t-72 0 t-72 0 t-72 0Z")
b += P("M500 400 V640 C500 720 400 720 400 650", fill=False) + P("M300 400 C320 300 380 240 440 175 M700 400 C680 300 620 240 560 175", fill=False)
for x, y in ((210, 590), (330, 700), (610, 610), (760, 690), (840, 560), (170, 740)):
    b += P(f"M{x} {y} q-14 -24 0 -40 q14 16 0 40Z")
pages["nature/umbrella"] = svg(b)

# ================= HALLOWEEN / THANKSGIVING / CHRISTMAS / EASTER EXTRAS =================
b = P("M520 740 C330 740 270 600 300 480 C320 410 380 380 440 380 C560 380 640 460 640 580 C640 660 600 740 520 740Z")
b += P("M640 600 C760 620 820 540 780 450 C760 410 800 380 830 400", fill=False) + E(450, 330, 125, 110)
b += P("M345 265 L330 150 L420 225Z") + P("M555 265 L570 150 L480 225Z") + E(410, 320, 24) + E(490, 320, 24) + dot(412, 322, 12) + dot(488, 322, 12)
b += P("M435 365 H465 L450 385Z") + P("M300 350 L370 360 M300 385 L370 380 M600 350 L530 360 M600 385 L530 380", fill=False)
b += P("M370 740 V700 M470 745 V700", fill=False)
pages["halloween/black-cat"] = svg(b)

b = P("M150 760 V400 L320 250 V150 H400 V210 L500 120 L600 210 V150 H680 V250 L850 400 V760Z") + P("M230 760 V560 H330 V760", fill=False)
b += E(500, 330, 70) + P("M500 260 V400 M430 330 H570", fill=False) + P("M620 450 H740 V540 H620Z") + P("M680 450 V540 M620 495 H740", fill=False) + P("M260 450 H380 V540 H260Z") + P("M320 450 V540 M260 495 H380", fill=False)
b += P("M420 760 V610 C420 550 580 550 580 610 V760", fill=False)
b += P("M60 90 A45 45 0 1 0 105 160 A34 34 0 1 1 60 90Z") + P("M760 120 q25 -25 50 0 q25 -25 50 0 q-25 25 -50 40 q-25 -15 -50 -40Z")
pages["halloween/haunted-house"] = svg(b)

b = E(500, 400, 355) + "".join(E(500 + 330 * math.cos(math.radians(a)), 400 + 330 * math.sin(math.radians(a)), 30) for a in range(0, 360, 20)) + E(500, 400, 330) + E(500, 400, 265)
b += E(500, 400, 170, fill=False) + rot(8, petal(500, 400, 20, 120, 34), 500, 400) + E(500, 400, 28, fill=False)
pages["thanksgiving/pumpkin-pie"] = svg(b)

b = P("M300 140 H620 V580 C620 650 580 700 510 700 C440 700 400 650 400 600 V560 H300Z") + P("M300 215 H620 M300 290 H620 M300 365 H620 M300 440 H620", fill=False)
b += P("M300 140 V120 C300 80 620 80 620 120 V140Z") + P("M300 560 C260 560 220 590 230 650 C240 720 330 740 400 700", fill=False)
b += P("M650 160 C720 100 810 130 790 210 C740 230 680 210 650 160Z") + P("M650 160 C700 180 750 190 790 210", fill=False)
pages["christmas/stocking"] = svg(b)

curve = "M600 700 V320 C600 170 400 150 330 260"
b = P(curve, fill=False).replace('<path', '<path stroke-width="95" stroke="#000"') + P(curve, fill=False).replace('<path', '<path stroke-width="79" stroke="#fff"')
for i in range(9):
    y = 640 - i * 48
    b += P(f"M555 {y} L645 {y - 48}", fill=False)
pages["christmas/candy-cane"] = svg(b)

b = rot(16, petal(500, 400, 150, 290, 42), 500, 400) + E(500, 400, 150) + E(500, 400, 295, fill=False)
b += "".join(E(500 + 235 * math.cos(math.radians(a)), 400 + 235 * math.sin(math.radians(a)), 16) for a in range(15, 360, 60))
b += P("M500 690 C420 640 360 700 360 740 C420 770 470 740 500 690Z") + P("M500 690 C580 640 640 700 640 740 C580 770 530 740 500 690Z") + E(500, 690, 30, 25)
pages["christmas/wreath"] = svg(b)

antler = P("M385 270 C345 200 320 150 330 80 M355 210 C320 200 290 190 270 160 M345 150 C320 120 300 100 295 70", fill=False)
b = antler + mirror(antler) + P("M360 380 C320 330 310 290 335 270", fill=False)
b += E(500, 440, 200, 215) + E(500, 600, 70, 55) + E(500, 580, 38, 28) + dot(500, 578, 14) + E(420, 400, 24, fill=False) + dot(424, 403, 12) + E(580, 400, 24, fill=False) + dot(576, 403, 12)
b += E(300, 380, 55, 28, rot=-20) + mirror(E(300, 380, 55, 28, rot=-20))
b += P("M500 630 V660 M500 660 Q470 690 440 670 M500 660 Q530 690 560 670", fill=False)
pages["christmas/reindeer"] = svg(b)

b = P("M500 750 C340 500 280 270 380 200 C440 160 560 160 620 200 C720 270 660 500 500 750Z")
b += P("M360 280 H420 M345 360 H425 M385 450 H450 M520 380 H600 M545 460 H610 M500 280 H580", fill=False)
b += P("M500 195 C430 120 360 80 330 40 C440 50 490 110 500 195Z") + P("M500 195 C500 110 520 70 540 20 C570 90 540 160 500 195Z") + P("M500 195 C570 130 640 100 690 90 C660 150 580 190 500 195Z")
pages["easter/carrot"] = svg(b)

# ================= MORE MANDALAS =================
def ring_of(n, r, shape):
    return rot(n, shape, 500, 400)


b = E(500, 400, 25) + ring_of(8, 0, E(500, 340, 22, 40)) + ring_of(16, 0, P("M500 330 C470 280 470 240 500 200 C530 240 530 280 500 330Z"))
b += E(500, 400, 150, fill=False) + ring_of(16, 0, E(500, 215, 20)) + E(500, 400, 245, fill=False) + ring_of(24, 0, P("M500 155 C488 110 488 80 500 55 C512 80 512 110 500 155Z"))
b += ring_of(24, 0, E(500, 150, 12)) + E(500, 400, 350, fill=False)
pages["mandalas/lotus-mandala"] = svg(b, 6)

b = P(star_d(500, 400, 350, 175, 12)) + P(star_d(500, 400, 250, 125, 12)) + P(star_d(500, 400, 150, 75, 12)) + E(500, 400, 60) + E(500, 400, 28, fill=False)
b += ring_of(12, 0, E(500, 90, 14, fill=False))
pages["mandalas/spiky-star-mandala"] = svg(b, 6)

b = E(500, 400, 360, fill=False) + E(500, 400, 300, fill=False) + ring_of(36, 0, P("M500 100 L488 40 H512Z"))
b += ring_of(18, 0, P("M500 120 C440 190 440 270 500 330 C560 270 560 190 500 120Z")) + ring_of(18, 0, E(500, 235, 14, fill=False))
b += E(500, 400, 90) + ring_of(9, 0, P("M500 400 C470 360 470 320 500 290 C530 320 530 360 500 400Z"))
pages["mandalas/sunburst-mandala"] = svg(b, 6)

for rel, content in pages.items():
    path = os.path.join(OUT, rel + ".svg")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as fh:
        fh.write(content)
print(f"wrote {len(pages)} pages")
