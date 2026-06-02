#!/usr/bin/env python3
"""
Generate ghost-poster app icons (icon.png and adaptive-icon.png).
Pure stdlib: no Pillow, no numpy.

Visual: white ghost on #15171A, with a Ghostbusters-style no-ghost badge
partially behind the ghost — "who ya gonna post?" joke.
"""

import struct
import zlib
import math
import os
import time

# ── Canvas ──────────────────────────────────────────────────────────────────
SIZE = 1024
CX = SIZE // 2  # 512

# ── Colors ──────────────────────────────────────────────────────────────────
BG     = (0x15, 0x17, 0x1A)
WHITE  = (0xFF, 0xFF, 0xFF)
RED    = (0xE5, 0x39, 0x35)   # Ghostbusters red

# ── Ghost geometry ───────────────────────────────────────────────────────────
# Vertically centered in safe zone (170–854 for adaptive icon masks)
# Ghost spans y=210 to y=797 → center ≈ 503 ≈ 512 ✓

HEAD_CX = CX
HEAD_CY = 440
HEAD_R  = 230

BODY_L   = HEAD_CX - HEAD_R  # 282
BODY_R   = HEAD_CX + HEAD_R  # 742
BODY_TOP = HEAD_CY           # body rect starts at head center
BODY_BOT = 720

BUMP_R   = 77
BUMP_CXS = (BODY_L + BUMP_R, CX, BODY_R - BUMP_R)  # 359, 512, 665

EYE_CY   = HEAD_CY - 65      # 375
EYE_R    = 54
EYE_L_CX = CX - 88           # 424  — left eye
EYE_R_CX = CX + 88           # 600  — right eye

# ── Ghostbusters badge ───────────────────────────────────────────────────────
# Partially behind the ghost (right-lower body area): ghost "bursts through"
# → visual pun: ghost is not busted, it's posting.
BADGE_CX   = 690
BADGE_CY   = 756
BADGE_R    = 72
BADGE_LH   = 13              # diagonal line half-width (pixels)

AA = 1.5  # anti-aliasing radius

# ── Helpers ──────────────────────────────────────────────────────────────────

def aa_circle(dx: float, dy: float, r: float) -> float:
    """Coverage of a filled circle with soft anti-aliased edge."""
    d2 = dx * dx + dy * dy
    inner = (r - AA) ** 2
    if d2 <= inner:
        return 1.0
    outer = (r + AA) ** 2
    if d2 >= outer:
        return 0.0
    return (r + AA - math.sqrt(d2)) / (2.0 * AA)


def ghost_coverage(x: int, y: int) -> float:
    """Coverage of ghost silhouette (union of head, body, bumps)."""
    # Head
    c = aa_circle(x - HEAD_CX, y - HEAD_CY, HEAD_R)
    if c >= 1.0:
        return 1.0

    # Body rect — AA on left/right edges only (top merges with head, bottom with bumps)
    if HEAD_CY - AA <= y <= BODY_BOT + AA:
        x_cov = (
            min(1.0, max(0.0, (x - BODY_L + AA) / (2.0 * AA))) *
            min(1.0, max(0.0, (BODY_R - x + AA) / (2.0 * AA)))
        )
        y_cov = (
            min(1.0, max(0.0, (y - (BODY_TOP - AA)) / (2.0 * AA))) *
            min(1.0, max(0.0, (BODY_BOT + AA - y) / (2.0 * AA)))
        )
        rc = x_cov * y_cov
        if rc > c:
            c = rc
        if c >= 1.0:
            return 1.0

    # Bumps (convex, hanging below body bottom)
    for bx in BUMP_CXS:
        bc = aa_circle(x - bx, y - BODY_BOT, BUMP_R)
        if bc > 0 and y >= BODY_BOT - AA:
            if bc > c:
                c = bc
            if c >= 1.0:
                return 1.0

    return c


def eye_coverage(x: int, y: int) -> float:
    """Coverage of eyes (holes cut into ghost)."""
    e1 = aa_circle(x - EYE_L_CX, y - EYE_CY, EYE_R)
    e2 = aa_circle(x - EYE_R_CX, y - EYE_CY, EYE_R)
    return max(e1, e2)


def badge_pixel(x: int, y: int):
    """
    Returns (is_in_badge, is_on_line) for Ghostbusters badge.
    badge = red filled circle + white diagonal line.
    """
    dx = x - BADGE_CX
    dy = y - BADGE_CY
    circ = aa_circle(dx, dy, BADGE_R)
    if circ <= 0.0:
        return 0.0, 0.0
    # Diagonal line (top-left → bottom-right) through badge center
    # Normal distance = |(dx - dy)| / sqrt(2)
    line_dist = abs(dx - dy) / 1.4142135
    line_cov = circ * min(1.0, max(0.0, (BADGE_LH - line_dist + AA) / (2.0 * AA)))
    return circ, line_cov


# ── PNG writer ───────────────────────────────────────────────────────────────

def make_png(pixels_rgba: bytes) -> bytes:
    """Encode raw RGBA bytes (SIZE×SIZE×4) as a valid PNG."""
    def chunk(tag: bytes, data: bytes) -> bytes:
        buf = tag + data
        return struct.pack('>I', len(data)) + buf + struct.pack('>I', zlib.crc32(buf) & 0xFFFFFFFF)

    ihdr = struct.pack('>IIBBBBB', SIZE, SIZE, 8, 6, 0, 0, 0)
    raw = bytearray()
    stride = SIZE * 4
    for row in range(SIZE):
        raw.append(0)  # filter: None
        raw += pixels_rgba[row * stride:(row + 1) * stride]

    return (
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', ihdr)
        + chunk(b'IDAT', zlib.compress(bytes(raw), 6))
        + chunk(b'IEND', b'')
    )


# ── Render ───────────────────────────────────────────────────────────────────

def render(with_bg: bool) -> bytes:
    """
    Render one icon.
    with_bg=True  → icon.png     (opaque #15171A background)
    with_bg=False → adaptive-icon.png (transparent background)
    """
    pixels = bytearray(SIZE * SIZE * 4)

    for y in range(SIZE):
        for x in range(SIZE):
            idx = (y * SIZE + x) * 4

            gc   = ghost_coverage(x, y)
            ec   = eye_coverage(x, y) if gc > 0 else 0.0
            net  = gc * (1.0 - ec)           # ghost minus eyes

            b_circ, b_line = badge_pixel(x, y)
            # Badge is drawn UNDER ghost — only visible where ghost is absent
            badge_vis  = b_circ * (1.0 - gc)
            line_vis   = b_line * (1.0 - gc)

            if with_bg:
                # Opaque: composite over BG
                r, g, b = BG
                if net > 0:
                    r = round(BG[0] + (WHITE[0] - BG[0]) * net)
                    g = round(BG[1] + (WHITE[1] - BG[1]) * net)
                    b = round(BG[2] + (WHITE[2] - BG[2]) * net)
                elif line_vis > 0:
                    r = round(BG[0] + (WHITE[0] - BG[0]) * line_vis)
                    g = round(BG[1] + (WHITE[1] - BG[1]) * line_vis)
                    b = round(BG[2] + (WHITE[2] - BG[2]) * line_vis)
                elif badge_vis > 0:
                    r = round(BG[0] + (RED[0] - BG[0]) * badge_vis)
                    g = round(BG[1] + (RED[1] - BG[1]) * badge_vis)
                    b = round(BG[2] + (RED[2] - BG[2]) * badge_vis)
                pixels[idx:idx + 4] = (r, g, b, 255)
            else:
                # Transparent: RGBA
                if net > 0:
                    a = round(255 * net)
                    pixels[idx:idx + 4] = (255, 255, 255, a)
                elif line_vis > 0:
                    a = round(255 * line_vis)
                    pixels[idx:idx + 4] = (255, 255, 255, a)
                elif badge_vis > 0:
                    a = round(255 * badge_vis)
                    pixels[idx:idx + 4] = (RED[0], RED[1], RED[2], a)
                # else stays (0,0,0,0)

    return make_png(bytes(pixels))


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'assets')

    for name, with_bg in [('icon.png', True), ('adaptive-icon.png', False)]:
        path = os.path.join(out_dir, name)
        print(f'Rendering {name}...', flush=True)
        t0 = time.time()
        data = render(with_bg)
        elapsed = time.time() - t0
        with open(path, 'wb') as f:
            f.write(data)
        print(f'  → {path}  ({len(data)//1024} KB, {elapsed:.1f}s)', flush=True)
