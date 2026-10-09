# Newark Museum of Art: event recap

`output/hellhound-newark-museum-recap.mp4`: 1080×1920 (vertical, for Reels/TikTok/Stories), 30fps, 1:10, silent.

## v4 (current): the day, in order; photos only in motion
Built from the 19 clips plus photo bursts from the `Newark Musem 10 8 26 - photos` Drive folder.

- **Photos only as stop-motion.** A photo appears only as part of a burst of 3+ frames shot seconds apart, played
  at ~8 fps and bouncing back and forth so it stays alive (`P()` refuses fewer than three). No single stills.
  Bursts: the crew at the dock door, the hoodie guy talking with his hands, the ladder out of the truck, truss into
  the freight elevator, a case carried across the hall, the crew at the ladder, the disco ball going up (12 frames),
  the hall going from dark to lit at 7:14 pm, the crew watching from the balcony, the dance floor.
- **Everything else is video**, including 2-second timelapses. Every fixed-camera timelapse appears once; handheld
  clips come back only for a different moment; shots with no people in them are out.
- **Runs in clock order.** A camcorder-style time stamp (top right, red dot) ticks forward from 10:34 am at the
  loading dock to 8:38 pm, from the photos' EXIF times and the clips' own start times (stamped in UTC, shifted to
  Eastern; the tripod timelapses shoot one frame every 0.5s, so their clock runs 15× while they play).
- It runs 1:10: tight rather than padded. Ends on the HELLHOUND AUDIO jacket on the dance floor, collapsing into
  the logo, which flips to the QR.
- One warm, faded look over footage and photos (lifted blacks, warm highlights, soft bloom, grain). Kept from v2:
  full screen for people at work, the hexagon collapsing in / blowing out at each chapter, the logo opening,
  chapter titles, progress bar, wordmark and corner coin.

v1 (fixed hexagon), v2 (no photos) and v3 (single photos too, 1:29) are in git history.

## Re-render
Footage and photos aren't committed (7.4 GB + 1.9 GB). Unzip the clips and rename `Newark Museum 10 8 26 - videos_N.MP4` → `vN.mp4`; unzip the photos as-is (`IMG_5220.JPG` …).
```
export FOOTAGE=/path/to/clips PHOTOS=/path/to/photos CACHE=/tmp/recap-cache
python3 render.py cache        # cut the shots out of the source (slow: 4K HEVC)
python3 render.py board        # first / middle / last frame of every shot → output/board.jpg
python3 render.py stills 4 82  # check frames
python3 render.py video        # → output/master.mp4 (large); then a 2-pass 8 Mb/s encode for delivery
```
Needs ffmpeg, Python 3 with numpy + Pillow. Shots (`V` clip, `P` photo burst, `XF` dissolve), speeds, crop focus, full-screen/hexagon mode and chapter
text all live in `CHAPTERS` at the top of `render.py`.
