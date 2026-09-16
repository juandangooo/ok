# SVG Recipes

Copy-paste building blocks. Read `style-guide.md` Part 1 first — several of
these are the wrong default if you have not chosen a density register and an
ink count. All tested; coordinates assume a 1000×740 canvas
with the tin occupying roughly `x 60..940, y 70..670`.

---

## 1. Tin body: rim, lid, sheen

Four stacked rounded rects. The chrome gradient running diagonally is what sells
it — a vertical gradient looks like plastic.

```xml
<defs>
  <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%"   stop-color="#F2F4F5"/>
    <stop offset="18%"  stop-color="#9AA3A8"/>
    <stop offset="34%"  stop-color="#E8ECEE"/>
    <stop offset="52%"  stop-color="#7E878C"/>
    <stop offset="72%"  stop-color="#DDE2E5"/>
    <stop offset="100%" stop-color="#8C9599"/>
  </linearGradient>
  <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%"   stop-color="#F6E08A"/>
    <stop offset="25%"  stop-color="#B8971F"/>
    <stop offset="50%"  stop-color="#F0D86A"/>
    <stop offset="78%"  stop-color="#A88A1C"/>
    <stop offset="100%" stop-color="#E4CE63"/>
  </linearGradient>
  <!-- lid sheen: a soft diagonal wash, ~10% opacity -->
  <linearGradient id="sheen" x1="0" y1="0" x2="0.7" y2="1">
    <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="0.34"/>
    <stop offset="38%"  stop-color="#FFFFFF" stop-opacity="0.06"/>
    <stop offset="62%"  stop-color="#000000" stop-opacity="0.04"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.20"/>
  </linearGradient>
</defs>

<!-- outer rim -->
<rect x="60"  y="70"  width="880" height="600" rx="96" fill="url(#chrome)"/>
<!-- rim shadow line -->
<rect x="76"  y="86"  width="848" height="568" rx="84" fill="none"
      stroke="#6E777C" stroke-width="3"/>
<!-- the label field: everything you draw goes inside this clip -->
<clipPath id="lid"><rect x="88" y="98" width="824" height="544" rx="76"/></clipPath>
<g clip-path="url(#lid)">
  <rect x="88" y="98" width="824" height="544" fill="#F3CE0A"/>
  <!-- ... artwork ... -->
</g>
<!-- sheen + vignette go LAST, over the artwork, inside the same clip -->
<rect x="88" y="98" width="824" height="544" rx="76" fill="url(#sheen)"/>
```

Corner radius by archetype: Nordic ≈ 18% of the short side · club/oblong tin =
50% of the short side (a stadium) · French/Italian rectangular ≈ 13%.

---

## 2. Ring pull

Sits on the lid, top-left by convention, and the artwork is drawn *around* it.

```xml
<g transform="translate(200,210)">
  <!-- riveted tab base -->
  <ellipse cx="0" cy="0" rx="62" ry="46" fill="url(#chrome)"
           stroke="#788186" stroke-width="2"/>
  <ellipse cx="-2" cy="-3" rx="26" ry="20" fill="#C9D0D4"
           stroke="#8B9499" stroke-width="2"/>
  <!-- the ring: a thick stroked ellipse, not two shapes -->
  <ellipse cx="46" cy="16" rx="52" ry="40" fill="none"
           stroke="url(#chrome)" stroke-width="15"/>
  <ellipse cx="46" cy="16" rx="52" ry="40" fill="none"
           stroke="#6E777C" stroke-width="1.4" opacity=".7"/>
  <!-- score line of the opening panel -->
  <path d="M-46 -40 q120 -26 220 4" fill="none" stroke="#8A9297"
        stroke-width="2.5" opacity=".65"/>
</g>
```

---

## 3. Engraving, drawn mark by mark

**Do not reach for `<pattern>` here.** A pattern tiles exactly; the eye catches
the grid and the drawing collapses into vector art. Engraving is individual
lines, each slightly off its neighbour. `../scripts/handdrawn.py` emits them:

```python
import sys; sys.path.insert(0, '.claude/skills/sardine-tin/scripts')
from handdrawn import hatch, scatter, taper, stroke_weights, ellipse_mask, paths

body = ellipse_mask(300, 170, 210, 62)          # the shape being shaded

# three tonal steps = three spacings, not three greys
t1 = hatch(90, 108, 420, 124, spacing=9.0, angle=34, seed=1, inside=body, bow=7)
t2 = hatch(90, 108, 420, 124, spacing=5.5, angle=34, seed=2, inside=body, bow=7)
t3 = hatch(90, 108, 420, 124, spacing=5.5, angle=-52, seed=3, inside=body)  # cross

# scales: hundreds of separate ticks, never a pattern
sc = scatter(120, 130, 360, 84, n=420, seed=7, length=7, angle=-18,
             spread=22, inside=body)

print(paths(t2, fill="none", stroke="#2E4A4C", stroke_width="1.5",
            stroke_linecap="round"))
print(paths(sc, fill="none", stroke="#2E4A4C", stroke_width="1.1",
            stroke_linecap="round", opacity=".85"))
```

`bow` bends each line so it follows the form's curvature — the engraver's move
that flat hatching cannot fake. Reserve it for the one or two focal shapes.

`paths()` joins hundreds of marks into a single `<path>` element, so the page
stays light.

Patterns are still right for **flat background tone**, where regularity is not
read as drawing — the tone-on-tone ground in §4 is the case.

## 3b. Line that swells and thins

A uniform `stroke-width` is the machine tell. Draw important contours as filled
shapes instead:

```python
from handdrawn import smooth, taper, stroke_weights, jitter

back = [(96,168),(150,128),(230,110),(320,112),(400,132),(462,166)]
w = [x * 5.2 for x in stroke_weights(len(back), ends=0.35, belly=1.0, peak=0.4)]
print(f'<path fill="#2E4A4C" d="{taper(jitter(back, 1.2, seed=4), w)}"/>')
```

Keep uniform strokes for rules, keylines and the ruled origin box, where
mechanical regularity is honest.

## 3c. Misregistration and overprint

The two cheapest, most convincing old-print cues.

```xml
<!-- flat colour sits a hair off the linework that describes it -->
<g transform="translate(3.5,-2.5)">
  <path fill="#F2C230" d="…the jacket…"/>
</g>
<g id="linework"> … </g>          <!-- drawn after, in register -->

<!-- ink goes darker where it crosses the second colour, as on press -->
<g style="mix-blend-mode:multiply"> …all the drawing ink… </g>
```

Let the colour spill past its outline in exactly one place. Two or three places
reads as a mistake; one reads as a press.

## 3d. Frames that are not machine-made

```python
from handdrawn import wobble_rect
print(f'<path fill="none" stroke="#2E4A4C" stroke-width="7" '
      f'd="{wobble_rect(128, 150, 744, 440, r=56, amp=1.8, seed=11)}"/>')
```

Each corner gets its own radius and every point is nudged. At 1000px wide keep
`amp` around 1.5–2.5; past that it reads as a gimmick rather than a hand.

## 4. Tone-on-tone ground (archetype H, Art Nouveau)

The subliminal tendril field. Keep the contrast under 10%.

```xml
<defs>
  <pattern id="tendril" width="180" height="180" patternUnits="userSpaceOnUse">
    <path d="M10 150 C 50 110, 40 60, 90 40 S 160 60, 170 20"
          fill="none" stroke="#E0B100" stroke-width="7" stroke-linecap="round"/>
    <path d="M0 60 C 40 80, 70 50, 90 90 S 140 130, 180 100"
          fill="none" stroke="#E0B100" stroke-width="5" stroke-linecap="round"/>
    <circle cx="140" cy="150" r="9" fill="none" stroke="#E0B100" stroke-width="5"/>
  </pattern>
</defs>
<rect x="88" y="98" width="824" height="544" fill="url(#tendril)"/>
```

---

## 4b. Ageing a palette

An eighty-year-old tin is not a saturated one. To pitch a palette at the
Peacock's end rather than the Belle-Iloise end, pull every ink toward a warm
grey before you start — do not try to fix it afterwards with an overlay.

```python
def aged(hex_colour, amount=0.22, toward=(214, 206, 178)):
    """Mix a colour toward old-paper cream. amount 0.15-0.35."""
    r, g, b = (int(hex_colour[i:i+2], 16) for i in (1, 3, 5))
    return "#%02X%02X%02X" % tuple(
        round(c + (t - c) * amount) for c, t in zip((r, g, b), toward))

aged("#2F5B3A")   # -> a green that has sat in a cupboard since 1936
```

Then finish with grain at 3–6% and a warm vignette. The Portuguese and Pinhais
cans are the opposite case — modern print, full strength, no ageing at all.

## 5. Arched display type

```xml
<defs>
  <!-- convex-up arc (top lines AND bottom "hill" lines): sweep-flag = 1 -->
  <path id="arcTop" d="M170 300 A 640 640 0 0 1 830 300" fill="none"/>
  <!-- sagging arc (a valley, for text hugging the bottom): sweep-flag = 0 -->
  <path id="arcBot" d="M170 560 A 640 640 0 0 0 830 560" fill="none"/>
</defs>

<text font-family="Bowlby One SC" font-size="66" fill="#E3D24A"
      stroke="#2B1620" stroke-width="5" paint-order="stroke fill"
      stroke-linejoin="round" letter-spacing="4" text-anchor="middle">
  <textPath href="#arcTop" startOffset="50%">GREBBESTADS</textPath>
</text>
```

Radius for a chord of width `W` with a rise `h` at the centre:
`r = (W² / 4 + h²) / (2h)`. A gentle packaging arc is `h ≈ W/14`.

---

## 6. Hand-lettered wobble

The difference between "vintage" and "a font". Set each letter in a `<tspan>`
with its own rotation and a little size variance.

```xml
<text font-family="Anton" font-size="112" fill="#E23B2E" stroke="#1B1B1B"
      stroke-width="7" paint-order="stroke fill" stroke-linejoin="round">
  <tspan x="140" y="360" rotate="-1.5 1 -0.5 2 -1 0.5 1.5 -2 0.5 1 -1">POLLASTRINI</tspan>
</text>
```

`rotate` on a `<tspan>` takes a per-glyph list — one of the few genuinely
useful obscure SVG attributes. Keep values inside ±2.5°; beyond that it reads
as a gimmick rather than a hand.

For a second-color inner highlight on the hero word, draw the same text twice:
once with the stroke, once on top with a slightly lighter fill and no stroke,
offset by 1–2px.

---

## 7. Ribbon banner

```xml
<g transform="translate(640,470) rotate(-18)">
  <path d="M-150 -26 H150 L128 0 L150 26 H-150 L-128 0 Z"
        fill="#F2C500" stroke="#141414" stroke-width="3.5"
        stroke-linejoin="round"/>
  <text x="0" y="9" text-anchor="middle" font-family="Oswald" font-size="26"
        letter-spacing="2" fill="#141414">100 YEARS · 1912-2012</text>
</g>
```

Fold-backs at the ends: add two small quadrilaterals behind the main band,
darker by ~18%, before drawing the band.

---

## 8. Star tally and ruled origin box

```xml
<!-- five-point star, r = 14 -->
<path d="M0 -14 L4.1 -4.5 L14.2 -4.3 L6.2 2 L9.1 11.7 L0 6 L-9.1 11.7
         L-6.2 2 L-14.2 -4.3 L-4.1 -4.5 Z" fill="#E3D24A" stroke="#2B1620"
      stroke-width="1.6"/>

<!-- the boxed origin statement -->
<g font-family="Archivo Narrow" font-size="19" fill="#1B1B1B">
  <text x="430" y="520" letter-spacing="1">NET WT 3 ½ OZ - 100 gr</text>
  <rect x="620" y="503" width="150" height="24" fill="none"
        stroke="#1B1B1B" stroke-width="1.4"/>
  <text x="695" y="521" text-anchor="middle" font-size="16">product of Italy</text>
</g>
```

---

## 9. Flat botanicals (archetype H, Art Nouveau)

Three elements per object, in this order. No shading, no gradients.

```xml
<g>
  <!-- 1. opaque base -->
  <path id="leaf" d="M0 0 C 60 -46, 150 -40, 196 10 C 150 60, 60 56, 0 0 Z"
        fill="#4E8A3C"/>
  <!-- 2. one lighter highlight shape INSIDE, offset toward the light -->
  <path d="M18 -4 C 66 -36, 132 -32, 168 4 C 120 20, 60 22, 18 -4 Z"
        fill="#6FAE55"/>
  <!-- 3. uniform keyline around the whole object + the central vein -->
  <use href="#leaf" fill="none" stroke="#2A1E12" stroke-width="3.6"/>
  <path d="M6 2 C 70 -8, 140 -6, 190 10" fill="none"
        stroke="#2A1E12" stroke-width="2.6"/>
</g>
```

Let objects cross the border rule and each other — the overlap is the charm.

---

## 10. Aging: grain and vignette

Last two layers, always, clipped to the lid.

```xml
<defs>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3"
                  stitchTiles="stitch" result="n"/>
    <feColorMatrix type="saturate" values="0" in="n" result="g"/>
    <feComponentTransfer in="g">
      <feFuncA type="linear" slope="0.5"/>
    </feComponentTransfer>
  </filter>
  <radialGradient id="vig" cx="0.5" cy="0.45" r="0.72">
    <stop offset="55%"  stop-color="#000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0.30"/>
  </radialGradient>
</defs>

<rect x="88" y="98" width="824" height="544" rx="76"
      filter="url(#grain)" opacity="0.05" style="mix-blend-mode:multiply"/>
<rect x="88" y="98" width="824" height="544" rx="76" fill="url(#vig)"/>
```

Keep grain at 3–6%. Above that it reads as a Photoshop filter, not as tin.

---

## 11. Delivery format

- **For the user to look at** → an HTML page with the SVG inline and the fonts
  loaded from `fonts.googleapis.com`, published as an Artifact. Fonts render
  exactly, and it works on a phone.
- **For a file they'll reuse** → standalone `.svg`. Google Fonts won't resolve
  in most SVG viewers, so either accept the fallback stack or convert the
  display words to paths.
- **Raster** → render the HTML in headless Chromium (pre-installed here at
  `/opt/pw-browsers/chromium`) and screenshot the tin element at 2–3× DPR.

---

## 12. Verify before delivering

Look at what you drew — collisions between type and illustration are the
failure mode, and they are invisible in source. Render and read the image back:

```bash
pip install playwright                      # browsers are already on disk
python3 - <<'PY'
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome')
    pg = b.new_page(viewport={'width':1100,'height':900}, device_scale_factor=2)
    pg.goto('file:///path/to/tin.html')
    pg.wait_for_timeout(2500)
    pg.locator('svg').screenshot(path='/tmp/tin.png')
    b.close()
PY
```

Headless Chromium in this sandbox cannot reach `fonts.googleapis.com`, so a
local render falls back to a system serif and tells you nothing about the type.
Inline the faces for the check: fetch the CSS with `curl` (a browser UA gets
woff2), download each `latin`/`latin-ext` woff2, base64 them into `@font-face`
rules, and inject that `<style>` into a throwaway copy of the page. Keep the
committed file pointing at Google Fonts.

What to look for in the render, in order: display words colliding with
illustration; text overflowing the end of a `textPath` arc (it silently
disappears); elements clipped at the lid edge that read as blobs rather than as
deliberate bleeds; a display face too light for the archetype; and empty yellow
where the coverage rule says there should be ornament.
