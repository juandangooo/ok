---
name: sardine-tin
description: Draw in the style of vintage European tinned-fish packaging — sardine, anchovy and conserva can lids. Use when asked to draw, design or recreate something as a sardine tin, conserva can, tinned-fish label, or "in the style of those sardine cans", and for any label, poster, badge or brand mark wanting that two-ink, hand-drawn, flat-spot-colour packaging look. Covers nine reference cans across nine archetypes, the principles behind them, and the SVG and Python technique to draw them by hand rather than by pattern fill.
---

# Sardine Tin

Drawing in the visual language of European tinned-fish packaging. Nine cans
studied; four reference photographs in `assets/`.

**Read `references/style-guide.md` Part 1 first, every time.** The archetypes
are a wardrobe; Part 1 is the posture. An archetype copied without the
principles produces something recognisably "vintage" and completely dead.

## The five that matter most

1. **Two inks.** One field colour, one drawing colour. Subject, type, texture,
   rules and legal copy all in the same ink; tone comes from line density, not
   a second shade. A third colour must do one specific job, like a single
   yellow oilskin, and nothing else.
2. **A strange field colour, not a loud one.** Unlike food and slightly unlike
   anything — acid chartreuse, faded sage, dusty blue, bubblegum pink on
   anchovies. Half these cans are quiet. If it feels tasteful, it is wrong.
3. **Pick a density register; there is no middle.** Packed corner to corner, or
   mostly bare field with one subject breathing in it. The politely-arranged
   medium-density can is where every imitation dies.
4. **One subject, drawn once.** One fish, one peacock, one fisherman. Not a
   scene, not an inventory. If you are drawing a group, work out which single
   member of it is the can.
5. **The hand is in the line, not the wobble.** Variable line weight;
   individually placed marks instead of `<pattern>` fills; flat colour
   misregistered against its outline; geometry slightly wrong; ink
   overprinting in multiply.

Then: mismatch the eras (antique drawing, modern type — or the reverse), run
the typographic pyramid all the way down to the town name and the ounce
fraction, and compose the artwork *around* the ring pull.

## Method

**1. Choose coordinates, not a look.** Density register (sparse / packed) and
drawing register (steel engraving / pen line / flat shape / decorative
pattern). The table in style-guide Part 2 places all nine archetypes on those
axes. Pick by subject: a character or animal → engraving or pen line; botanical
or food → flat shape; a long name or heavy copy → typographic; a bold single
mark → sparse two-ink.

**2. Draw the tin first.** Rim, corner radius, ring pull. `svg-recipes.md` §1–2.

**3. Build in order.** Field → ground tone → holder shape (frame, cartouche,
split) → subject → type → pyramid copy → tally → sheen → vignette → grain.

**4. Draw by hand, not by pattern.** `scripts/handdrawn.py` gives you
`taper()` for swelling line weight (pass `straight=True` for anything with
corners that must stay corners), `scatter()` and `hatch()` for texture made of
individual marks, `wobble_rect()` for frames whose corners do not match, and
`smooth()` for organic contours. Import it and emit paths; do not reach for
`<pattern>` on anything that is meant to look drawn.

**4b. Letter the display words, don't set them.** `scripts/lettering.py`
carries a monoline squared grotesque as centrelines, so weight is just the
stroke and every letter can be cut slightly differently. Redraw `GLYPHS` to
match a brand's own skeleton. Small legal copy is the exception — real tins
typeset it. `svg-recipes.md` §13.

**4c. Wear it in.** A clean tin looks like a mockup. Blotchy paint under the
ink, a small displacement on the ink's edges, several hundred field-coloured
abrasion specks that punch holes only where they land on ink, two kinds of
scratch, and a lot code stamped after the fact and a degree out of true.
`svg-recipes.md` §14.

**5. Render and look at it.** Type/illustration collisions and text overflowing
a `textPath` are invisible in source. `svg-recipes.md` §12 has the
headless-Chromium loop and the font workaround this sandbox needs.

**6. Check it** against style-guide Part 3.

## Putting a real brand on a tin

Rebuild the mark's geometry rather than placing the supplied file — a flat logo
dropped onto a tin reads as a sticker. Work out how the mark is actually
constructed first: the Hellhound example turned on noticing that its hexagon
splits into two *trapezoids*, so the H on each half is tapered (stems vertical,
growing taller toward the centre seam), not skewed; a skew put the outer
corners outside the hexagon.

Then recolour into the tin's palette — the brand's own colour usually becomes
the field, and everything else collapses into one ink. Resist drawing the
brand's whole product range; pick the one object (principle 4).

If the brand hands you a badge that will not fit the palette, do what the
Portuguese can does with its certification mark: let it sit there as a frank
foreign object rather than restyling it.

## Rendering

SVG. `references/svg-recipes.md` has tested code for the rim and pull, chrome
and brass gradients, hand-drawn line and texture, misregistration, overprint,
tone-on-tone grounds, `textPath` arcs, ribbons, the ruled origin box, aged
palettes and grain.

Deliver as an inline-SVG HTML page with Google Fonts, published as an Artifact
when the user wants to look at it; a standalone `.svg` when they want the file.
Worked examples to start from rather than a blank canvas:

- `examples/hellhound-salt.html` — archetype A at full strength: two inks,
  hand-cut lettering, a brand mark as its own subject, and the whole wear
  stack. Read this one first.
- `examples/hellhound-two-ink.html` — archetype A with an engraved subject
  drawn mark by mark.
- `examples/conservas-cortes.html` — archetype H, packed, Art Nouveau
- `examples/hellhound-tin.html` — archetype D, the same brand at the packed
  end of the density register, with its logo rebuilt

The matching `.jpg` beside each is what it renders to.

## Original brands

Draw *in the style*. Don't reproduce the Abba, Porthos, La Belle-Iloise,
Pollastrini, Pinhais or Peacock's wordmarks and logos on new work — invent the
brand.
