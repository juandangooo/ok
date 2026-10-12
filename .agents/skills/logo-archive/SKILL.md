---
name: logo-archive
description: Logo design with a searchable archive of ~7,300 published trademarks (1950s-1973) and image generation. Use when designing, critiquing or refining a logo, symbol, monogram or brand mark; when looking for logo precedent by industry, letter or motif; or when checking a new mark for resemblance to existing ones.
---

# Logo archive

About 7,300 trademarks from *Top Symbols and Trademarks of the World* (Deco Press, 1973) and Yasaburō Kuwayama's *Trade Marks & Symbols* (1973), each with firm, business, designer, country and year. Kuwayama Vol. 1 is ordered by letter; Vol. 2 is grouped by motif (circles, hands, birds, beasts, trees, arrow heads, faces, heavenly bodies, tools, polygons, fish, flowers, insects). Browse it visually at https://logos.micr.dev.

## Search

```bash
node scripts/search.mjs <terms...> [--country X] [--volume alphabetical|symbolical|...] [--from 1960] [--to 1970] [--limit 30] [--download ./refs] [--json]
```

Every term must match the firm, business, designer, agency, address, motif, country, year or number. `--download` saves the matching marks as image files: open them and look. The construction of a mark lives in the image, never in its credits. Credits come from OCR of the books and may contain errors.

## Steps

1. **Brief.** Write down the name and its initials, the business, two or three qualities the mark must carry, and where it will live (smallest size, colours available). In the same message, ask how to generate the images:
   - **Codex CLI** (recommended, and the default if the user doesn't choose): generated, inspected and iterated right here.
   - **A prompt to paste** into ChatGPT or another text-to-image tool. Say plainly that results are usually worse: you can't see the outputs, so there is no inspect-and-refine loop, and the user carries every round trip.

   Ask for the name or business if missing; assume the rest and state the assumptions. Done when all four brief items and the generation path are settled.
2. **Precedent.** Search at least three angles: the business (`bank`, `airline`, `chemicals`), the initials or letterform (`--volume alphabetical` plus the letter), and a motif the brand suggests (`--volume symbolical birds`). Download and look at 15-30 marks. Done when every reference you keep has a one-line note naming its **device** (below) and its number, e.g. "#412: one continuous stroke forms both letters (monoline ligature)".
3. **Directions.** Define three directions that differ in device, not only in styling. For each, name the device and the references it learned from, and write its image prompt (see Prompts). Each direction is a new drawing of the brief's own subject.
4. **Generate** on the chosen path:
   - **Codex CLI.** Check `codex --version` and `codex login status` (needs Codex CLI 0.125+ signed in with a ChatGPT account; no API key). If either fails, offer `npm i -g @openai/codex` and `codex login`, or switch to the prompt path. Generate each direction:
     ```bash
     mkdir -p logos && codex exec -C "$(pwd)" -s workspace-write --skip-git-repo-check \
       "Use your image generation tool to create: <prompt>. Save it as ./logos/<name>-<direction>-1.png and reply with the path only."
     ```
     Open every image. Regenerate with a sharpened prompt (`-2`, `-3`...) until each direction reads as its device at a glance. Done when you have one strong image per direction.
   - **Prompt to paste.** Give the user one prompt per direction in a copy-ready block, and ask them to save the results into `./logos/` (or attach them) so you can review them. Done when the user has the prompts.
5. **Resemblance check.** For the chosen direction, search its motif and initials again and look at every hit. Done when no archived mark shares both its core construction and its subject; if one does, change one of the two and generate again.
6. **Build.** Redraw the chosen image as SVG on a simple grid: one colour first, on white and reversed, legible at 16 px. The generated image is the sketch; the SVG is the logo. Present it with the references and devices behind it.

## Prompts

One prompt per direction, in this order: the subject and name, the device described in plain shapes (never a reference's firm name), then the fixed constraints. Example:

> Logo mark for "Kestrel Cycles", a bicycle shop. A single monoline stroke that draws a K whose arm becomes a stylised bird's wing. Flat solid black on a plain white background, centred, square format. One colour, no gradient, no shadow, no 3D, no mockup, no text.

Add the name as lettering only for a wordmark direction, and spell it out exactly.

## Devices

The words to look with when reading a mark, and to name in notes, directions and prompts:

- **reduction**: the subject cut to the fewest shapes that still read
- **figure-ground**: the negative space forms a second image
- **monoline**: one even stroke draws the whole mark
- **modular**: built from one repeated unit on a grid
- **ligature / monogram**: letters share strokes or interlock
- **radial**: rotation or repetition around a centre
- **counterform**: a letter or symbol carved out of a solid shape
- **container**: the mark set inside a circle, square or shield
- **stencil / cut**: deliberate breaks that hold the shape together
- **illusion**: impossible figures, depth or motion from flat shapes

## Rights

The marks belong to their owners and designers. Use them to learn construction and to check originality; every mark you deliver is drawn new.
