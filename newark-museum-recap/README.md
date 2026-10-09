# Newark Museum of Art: event recap

`output/hellhound-newark-museum-recap.mp4`: 1080×1920 (vertical, for Reels/TikTok/Stories), 30fps, 1:29, silent.

## v3 (current): the day, in order
Built from the 19 clips plus the 342 photos from the `Newark Musem 10 8 26 - photos` Drive folder.

- **Runs in clock order.** A camcorder-style time stamp (top right, red dot) ticks forward from 10:34 am at the
  loading dock to 8:44 pm, using the photos' EXIF times and the clips' own start times (stamped in UTC, shifted to
  Eastern; the tripod timelapses shoot one frame every 0.5s, so their clock runs 15× while they play).
- **No repeats.** Every fixed-camera timelapse appears once; handheld clips come back only for a different moment.
  Shots that were there to fill time are gone, so it runs 1:29 rather than padding to 1:30.
- **Photos narrate**: single frames drift slowly; bursts play as stop-motion (the disco ball going up at 11:52,
  truss into the freight elevator, the crew watching from the balcony). The hall goes from dark to lit at 7:14 pm
  inside the hexagon, and it ends on a small disco-ball candle at 8:44 pm before the logo.
- **One warm, faded look** over footage and photos alike (lifted blacks, warm highlights, soft bloom, grain).
- Kept from v2: full screen for people at work, the hexagon collapsing in / blowing out at each chapter, the logo
  opening and the logo → QR ending, chapter titles, progress bar, wordmark and corner coin.

v1 (everything in a fixed hexagon) and v2 (no photos) are in git history.

## Re-render
Footage and photos aren't committed (7.4 GB + 1.9 GB). Unzip the clips and rename `Newark Museum 10 8 26 - videos_N.MP4` → `vN.mp4`; unzip the photos as-is (`IMG_5220.JPG` …).
```
export FOOTAGE=/path/to/clips PHOTOS=/path/to/photos CACHE=/tmp/recap-cache
python3 render.py cache        # cut the shots out of the source (slow: 4K HEVC)
python3 render.py board        # first / middle / last frame of every shot → output/board.jpg
python3 render.py stills 4 82  # check frames
python3 render.py video        # → output/master.mp4 (large); then a 2-pass 8 Mb/s encode for delivery
```
Needs ffmpeg, Python 3 with numpy + Pillow. Shots (`V` clip, `P` photo or burst, `XF` dissolve), speeds, crop focus, full-screen/hexagon mode and chapter
text all live in `CHAPTERS` at the top of `render.py`.
