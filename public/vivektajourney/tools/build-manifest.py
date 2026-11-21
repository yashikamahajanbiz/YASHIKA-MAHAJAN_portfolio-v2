#!/usr/bin/env python3
"""VIVEKTA — build data/media.json from whatever is in media/.

Walk media/, work out which stop and which section each file belongs to,
read its real pixel dimensions, and write the manifest the site reads.

    media/<stop-id>/IMG_0412.webp          -> section: photos
    media/<stop-id>/food/IMG_0455.webp     -> section: food
    media/<stop-id>/travel/VID_0088.mp4    -> section: travel
    media/tickets/<ticket-id>.webp         -> section: tickets
    panorama/oslo-apartment.webp           -> type: panorama

Captions are preserved. Write them into data/media.json by hand whenever you
like and re-run this as often as you want; it merges on id and never clobbers
a caption you have written.

Usage:  tools/build-manifest.py [--check]
        --check  exit 1 if the manifest is out of date (for a pre-deploy check)
"""

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / "media"
PANO = ROOT / "panorama"
OUT = ROOT / "data" / "media.json"
STOPS = ROOT / "data" / "stops.json"

PHOTO_EXT = {".webp", ".jpg", ".jpeg", ".png", ".gif", ".avif"}
VIDEO_EXT = {".mp4", ".m4v", ".webm", ".mov"}
SECTIONS = {"photos", "food", "tickets", "travel"}


def dimensions(path: Path):
    """Real pixel dimensions. sips for stills, ffprobe for video. None if unreadable."""
    if path.suffix.lower() in VIDEO_EXT:
        try:
            out = subprocess.run(
                ["ffprobe", "-v", "error", "-select_streams", "v:0",
                 "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", str(path)],
                capture_output=True, text=True, timeout=30,
            ).stdout.strip()
            w, h = out.split("x")[:2]
            return int(w), int(h)
        except Exception:
            return None, None
    try:
        out = subprocess.run(
            ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)],
            capture_output=True, text=True, timeout=30,
        ).stdout
        w = re.search(r"pixelWidth:\s*(\d+)", out)
        h = re.search(r"pixelHeight:\s*(\d+)", out)
        return (int(w.group(1)), int(h.group(1))) if w and h else (None, None)
    except Exception:
        return None, None


def duration(path: Path):
    """Video duration in whole seconds, so the film knows how long to hold a shot."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, timeout=30,
        ).stdout.strip()
        return round(float(out))
    except Exception:
        return None


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def main() -> int:
    check_only = "--check" in sys.argv

    stop_ids = {s["id"] for s in json.loads(STOPS.read_text())["stops"]}

    previous, note = {}, None
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text())
            note = old.get("note")
            previous = {m["id"]: m for m in old.get("media", [])}
        except (json.JSONDecodeError, KeyError):
            print("  ! data/media.json was unreadable — rebuilding from scratch")

    found, unknown = [], []

    files = sorted(MEDIA.rglob("*")) if MEDIA.exists() else []
    if PANO.exists():
        files += sorted(PANO.rglob("*"))

    for path in files:
        if not path.is_file() or path.name.startswith("."):
            continue
        ext = path.suffix.lower()
        if ext not in PHOTO_EXT | VIDEO_EXT:
            continue

        rel = path.relative_to(ROOT)
        parts = rel.parts

        # panorama/<name>.webp  — the Oslo flat, shown in a drag-to-look viewer
        if parts[0] == "panorama":
            stop, section, kind = "oslo", "photos", "panorama"
        # media/tickets/<ticket-id>.webp — artefacts, not stop-scoped
        elif parts[1] == "tickets":
            stop, section = None, "tickets"
            kind = "video" if ext in VIDEO_EXT else "photo"
        # media/<stop-id>/[section/]<file>
        else:
            stop = parts[1]
            sub = parts[2:-1]
            section = sub[0] if sub and sub[0] in SECTIONS else "photos"
            kind = "video" if ext in VIDEO_EXT else "photo"

        if stop is not None and stop not in stop_ids:
            unknown.append(str(rel))
            continue

        mid = f"m_{slug(stop or 'ticket')}_{slug(path.stem)}"
        w, h = dimensions(path)

        entry = {
            "id": mid,
            # `file` is relative to its top folder, as in the data model;
            # `src` is what the page actually loads.
            "file": str(Path(*parts[1:])),
            "src": str(rel),
            "type": kind,
            "stop": stop,
            "section": section,
            "caption": previous.get(mid, {}).get("caption"),
            "width": w,
            "height": h,
        }
        if kind == "video":
            entry["duration"] = duration(path)
        # keep any hand-written fields (ordering hints, hero flags, food links)
        for key, value in previous.get(mid, {}).items():
            if key not in entry and value is not None:
                entry[key] = value
        found.append(entry)

    found.sort(key=lambda m: (m["section"], m["stop"] or "", m["src"]))

    manifest = {
        "note": note or "Generated by tools/build-manifest.py. Captions are preserved across runs.",
        "media": found,
    }
    rendered = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"

    if check_only:
        current = OUT.read_text() if OUT.exists() else ""
        if current != rendered:
            print("manifest is out of date — run tools/build-manifest.py")
            return 1
        print(f"manifest current — {len(found)} items")
        return 0

    OUT.write_text(rendered)

    by_section = {}
    for m in found:
        by_section[m["section"]] = by_section.get(m["section"], 0) + 1
    missing = [m["src"] for m in found if not m["width"]]
    covered = {m["stop"] for m in found if m["stop"]}

    print(f"wrote {OUT.relative_to(ROOT)} — {len(found)} items")
    for section, n in sorted(by_section.items()):
        print(f"  {section:<8} {n}")
    if missing:
        print(f"  ! {len(missing)} without dimensions (they will still render): {missing[:3]}")
    if unknown:
        print(f"  ! {len(unknown)} under a folder that is not a stop id — ignored:")
        for u in unknown[:8]:
            print(f"      {u}")
        print("    stop ids are in data/stops.json")
    bare = sorted(stop_ids - covered)
    if bare:
        print(f"  {len(bare)} of {len(stop_ids)} stops still have no media:")
        print("      " + ", ".join(bare))
    if not found:
        print("  media/ is empty. Drop files in media/<stop-id>/ and re-run.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
