#!/usr/bin/env python3
"""VIVEKTA — build the bundled Scandinavia map.

The film flies in from orbit on a raster earth, but a 4096 px texture is mush
by the time the camera is over a fjord. From Oslo onward the film therefore
draws a vector map instead, which stays sharp at any zoom.

This takes Natural Earth 10m country borders, keeps only what is in frame for
the Nordic chapter, clips it to a bounding box, drops islands too small to read,
simplifies the rings and rounds the coordinates. The result is bundled — the
site never fetches anything at runtime.

    tools/build-map.py [path-to-ne_10m_admin_0_countries.geojson]

Without an argument it downloads the source to a temp file. That download is a
BUILD step; the site itself has no external dependency.
"""

import json
import math
import os
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "scandinavia.geo.json"
SRC_URL = ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
           "master/geojson/ne_10m_admin_0_countries.geojson")

# What the camera can see during the Nordic chapter.
BBOX = (0.0, 52.0, 44.0, 72.5)        # west, south, east, north

# Norway is the subject; its neighbours give it a shape to sit against.
SUBJECT = {"Norway"}
CONTEXT = {"Sweden", "Finland", "Denmark", "Estonia", "Latvia",
           "Lithuania", "Russia", "Poland", "Germany", "United Kingdom"}

PRECISION = 3          # ~110 m at the equator, finer with latitude
MIN_RING_AREA = 2e-4   # square degrees; drops specks that render as one pixel
TOLERANCE = 0.009      # simplification, in degrees


def ring_area(ring):
    """Shoelace area in square degrees — only used to rank ring size."""
    a = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2


def clip_to_bbox(ring):
    """Sutherland–Hodgman against the frame.

    Testing whether a ring merely *touches* the box keeps the whole of Russia
    for the sake of its border with Norway. Clipping keeps only what is on
    screen, which is the difference between 589 KB and something shippable."""
    w, s, e, n = BBOX
    edges = (
        ("x>=", w), ("x<=", e), ("y>=", s), ("y<=", n),
    )
    poly = list(ring)
    for op, v in edges:
        if not poly:
            return []

        def inside(p):
            x, y = p
            return {"x>=": x >= v, "x<=": x <= v, "y>=": y >= v, "y<=": y <= v}[op]

        def cross(a, b):
            (ax, ay), (bx, by) = a, b
            if op in ("x>=", "x<="):
                t = (v - ax) / (bx - ax) if bx != ax else 0.0
                return [v, ay + t * (by - ay)]
            t = (v - ay) / (by - ay) if by != ay else 0.0
            return [ax + t * (bx - ax), v]

        out = []
        for i in range(len(poly)):
            cur, prv = poly[i], poly[i - 1]
            ci, pi = inside(cur), inside(prv)
            if ci:
                if not pi:
                    out.append(cross(prv, cur))
                out.append(list(cur))
            elif pi:
                out.append(cross(prv, cur))
        poly = out
    return poly


def perp_distance(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def simplify(points, tol):
    """Ramer–Douglas–Peucker, iterative so a long coastline cannot blow the stack."""
    if len(points) < 3:
        return points[:]
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        lo, hi = stack.pop()
        if hi <= lo + 1:
            continue
        worst, idx = -1.0, lo
        for i in range(lo + 1, hi):
            d = perp_distance(points[i], points[lo], points[hi])
            if d > worst:
                worst, idx = d, i
        if worst > tol:
            keep[idx] = True
            stack.append((lo, idx))
            stack.append((idx, hi))
    return [p for p, k in zip(points, keep) if k]


def clean_ring(ring, tol):
    ring = simplify(ring, tol)
    out = []
    for x, y in ring:
        p = [round(x, PRECISION), round(y, PRECISION)]
        if not out or p != out[-1]:
            out.append(p)
    if len(out) < 4:
        return None
    if out[0] != out[-1]:
        out.append(out[0][:])
    return out


def polygons_of(geom):
    """Normalise Polygon / MultiPolygon to a list of ring-lists."""
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon":
        return list(geom["coordinates"])
    return []


def build_feature(feature, tol, min_area):
    name = feature["properties"].get("NAME")
    kept = []
    for poly in polygons_of(feature["geometry"]):
        if not poly:
            continue
        # clip first: no point simplifying coastline that is off screen
        outer = clip_to_bbox(poly[0])
        if len(outer) < 4 or ring_area(outer) < min_area:
            continue
        cleaned = clean_ring(outer, tol)
        if not cleaned:
            continue
        rings = [cleaned]
        for hole in poly[1:]:
            clipped = clip_to_bbox(hole)
            if len(clipped) < 4 or ring_area(clipped) < min_area * 4:
                continue
            ch = clean_ring(clipped, tol)
            if ch:
                rings.append(ch)
        kept.append(rings)
    if not kept:
        return None
    return {
        "type": "Feature",
        "properties": {"name": name, "subject": name in SUBJECT},
        "geometry": {"type": "MultiPolygon", "coordinates": kept},
    }


def main() -> int:
    src = sys.argv[1] if len(sys.argv) > 1 else None
    if not src:
        src = os.path.join(tempfile.gettempdir(), "ne_10m_admin_0_countries.geojson")
        if not os.path.exists(src):
            print("downloading Natural Earth 10m (build step, not a runtime dependency)…")
            urllib.request.urlretrieve(SRC_URL, src)
    data = json.loads(Path(src).read_text())

    features = []
    for f in data["features"]:
        name = f["properties"].get("NAME")
        if name not in SUBJECT | CONTEXT:
            continue
        # Norway gets the finest treatment; it is the one being looked at.
        subject = name in SUBJECT
        built = build_feature(
            f,
            TOLERANCE / (3 if subject else 1),
            MIN_RING_AREA / (3 if subject else 1),
        )
        if built:
            features.append(built)

    features.sort(key=lambda f: (f["properties"]["subject"], f["properties"]["name"]))
    out = {
        "type": "FeatureCollection",
        "note": ("Natural Earth 10m, clipped to the Nordic chapter and simplified. "
                 "Rebuild with tools/build-map.py. Bundled on purpose."),
        "bbox": list(BBOX),
        "features": features,
    }
    OUT.write_text(json.dumps(out, separators=(",", ":")) + "\n")

    pts = sum(len(r) for f in features for poly in f["geometry"]["coordinates"] for r in poly)
    size = OUT.stat().st_size
    print(f"wrote {OUT.relative_to(ROOT)} — {len(features)} countries, {pts} points, {size/1024:.0f} KB")
    for f in features:
        n = sum(len(r) for poly in f["geometry"]["coordinates"] for r in poly)
        rings = len(f["geometry"]["coordinates"])
        print(f"  {f['properties']['name']:<16} {rings:>4} parts  {n:>6} points"
              + ("   (subject)" if f["properties"]["subject"] else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
