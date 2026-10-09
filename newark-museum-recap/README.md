# Newark Museum of Art: event recap

`output/hellhound-newark-museum-recap.mp4`: 1080×1920 (vertical, for Reels/TikTok/Stories), 30fps, 1:30, silent.

Built from the 19 original clips in the `Newark Museum 10 8 26` Drive folder (4K/1080p, not re-cropped from an export).

## v2 (current)
Movement taken from the "HexFlow" edit, with the v1 type and branding kept:

- **Full screen** for people at work: the vertical phone clips, the 4K front-of-house and DJ clips, close timelapses.
  Every 9:16 crop is aimed at the crew or the guests (`focus x` per shot), and every shot's first, middle and
  last frame was checked on `output/board.jpg` so none land on a bare wall or a body blocking the lens.
- **The hexagon** (the logo's own outline, thin red edge) at each chapter break: the full-screen shot collapses into
  it, a wide room timelapse plays inside over a blurred copy of itself, then the next shot blows back out to full
  screen. Wide shots of the hall live here, where they read well; people are too small in them for full screen.
- Opens on the logo inside the hexagon and dissolves into the disco-ball arch. Ends on the crew at front of house,
  collapsing into the hexagon, which becomes the logo (over a blurred logo backdrop) and spins to the QR code.
- Kept from v1: chapter titles in the brand font with the red bolt `I` (Newark Museum → Load In → The Build →
  Lights Up → The Night), the subtitle line, the progress bar with red chapter ticks, the wordmark, and the
  logo ⇄ QR coin in the corner. Gradients at the top and bottom keep them readable over footage.
- Cuts land on a 120 BPM grid (one beat = 0.5s = 15 frames), so a track at 120 (or 60/240) sits on them.

v1 (everything inside a fixed hexagon) is in git history: commit "Add Newark Museum of Art event recap video".

## Re-render
Footage isn't committed (7.4 GB). Unzip it and rename `Newark Museum 10 8 26 - videos_N.MP4` → `vN.mp4`.
```
export FOOTAGE=/path/to/clips CACHE=/tmp/recap-cache
python3 render.py cache        # cut the shots out of the source (slow: 4K HEVC)
python3 render.py board        # first / middle / last frame of every shot → output/board.jpg
python3 render.py stills 4 82  # check frames
python3 render.py video        # → output/master.mp4 (large); then a 2-pass 8 Mb/s encode for delivery
```
Needs ffmpeg, Python 3 with numpy + Pillow. Shots, speeds, crop focus, full-screen/hexagon mode and chapter text
all live in `CHAPTERS` at the top of `render.py`.
