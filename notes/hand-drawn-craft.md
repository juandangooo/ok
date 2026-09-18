# What the five films actually teach

Extracted from the `hand-drawn-canvas-animation` skill: its measurements of five films by
Kevin Ngo (`references/reference-films.md`), the reconstructions in `examples/`, and the
engine in `assets/core.js`. The videos themselves are on x.com, which this environment
cannot reach, so nothing here is claimed from watching them; it is taken from the
measurements and the code that reproduces them.

The skill's own docs give you the rules. This is the layer underneath: *why* the rules
hold, and the techniques the code uses that no doc states outright.

---

## 1. The one architectural idea everything else hangs off

**`drawFrame(i)` is a pure function of the drawn-frame index, and the score reads the same
timeline.**

That single constraint buys, in order:

- **Sound cannot drift.** The music is not synced to the picture; both are generated from
  `TIMELINE`, so a cue lands on a cut by construction. The author confirmed in replies under
  the fly post that the music was written in code and timed to the animation.
- **Any frame, any time, on any machine.** Render frame 2,431 without rendering 2,430. That
  is what makes `--only 37` and a 24-frame grid sheet in two seconds possible, which is what
  makes the review loop fast, which is what makes the films good.
- **No boil for free.** Purity plus `rng(seed)` means a static shot's texture is byte-identical
  across frames. Measured on four of the five films: consecutive frames of a static shot differ
  by about 1/255, which is codec noise, not redrawing.
- **Format is a render-time choice.** Scenes place things relative to `CX, CY, W, H`, so the
  same film renders square, wide or tall. A literal `540` in a scene is a latent bug.

Everything in the skill that looks like a style rule is downstream of this. `Math.random` is
not banned on aesthetic grounds; it is banned because it breaks purity, and broken purity
shows up as boiling texture.

## 2. Author once, derive the variant — the trick used three times

The same move appears at three scales, and it is the most reusable idea in the whole kit.

| scale | mechanism | what you write once | what you get free |
|---|---|---|---|
| a drawable | `mode` parameter: `'ink'` or `'blueprint'` | one geometry | chalk-on-night version of anything, so "look inside" is a device you already own |
| a whole shot | `nightShot(c, body, {lights})` | the shot in daylight | night everywhere except inside moving pools of light |
| a palette | `usePalette`, `derivePalette`, `duotone` | one film | a hue-shifted or two-ink variant on one line |

`nightShot` is worth studying closely. It runs **the entire shot function twice** — once in
ink, once under `chalkPalette()` — keeps the chalk pass only where it is dark, and lays it on
top. So a single line is ink where the light falls and chalk where it does not, and the
transition happens at the edge of the pool *as the light moves*. You never author a night
version of anything.

The cost is a discipline: anything whose colour must not change between passes (a flame, a
lamp) has to state its colours explicitly. In `night-shift.html` the spark's body is a literal
`#fff4b8`/`#ffab2e` with `blend: 'source-over'` on its wash, precisely so it survives both
passes. And `usePalette` inside a `nightShot` body is a listed defect: the chalk pass would
come out in ink.

## 3. The cadence is the style

More of the hand-drawn feel comes from timing than from texture.

- **Drawn at 12 fps, output at 24.** Measured on the fly film: even frames are duplicates,
  median diff 0.74 against 4.37 on odd pairs, 101 of 104 frozen frames on even positions.
  That is cel animation shot on twos, and the author's reply says slowing it down loses the feel.
- **Idle motion is quantised, not eased.** The fly twitches for one drawn frame every nine:
  `const twitch = (f % 9 === 0) ? .18 : 0`. The generic form is `pulse(i, every)`. A smoothly
  eased idle reads as computer graphics; a discrete tick reads as drawing.
- **Camera and paths ease, but are sampled on the grid.** Smooth motion is fine — it just gets
  sampled at 12 Hz like everything else.
- **Boil, if you want it, is a separate decision.** Re-seed *outlines only*, every 3 drawn
  frames, never the finish. `fly-style.html` exposes this as one flag, `BOIL = false`.
- **The doodle film breaks the cadence deliberately and only in one direction:** lines draw
  themselves on at the full 24 fps while drawn characters hold poses for 2 to 6 frames. Fast
  ink, slow bodies.

## 4. Why it reads as drawn rather than vector

**Fill and outline are never the same object.** A shape is a `Path2D` fill; its outline is a
*separately jittered polyline* (`wob`, `crayon`, `brush`). They disagree by a pixel or two
everywhere, which is exactly what a hand does and what a vector tool cannot do by accident.
If you take one thing from the whole kit, take this.

Around it:

- **Texture is a finish, computed per shape** (`surface()`), never a filter, blur or gradient
  over the final canvas. Shading is hatching, a dot screen or graphite — marks, not ramps.
- **The one gradient exception is inside a riso plate**, where a canvas gradient becomes *dot
  size* via `printPlate`. A gradient that survives to the final frame is a defect; a gradient
  that becomes a halftone density is the medium working correctly.
- **Volume comes from layered hatch, not from a ramp.** The peach in `fly-style.html` is one
  flat fill plus three hatch layers, each clipped to a *different offset circle* at a different
  angle and colour: a light layer at `.8` rad in cream, a blush layer at `-.6` in red, a dark
  layer at `.9` in maroon. That is a lit sphere made entirely of strokes.
- **Misregistration is an accent, and it is rationed.** `scribble` on one or two parts per
  frame, two-ink offsets on lettering and dots, never on backgrounds.
- **Lattices do "many of the same".** The compound eye is `hexCells` where each cell's fill is
  interpolated by distance from a highlight point — the lattice *is* the shading.

## 5. Motion tricks that cost nothing

From the flight scene and the chase, all of them stateless:

- **Ghost limbs for blur.** Draw the part 3 times at ±angle. The code divides alpha by the
  count (`.34 / ghosts.length + .06`) — three copies at full alpha stack to near-opaque, which
  is a listed pitfall.
- **Heading from the derivative.** Sample a cubic Bézier at `u` and `u + .01`; the angle
  between them is the facing. No stored rotation.
- **The camera leads.** `cam(p[0] + cos(dir) * 120, p[1] + sin(dir) * 120, ...)` — the frame
  centre sits 120 units *ahead* of the subject along its heading. A camera centred on the
  subject feels dead.
- **A trail is the path evaluated backwards in time.** `trail(path, tau)` calls `path(tau - k * .07)`
  for k = 1..9. No particle list, no state, and it is automatically correct on any frame.
- **An arc is one line.** `hop(a, b, t, h)` = lerp minus `sin(t * π) * h`. Every jump in the
  chase film is this.
- **Occlusion is draw order, decided per frame.** "He goes round the back of it" is literally
  `if (tau >= 1.75) drawHog(); photo(); else { photo(); drawHog(); }`.

## 6. Composition is reviewed at thumbnail size, on purpose

The rule is "one thing per shot; the silhouette reads at 240 px; a montage card reads at
120 px". Those numbers are not arbitrary — they are contact-sheet and badge size. The whole
review method is built to be done at a scale where only the silhouette survives:

1. `--grid 24` writes 24 evenly spaced frames as one sheet in a couple of seconds. Look at it
   before anything else.
2. The full render writes a contact sheet at two tiles per second. That is the edit view: you
   read pacing, dead air and repetition off it directly.
3. The checklist is a list of things *visible on a contact sheet*: a blank frame, a subject
   that does not read, two finishes in one shot, a palette change inside a shot, two transition
   devices in a row, the anchor missing.

"If a scene does not read on the grid sheet in a second and a half, redo it, do not decorate
it. One large object beats twenty small ones."

I hit three of these building `films/off-the-ground`, including one that was a real bug
(the height scale compressed into 6% of the frame) that no amount of reading the code would
have surfaced. **You cannot judge a frame from code.**

## 7. Editing: hard cuts, rationed devices, one anchor

- **Cut hard.** Shots 0.8 to 2.5 s; montage cards 0.25 s; inserts two drawn frames.
- **One device between two shots, never two in a row.** Preference order: ink blot, iris,
  self-drawing line, flicker, one-frame flash, torn section. A transition over 1 s is a defect.
- **One anchor survives every cut** — the fly, the seed dot at the exact centre of every riso
  frame, the boat that never moves while thirty worlds cut behind it, the thread down the
  page, the spark. Decide it before writing scenes. It is what holds a film of hard cuts together.
- **Cut on the beat.** `night-shift.html` runs at 120 bpm, so a beat is 6 drawn frames and
  every shot length is a multiple of 0.5 s. Sound and picture come from one timeline, so this
  costs nothing.
- **Sign it.** Every one of the five films ends with the same two words in hand lettering, two
  inks. The sign-off must be complete at least 1.5 s before the end or it gets cut when the
  film loops in a feed.

## 8. Characters: 3 to 8 parts, 3 to 6 numbers

- Parts as paths in **local** coordinates, origin at the body centre, forward = up.
- A pose is 3 to 6 numbers (`walk`, `twitch`, `wing`, `flap`, `tuck`, `lean`). Nothing else.
  The fly's entire vocabulary is `{wing, flap, legs, walk}`.
- Per part: fill → `surface()` → wobbly outline. That pipeline re-textures itself when the
  palette's finish changes, which is what makes a puppet portable between looks.
- `night-shift.html` generalises the placement: `tf(x, y, s, rot, dir)` returns a closure
  mapping unit coordinates to the frame, so a character is authored once in `[-1..1]` and
  dropped anywhere at any scale, rotation or facing. Bodies are splines through knot lists.
- **Test at 0.6, 1 and 1.8 on the style sheet, then read it at 240 px.**

## 9. Subject-agnosticism is the point

The core knows nothing about flies or boats. "A GPU, a server, a token, a city or a recipe is
built the same way": parts become rounded rects and circles, eyes become LEDs as small hex
discs, hatching runs along panel directions, markings become vents or traces, `construction`
lines make any object read as a technical drawing, and a riso card of it is three plates with
knockouts. The five looks are five finishes over one geometry system, not five drawing styles.

## 10. What the three engines actually change

Each replaces a different part of "draw the frame", which is why they compose:

| engine | what it replaces | the rule it bends |
|---|---|---|
| found motion | where the *motion* comes from — poses traced from a real motion study | none; palette and finish stay yours |
| sand | what the *frame is made of* — a bed that remembers, so one picture is made out of the one before it | drops hard cuts entirely, and pays by never showing a transition device either |
| paper in space | where the *paper is* — flat sheets stood up in a 3D room | none; the room only adds light |

Sand is the interesting one philosophically: every other method redraws the frame from
nothing, and sand does not. Its rules follow from the material — dark is sand and light is
glass, so to make something dark you pour and to make something light you wipe; and nothing
disappears, so sand a fingertip moves piles up beside the stroke and has to be planned as part
of the picture.

---

## The shortest version

1. Make `drawFrame(i)` pure and generate the sound from the same timeline. Everything else follows.
2. Never let fill and outline coincide.
3. Draw on twos; quantise idle motion; seed everything.
4. Author once, derive the variant (mode, night, palette).
5. Review on a contact sheet at thumbnail size, because that is where the failures are visible.
6. One anchor, hard cuts, one device at a time, and sign it.
