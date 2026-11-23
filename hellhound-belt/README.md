# Hellhound Audio Championship Belt: Plate Files

Classic hand-built championship craft, the kind associated with makers like Dave Millican and Reggie Parks, applied to the Hellhound brand. This design is inspired by that style. No maker was involved.

Vendor upload fields from the Undisputed Belts screenshot:

| Upload field | File (flat, 300 dpi) | Layered master | Plate size (assumed) |
|---|---|---|---|
| Main Plate | `01_Main_Plate.png` | `01_Main_Plate.psd` | 12 × 10 in (3600 × 3000 px) |
| Side Plate 1 | `02_Side_Plate_1_NJ.png` | `02_Side_Plate_1_NJ.psd` | 5 × 5.67 in (1500 × 1700 px) |
| Side Plate 2 | `03_Side_Plate_2_Sound.png` | `03_Side_Plate_2_Sound.psd` | 5 × 5.67 in |
| End Plate 1 | `04_End_Plate_1.png` | `04_End_Plate_1.psd` | 3 × 3.67 in (900 × 1100 px) |
| End Plate 2 | `05_End_Plate_2.png` | `05_End_Plate_2.psd` | 3 × 3.67 in |
| Full Design | `06_Full_Design_Upload.png` | (build from the five PSDs) | all plates at actual size |

`00_Full_Belt_Mockup.png` is the presentation view: black strap, red stitching, all five plates.

**These sizes are placeholders.** The vendor's real plate outlines, sizes and print method were not in the screenshot. Get their template, then resize or re-cut before ordering.

## The design: saying a lot with little

- **Main plate:** a stretched hexagon cut from the HH cube logo, with crown peaks top and bottom. The nickel backer flares out under a 24k-gold front plate. Hand-cut scrolls and a sunburst are engraved in the band, with a cast bead border and eight rubies.
- **Center:** the real HH emblem cut from the supplied logo and rebuilt in metal. The white H is polished gold, black is black enamel, red is ruby enamel, and a cast gold rim goes around it.
- **Sound rings:** concentric speaker-cone rings are engraved into the black enamel behind the emblem. This is the Hellhound touch: the plate reads as a speaker.
- **Lettering:** the actual HELLHOUND / AUDIO wordmarks are lifted from the logo onto raised banners, and the AUDIO bolt stays ruby. "NO COMPARISON" is engraved small underneath, so it's said quietly rather than shouted.
- **Side plates:** NJ split by the bolt, and a gold speaker with the bolt on its dust cap.
- **End plates:** just the bolt, mirrored left and right.

## Working the PSDs

- Every material sits on its own named layer: nickel backer, gold front, engraving, enamel field, beads, emblem parts, banners, text, jewels and highlights.
- **Hide the "Strap preview" layer before exporting for upload.** The guide layers ("cut line" and "safe area") are hidden by default.
- `TEXT - ...` layers are rendered pixels. To change copy, retype it in Cinzel (in `fonts/`, OFL license) and use Bevel & Emboss with a gold gradient.
- Metal shading is baked in, so it shows up in any app. Dial it back if the vendor prints flat color art (Color Tech) and adds its own plating.
- Regenerate everything with `python3 source/build_belt.py <logo-folder> <out-folder> fonts`.

## Still open

The final wording, whether "NEW JERSEY" appears literally, and the vendor's template, file specs and proof process.
