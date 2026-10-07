# Hellhound promo video

`hellhound-promo.mp4`: 1920×1080, 30fps, 49s, silent (add music in your editor).

Built in code from `index.html`: one timed scene that copies the scroll/wipe flow of the reference recording
and follows the arte* DESIGN.md tokens (cream canvas, citron display type, copper body, periwinkle highlights).

## Re-render
Media isn't committed (≈245 MB). Put it in `assets/` next to `index.html`:
- `assets/img/NN.jpg`: photos, numbered by sorted filename from the zip (HEIC converted to JPG)
- `assets/clips/{gala,band,build}/0001.jpg…`: frames from `IMG_6028.mov`, `PXL_20250907_020841625.mp4`, and the WhatsApp timelapse at 4×
- `assets/fonts.css` + `assets/fonts/`: Bricolage Grotesque 500, Poppins 400/500, Instrument Serif, DM Mono

```
node render.mjs frames --workers 6
ffmpeg -framerate 30 -i frames/%05d.jpg -c:v libx264 -crf 19 -pix_fmt yuv420p hellhound-promo.mp4
```
Edit copy, photos and timings in the `PANELS`, `MONTAGE` and `T` blocks of `index.html`.
Opening `index.html` in a browser plays a live preview.

## v2: TV loop (`v2.html`, draft)
A 3:26 seamless loop for venue TVs: red/black, film grain, warm grade, a permanent logo and website bar, six service
chapters (audio, visual, lighting, power, truss, staging) with a logo/QR card after each, and a VHS intro/outro for the loop seam.
`brand/` holds the logo cut-outs and the QR code (points to https://www.hellhoundaudio.com); copy it to `assets/brand/` before rendering.
Grain textures are generated into `assets/grain/g0-7.png` (640×360 noise).
```
node render.mjs frames2 --html v2.html --workers 8
```
