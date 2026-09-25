// @ts-nocheck
/** Musical core for WalkFour. Live FluidR3 acoustic bass walking lines. */

export const SAMPLE_ROOT =
  "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@gh-pages/FluidR3_GM";
export const KIT_ROOT =
  "https://cdn.jsdelivr.net/gh/workinwithai-create/PreEight@main/public/samples/drums";

const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export const VOICE_DIR = {
  keys: "electric_piano_1-mp3",
  walk: "acoustic_bass-mp3",
};

export function midiName(midi) {
  const m = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${FLATS[m]}${oct}`;
}

export function sampleUrl(voice, midi) {
  return `${SAMPLE_ROOT}/${VOICE_DIR[voice]}/${midiName(midi)}.mp3`;
}

function keys(m) {
  let n = m;
  while (n < 48) n += 12;
  while (n > 76) n -= 12;
  return n;
}

function walkNote(m) {
  let n = m;
  while (n < 28) n += 12;
  while (n > 52) n -= 12;
  return n;
}

function chord(symbol, root, third, fifth, bass, minor) {
  return { symbol, root: keys(root), third: keys(third), fifth: keys(fifth), bass: walkNote(bass), minor };
}

export const recipes = [
  { id: "quarters", name: "Quarter walk", blurb: "Root, third, fifth, approach. The classic four-to-the-bar walk." },
  { id: "approach", name: "Chromatic approach", blurb: "Walks into the next root from a half-step below. The door into the change." },
  { id: "skip", name: "Skip walk", blurb: "Root, fifth, octave, fifth. Bigger steps, still a human figure." },
  { id: "twofeel", name: "Two-feel", blurb: "Half notes on root and fifth. Space so the vocal can land." },
  { id: "turn", name: "Turnaround", blurb: "Last bar drops a 1-6-2-5 walk so the next chorus has a hinge." },
  { id: "pedal", name: "Pedal then walk", blurb: "Holds the root two beats, then walks the rest. Motion after the hit." },
];

export const grooves = [
  { id: "copper", name: "Copper Room", bpm: 96, key: "E minor", tonic: 40, minor: true, blurb: "Night chorus. Vocal and kit already exist. The bass chair walks empty.", bars: [chord("Em", 52, 55, 59, 40, true), chord("C", 60, 64, 67, 36, false), chord("G", 55, 59, 62, 43, false), chord("D", 50, 54, 57, 38, false)] },
  { id: "radio", name: "Late Radio", bpm: 108, key: "A minor", tonic: 33, minor: true, blurb: "Faster pocket. A walking line finishes the hook without another 808.", bars: [chord("Am", 57, 60, 64, 33, true), chord("F", 53, 57, 60, 41, false), chord("C", 60, 64, 67, 36, false), chord("G", 55, 59, 62, 43, false)] },
  { id: "yard", name: "Yard Light", bpm: 88, key: "D major", tonic: 38, minor: false, blurb: "Slow major. Acoustic bass here finishes the chorus without crowding the singer.", bars: [chord("D", 50, 54, 57, 38, false), chord("G", 55, 59, 62, 43, false), chord("Bm", 59, 62, 66, 35, true), chord("A", 57, 61, 64, 33, false)] },
  { id: "shift", name: "Night Shift", bpm: 120, key: "G minor", tonic: 31, minor: true, blurb: "Driving minor. The walk is the section change, not a sub drop.", bars: [chord("Gm", 55, 58, 62, 31, true), chord("Eb", 51, 55, 58, 39, false), chord("Bb", 58, 62, 65, 34, false), chord("F", 53, 57, 60, 41, false)] },
  { id: "porch", name: "Porch Wire", bpm: 100, key: "C major", tonic: 36, minor: false, blurb: "Open major. Four bars you can hum after one pass.", bars: [chord("C", 60, 64, 67, 36, false), chord("Am", 57, 60, 64, 33, true), chord("F", 53, 57, 60, 41, false), chord("G", 55, 59, 62, 43, false)] },
];

function hit(step, voice, midi, gain, dur) {
  return { step, voice, midi, gain, dur };
}
function approachTo(nextRoot) { return walkNote(nextRoot - 1); }
function nextRoot(groove, bar) { return groove.bars[(bar + 1) % 4].bass; }
function quartersHits(chord) {
  const third = chord.minor ? 3 : 4;
  return [hit(0, "walk", walkNote(chord.bass), 0.72, 0.42), hit(4, "walk", walkNote(chord.bass + third), 0.58, 0.38), hit(8, "walk", walkNote(chord.bass + 7), 0.62, 0.38), hit(12, "walk", walkNote(chord.bass + third + 2), 0.5, 0.32)];
}
function approachHits(chord, groove, bar) {
  const third = chord.minor ? 3 : 4;
  return [hit(0, "walk", walkNote(chord.bass), 0.74, 0.4), hit(4, "walk", walkNote(chord.bass + third), 0.56, 0.36), hit(8, "walk", walkNote(chord.bass + 7), 0.6, 0.34), hit(12, "walk", approachTo(nextRoot(groove, bar)), 0.64, 0.3)];
}
function skipHits(chord) {
  return [hit(0, "walk", walkNote(chord.bass), 0.74, 0.4), hit(4, "walk", walkNote(chord.bass + 7), 0.58, 0.36), hit(8, "walk", walkNote(chord.bass + 12), 0.62, 0.36), hit(12, "walk", walkNote(chord.bass + 7), 0.52, 0.3)];
}
function twoFeelHits(chord) {
  return [hit(0, "walk", walkNote(chord.bass), 0.76, 0.85), hit(8, "walk", walkNote(chord.bass + 7), 0.62, 0.8)];
}
function turnHits(chord, groove, bar) {
  if (bar !== 3) return quartersHits(chord);
  const root = groove.bars[0].bass;
  return [hit(0, "walk", walkNote(root), 0.74, 0.36), hit(4, "walk", walkNote(root + 9), 0.58, 0.32), hit(8, "walk", walkNote(root + 2), 0.6, 0.32), hit(12, "walk", walkNote(root + 7), 0.66, 0.3)];
}
function pedalHits(chord, groove, bar) {
  const third = chord.minor ? 3 : 4;
  return [hit(0, "walk", walkNote(chord.bass), 0.76, 0.7), hit(8, "walk", walkNote(chord.bass + third), 0.56, 0.32), hit(12, "walk", approachTo(nextRoot(groove, bar)), 0.6, 0.28)];
}
export function walkHits(groove, recipeId, bar) {
  const c = groove.bars[bar];
  if (recipeId === "quarters") return quartersHits(c);
  if (recipeId === "approach") return approachHits(c, groove, bar);
  if (recipeId === "skip") return skipHits(c);
  if (recipeId === "twofeel") return twoFeelHits(c);
  if (recipeId === "turn") return turnHits(c, groove, bar);
  if (recipeId === "pedal") return pedalHits(c, groove, bar);
  return quartersHits(c);
}
export function formLength(mode) { return mode === "pass" ? 8 : 4; }
export function isHole(mode, formBar) { return mode === "hole" || (mode === "pass" && formBar < 4); }
export function walkIndex(mode, formBar) {
  if (mode === "pass") return formBar < 4 ? formBar : formBar - 4;
  return formBar % 4;
}
export function barEvents(groove, recipeId, formBar, mode) {
  const hole = isHole(mode, formBar);
  const idx = walkIndex(mode, formBar);
  const c = groove.bars[idx];
  const events = [];
  const push = (step, voice, gain, dur, midi) => { events.push({ step, voice, gain, dur, midi: midi ?? null }); };
  push(0, "kick", 0.78, 0.28);
  push(8, "kick", 0.68, 0.26);
  if (!hole) push(10, "kick", 0.36, 0.2);
  push(4, "snare", 0.5, 0.22);
  push(12, "snare", 0.44, 0.22);
  for (let s = 0; s < 16; s += 2) push(s, "hat", s % 4 === 2 ? 0.11 : 0.06, 0.06);
  if (!hole && idx === 0) push(0, "crash", 0.24, 0.7);
  push(0, "keys", 0.16, 1.15, c.root);
  push(0, "keys", 0.12, 1.15, c.third);
  push(0, "keys", 0.1, 1.15, c.fifth);
  if (hole) {
    push(0, "walk", 0.22, 0.7, walkNote(c.bass));
    return { chord: c, hole: true, walkBar: idx, events };
  }
  for (const h of walkHits(groove, recipeId, idx)) push(h.step, h.voice, h.gain, h.dur, h.midi);
  return { chord: c, hole: false, walkBar: idx, events };
}
const KIT_VOICES = new Set(["kick", "snare", "hat", "crash"]);
export function collectSamples() {
  const map = new Map();
  const add = (voice, midi) => {
    if (KIT_VOICES.has(voice)) return;
    const key = `${voice}:${midi}`;
    if (!map.has(key)) map.set(key, { key, voice, midi, url: sampleUrl(voice, midi) });
  };
  for (const g of grooves) {
    for (const r of recipes) {
      for (let b = 0; b < 4; b++) for (const h of walkHits(g, r.id, b)) add(h.voice, h.midi);
    }
    for (let b = 0; b < 4; b++) {
      const ev = barEvents(g, "quarters", b, "hole");
      for (const e of ev.events) if (e.midi != null) add(e.voice, e.midi);
      const pass = barEvents(g, "quarters", b + 4, "pass");
      for (const e of pass.events) if (e.midi != null) add(e.voice, e.midi);
    }
  }
  const kits = [
    { key: "kick", voice: "kick", midi: null, url: `${KIT_ROOT}/kick.mp3` },
    { key: "snare", voice: "snare", midi: null, url: `${KIT_ROOT}/snare.mp3` },
    { key: "hat", voice: "hat", midi: null, url: `${KIT_ROOT}/hihat.mp3` },
    { key: "crash", voice: "crash", midi: null, url: `${KIT_ROOT}/crash.mp3` },
  ];
  return [...kits, ...map.values()];
}
export function punchText(groove, recipe) {
  const lines = groove.bars.map((bar, i) => {
    const hits = walkHits(groove, recipe.id, i);
    const notes = hits.filter((h) => h.voice === "walk").map((h) => `${h.step + 1}:${midiName(h.midi)}`).join(" ");
    return `  ${i + 1}. ${bar.symbol}  ${notes}`;
  }).join("\n");
  return [
    "WalkFour punch list",
    `${groove.name} · ${groove.bpm} BPM · ${groove.key} · ${recipe.name}`,
    "",
    "The hole: chorus already has a vocal and a kit. Bass is a root thud or an 808.",
    `The move: ${recipe.blurb}`,
    "",
    "Four bars — live FluidR3 acoustic bass, soft Rhodes chair, kit.",
    lines,
    "",
    "Drop the WAV on the chorus. Do not replace it with a synth sub, a finger-pocket loop, or another 808 slide.",
    "Distinct from RhodesFour, FingerFour, BassFour, SlideTwo, RiffFour, HarmFour.",
  ].join("\n");
}
export function stepHasWalk(hits, step) {
  return hits.some((h) => h.step === step && h.voice === "walk");
}
