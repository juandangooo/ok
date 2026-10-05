# The Primark Journey: 12 Etched Motion drawings

Exactly 12 authored keyframes, in 4:5 portrait format. Each PNG is 2160 × 2700 pixels. These are original JavaScript Canvas drawings with stable seeded ink hatching, opening road-case poses, equipment, a map unfolding, and cumulative opening markers.

## Deliverables

- frames/frame-01.png through frame-12.png: the twelve individual drawings.
- contact-sheet.jpg: all twelve drawings on one sheet.
- primark-journey.mp4: silent 1080 × 1350 H.264 preview. Fourteen seconds: each of the first eleven drawings holds one second; the final drawing holds three seconds. Twenty-four encoded frames per second repeat those held drawings; no extra in-between drawings are implied.
- primark-journey.gif: 640 × 800 looping preview with the same timing.
- preview.html: self-contained player with play/pause and twelve-position scrubber.
- journey.js: frame compositions, beat titles, opening counts, drawing poses and timing.
- drawing-kit.js, map-paths.js, etch.js, hellhound-logo.js: editable drawing helpers, map boundary geometry, and existing Hellhound logo paths.
- openings.json and openings.js: the 36 supplied entries, including 35 completed openings and one upcoming opening as of September 28, 2026.

## Twelve beats

1. The case is packed: The sound of opening day.
2. The lid opens; a microphone and speaker emerge.
3. The folded map unfolds above the case.
4. The first three openings, November–December 2022.
5. Seven openings reached, April–July 2023.
6. Eleven openings reached, September–November 2023.
7. Seventeen openings reached, July 2024–April 2025.
8. Twenty-five openings reached, July–December 2025.
9. Twenty-eight openings reached, April–May 2026.
10. Thirty-two openings reached, June–August 2026.
11. Thirty-five completed openings reached, September 2026.
12. Thirty-six markers across thirteen states: 35 completed openings plus Pentagon City Mall, upcoming (date not yet announced, shown as TBD), drawn with a hollow dashed marker.

## Source and limits

The chronology comes from the user's two photographed opening lists plus the September 28 screenshot with eight added locations. Parks at Arlington uses June 25, 2026, interpreting the handwritten correction beside the crossed-out May 20 date. Castleton Square Mall expands the handwritten Castleton Sq. Mall. Upcoming status is determined from the supplied dates relative to September 28, 2026. Public opening schedules were not independently verified. A two-day Potomac Mills entry counts once. Map geometry was traced from the supplied map into editable paths; geographic positions remain approximate, and regional close-ups are schematic. The cable belongs to the audio equipment and does not represent a travel route. The Primark wordmark remains a raster image derived from the supplied map. The equipment is an illustrative reimagining, not a technical product drawing. System fonts are DIN Condensed, Avenir Next, and Baskerville; other systems may substitute fonts when rerendering. PNG and video exports preserve the checked typography.

## Editing and checks

Open preview.html in a browser. If local-file access is restricted, serve this folder with python3 -m http.server 8768 and visit http://localhost:8768/preview.html. renderKeyframe(index,scale) renders indices 0–11; renderFrame(t,scale) holds one drawing per second and clamps at frame 12. Timeline playback holds the ending three seconds.

Verified the per-frame marker counts 0, 0, 0, 3, 7, 11, 17, 25, 28, 32, 35, 36, unique final marker IDs 01–36, stable repeated rendering, image dimensions, and full video decode. Reviewed the contact sheet plus larger opening and final frames. The work is a twelve-drawing held-frame sequence, not smooth interpolated animation. The prior five-slide carousel is preserved separately.

## 30-second continuous version

- primark-journey-30s.mp4: 1080 × 1350, 30 fps, 30 seconds, H.264. One continuous eased timeline instead of twelve held drawings.
- motion.html: player with play/pause and a scrubber. Serve the folder (python3 -m http.server 8768) and open http://localhost:8768/motion.html.
- motion.js: the timeline. It reuses the same drawing kit, map geometry, logo and openings data.
- render-motion.mjs: export script. Run `node render-motion.mjs` (needs Playwright and ffmpeg; set FFMPEG=/path/to/ffmpeg if it is not on PATH). It supersamples each frame at 2× to keep the hatching steady. Use `--stills 2.4,12,29` to export PNG stills instead.
- Map: real state boundaries from the U.S. Census Bureau cartographic boundary file (cb_2023_us_state_500k), in an Albers equal-area projection. This replaces the traced map, which had state abbreviations cut into the shapes (the "W" in West Virginia, "M" in Massachusetts, "V" in Vermont), a split Virginia, and no Upper Peninsula or Rhode Island. Rebuild with `node tools/build-map.mjs <dir>` (the steps are in the script header). Stores are placed from real coordinates (`lat`/`lon` in openings.json).
- NYC and DC close-ups (top right) use the same Census data at full 1:500k detail.
- Intro gear, drawn to real proportions: a Shure SM58 (51 mm ball grille, 162 mm long, tapering charcoal handle) and a JBL VRX ground stack (one VRX918S sub at 508 × 597 × 749 mm, three VRX932LA-1 at 343 × 597 × 376 mm with trapezoid sides and front rigging).
- fonts/: open-licence stand-ins (Barlow Condensed, Nunito Sans, Libre Baskerville), used only when DIN Condensed, Avenir Next or Baskerville are not installed.

Timeline (seconds):
- 0–3.0: quick intro. The black case etches in, the lid swings open, the mic and speaker pop out, and the map unfolds and settles.
- 3.4–25.2: openings 01–35 arrive on a steady beat, one every 0.64 s. Each one gets:
  - its pin on the map, with its state inking in (NY/NJ and MD/VA openings use numbered badges beside the map);
  - a large "now opening" callout with the name, city and date beside the counter;
  - a permanent line in the 36-slot ledger, so every store visited stays on screen.
- 26.0–30.0: the dashed Pentagon City marker lands as NEXT, a thank-you pulse runs through every marker, then a hold.

To change the pacing, edit `FIRST` and `STEP` (the opening beat) and the intro times in `caseScene`, `gearAt` and `mapAt` in motion.js. The case finish is the `CASE` palette in drawing-kit.js.
