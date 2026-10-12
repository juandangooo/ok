#!/bin/sh
# Build the HTML and print it to PDF with headless Chromium.
set -e
cd "$(dirname "$0")"
node build.mjs
"${CHROME:-chromium}" --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer --virtual-time-budget=4000 \
  --print-to-pdf="$PWD/P2S_Care_Manual.pdf" "file://$PWD/manual.html"
