"""Small SVG helpers shared by the page generators (bold outlines on a white page)."""
import math

W, H = 1000, 800
_clip = [0]


def svg(body, sw=7):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">\n'
        f'<rect width="{W}" height="{H}" fill="#fff"/>\n'
        f'<g fill="none" stroke="#000" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">\n'
        f"{body}\n</g>\n</svg>\n"
    )


def E(cx, cy, rx, ry=None, fill=True, rot=0):
    ry = rx if ry is None else ry
    f = ' fill="#fff"' if fill else ""
    t = f' transform="rotate({rot} {cx} {cy})"' if rot else ""
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"{f}{t}/>\n'


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
    cid = f"m{_clip[0]}"
    return f'<clipPath id="{cid}"><path d="{shape_d}"/></clipPath><g clip-path="url(#{cid})">{inner}</g>\n'


def star_d(cx, cy, ro, ri, n=5, rot0=-90):
    pts = []
    for i in range(n * 2):
        r = ro if i % 2 == 0 else ri
        a = math.radians(rot0 + i * 180 / n)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z"


def petal(cx, cy, r0, r1, wid):
    return P(f"M{cx} {cy - r0} C{cx + wid} {cy - (r0 + r1) / 2} {cx + wid} {cy - r1 + 20} {cx} {cy - r1} "
             f"C{cx - wid} {cy - r1 + 20} {cx - wid} {cy - (r0 + r1) / 2} {cx} {cy - r0}Z")
