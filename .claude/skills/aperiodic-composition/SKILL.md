---
name: aperiodic-composition
description: Compose and synthesize music from self-similar and aperiodic structures (Thue-Morse, Nørgård's infinity series, period-doubling/Feigenbaum, the adding machine), apply Stockhausen-style time/pitch unification, constructed-sound models, dichotic pitch, and time-varying filters. Use when the user asks for generative music, algorithmic sequences, "infinite" melodies, edge-of-chaos rhythm, or experimental synthesis.
---

# Aperiodic Composition

Core idea from the reading list: the most interesting structures sit **between periodic and random**.
They are fully determined, never repeat exactly, and look the same at every scale.
Use them to drive pitch, rhythm, form and timbre with a single rule.

## 1. Generators

### Thue-Morse (balance, "fairness")
`t(n)` = parity of the number of 1s in binary `n`: 0 1 1 0 1 0 0 1 …
- Substitution: 0→01, 1→10. Contains no `xxx` (cube-free).
- Its diffraction spectrum is **singular continuous**: no clean peaks (not periodic),
  no flat noise (not random). Sonically it is "pitched-feeling non-periodicity".
- Use for: accent patterns, L/R panning, alternating two timbres, order of sections.

### Nørgård's infinity series (self-similar melody)
`a(0)=0, a(2n) = -a(n), a(2n+1) = a(n)+1` → 0 1 -1 2 1 0 -2 3 …
- Every even-indexed subsequence is the inversion of the whole; every 2^k-th sample
  reproduces the melody (so it can be played against itself at tempo ratios 1:2:4).
- Map values to scale degrees (Nørgård started on G–A♭, interval 1 = semitone).
- Note pairs: consecutive pairs (a(2n), a(2n+1)) always differ by `2a(n)+1`, an odd
  interval that itself follows the series — use pairs as the unit of phrasing.

### Period doubling / Feigenbaum (route to chaos)
Logistic map `x ← r·x(1-x)`. Periods double at r₁≈3, r₂≈3.449, r₃≈3.544…;
spacing ratio → δ ≈ 4.6692, scaling of the attractor → α ≈ 2.5029.
- At the accumulation point r∞≈3.5699 the orbit is aperiodic but ordered: its symbolic
  itinerary (above/below the critical point) is the **period-doubling sequence**
  (0→01, 1→00), close cousin of Thue-Morse.
- The dynamics on that attractor is the **adding machine (2-adic odometer)**:
  add 1 to a binary number with carry, reading digits from the left. Each digit
  flips at half the rate of the previous → nested rhythm layers at 1, 1/2, 1/4…
- Feigenbaum's turbulence paper: the same universal cascade appears in physical
  systems (fluids), so "approaching chaos" is a form, not an accident. Sweep r slowly
  over a piece: periodic → doubling → edge-of-chaos → noise.

### Fiction as constraint (Borges, *Tlön*)
A rule-world described consistently enough begins to replace the real one. Treat a
generator as a "planet": invent its grammar, let the piece be an artefact found there
(hrönir = copies that drift from the original — use as variation technique).

## 2. Time ↔ pitch (Stockhausen, "…how time passes…")
- One scale of durations and frequencies: a rhythm sped up past ~16–20 Hz becomes pitch;
  a pitch slowed down becomes rhythm. Formants of rhythm = phase/meter structure.
- Use proportional (logarithmic) duration scales, not additive ones.
- Critical reading (Horvitz and others): the physics is loose; the scheme is
  a compositional fiction, valuable for unity, not as acoustics. State it honestly.
- Practice: render any generator above twice: as a melody (slow) and as a waveform
  or pulse train (fast) and let the transition be audible.

## 3. Sound construction
- **Constructed sound (Döbereiner)**: design the model first (formal/physical/logical),
  then the sound is the model's audible consequence. Document the model; the
  listener hears relations, not the parameter list.
- **Dichotic pitch (Huggins / binaural demos)**: identical white noise to both ears
  except a narrow band phase-shifted 180° (or a phase transition) in one ear →
  a faint pitch heard *only* centrally. Pitch with no monaural spectral cue.
  Requires headphones. Great for "invisible" melodies (e.g. Nørgård series as the
  shifted-band center frequency).
- **Time-varying poles (Smyth & Hsu, SMC 2019)**: modulating resonator pole
  radius/angle per sample changes energy and can click or blow up; use structures
  that preserve energy (e.g. rotation-matrix / coupled-form resonators, normalized
  updates) when sweeping.
- **Phase/pulse modulation (DAFx 2025 WPPM)**: build waveforms from a pulse whose
  phase is warped per cycle; drive the warp with an aperiodic sequence for
  quasi-periodic timbres. (Details of that specific paper not verified; treat as
  a direction, check the paper before claiming specifics.)

## 4. Recipe
```python
import numpy as np
def thue_morse(n): return np.array([bin(i).count("1") % 2 for i in range(n)])
def norgard(n):
    a = [0]*n
    for i in range(1, n): a[i] = -a[i//2] if i % 2 == 0 else a[i//2] + 1
    return np.array(a)
def logistic_itinerary(r=3.5699456, n=256, x=0.5):
    out = []
    for _ in range(n): x = r*x*(1-x); out.append(int(x > 0.5))
    return np.array(out)
def odometer(n, bits=6):  # rows = layers flipping at 1, 1/2, 1/4...
    return np.array([[(i >> b) & 1 for b in range(bits)] for i in range(n)])

sr = 44100
def render(pitches, accents, dur=0.18, base=196.0):  # G3
    t = np.arange(int(sr*dur))/sr
    env = np.exp(-6*t)
    return np.concatenate([(0.4+0.6*a)*env*np.sin(2*np.pi*base*2**(p/12)*t)
                           for p, a in zip(pitches, accents)])
# melody = Nørgård, accents = Thue-Morse; write with scipy.io.wavfile.write
```

## 5. Rules of thumb
1. One generator per dimension, then derive the others by scaling (2^k subsampling).
2. Prefer substitution rules: they give self-similarity for free.
3. Expose the scale change (Stockhausen threshold, Feigenbaum sweep) as the form.
4. Keep claims about physics/psychoacoustics accurate; label metaphors as metaphors.
5. Always test dichotic material on headphones; mono-sum it to confirm it vanishes.
