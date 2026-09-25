import {
  barEvents,
  collectSamples,
  formLength,
  grooves,
  isHole,
  punchText,
  recipes,
  walkHits,
  walkIndex,
  stepHasWalk,
} from "./core.js";

const KIT = new Set(["kick", "snare", "hat", "crash"]);
const state = { groove: grooves[0], recipe: recipes[0], ready: false, playing: false, mode: null, formBar: 0, step: -1 };
const raw = new Map();
const buffers = new Map();
let ctx, bus, timer = 0, nodes = [], nextTime = 0, stepDur = 0.15, stopAt = Infinity, barStart = 0, currentBar = 0;
const $ = (id) => document.getElementById(id);

async function prefetch() {
  const specs = collectSamples();
  let done = 0;
  const queue = specs.slice();
  async function worker() {
    while (queue.length) {
      const spec = queue.shift();
      if (!spec) return;
      try {
        const res = await fetch(spec.url);
        if (!res.ok) throw new Error(String(res.status));
        raw.set(spec.key, { voice: spec.voice, midi: spec.midi, buf: await res.arrayBuffer() });
      } catch { /* nearest note covers a miss */ }
      done += 1;
      $("status").textContent = `Seating live chairs ${done}/${specs.length}`;
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  state.ready = true;
  $("status").textContent = "Chairs seated · FluidR3 acoustic bass, Rhodes chair, kit";
  for (const id of ["play-hole", "play-pass", "play-walk", "bounce"]) $(id).disabled = false;
}

async function ensureCtx() {
  if (!ctx) {
    ctx = new AudioContext();
    bus = ctx.createGain();
    bus.gain.value = 0.44;
    bus.connect(ctx.destination);
  }
  if (ctx.state === "suspended") await ctx.resume();
  if (buffers.size === 0) {
    for (const [key, item] of raw) {
      try { buffers.set(key, await ctx.decodeAudioData(item.buf.slice(0))); } catch { /* skip */ }
    }
  }
}

function resolve(voice, midi) {
  if (KIT.has(voice)) return { buffer: buffers.get(voice), rate: 1 };
  if (midi == null) return { buffer: undefined, rate: 1 };
  const exact = buffers.get(`${voice}:${midi}`);
  if (exact) return { buffer: exact, rate: 1 };
  for (let d = 1; d <= 7; d++) {
    const down = buffers.get(`${voice}:${midi - d}`);
    if (down) return { buffer: down, rate: 2 ** (d / 12) };
    const up = buffers.get(`${voice}:${midi + d}`);
    if (up) return { buffer: up, rate: 2 ** (-d / 12) };
  }
  return { buffer: undefined, rate: 1 };
}

function trigger(audio, dest, when, voice, midi, gain, dur) {
  const { buffer, rate } = resolve(voice, midi);
  if (!buffer) return;
  const src = audio.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const g = audio.createGain();
  g.gain.setValueAtTime(Math.max(0.0001, gain), when);
  const end = when + Math.max(0.04, dur);
  g.gain.exponentialRampToValueAtTime(0.001, end);
  src.connect(g); g.connect(dest);
  src.start(when); src.stop(end + 0.02);
  if (audio === ctx) {
    nodes.push(src);
    src.onended = () => { nodes = nodes.filter((n) => n !== src); };
  }
}

function scheduleBar(audio, dest, when, formBar, mode) {
  const { events } = barEvents(state.groove, state.recipe.id, formBar, mode);
  for (const e of events) trigger(audio, dest, when + e.step * stepDur, e.voice, e.midi, e.gain, e.dur);
}

function paint() {
  const gRoot = $("grooves"); gRoot.innerHTML = "";
  for (const g of grooves) {
    const b = document.createElement("button");
    b.className = "card" + (g.id === state.groove.id ? " on" : "");
    b.innerHTML = `<b>${g.name}</b><span>${g.bpm} BPM · ${g.key}</span>`;
    b.onclick = () => { state.groove = g; paint(); };
    gRoot.appendChild(b);
  }
  $("groove-note").textContent = state.groove.blurb;
  const rRoot = $("recipes"); rRoot.innerHTML = "";
  for (const r of recipes) {
    const b = document.createElement("button");
    b.className = "card" + (r.id === state.recipe.id ? " on" : "");
    b.innerHTML = `<b>${r.name}</b><span>${r.blurb}</span>`;
    b.onclick = () => { state.recipe = r; paint(); };
    rRoot.appendChild(b);
  }
  const form = $("form"); form.innerHTML = "";
  for (const row of ["hole", "walk"]) {
    const wrap = document.createElement("div");
    const label = document.createElement("p");
    label.className = "row-label";
    label.textContent = row === "hole" ? "The hole" : "The walk";
    const bars = document.createElement("div");
    bars.className = "bars";
    state.groove.bars.forEach((bar, i) => {
      const cell = document.createElement("div");
      cell.className = "bar" + (row === "walk" ? " walk" : "") + (lit(row, i) ? " on" : "");
      cell.innerHTML = `<div class="n">${i + 1} · ${row === "walk" ? "W" : "H"}</div><div class="c">${bar.symbol}</div>`;
      bars.appendChild(cell);
    });
    wrap.append(label, bars);
    form.appendChild(wrap);
  }
  const view = !state.playing || state.mode === "hole" ? 0 : walkIndex(state.mode, state.formBar);
  const hits = walkHits(state.groove, state.recipe.id, view);
  $("strip-label").textContent = `Bar ${view + 1} · ${state.groove.bars[view].symbol}`;
  const walkActive = state.playing && state.mode && !isHole(state.mode, state.formBar);
  $("strip-hint").textContent = walkActive ? "Walk chair" : "Grid of the walk, not the hole";
  const steps = $("steps"); steps.innerHTML = "";
  for (let s = 0; s < 16; s++) {
    const cell = document.createElement("div");
    const now = walkActive && state.step === s;
    cell.className = "step" + (now ? " now" : stepHasWalk(hits, s) ? " on" : "");
    cell.textContent = String(s + 1);
    steps.appendChild(cell);
  }
  $("punch").textContent = punchText(state.groove, state.recipe);
}

function lit(row, index) {
  if (!state.playing || !state.mode) return false;
  if (state.mode === "hole") return row === "hole" && state.formBar % 4 === index;
  if (state.mode === "walk") return row === "walk" && state.formBar % 4 === index;
  if (state.formBar < 4) return row === "hole" && state.formBar === index;
  return row === "walk" && state.formBar - 4 === index;
}

function stop() {
  state.playing = false; state.mode = null; state.step = -1;
  window.clearTimeout(timer);
  for (const n of nodes) { try { n.stop(); } catch { /* ended */ } }
  nodes = []; paint();
}

function encodeWav(buffer) {
  const channels = 2, length = buffer.length, bytes = 44 + length * channels * 2;
  const ab = new ArrayBuffer(bytes); const view = new DataView(ab);
  const str = (offset, text) => { for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i)); };
  str(0, "RIFF"); view.setUint32(4, bytes - 8, true); str(8, "WAVE"); str(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); str(36, "data"); view.setUint32(40, length * channels * 2, true);
  const left = buffer.getChannelData(0); const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const l = Math.max(-1, Math.min(1, left[i] || 0)); const r = Math.max(-1, Math.min(1, right[i] || 0));
    view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true); offset += 2;
    view.setInt16(offset, r < 0 ? r * 0x8000 : r * 0x7fff, true); offset += 2;
  }
  return new Blob([ab], { type: "audio/wav" });
}

async function bounce() {
  await ensureCtx();
  const localStep = 60 / state.groove.bpm / 4;
  const seconds = 4 * 16 * localStep + 0.75;
  const offline = new OfflineAudioContext(2, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate);
  const out = offline.createGain(); out.gain.value = 0.88; out.connect(offline.destination);
  const prev = stepDur; stepDur = localStep;
  for (let bar = 0; bar < 4; bar++) scheduleBar(offline, out, 0.05, bar, "walk");
  stepDur = prev;
  const rendered = await offline.startRendering();
  const blob = encodeWav(rendered); const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `WalkFour-${state.groove.name}-${state.recipe.name}.wav`.replace(/\s+/g, "-");
  a.click(); URL.revokeObjectURL(url);
}

let cursor = 0;
function pumpFixed() {
  if (!state.playing || !ctx || !bus || !state.mode) return;
  const horizon = ctx.currentTime + 0.28;
  while (nextTime < horizon && nextTime < stopAt) {
    scheduleBar(ctx, bus, nextTime, cursor, state.mode);
    barStart = nextTime; currentBar = cursor; nextTime += 16 * stepDur; cursor += 1;
    if (cursor >= formLength(state.mode)) {
      if (state.mode === "pass") { stopAt = nextTime; break; }
      cursor = 0;
    }
  }
  if (ctx.currentTime >= stopAt - 0.02 && state.mode === "pass") { stop(); return; }
  state.formBar = currentBar;
  state.step = Math.max(0, Math.min(15, Math.floor((ctx.currentTime - barStart) / stepDur)));
  paint(); timer = window.setTimeout(pumpFixed, 40);
}

async function playFixed(mode) {
  await ensureCtx(); stop();
  state.playing = true; state.mode = mode; cursor = 0; currentBar = 0; state.formBar = 0;
  stepDur = 60 / state.groove.bpm / 4;
  nextTime = ctx.currentTime + 0.06; stopAt = Infinity; barStart = nextTime;
  pumpFixed();
}

for (const id of ["play-hole", "play-pass", "play-walk", "bounce"]) $(id).disabled = true;
$("play-hole").onclick = () => playFixed("hole");
$("play-pass").onclick = () => playFixed("pass");
$("play-walk").onclick = () => playFixed("walk");
$("stop").onclick = stop;
$("copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText(punchText(state.groove, state.recipe));
    $("copy").textContent = "Copied";
    setTimeout(() => { $("copy").textContent = "Copy punch"; }, 1400);
  } catch {
    $("error").textContent = "Clipboard blocked. Select the punch list and copy it.";
  }
};
$("bounce").onclick = () => {
  bounce().catch((err) => { $("error").textContent = err instanceof Error ? err.message : "Bounce failed."; });
};

paint();
prefetch();
