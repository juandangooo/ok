/* The Primark Journey: every pace, hold and transition length in one place.
   Seconds unless a name says frames; frame counts are 30 fps frames, so a transition keeps its length
   at any export frame rate. Change a number here and re-render; the total length follows. */
globalThis.JourneyTiming = (() => {
  const C = {
    bpm: 110,                 // pace grid: one beat = 60 / bpm = 0.545 s (openings land on whole beats)
    fps: 60,                  // export frame rate
    introBeats: 7,            // case, gear, map and TV drawing before opening 01 lands (7 beats = 3.8 s)
    beatsPerOpening: 2,       // every opening gets the same slot (2 beats = 1.09 s)
    openings: 35,             // openings 01-35 land one per slot; 36 is the upcoming one
    finalHold: 3.0,           // the final card ("A journey built on trust." + Primark) holds this long
    // Transitions, in 30 fps frames.
    headlineOutFrames: 8,     // old headline fades out and rises (ease-in)
    headlineInFrames: 8,      // new headline fades in, rising from below (ease-out); it lands on the beat
    headlineRisePx: 10,
    photoFadeFrames: 7,       // photo crossfade on the billboard (shortened if a burst is very quick)
    kenBurns: 0.04,           // slow push-in on each photo while it is on screen (4%)
    mapFadeFrames: 10,        // a new state fills in
    counterRollFrames: 10,    // the counter rolls to its next number
    listFadeFrames: 10,       // a new line in the store list fades in
    restSeconds: 1.8,         // ambient motion eases to rest over the last seconds
  };
  const f = n => n / 30, beat = 60 / C.bpm, slot = C.beatsPerOpening * beat;
  const firstAt = C.introBeats * beat, cardAt = firstAt + C.openings * slot;
  return Object.assign({}, C, {
    beat, slot, firstAt, cardAt, duration: cardAt + C.finalHold,
    swapOut: f(C.headlineOutFrames), swapIn: f(C.headlineInFrames), swapRise: C.headlineRisePx,
    photoFade: f(C.photoFadeFrames), mapFade: f(C.mapFadeFrames), counterRoll: f(C.counterRollFrames), listFade: f(C.listFadeFrames),
  });
})();
