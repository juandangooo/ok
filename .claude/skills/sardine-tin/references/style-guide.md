# Conserva Tin Style Guide

The visual language of European tinned-fish packaging. Nine cans studied; four
are stored in `../assets/`, the rest are described here from reference.

**Read Part 1 before drawing anything.** The archetypes in Part 2 are a
wardrobe; Part 1 is the posture. Copying an archetype without the principles
produces a costume — recognisably "vintage", and dead.

---

# Part 1 — The approach

## 1. Two inks, and the discipline is the point

Most of the best cans are **one field colour and one drawing colour**. The
subject, the type, the texture, the rules and the six-point legal copy are all
the same ink. Tone comes from line density — never from a second shade of the
same colour.

The lime-green *Portuguese Sardines* can is the proof: one acid field, one
slate-teal ink, one engraved fish, three lines of type. Nothing else. It is the
most confident can in the set.

Make a third colour cost you something. When one does appear it is nearly
always a **spot accent doing exactly one job**: Pinhais' yellow is only the
fisherman's oilskin; the Belle-Iloise citron's green is only the leaves. It is
never spread around to "balance" the composition.

Two inks is not a limitation to work around. It is the constraint that forces
every other decision to be good.

## 2. The field colour is strange, not loud

Earlier drafts of this guide said "high chroma, loud". That is wrong, and it is
wrong in an instructive way. The real rule is that the field colour is **unlike
food, and slightly unlike anything**:

- a chartreuse that is nearly unpleasant
- a sage gone soft with eighty years of age
- a dusty mid-blue with no brightness in it at all
- a grass green too bright for a grocery shelf
- bubblegum pink on a can of anchovies

Saturation is a free variable — half these cans are quiet. *Oddness* is the
requirement. Pick the colour one step off the obvious one: not red but the
red-orange beside it, not green but the yellow-green that makes people faintly
uneasy. If the field colour feels tasteful, it is wrong.

## 3. Density is a register, and there is no middle

Either the can is **packed corner to corner** (Pollastrini, Belle-Iloise
épices) or it is **mostly bare field with one subject breathing in it**
(Portuguese, Pinhais). Both are correct. The medium-density can — elements
evenly distributed, politely arranged, nothing touching — is the dead zone, and
it is where almost every imitation lands.

Choose the register before you place anything:

- **Sparse:** one subject, two or three lines of type, and at least half the
  lid left as bare colour. Resist filling the space. The emptiness is the
  design. Pinhais leaves an entire quadrant empty around the ring pull.
- **Packed:** thin margins, stacked copy, ornament in every gap, objects
  overlapping and breaking the frame, ~85% coverage.

## 4. One subject, drawn once

Not a scene. Not a collage. Not a still life of the product range. **One fish.
One peacock. One fisherman. One lemon branch.** It is isolated, given room, and
drawn properly.

The temptation is always to add a second object, then a third, and to end up
with an inventory. An inventory has no subject. If you find yourself drawing a
group, ask which single member of it is the can.

## 5. The hand is in the line, not in the wobble

Rotating glyphs a degree or two is a party trick. Four things actually read as
hand-drawn, and `../scripts/handdrawn.py` produces all of them:

**Variable line weight.** A line that swells and thins along its length, the
way a nib or a brush does. A uniform `stroke-width` is the machine tell. Draw
important lines as filled shapes (`taper()`), and keep uniform strokes for
rules and keylines where mechanical regularity is honest.

**Individually placed marks.** The Portuguese sardine's scales are hundreds of
separate little ticks, each a slightly different length and angle. An SVG
`<pattern>` repeats exactly, and the eye catches the grid immediately — it is
the single fastest way to look like vector art. Use `scatter()` and `hatch()`
for anything on the subject; keep patterns for flat background tone, where
regularity is not read as drawing.

**Misregistration.** Flat colour areas sit a hair off from the linework that
describes them. Pinhais' yellow oilskin does not quite fill its outline. Offset
the colour layer 2–4 units from the ink layer, and let it spill past an edge in
one place. This is the most convincing old-print cue there is and it costs
nothing.

**Geometry that is slightly wrong.** The frame's four corners do not match. The
arc is not a circle. The two halves are not mirrored. Use `wobble_rect()` for
frames rather than `<rect rx>`.

And one more that belongs here: **overprint**. Where the drawing ink crosses a
second colour it goes *darker* rather than covering it —
`style="mix-blend-mode:multiply"`. That is literally what happened on the
press, it hands you a third colour free, and it ties the two inks together.

## 6. Mismatch the eras

The most sophisticated move in the set. Pair an antique drawing with modern
type, or a modern flat drawing with antique type:

- *Portuguese Sardines*: a 19th-century steel engraving under a 1950s
  geometric sans. The whole design is that tension.
- *Pinhais*: a loose cartoon line, a handwritten signature, and clean modern
  caps — three eras on one lid.
- *Abba*: century-old ornament under a contemporary soft-sans wordmark.

Matching the eras gives you a costume. Mismatching them gives you a design.

## 7. The typographic pyramid

Type descends in size *and* in importance, and keeps descending well past where
a modern designer would stop. Peacock's runs eight steps:

> **PEACOCK'S** → BEST ⋯ → *Sardines* → PACKED IN PEANUT OIL → FLAVORED WITH
> SPICE OILS → NET WT. 3¼ OZ. → R. J. PEACOCK CANNING CO. → LUBEC, ME. U.S.A.

The charm lives at the bottom of that list. The town name, the ounce fraction,
the chain-of-custody number, the traditional-method-since date. **Write the
boring lines.** They are the best lines on the can, and leaving them off is
what makes a design look like a poster instead of a product.

## 8. Give the type something to sit on

Type rarely sits directly on the field. It sits on or inside a shape: a
cartouche, a scroll with rolled ends, a double keyline frame, a banner, or one
half of a split field. Peacock's cream scroll and the blue can's wobbling
double frame do the same job — they make the type an object rather than a
caption.

The exception proves it: the sparse two-ink cans have no holder at all, and
they earn that by having almost no type.

## 9. The tin is part of the drawing

Rim, corner radius, ring pull, the pressed ear dimples. The artwork is composed
*around* the pull, never behind it: the Portuguese sardine's tail passes behind
the ring, and Pinhais leaves a whole empty quadrant for it. Plan the pull in
before the first mark.

---

# Part 2 — The archetypes

Two coordinates place any of them: how dense, and what the drawing register is.

| | Archetype | Density | Drawing | Inks |
|---|---|---|---|---|
| **A** | Two-Ink Modern | sparse | steel engraving | 2 |
| **B** | Pen-Line Sparse | sparse | single-weight cartoon line | 3 |
| **C** | Naive Hand | sparse–mid | painted, everything by hand | 2–3 |
| **D** | Nordic Spot-Colour | mid | flat shape + dot texture | 3–4 |
| **E** | American Cartouche | mid | flat silhouette + pattern | 3–4 |
| **F** | Split Field | mid | fine engraving on the light half | 3 |
| **G** | Steel Engraving | packed | hatch, everywhere | 2 |
| **H** | Art Nouveau | packed | flat botanicals, keylined | 5 |
| **I** | Typographic Maximalism | packed | tiny, subordinate | 5 |

### A. Two-Ink Modern — *Portuguese Sardines in Olive Oil*

The best argument in the set for restraint. Acid lime field, dark slate-teal
ink, nothing else. **No frame at all** — the type and the fish sit directly on
bare colour with enormous margins.

One sardine, large, in profile, filling the width, drawn as a proper engraving:
fine contour hatch following the body's curve, scales as hundreds of individual
ticks, fins as radiating lines, a solid dark eye. Its tail passes behind the
ring pull.

Type is a clean geometric sans (Futura/Avenir cast), all caps, wide-tracked,
straight baselines, same ink as the fish. PORTUGUESE above, SARDINES below, IN
OLIVE OIL small beneath that. The certification badge in the corner is a
mandated foreign object and the design simply lets it be one — which is itself
worth copying when a real brand hands you a logo that will not fit.

Palette: lime `#C3CE48` · slate teal `#2E4A4C`.

### B. Pen-Line Sparse — *Pinhais*

Grass-green field, navy line, one yellow accent. The fisherman is drawn in a
**single-weight pen line with no shading** — a cartoonist's confident sketch,
not an engraving. The entire background is one thin horizon line with a tiny
boat and two seagull ticks on it.

Half the lid is empty green. The brand is a handwritten signature. The
descriptor is small tracked caps. The date code is stamped straight over the
artwork, and the accident became part of the charm.

The yellow oilskin is **misregistered** against its outline — that offset is
the most copyable thing on this can.

Palette: grass `#20A25A` · navy `#1B2C6B` · oilskin yellow `#F2C230` · white.

### C. Naive Hand — *"Original" Sardines*, the painted blue can

The purest expression of hand-drawn soul. Dusty mid-blue field, navy ink, cream
highlights, and **nothing mechanical anywhere**. Every letter is drawn: widths
vary, spacing wanders, ORIGINAL arcs by eye rather than on a circle.

The vocabulary is tiny and that is the lesson — a fish, six loose comma
squiggles for water, three small stars, a wobbling double keyline frame, five
words. The fish is two flat tones (navy back, cream belly) and a few hatch
strokes. "Hand Packed" in a loose script sits above it.

Charm here is entirely a function of imperfection. Draw it clean and there is
nothing left.

Palette: dusty blue `#7FA0C0` · navy `#22306E` · cream `#EFEDE4`.

### D. Nordic Spot-Colour — *Abba Grebbestads Ansjovis* — `../assets/ref-abba-ansjovis.jpg`

Bubblegum pink field, brass rim, double keyline frame inset ~8% (thick yellow
rule, thin dark line inside). Heavy soft-cornered caps, wide-tracked, arched:
place-name above the frame, product inside the top, qualifier inside the
bottom. A shoal of three or four fish in one flat crimson with black linework
and a field of dots along the dorsal flank for scales; two or three squiggles
behind for water. Three stars stacked in the right margin. A contemporary
geometric-sans wordmark below the frame — the era mismatch, doing its work.

Palette: pink `#D07CB0` · brass `#E3D24A` · crimson `#B01243` · ink `#2B1620`.

### E. American Cartouche — *Peacock's Best*, Lubec, Maine

1930s American, and **faded** — sage green, cream, a darker green line, black.
Nothing in it is saturated. If you are drawing a tin that is meant to have
existed for eighty years, this is the palette model, not the French ones.

A cream scroll with rolled ends floats on the green and carries the type. The
peacock is a flat silhouette whose entire tail is one repeated imbricated
leaf-shape with a dot in each — pure pattern doing the work of drawing.
"Sardines" is a brush script with a white outline and a drop shadow. Below it,
the eight-step typographic pyramid in §7.

Palette: sage `#8FBE8A` · cream `#E8E6C8` · deep green `#2F5B3A` · black.

### F. Split Field — *La Belle-Iloise, sardines au citron*

A **vertical split**: saturated yellow on the left ~45%, white on the right
~55% carrying a delicate harbour engraving in fine green line. Bold flat colour
against fine linework — the pairing is the idea, and it transfers to any
subject.

Type runs rotated 90° up the yellow half, mixing a bold slab with a script.
Lemon slice and leaves as a small flat-colour motif bridging the two halves.

Palette: yellow `#F5D400` · white `#F4F2E8` · engraving green `#3E7A46`.

### G. Steel Engraving — *Porthos* — `../assets/ref-porthos.jpg`

Oblong club tin, chrome yellow, **two inks only**. There is no grey ink
anywhere — every tone is black line on yellow: parallel rules at three
spacings, cross-hatch for the darkest, stipple for skin, contour hatch for
volume, bare yellow for highlights. A 19th-century character portrait cropped
by the tin edge, holding a tin of Porthos. Heavy black sans at an angle with a
descending swash, a yellow banner ribbon, small condensed legal copy set
upside-down relative to the brand, and Chinese export text in a ruled box.

Palette: chrome yellow `#F2C500` · ink `#141414`.

### H. Art Nouveau — *La Belle-Iloise, épices et aromates* — `../assets/ref-belle-iloise.jpg`

Chrome yellow carrying a **tone-on-tone tendril ground** ~8% darker than the
field. A vermilion rule inset ~6%, deliberately crossed by the illustrations.
Hand-lettered Art Nouveau roman with sizes mixed *within one sentence* — "aux"
tiny and italic, "**épices**" enormous. Flat botanicals built from three
elements each: one opaque base, one lighter highlight shape inside, one uniform
dark keyline. They enter from the corners, overlap, and break the rule.

Palette: yellow `#F3CE0A` · ground `#E0B100` · vermilion `#C22A20` · leaf green
`#4E8A3C` · carrot `#E4802A` · ink brown `#2A1E12`.

### I. Typographic Maximalism — *Pollastrini di Anzio* — `../assets/ref-pollastrini.jpg`

Field split Wedgwood blue over chrome yellow, no frame. Six type styles
stacked, each a different colour: italic script line, bouncy outlined caps on
an arc, a heavy condensed red grotesque packed edge to edge, a lighter wide
cut, bottle-green caps on the yellow band, small italic serif provenance
ragged in the margin. Net weight in caps beside a **ruled box** around "product
of Italy". The illustration is tiny and subordinate — when the type is this
loud the picture gets small.

Palette: pale blue `#B8CCD7` · yellow `#E8D820` · red `#E23B2E` · type yellow
`#F5D51E` · bottle green `#1E6B45` · ink `#1B1B1B`.

---

# Part 3 — Checklist

Register and economy:
- [ ] Density register chosen and committed to — packed, or half the lid bare
- [ ] Two inks unless a third has a single specific job
- [ ] Field colour is strange rather than tasteful
- [ ] **One** subject, drawn once, given room

The hand:
- [ ] Focal linework has variable weight (`taper`), not uniform stroke
- [ ] Subject texture is individual marks (`scatter`/`hatch`), not a `<pattern>`
- [ ] Flat colour misregistered 2–4 units against its linework
- [ ] Frame/keylines drawn with `wobble_rect`, corners not matching
- [ ] Ink overprints the second colour (`mix-blend-mode: multiply`)

Composition and copy:
- [ ] Drawing and type come from different eras
- [ ] Typographic pyramid runs all the way down to the mundane lines
- [ ] Type sits on a holder — cartouche, frame, banner, split — or the can is
      sparse enough to need none
- [ ] Net weight, origin, a date or method claim, a small tally
- [ ] Rim, radius and pull drawn, artwork composed around the pull
- [ ] Sheen, vignette and grain applied last, grain at 3–6%
