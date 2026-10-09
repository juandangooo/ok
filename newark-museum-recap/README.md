# Newark Museum of Art: event recap

`output/hellhound-newark-museum-recap.mp4`: 1080×1920 (vertical, for Reels/TikTok/Stories), 30fps, 1:30, silent.

Built from the 19 clips in the `Newark Museum 10 8 26` Drive folder, styled after the Spotify Canvas of Tycho's *Dive*:
one fixed window on a dark field, footage drifting inside it, hard cuts on the beat.

- **Window**: the hexagon from the Hellhound logo, using the logo's own alpha. The triangle is gone, and at the end the window
  turns into the logo, which spins over to a big QR code (hellhoundaudio.com) and holds still so it can be scanned.
- **Rhythm**: every cut lands on a 120 BPM grid (one beat = 0.5s = 15 frames). Shots run 1–2.5s, and timelapses play
  at 6–12× so the room visibly fills up. Any track at 120 BPM (or 60/240) will sit on the cuts.
- **Chapters** (the track-name slot in the Canvas): Newark Museum → Load In → The Build → Lights Up → The Night → logo.
  "Lights Up" opens by dissolving the daylight hall into the same hall lit purple.
- **Coin**: the logo ⇄ QR coin from the TV loop sits in the bottom-right corner, on a 10s cycle.
- Brand font (`brand/HellhoundAudio.ttf`, with the thunderbolt `I` painted red), progress bar with red chapter ticks, film grain.

## Re-render
Footage isn't committed (7.4 GB). Unzip it and rename `Newark Museum 10 8 26 - videos_N.MP4` → `vN.mp4`.
```
export FOOTAGE=/path/to/clips CACHE=/tmp/recap-cache
python3 render.py cache        # cut the 62 shots out of the source (slow: 4K HEVC)
python3 render.py board        # contact sheet of every shot → output/board.jpg
python3 render.py stills 41 86 # check frames
python3 render.py video        # → output/hellhound-newark-museum-recap.mp4
```
Needs ffmpeg, Python 3 with numpy + Pillow. Shots, speeds, crop focus and chapter text all live in `CHAPTERS` at the top of `render.py`.
