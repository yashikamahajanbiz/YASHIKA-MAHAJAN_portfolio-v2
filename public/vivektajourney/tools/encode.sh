#!/usr/bin/env bash
# VIVEKTA — the encoding pass.
#
#   originals/<stop-id>/IMG_0412.HEIC   ->   media/<stop-id>/IMG_0412.webp
#   originals/<stop-id>/VID_0088.mov    ->   media/<stop-id>/VID_0088.mp4
#   originals/<stop-id>/food/...        ->   media/<stop-id>/food/...
#   originals/tickets/<ticket-id>.pdf   ->   media/tickets/<ticket-id>.webp
#
# Photos : WebP, max 2000 px on the long edge
# Video  : H.264 / AAC, max 1080p, +faststart so it plays before it has finished
#
# Idempotent — anything already encoded and newer than its source is skipped,
# so re-running after each drop costs nothing.
#
# Usage:  tools/encode.sh [originals-dir]      (default: originals)

set -eu
cd "$(dirname "$0")/.."

SRC="${1:-originals}"
OUT="media"
MAX_EDGE=2000
MAX_H=1080
QUALITY=82

[ -d "$SRC" ] || { echo "no $SRC/ — put raw files in $SRC/<stop-id>/ and re-run"; exit 0; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not found (brew install ffmpeg)"; exit 1; }
command -v cwebp  >/dev/null || { echo "cwebp not found (brew install webp)";    exit 1; }

photos=0; videos=0; skipped=0; failed=0

stale() { [ ! -f "$2" ] || [ "$1" -nt "$2" ]; }

# to_webp <source-image> <dest.webp>
# Shrinks only when the long edge is over budget. cwebp has no "down only"
# mode, so the decision is made here from the real dimensions.
to_webp() {
  src=$1; dst=$2
  dims=$(sips -g pixelWidth -g pixelHeight "$src" 2>/dev/null \
         | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w" "h}')
  w=${dims% *}; h=${dims#* }
  if [ -n "$w" ] && [ -n "$h" ] && { [ "$w" -gt "$MAX_EDGE" ] || [ "$h" -gt "$MAX_EDGE" ]; }; then
    if [ "$w" -ge "$h" ]; then
      cwebp -quiet -q $QUALITY -resize $MAX_EDGE 0 -metadata none "$src" -o "$dst"
    else
      cwebp -quiet -q $QUALITY -resize 0 $MAX_EDGE -metadata none "$src" -o "$dst"
    fi
  else
    cwebp -quiet -q $QUALITY -metadata none "$src" -o "$dst"
  fi
}

# decode anything cwebp cannot read (HEIC, TIFF, PDF) through sips first
via_png() {
  tmp=$(mktemp -t vivekta).png
  if sips -s format png "$1" --out "$tmp" >/dev/null 2>&1 && to_webp "$tmp" "$2"; then
    rm -f "$tmp"; return 0
  fi
  rm -f "$tmp"; return 1
}

while IFS= read -r f; do
  rel=${f#"$SRC"/}
  dir="$OUT/$(dirname "$rel")"
  base=$(basename "$rel"); base=${base%.*}
  ext=$(printf '%s' "${f##*.}" | tr '[:upper:]' '[:lower:]')
  mkdir -p "$dir"

  case "$ext" in
    jpg|jpeg|png|webp)
      dst="$dir/$base.webp"
      stale "$f" "$dst" || { skipped=$((skipped+1)); continue; }
      if to_webp "$f" "$dst"; then
        photos=$((photos+1)); echo "  photo  $rel"
      else
        echo "  ! encode failed: $rel"; failed=$((failed+1))
      fi
      ;;

    heic|heif|tif|tiff)
      dst="$dir/$base.webp"
      stale "$f" "$dst" || { skipped=$((skipped+1)); continue; }
      if via_png "$f" "$dst"; then
        photos=$((photos+1)); echo "  photo  $rel"
      else
        echo "  ! decode failed: $rel"; failed=$((failed+1))
      fi
      ;;

    mp4|mov|m4v|avi|mkv|3gp)
      dst="$dir/$base.mp4"
      stale "$f" "$dst" || { skipped=$((skipped+1)); continue; }
      # -nostdin: ffmpeg would otherwise swallow the file list this loop reads
      if ffmpeg -nostdin -loglevel error -y -i "$f" \
          -vf "scale='min(1920,iw)':'min(${MAX_H},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2" \
          -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p \
          -c:a aac -b:a 128k -movflags +faststart "$dst"; then
        videos=$((videos+1)); echo "  video  $rel"
      else
        echo "  ! encode failed: $rel"; failed=$((failed+1))
      fi
      ;;

    pdf)
      # Tickets arrive as PDFs. Render page one so it shows as an artefact,
      # and keep the PDF beside it for anyone who wants the real thing.
      dst="$dir/$base.webp"
      [ -f "$dir/$base.pdf" ] || cp "$f" "$dir/$base.pdf"
      stale "$f" "$dst" || { skipped=$((skipped+1)); continue; }
      if via_png "$f" "$dst"; then
        photos=$((photos+1)); echo "  ticket $rel"
      else
        echo "  ! pdf render failed (pdf kept): $rel"; failed=$((failed+1))
      fi
      ;;
  esac
done <<EOF
$(find "$SRC" -type f ! -name '.*')
EOF

echo
echo "encoded $photos photos, $videos videos — skipped $skipped already current, $failed failed"
echo "now run: tools/build-manifest.py"
