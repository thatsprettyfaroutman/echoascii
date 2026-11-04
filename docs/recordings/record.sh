#!/usr/bin/env bash
# Re-records the README GIFs from the tapes in this folder.
# Needs vhs (brew install vhs), and gifsicle to keep the GIFs small.
set -euo pipefail
cd "$(dirname "$0")/../.."

npm run build
for tape in docs/recordings/*.tape; do
  vhs "$tape"
done

if command -v gifsicle >/dev/null; then
  for gif in docs/recordings/*.gif; do
    gifsicle --batch -O3 "$gif"
  done
  # Every frame of the flowing rainbow is different, so the title needs a
  # smaller palette and light lossy compression to stay under 1 MB
  gifsicle --batch -O3 --colors 96 --lossy=40 docs/recordings/title.gif
  # Colors or letters change on every frame of these too
  for name in decode fall marquee rain; do
    gifsicle --batch -O3 --colors 128 --lossy=40 "docs/recordings/$name.gif"
  done
else
  echo "gifsicle not found, so the GIFs are not optimized" >&2
fi
