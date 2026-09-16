---
name: sardine-tin
description: Draw in the style of vintage European tinned-fish packaging — sardine, anchovy and conserva can lids. Use when asked to draw, design or recreate something as a sardine tin, conserva can, tinned-fish label, or "in the style of those sardine cans", and for any label, poster or badge wanting that flat-spot-color, hand-lettered, steel-engraved packaging look. Covers four archetypes (Nordic spot-color, steel engraving, Art Nouveau hand-lettering, typographic maximalism), their palettes, and the SVG technique to render them.
---

# Sardine Tin

Drawing in the visual language of European tinned-fish packaging: Abba
Grebbestads (Sweden), Porthos (Portugal), La Belle-Iloise (France), Pollastrini
di Anzio (Italy). Reference photographs of all four are in `assets/`.

## Method

**1. Pick one archetype and commit to it.** They do not blend well.

| | Archetype | Signature |
|---|---|---|
| **A** | Nordic Spot-Color | one loud flat field, double keyline frame, arched heavy caps, a shoal of fish in a single ink |
| **B** | Steel Engraving | two inks only (yellow + black), all tone made of hatch, a 19th-c. character portrait |
| **C** | Art Nouveau | tone-on-tone ground, hand-lettered display roman, flat botanicals breaking the border |
| **D** | Typographic Maximalism | field split into two colors, six type styles stacked, illustration tiny |

Read `references/style-guide.md` for the full breakdown and the exact palette of
each, and look at the matching image in `assets/` before drawing. If the user
names a can or shows one, match that archetype. Otherwise pick by subject: a
portrait or any character → B; botanicals, food, anything warm → C; a long name
or lots of copy → D; a bold simple mark → A.

**2. Draw the tin first, not the label.** Rim, corner radius, ring pull. The
artwork is composed *around* the pull, not behind it. `references/svg-recipes.md`
§1–2.

**3. Choose one organizing device** before placing type: closed frame, broken
frame, field split, or full bleed.

**4. Build in this order.** Field → ground pattern → border rule → illustration
→ display type → small copy → ornament (stars, monogram, ribbon) → sheen →
vignette → grain. Sheen and grain go over everything, clipped to the lid.

**5. Fill the surface.** Thin margins, stacked copy, ornament in the gaps,
roughly 85% ink coverage. An airy layout is the most common failure.

**6. Break the regularity.** Curved baselines on display words, per-glyph
rotation inside ±2.5°, objects overlapping the border rule. Perfectly kerned
type on a clean grid is the tell of a fake.

**7. Check it against the list** at the end of `references/style-guide.md`.

## Non-negotiables

- Flat opaque spot color in the artwork. **Gradients only on metal** — rim, pull,
  sheen. One gradient in an illustration kills the whole effect.
- 2–5 inks, high chroma. Chrome yellows and vermilions, not heritage browns.
  The palette is loud; the *drawing* is old.
- Every illustrated object carries a dark keyline. So does every display word
  whose fill is *not* the ink color — `paint-order="stroke fill"`, weight 6–10%
  of cap height, round joins. Words already set in the ink color need none.
- Ink is never `#000000`. Use a warm or cool near-black.
- Texture is line or dot — hatch, cross-hatch, stipple. Never a soft shadow or
  a blur.
- Include the furniture: a heritage claim ("ORIGINAL", "DESDE 1912"), a net
  weight, an origin line, and a small tally (stars, a monogram, a medal).
  Multilingual copy is authentic, not clutter.

## Rendering

SVG. `references/svg-recipes.md` has tested code for the rim and pull, chrome
and brass gradients, hatch and stipple patterns, the tone-on-tone ground,
`textPath` arcs, per-glyph wobble, ribbons, stars, the ruled origin box, flat
botanical construction, and the grain filter.

Deliver as an inline-SVG HTML page with Google Fonts and publish it as an
Artifact when the user wants to look at it; as a standalone `.svg` when they
want the file. Two complete worked examples — start from one rather than from a blank canvas:
`examples/conservas-cortes.html` (archetype C, Art Nouveau) and
`examples/hellhound-tin.html` (archetype A, Nordic spot-colour, built around an
existing brand's logo). The matching `.jpg` beside each is what it renders to.

**Putting a real logo on a tin:** rebuild the mark's geometry rather than
placing the supplied file — a flat logo dropped onto a tin reads as a sticker.
Work out what the mark's construction actually is first. The Hellhound example
turned on noticing that its hexagon splits into two *trapezoids*, so the H on
each half is tapered (stems vertical, growing taller toward the centre seam),
not skewed; a skew put the outer corners outside the hexagon. Then recolour it
into the tin's palette — the brand's own colours become the field and the inks.

Always render and look at the result before delivering; type/illustration
collisions and text overflowing a `textPath` arc are invisible in the source.
`references/svg-recipes.md` §12 has the headless-Chromium loop and the font
workaround the local sandbox needs.

## Original brands

Draw *in the style*. Don't reproduce the Abba, Porthos, La Belle-Iloise or
Pollastrini wordmarks and logos on new work — invent the brand.
