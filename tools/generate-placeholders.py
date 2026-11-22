#!/usr/bin/env python3
"""
Generate placeholder artwork for every print listed in data/catalog.json.

Each print gets a flat, poster-style illustration based on its "theme"
(pitch, night, retro, market, kit) and "ratio" (portrait, landscape, square).
The images are only stand-ins - replace them with real artwork any time
(see docs/CUSTOMIZE.md).

Usage:
    python3 tools/generate-placeholders.py           # only create missing images
    python3 tools/generate-placeholders.py --force   # overwrite all images

Requires: Pillow, numpy  (pip install pillow numpy)
"""
import hashlib
import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "data" / "catalog.json"

SIZES = {"portrait": (900, 1200), "landscape": (1200, 900), "square": (1050, 1050)}

SKIN = ["#3b2219", "#5a3423", "#7a4a2e", "#a0673f", "#c68a5c", "#e0b48a"]
KITS = [
    ("#c8102e", "#ffffff"), ("#0b3d91", "#ffffff"), ("#007a3d", "#fcd116"),
    ("#111111", "#f2f2f2"), ("#ff7f00", "#1b1b1b"), ("#5bc2e7", "#ffffff"),
    ("#6a0dad", "#ffd700"), ("#e4002b", "#003da5"), ("#00843d", "#ffffff"),
]


def rng_for(slug):
    seed = int(hashlib.md5(slug.encode()).hexdigest()[:8], 16)
    return random.Random(seed)


# ---------------------------------------------------------------- helpers

def figure(d, r, x, ground, h, kit, skin=None, arms_up=False):
    """A simple flat human figure standing on `ground` (y) at x, height h."""
    skin = skin or r.choice(SKIN)
    head = h * 0.13
    body_top = ground - h * 0.78
    hip = ground - h * 0.42
    w = h * 0.2
    lw = max(3, int(h * 0.07))
    # legs
    d.line([(x - w * 0.25, hip), (x - w * 0.35 + r.uniform(-8, 8), ground)], fill=skin, width=lw)
    d.line([(x + w * 0.25, hip), (x + w * 0.35 + r.uniform(-8, 8), ground)], fill=skin, width=lw)
    # shorts
    d.rectangle([x - w * 0.5, hip - h * 0.04, x + w * 0.5, hip + h * 0.1], fill=kit[1])
    # arms
    ay = body_top + h * 0.05
    if arms_up:
        d.line([(x - w * 0.5, ay), (x - w * 0.95, ay - h * 0.28)], fill=skin, width=lw)
        d.line([(x + w * 0.5, ay), (x + w * 0.95, ay - h * 0.28)], fill=skin, width=lw)
    else:
        d.line([(x - w * 0.5, ay), (x - w * 0.8, ay + h * 0.3)], fill=skin, width=lw)
        d.line([(x + w * 0.5, ay), (x + w * 0.8, ay + h * 0.3)], fill=skin, width=lw)
    # torso
    d.rounded_rectangle([x - w * 0.55, body_top, x + w * 0.55, hip], radius=int(w * 0.2), fill=kit[0])
    d.rectangle([x - w * 0.1, body_top, x + w * 0.1, hip], fill=kit[1])
    # head
    d.ellipse([x - head, body_top - head * 2.1, x + head, body_top - head * 0.1], fill=skin)


def ball(d, x, y, rad):
    d.ellipse([x - rad, y - rad, x + rad, y + rad], fill="#fafafa", outline="#222222", width=max(2, int(rad * 0.12)))
    d.regular_polygon((x, y, rad * 0.38), 5, fill="#222222")


def grain(img, r, amount=7):
    arr = np.asarray(img).astype(np.int16)
    noise = np.random.default_rng(r.randint(0, 10_000)).normal(0, amount, arr.shape[:2])
    arr = arr + noise[..., None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------- themes

def theme_pitch(img, d, r):
    W, H = img.size
    sky = r.choice(["#bfe3f2", "#f4e6c8", "#cfe8ff", "#f6d6b8"])
    d.rectangle([0, 0, W, H], fill=sky)
    horizon = int(H * r.uniform(0.38, 0.5))
    # sun + clouds
    sx = r.uniform(0.15, 0.85) * W
    d.ellipse([sx - 70, 60, sx + 70, 200], fill="#ffd15c")
    for _ in range(3):
        cx, cy = r.uniform(0, W), r.uniform(40, horizon - 80)
        for k in range(4):
            d.ellipse([cx + k * 40 - 60, cy - 30 + (k % 2) * 12, cx + k * 40 + 20, cy + 30], fill="#ffffff")
    # stand / houses on the horizon
    x = 0
    while x < W:
        bw = r.randint(80, 180)
        bh = r.randint(40, 120)
        d.rectangle([x, horizon - bh, x + bw, horizon], fill=r.choice(["#e8d3b0", "#d9b48c", "#c9c2b4", "#f0e2c4"]))
        for wx in range(x + 12, x + bw - 20, 30):
            d.rectangle([wx, horizon - bh + 15, wx + 14, horizon - bh + 32], fill="#5d6d7e")
        x += bw + r.randint(0, 20)
    # pitch stripes
    g1, g2 = r.choice([("#2f9e44", "#37b24d"), ("#2b8a3e", "#2f9e44"), ("#3a9a4a", "#46ad57")])
    sh = (H - horizon) / 8
    for i in range(8):
        d.rectangle([0, horizon + i * sh, W, horizon + (i + 1) * sh], fill=g1 if i % 2 else g2)
    lw = 6
    d.line([(0, horizon + sh * 2), (W, horizon + sh * 2)], fill="#ffffff", width=lw)
    d.ellipse([W * 0.35, horizon + sh * 3, W * 0.65, horizon + sh * 5.5], outline="#ffffff", width=lw)
    # goal
    gx = r.uniform(0.1, 0.6) * W
    d.rectangle([gx, horizon - 70, gx + 220, horizon + 10], outline="#ffffff", width=8)
    for k in range(1, 8):
        d.line([(gx + k * 27, horizon - 70), (gx + k * 27, horizon + 10)], fill="#e9ecef", width=2)
    # players
    a, b = r.sample(KITS, 2)
    for i in range(r.randint(3, 6)):
        fx = r.uniform(0.08, 0.92) * W
        fg = r.uniform(horizon + sh * 2.5, H - 30)
        fh = (fg - horizon) * 1.25 + 80
        figure(d, r, fx, fg, fh, a if i % 2 else b, arms_up=r.random() < 0.3)
    ball(d, r.uniform(0.2, 0.8) * W, H - r.uniform(60, 180), 28)


def theme_night(img, d, r):
    W, H = img.size
    top, bottom = r.choice([("#0b1a3a", "#253b6e"), ("#120c2e", "#3a2a6b"), ("#071d2b", "#1f4e5f")])
    for y in range(H):
        t = y / H
        c = tuple(int(int(top[i:i + 2], 16) * (1 - t) + int(bottom[i:i + 2], 16) * t) for i in (1, 3, 5))
        d.line([(0, y), (W, y)], fill=c)
    for _ in range(90):
        x, y = r.uniform(0, W), r.uniform(0, H * 0.5)
        s = r.uniform(1, 3)
        d.ellipse([x - s, y - s, x + s, y + s], fill="#fff6d5")
    d.ellipse([W * 0.75, 70, W * 0.75 + 110, 180], fill="#fff1c1")
    # houses
    ground = int(H * 0.72)
    x = -20
    while x < W:
        bw, bh = r.randint(140, 260), r.randint(160, 360)
        col = r.choice(["#2c2f5a", "#3b2f5c", "#24304f", "#41315f"])
        d.rectangle([x, ground - bh, x + bw, ground], fill=col)
        d.polygon([(x - 10, ground - bh), (x + bw / 2, ground - bh - 70), (x + bw + 10, ground - bh)], fill="#1b1d3a")
        for wy in range(ground - bh + 30, ground - 40, 60):
            for wx in range(x + 20, x + bw - 30, 50):
                if r.random() < 0.7:
                    d.rectangle([wx, wy, wx + 24, wy + 32], fill=r.choice(["#ffd166", "#ffb347", "#ffe8a3"]))
        x += bw + 10
    d.rectangle([0, ground, W, H], fill="#1a1a33")
    # lantern string with glow
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    y0 = H * 0.18
    pts = [(x, y0 + 60 * math.sin(x / W * math.pi) + 30) for x in range(0, W + 1, 20)]
    d.line(pts, fill="#0d0d1f", width=3)
    for i in range(0, len(pts), 4):
        x, y = pts[i]
        c = r.choice(["#ff595e", "#ffca3a", "#ff924c", "#ffd6a5"])
        gd.ellipse([x - 40, y - 20, x + 40, y + 70], fill=c + "70")
        d.ellipse([x - 18, y + 5, x + 18, y + 50], fill=c)
    img.paste(Image.alpha_composite(img.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(18))).convert("RGB"))
    d = ImageDraw.Draw(img)
    for i in range(r.randint(2, 4)):
        fx = r.uniform(0.15, 0.85) * W
        figure(d, r, fx, H - r.uniform(20, 80), r.uniform(300, 420), r.choice(KITS))


def theme_retro(img, d, r):
    W, H = img.size
    bg = r.choice(["#e64fd3", "#ff6fb5", "#37c6c0", "#ffcc33", "#7b5cff", "#ff7a59"])
    d.rectangle([0, 0, W, H], fill=bg)
    # sunset stripes
    cy = H * 0.42
    for i, c in enumerate(["#ffe066", "#ffa94d", "#ff6b6b", "#cc5de8"]):
        rad = W * 0.32 - i * 40
        d.ellipse([W / 2 - rad, cy - rad, W / 2 + rad, cy + rad], fill=c)
    for i in range(6):
        d.rectangle([0, cy + i * 26, W, cy + i * 26 + 10], fill=bg)
    # checkered floor
    floor = int(H * 0.62)
    s = 60
    for yy in range(floor, H, s):
        for xx in range(0, W, s):
            if (xx // s + yy // s) % 2 == 0:
                d.rectangle([xx, yy, xx + s, yy + s], fill="#1b1b1b")
            else:
                d.rectangle([xx, yy, xx + s, yy + s], fill="#f8f9fa")
    # TV / radio
    tx = r.uniform(0.05, 0.6) * W
    d.rounded_rectangle([tx, floor - 260, tx + 300, floor - 20], radius=24, fill="#343a40")
    d.rounded_rectangle([tx + 20, floor - 240, tx + 220, floor - 60], radius=18, fill=r.choice(["#74c0fc", "#b2f2bb", "#ffec99"]))
    d.ellipse([tx + 240, floor - 220, tx + 280, floor - 180], fill="#ced4da")
    d.ellipse([tx + 240, floor - 160, tx + 280, floor - 120], fill="#ced4da")
    for i in range(r.randint(3, 6)):
        fx = r.uniform(0.1, 0.9) * W
        figure(d, r, fx, H - r.uniform(30, 120), r.uniform(300, 460), r.choice(KITS), arms_up=r.random() < 0.6)


def theme_market(img, d, r):
    W, H = img.size
    d.rectangle([0, 0, W, H], fill=r.choice(["#e9c46a", "#f4a261", "#e76f51", "#f2cc8f"]))
    d.rectangle([0, H * 0.55, W, H], fill=r.choice(["#b5838d", "#a26769", "#9c6644", "#8d6e63"]))
    # back wall arches
    for i in range(5):
        ax = i * W / 4.5 + 20
        d.rounded_rectangle([ax, H * 0.12, ax + W / 6, H * 0.55], radius=int(W / 12), fill="#f6e7cb")
    # umbrellas
    for i in range(r.randint(3, 5)):
        ux = r.uniform(0.05, 0.95) * W
        uy = r.uniform(0.2, 0.42) * H
        ur = r.uniform(110, 190)
        cols = r.choice([("#e63946", "#f1faee"), ("#2a9d8f", "#e9c46a"), ("#264653", "#f4a261"), ("#6a4c93", "#ffca3a")])
        for k in range(6):
            d.pieslice([ux - ur, uy - ur, ux + ur, uy + ur], 180 + k * 30, 180 + (k + 1) * 30, fill=cols[k % 2])
        d.line([(ux, uy), (ux, uy + ur * 1.6)], fill="#3d3d3d", width=6)
    # crates with fruit
    ground = int(H * 0.82)
    for i in range(r.randint(4, 7)):
        cx = r.uniform(0, W - 160)
        d.rectangle([cx, ground - 90, cx + 160, ground], fill="#c08552", outline="#7f5539", width=4)
        fc = r.choice(["#ff922b", "#fa5252", "#94d82d", "#fcc419", "#e64980"])
        for k in range(5):
            d.ellipse([cx + 8 + k * 30, ground - 120, cx + 40 + k * 30, ground - 88], fill=fc)
    for i in range(r.randint(2, 4)):
        figure(d, r, r.uniform(0.1, 0.9) * W, H - r.uniform(10, 60), r.uniform(320, 460), r.choice(KITS))


def theme_kit(img, d, r):
    W, H = img.size
    c1, c2 = r.sample(["#ffd23f", "#ee4266", "#3bceac", "#0ead69", "#540d6e", "#f4f1de", "#e07a5f", "#3d405b", "#81b29a", "#f2cc8f"], 2)
    d.rectangle([0, 0, W, H], fill=c1)
    if r.random() < 0.5:
        d.polygon([(0, 0), (W, 0), (0, H)], fill=c2)
    else:
        d.rectangle([0, 0, W, H * 0.45], fill=c2)
    # star
    d.regular_polygon((W * r.uniform(0.2, 0.8), H * 0.16, 60), 5, fill="#ffffff", rotation=r.randint(0, 72))
    kit = r.choice(KITS)
    skin = r.choice(SKIN[:4])
    cx = W * r.uniform(0.42, 0.58)
    # shoulders / jersey
    top = H * 0.6
    d.rounded_rectangle([cx - W * 0.42, top, cx + W * 0.42, H + 80], radius=int(W * 0.18), fill=kit[0])
    stripe_w = W * 0.07
    x = cx - W * 0.42 + stripe_w
    while x < cx + W * 0.42 - stripe_w:
        d.rectangle([x, top + 40, x + stripe_w * 0.5, H], fill=kit[1])
        x += stripe_w * 1.6
    # zig-zag trim
    pts = []
    for i in range(13):
        pts.append((cx - W * 0.4 + i * W * 0.8 / 12, top + (0 if i % 2 else 26)))
    d.line(pts, fill=kit[1], width=10)
    # neck + head
    d.rectangle([cx - 55, top - 110, cx + 55, top + 20], fill=skin)
    d.polygon([(cx - 70, top), (cx, top + 90), (cx + 70, top)], fill=kit[1])
    hr = W * 0.17
    hy = top - 110 - hr * 0.8
    # hair puffs
    hair = "#151515"
    for k in range(r.randint(5, 9)):
        a = r.uniform(math.pi * 0.9, math.pi * 2.1)
        px, py = cx + math.cos(a) * hr * 0.95, hy + math.sin(a) * hr * 0.95
        pr = r.uniform(hr * 0.35, hr * 0.6)
        d.ellipse([px - pr, py - pr, px + pr, py + pr], fill=hair)
    d.ellipse([cx - hr * 0.8, hy - hr, cx + hr * 0.8, hy + hr], fill=skin)
    # number badge
    d.ellipse([cx + W * 0.12, top + 120, cx + W * 0.24, top + 120 + W * 0.12], fill="#ffffff")
    d.regular_polygon((cx + W * 0.18, top + 120 + W * 0.06, W * 0.04), 5, fill=kit[0])
    # ball resting on shoulder
    if r.random() < 0.6:
        ball(d, cx + W * 0.3, top - 40, W * 0.09)


THEMES = {"pitch": theme_pitch, "night": theme_night, "retro": theme_retro, "market": theme_market, "kit": theme_kit}


def make(print_info, force=False):
    out = ROOT / print_info["image"]
    if out.exists() and not force:
        return False
    out.parent.mkdir(parents=True, exist_ok=True)
    r = rng_for(print_info["slug"])
    size = SIZES.get(print_info.get("ratio", "portrait"), SIZES["portrait"])
    img = Image.new("RGB", size, "#ffffff")
    d = ImageDraw.Draw(img)
    THEMES.get(print_info.get("theme", "retro"), theme_retro)(img, d, r)
    img = grain(img, r)
    img.save(out, "JPEG", quality=84, optimize=True, progressive=True)
    return True


def main():
    force = "--force" in sys.argv
    data = json.loads(CATALOG.read_text())
    made = sum(make(p, force) for p in data["prints"])
    print(f"Generated {made} placeholder image(s) in assets/artworks/")


if __name__ == "__main__":
    main()
