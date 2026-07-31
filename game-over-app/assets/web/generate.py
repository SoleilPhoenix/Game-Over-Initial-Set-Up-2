#!/usr/bin/env python3
"""Regenerate the self-contained website brand assets from the app logo."""

from __future__ import annotations

import html
import math
import re
from pathlib import Path
from xml.etree import ElementTree as ET


WEB_DIR = Path(__file__).resolve().parent
SOURCE = WEB_DIR.parent / "brand" / "logo.svg"
NAVY = "#0D1B2A"
GOLD = "#C6A75E"
VIEWBOX = 1024.0
WORD_BAND_TOP = 745.0

NUMBER = r"[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?"
TOKEN_RE = re.compile(rf"[A-Za-z]|{NUMBER}")


def cubic_roots(p0: float, p1: float, p2: float, p3: float) -> list[float]:
    a = -p0 + 3 * p1 - 3 * p2 + p3
    b = 2 * (p0 - 2 * p1 + p2)
    c = p1 - p0
    if abs(a) < 1e-12:
        return [] if abs(b) < 1e-12 else [-c / b]
    discriminant = b * b - 4 * a * c
    if discriminant < 0:
        return []
    root = math.sqrt(discriminant)
    return [(-b + root) / (2 * a), (-b - root) / (2 * a)]


def path_subpath_bounds(data: str) -> list[tuple[float, float, float, float]]:
    """Return exact Bézier bounds; the traced source uses only M, c and Z."""
    tokens = TOKEN_RE.findall(data)
    index = 0
    x = y = start_x = start_y = 0.0
    current: list[float] | None = None
    bounds: list[tuple[float, float, float, float]] = []

    def add(px: float, py: float) -> None:
        nonlocal current
        if current is None:
            current = [px, py, px, py]
        else:
            current[0] = min(current[0], px)
            current[1] = min(current[1], py)
            current[2] = max(current[2], px)
            current[3] = max(current[3], py)

    while index < len(tokens):
        token = tokens[index]
        if token == "M":
            if current is not None:
                bounds.append(tuple(current))
            x, y = float(tokens[index + 1]), float(tokens[index + 2])
            start_x, start_y = x, y
            index += 3
            current = None
            add(x, y)
        elif token == "c":
            index += 1
            while index < len(tokens) and not tokens[index].isalpha():
                dx1, dy1, dx2, dy2, dx3, dy3 = map(float, tokens[index : index + 6])
                index += 6
                x1, y1 = x + dx1, y + dy1
                x2, y2 = x + dx2, y + dy2
                x3, y3 = x + dx3, y + dy3
                candidates = [0.0, 1.0]
                candidates.extend(t for t in cubic_roots(x, x1, x2, x3) if 0 < t < 1)
                candidates.extend(t for t in cubic_roots(y, y1, y2, y3) if 0 < t < 1)
                for t in candidates:
                    inverse = 1 - t
                    px = (
                        inverse**3 * x
                        + 3 * inverse**2 * t * x1
                        + 3 * inverse * t**2 * x2
                        + t**3 * x3
                    )
                    py = (
                        inverse**3 * y
                        + 3 * inverse**2 * t * y1
                        + 3 * inverse * t**2 * y2
                        + t**3 * y3
                    )
                    add(px, py)
                x, y = x3, y3
        elif token == "Z":
            add(start_x, start_y)
            x, y = start_x, start_y
            index += 1
        else:
            raise ValueError(f"Unsupported SVG path token {token!r} in {SOURCE}")

    if current is not None:
        bounds.append(tuple(current))
    return bounds


def overall_bounds(data: str) -> tuple[float, float, float, float]:
    pieces = path_subpath_bounds(data)
    return (
        min(piece[0] for piece in pieces),
        min(piece[1] for piece in pieces),
        max(piece[2] for piece in pieces),
        max(piece[3] for piece in pieces),
    )


def fmt(value: float) -> str:
    return f"{value:.6f}".rstrip("0").rstrip(".")


def svg_path(data: str, colour: str, stroke_width: float | None) -> str:
    stroke = ""
    if stroke_width is not None:
        stroke = f' stroke="{colour}" stroke-width="{fmt(stroke_width)}"'
    return f'<path fill="{colour}"{stroke} d="{html.escape(data, quote=True)}"/>'


def read_source() -> tuple[list[tuple[str, float | None]], list[tuple[str, float | None]]]:
    root = ET.parse(SOURCE).getroot()
    gold_paths: list[tuple[str, float | None]] = []
    correction_paths: list[tuple[str, float | None]] = []

    for element in root.iter():
        if element.tag.rsplit("}", 1)[-1] != "path":
            continue
        data = element.attrib.get("d")
        if not data:
            continue
        fill = element.attrib.get("fill", "").upper()
        stroke_width = (
            float(element.attrib["stroke-width"])
            if element.attrib.get("stroke", "").upper() == fill and "stroke-width" in element.attrib
            else None
        )
        if fill == GOLD:
            gold_paths.append((data, stroke_width))
        elif fill == NAVY:
            left, _, right, _ = overall_bounds(data)
            # The first navy paths are the source canvas. Later, local navy paths
            # carve the traced gold artwork and must become transparent mask cuts.
            if not (left <= 1 and right >= VIEWBOX - 1):
                correction_paths.append((data, stroke_width))

    if not gold_paths or not correction_paths:
        raise ValueError("Could not identify the traced gold paths and navy corrections")
    return gold_paths, correction_paths


def mask_paths(
    gold_paths: list[tuple[str, float | None]],
    corrections: list[tuple[str, float | None]],
    optical_stroke: float | None = None,
) -> str:
    paths: list[str] = []
    for data, source_stroke in gold_paths:
        width = optical_stroke if optical_stroke is not None else source_stroke
        paths.append(svg_path(data, "#FFFFFF", width))
    for data, source_stroke in corrections:
        width = optical_stroke if optical_stroke is not None else source_stroke
        paths.append(svg_path(data, "#000000", width))
    return "\n      ".join(paths)


def visible_paths(
    gold_paths: list[tuple[str, float | None]],
    corrections: list[tuple[str, float | None]],
    optical_stroke: float | None = None,
    indent: str = "  ",
) -> str:
    paths: list[str] = []
    for data, source_stroke in gold_paths:
        width = optical_stroke if optical_stroke is not None else source_stroke
        paths.append(svg_path(data, GOLD, width))
    for data, source_stroke in corrections:
        width = optical_stroke if optical_stroke is not None else source_stroke
        paths.append(svg_path(data, NAVY, width))
    return ("\n" + indent).join(paths)


def art_mask(mask_id: str, paths: str) -> str:
    return f'''<mask id="{mask_id}" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
      <rect width="1024" height="1024" fill="#000000"/>
      {paths}
    </mask>'''


def svg_document(width: str, height: str, view_box: str, body: str, title: str) -> str:
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="{view_box}" fill-rule="evenodd" clip-rule="evenodd" role="img" aria-labelledby="title">
  <title id="title">{html.escape(title)}</title>
{body}
</svg>
'''


def ring_circuit() -> tuple[str, float]:
    cx, cy = 512.1, 498.4
    radii = [162.5, 181.5, 202.4]
    gap = 11.0
    lap_degrees = 360 - 2 * gap
    right_edge, left_edge = -90 + gap, -90 - gap

    def polar(radius: float, degrees: float) -> tuple[float, float]:
        radians = math.radians(degrees)
        return cx + radius * math.cos(radians), cy + radius * math.sin(radians)

    start = polar(radii[0], right_edge)
    commands = [f"M {fmt(start[0])} {fmt(start[1])}"]
    length = 0.0
    for index, radius in enumerate(radii):
        clockwise = index % 2 == 0
        end = polar(radius, left_edge if clockwise else right_edge)
        commands.append(
            f"A {fmt(radius)} {fmt(radius)} 0 1 {1 if clockwise else 0} {fmt(end[0])} {fmt(end[1])}"
        )
        length += radius * lap_degrees * math.pi / 180
        if index + 1 < len(radii):
            following = radii[index + 1]
            hop = polar(following, left_edge if clockwise else right_edge)
            commands.append(f"L {fmt(hop[0])} {fmt(hop[1])}")
            length += following - radius
    return " ".join(commands), length


def glow_keyframes() -> str:
    samples = [index / 20 for index in range(21)]
    peak_time = 1 - math.sqrt(0.55)
    samples.append(peak_time)
    rows = []
    for elapsed in sorted(set(samples)):
        progress = 1 - (1 - elapsed) ** 2
        opacity = (
            progress * 1.15
            if progress <= 0.45
            else 0.5175 * (1 - (progress - 0.45) / 0.55)
        )
        rows.append(f"  {fmt(elapsed * 100)}% {{ opacity: {fmt(max(0.0, opacity))}; }}")
    return "\n".join(rows)


def main() -> None:
    gold_paths, corrections = read_source()
    normal_paths = mask_paths(gold_paths, corrections)
    artwork = visible_paths(gold_paths, corrections)

    mark_bounds = [math.inf, math.inf, -math.inf, -math.inf]
    for data, source_stroke in gold_paths:
        expansion = (source_stroke or 0) / 2
        for left, top, right, bottom in path_subpath_bounds(data):
            if top >= WORD_BAND_TOP:
                continue
            mark_bounds[0] = min(mark_bounds[0], left - expansion)
            mark_bounds[1] = min(mark_bounds[1], top - expansion)
            mark_bounds[2] = max(mark_bounds[2], right + expansion)
            mark_bounds[3] = max(mark_bounds[3], bottom + expansion)

    left, top, right, bottom = mark_bounds
    mark_width, mark_height = right - left, bottom - top
    mark_view_box = f"{fmt(left)} {fmt(top)} {fmt(mark_width)} {fmt(mark_height)}"
    mark_mask = art_mask("mark", normal_paths)

    logo_mark = svg_document(
        str(math.ceil(mark_width)),
        str(math.ceil(mark_height)),
        mark_view_box,
        f'''  <defs>
    {mark_mask}
  </defs>
  <rect x="0" y="0" width="1024" height="745" fill="{GOLD}" mask="url(#mark)"/>''',
        "Game Over logo mark",
    )

    vertical_shift = VIEWBOX / 2 - (top + bottom) / 2
    logo_on_navy = svg_document(
        "1024",
        "1024",
        "0 0 1024 1024",
        f'''  <defs>
    <clipPath id="mark-band"><rect x="0" y="0" width="1024" height="745"/></clipPath>
  </defs>
  <rect width="1024" height="1024" fill="{NAVY}"/>
  <g transform="translate(0 {fmt(vertical_shift)})" clip-path="url(#mark-band)">
    {artwork}
  </g>''',
        "Game Over logo mark on Midnight Navy",
    )

    splash = svg_document(
        "1024",
        "1024",
        "0 0 1024 1024",
        f'''  <rect width="1024" height="1024" fill="{NAVY}"/>
  {artwork}
  <text x="512" y="911" fill="{GOLD}" fill-opacity="0.62" text-anchor="middle" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="24" font-weight="500" letter-spacing="3">game-over.app</text>''',
        "Game Over splash",
    )

    favicon_artwork = visible_paths(gold_paths, corrections, optical_stroke=12)
    favicon_side = mark_height * 1.12
    favicon_left = (left + right - favicon_side) / 2
    favicon_top = (top + bottom - favicon_side) / 2
    favicon = svg_document(
        "64",
        "64",
        f"{fmt(favicon_left)} {fmt(favicon_top)} {fmt(favicon_side)} {fmt(favicon_side)}",
        f'''  <rect x="{fmt(favicon_left)}" y="{fmt(favicon_top)}" width="{fmt(favicon_side)}" height="{fmt(favicon_side)}" fill="{NAVY}"/>
  {favicon_artwork}''',
        "Game Over favicon",
    )

    circuit, circuit_length = ring_circuit()
    intro = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Game Over logo reveal</title>
  <style>
    :root {{ color-scheme: dark; background: {NAVY}; }}
    * {{ box-sizing: border-box; }}
    html, body {{ min-height: 100%; margin: 0; }}
    body {{ min-height: 100vh; display: grid; place-items: center; background: {NAVY}; }}
    .logo {{ display: block; width: min(82vmin, 720px); height: auto; background: {NAVY}; }}
    .circuit-layer {{ animation: settle-out 200ms 1950ms cubic-bezier(.455,.03,.515,.955) forwards; }}
    .circuit {{ stroke-dasharray: {fmt(circuit_length)}; stroke-dashoffset: {fmt(circuit_length)}; animation: draw 2000ms cubic-bezier(.37,0,.63,1) forwards; }}
    .rings {{ opacity: 0; animation: settle-in 200ms 1950ms cubic-bezier(.455,.03,.515,.955) forwards; }}
    .stem-cover {{ transform-box: fill-box; transform-origin: center bottom; animation: uncover 500ms 2150ms cubic-bezier(.55,.085,.68,.53) forwards; }}
    .word {{ opacity: 0; transform: translateY(56.32px); animation: word-rise 1000ms 2650ms cubic-bezier(.215,.61,.355,1) forwards, fade-in 550ms 2650ms cubic-bezier(.25,.46,.45,.94) forwards; }}
    .shine {{ transform: translateX(-430.08px); animation: shine 700ms 2950ms cubic-bezier(.455,.03,.515,.955) forwards; }}
    .gem {{ opacity: 0; transform: translateY(-92.16px); animation: gem-seat 500ms 3500ms cubic-bezier(.215,.61,.355,1) forwards, fade-in 275ms 3500ms cubic-bezier(.25,.46,.45,.94) forwards; }}
    .glow {{ opacity: 0; animation: glow-bloom 400ms 3600ms linear forwards; }}
    @keyframes draw {{ to {{ stroke-dashoffset: 0; }} }}
    @keyframes settle-out {{ to {{ opacity: 0; }} }}
    @keyframes settle-in {{ to {{ opacity: 1; }} }}
    @keyframes uncover {{ to {{ transform: scaleY(0); }} }}
    @keyframes word-rise {{ to {{ transform: translateY(0); }} }}
    @keyframes fade-in {{ to {{ opacity: 1; }} }}
    @keyframes shine {{ to {{ transform: translateX(1024px); }} }}
    @keyframes gem-seat {{ to {{ transform: translateY(0); }} }}
    @keyframes glow-bloom {{
{glow_keyframes()}
    }}
    @media (prefers-reduced-motion: reduce) {{
      .circuit-layer, .stem-cover, .shine, .glow {{ display: none; }}
      .rings, .word, .gem {{ animation: none; opacity: 1; transform: none; }}
    }}
  </style>
</head>
<body>
  <svg class="logo" width="1024" height="1024" viewBox="0 0 1024 1024" fill-rule="evenodd" clip-rule="evenodd" role="img" aria-labelledby="intro-title intro-description">
    <title id="intro-title">Game Over logo reveal</title>
    <desc id="intro-description">Three rings trace outward, followed by the stem, wordmark, gem, and a final gold glow.</desc>
    <defs>
      <g id="intro-art">
        {visible_paths(gold_paths, corrections, indent='        ')}
      </g>
      <clipPath id="rings-band"><rect x="0" y="288" width="1024" height="424"/></clipPath>
      <clipPath id="word-band"><rect x="0" y="745" width="1024" height="127"/></clipPath>
      <clipPath id="gem-band"><rect x="0" y="196" width="1024" height="92"/></clipPath>
      <linearGradient id="word-shine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/>
        <stop offset="0.5" stop-color="#FFF5DC" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
      </linearGradient>
      <radialGradient id="logo-glow" cx="50%" cy="48%" r="52%">
        <stop offset="0" stop-color="{GOLD}" stop-opacity="0.42"/>
        <stop offset="0.55" stop-color="{GOLD}" stop-opacity="0.13"/>
        <stop offset="1" stop-color="{GOLD}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1024" height="1024" fill="{NAVY}"/>
    <g class="circuit-layer">
      <path class="circuit" d="{circuit}" fill="none" stroke="{GOLD}" stroke-width="4.5" stroke-linecap="butt" stroke-linejoin="miter"/>
    </g>
    <g class="rings" clip-path="url(#rings-band)">
      <use href="#intro-art"/>
    </g>
    <rect class="stem-cover" x="500" y="282" width="25" height="223" fill="{NAVY}"/>
    <g class="word" clip-path="url(#word-band)">
      <use href="#intro-art"/>
      <rect class="shine" x="0" y="745" width="430.08" height="127" fill="url(#word-shine)"/>
    </g>
    <g class="gem" clip-path="url(#gem-band)">
      <use href="#intro-art"/>
    </g>
    <circle class="glow" cx="512" cy="491.52" r="512" fill="url(#logo-glow)"/>
  </svg>
</body>
</html>
'''

    outputs = {
        "logo-mark.svg": logo_mark,
        "logo-on-navy.svg": logo_on_navy,
        "splash.svg": splash,
        "favicon.svg": favicon,
        "intro.html": intro,
    }
    for name, content in outputs.items():
        (WEB_DIR / name).write_text(content, encoding="utf-8")
        print(f"wrote {name}")


if __name__ == "__main__":
    main()
