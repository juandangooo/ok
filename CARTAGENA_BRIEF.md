# EDIT BRIEF: "Los 50 de Andrea · Cartagena 2026"

**For:** Claude Code (terminal) driving the Edits app MCP
**From:** Project lead (Juan) plus a reference study of Ableton's "Live 13 (de)tour" spot (1:40, studied frame by frame at 4 frames per second)
**Read this whole file before touching the project. Re-read it before every new step.**

---

## 0. Non-negotiable rules
1. **Never reorder, delete or replace clips.** The story order belongs to Juan. You may only trim *inside* a clip, and only after approval.
2. Save a duplicate or version of the project before each step.
3. Work one step at a time (section 6). Show the result and **wait for an OK**.
4. Don't fake anything. If the Edits MCP can't do something, say so and offer the closest option.
5. Juan doesn't edit in the app while you're working. Take turns.
6. **Token rule:** use frameSheet only on the seconds you're working on, at low resolution and as few frames as possible. Never scan the whole video without asking.

---

## 1. What the reference actually does (findings from the frame-by-frame study)

### A. Rhythm and structure
- **Cold open:** no title. It starts directly on a detail shot.
- Cuts run about **0.5–1.5s**, with **bursts of 0.25s cuts** (in the reference at 0:12–0:16 and 1:16–1:28, where almost every frame is a new shot).
- **Breathing shots** of 1.5–3s on faces (smiles, someone talking) between bursts.
- A constant rhythm: **person → hands/detail → macro texture → person**.
- **Flash frames between sections:** one fully white frame (1:07), dark or black frames (1:15), and abstract colour or texture fields (0:02.75–0:03, green and amber). They work like punctuation.

### B. Camera and image
- Extreme macro, filling the frame: a single word or a single number.
- **Fast whip pans with heavy motion blur.** The blurred frame itself is the transition (0:13.5, 0:48.5, 0:57).
- Low angles, Dutch (tilted) angles, foreground objects out of focus.
- **Small changes over 3 frames:** a search box typing "m" → "mi" → "mid", or a number going 0.51 → 0.43 → 0.31. A small "thing in motion" in close-up.

### C. Mixed formats (I missed this the first time)
- **A small photo centred on a black background:** a black-and-white portrait, or a warm wide shot, about 60% of the frame width, held about 1s (0:17, 0:23.7, 0:31).
- **Photo "cards" on a solid terracotta background** (#8B4A3C, roughly), changing on every beat (0:19–0:20.5).
- **A 3-photo stacked vertical collage** with handwritten words over it (1:00).
- Black and white mixed into a colour video.

### D. Colour and texture
- Warm skin and amber highlights, teal or green in the shadows, lifted blacks.
- **Film grain everywhere**, including on screen shots.
- **Chromatic aberration (RGB split)** on edges and on the macro shots, plus a 16mm or VHS feel on some shots (the clapperboard at 1:16).
- Soft halation or glow on highlights.

### E. Handwritten lettering (THE signature, used three ways)
1. **Captions that follow the speech, word by word**, in white marker, placed around the face, never centred: "is … quite … messy" (0:11), "looping" (0:55), "square … of … a … picture" (1:00). Each word appears on its own.
2. **Animated scribbles:** black or white marker scratches that cross the image like a wipe (0:20 over the photo cards; 1:29.7 and 1:31.5 over the final list).
3. **Scribble-out:** a clean title ("Live 13", plain sans-serif) gets crossed out with marker scribbles until it disappears, and the logo stays (1:35.5–1:36.2).

### F. The ending (1:29–1:39)
- A still wide shot of two people from behind, held for about 9s.
- A handwritten list builds up line by line until it fills the frame. A scribble crosses it. It clears.
- A clean title appears, gets scribbled out, and then just the small logo remains. Hold, then end.

---

## 2. Translation for Cartagena

| Reference | Cartagena |
|---|---|
| Macro screen / UI | Macro of the city: bougainvillea, door knockers, peeling walls, sea foam, the sash's lettering, glasses clinking |
| Typing in the search box | Any small change in close-up: a glass filling, a hand painting a nail, a candle |
| B&W photo on black | Old photos of Andrea or the friends (if there are any) on black, in B&W |
| Cards on terracotta | Group photos on a Cartagena colour background (terracotta, bougainvillea pink, or wall yellow) |
| Speech captions | Handwritten words over the faces when someone speaks or toasts |
| Final list | The final poem, line by line (section 4) |
| Scribble-out of "Live 13" | "Los 50 de Andrea" in clean type → scribbled out → "Volveremos." remains |

---

## 3. Technical look (apply the same to every clip)
- **Grade:** lifted/faded blacks · warm golden skin and highlights · shadows toward teal · less saturation in greens and blues · gentle contrast. If Edits has a film or vintage filter, use it at low-to-medium strength and fine-tune from there.
- **Texture:** fine grain on everything (~15–25%) · soft glow on highlights · light vignette · light RGB split on the fast or macro shots only.
- **Text:** white marker handwriting (e.g. Permanent Marker or Rock Salt, or Juan's own scanned handwriting). Small, slightly tilted, off-centre. **No yellow block font.**
- **Transitions:** hard cuts by default · whip/blur only between dancing or party shots · punch-in zoom of 100→112% on strong beats · white or black flash frame (1 frame) between big sections · **never** spins, wipes or 3D cubes.

---

## 4. Closing text (Juan's final version, already in the project; DON'T edit it)
> Cartagena de Indias, tierra de calor y de salitre. Nos recibiste con los brazos abiertos y nos devolviste más alegres de lo que llegamos. Gracias. Volveremos.

---

## 5. Current state
See `CARTAGENA_STATUS.md` (Nov 11 snapshot). In short: 119 clips, 2:15.27, every cut on the beat (143.5 BPM, 1 beat = 0.418 s), grade + 9% grain + 40% vignette, 7 punch-ins, 3 whips (0:44–0:48), lyrics as text 0:20–1:18, poem at 2:09–2:15.
**Also follow the House Rules in STATUS §2 and the gotchas in §6.** In particular: **never touch Juan's text.** For any text change, propose it and Juan makes it.

---

## 6. Gaps against the reference (what's still needed, in priority order)

### A. Must do (fixes)
1. **Song:** cut it at 2:15.27 and add a 2–3 s fade-out that lands on the last downbeat. (Right now there's 67 s of music over black.)
2. **Fade to black** at the end, on the last downbeat.
3. **Clean up stale keyframes** (last clip; the clip at 2:09.87).

### B. Texture (cheap, high impact)
4. **Grain 9% → ~15–18%.** The reference's grain is visible, even on still shots. Show a before/after on a night clip and a beach clip.
5. **Vignette 40% → ~20–25%.** The reference's vignette is barely there; 40% closes the frame in too much.
6. **Light RGB split / chromatic aberration** *only* on the burst and whip clips, if Edits has it. Not on the tender moments.
7. Glow stays off (Juan's choice). Don't propose it again.

### C. Punctuation and energy (the biggest missing piece)
8. **Flash frames:** 1 white or black frame (1/60 s, or 2–3 frames) **going into each chorus** and at big scene changes (day→night, boat→party). The reference uses them as punctuation. Suggest 4–6 positions with timestamps from `beats.json`.
9. **Half-beat bursts (0.209 s):** the reference has stretches of ~0.25 s per shot. Right now the fastest is 1 beat. Propose **1–2 bursts** (e.g. a dancing run) by trimming clip ends only. Don't reorder.
10. **Whips in the second half:** there are 0 after 1:22. Propose 3–5 between dancing/party clips, 0.2 s, on beats.
11. **More punch-ins after 1:22** on the strongest downbeats (there's only 1). Target about 1 every 2–4 bars in the high-energy parts. **None** on the tender moments.
12. **Speed ramp** on 1 dancing clip, landing on a downbeat (optional).

### D. Lettering in the reference's style (proposals only; Juan makes them)
13. The lyrics as text are perfect: they're the equivalent of the reference's speech captions. To match the style, **suggest** to Juan: white marker handwriting, small, slightly tilted, **off-centre around the faces**, **one word or phrase at a time** on the beat, and no gold or block font.
14. Re-sync the words that drifted off their cuts (e.g. "caracoles" 1:15.12 → cut 1:15.03). List them all; Juan moves them.
15. **Animated marker scribbles** (the reference's signature): generate 2–3 short assets (white scribble on black/alpha, 0.5–1 s) in `~/Downloads/video/_film_grain`, to use as a wipe going into the ending and maybe once mid-video.

### E. Ending (the reference holds its final still for ~9 s; ours is cramped)
16. Right now the poem has ~5.8 s across 2 clips, with no time to read it. Propose:
    - let the **last photo of Andrea hold for 2–4 bars** (extend the end of the final clip),
    - the **poem builds line by line** on the beat (Juan places the text),
    - **marker scribble** crosses the frame → it clears → **"Volveremos."** alone → fade to black on the last downbeat.
    - Optional, like the reference: "Los 50 de Andrea" in a clean font that gets scribbled out before "Volveremos."

### F. Mixed formats (optional, ask first)
17. 1 moment of a **small photo on black** (or in B&W) and/or 1 moment of **photo cards on a terracotta background** (#8B4A3C) on the beat, using photos that are already in that position.
18. The "static grid" effect at 1:18.85: **keep it if Juan chose it**. It works like the reference's texture flashes.

---

## 7. Work plan
Go in the order of section 6 (A → F), one block at a time: propose with timestamps → wait for OK → apply → show a small preview → reply ✅/⏳/⚠️.

---

## Re-anchor message (paste whenever you like)
```
Re-read CARTAGENA_BRIEF.md. Confirm you are following section 0 (rules) and section 3 (look). Tell me which block of section 6 (A–F) we're on and reply ✅/⏳/⚠️.
```
