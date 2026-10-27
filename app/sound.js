// Sound engine: layered ambience loops and one-shot effects.
// Built-in sounds are synthesized with WebAudio, so the board works before any files are added.
export const BUILTIN = {
  ambience: [
    { id: "b:rain", name: "Rain", synth: "rain", icon: "rest" },
    { id: "b:wind", name: "Howling wind", synth: "wind", icon: "travel" },
    { id: "b:fire", name: "Campfire", synth: "fire", icon: "forge" },
    { id: "b:cave", name: "Cave drips", synth: "cave", icon: "explore" },
    { id: "b:sea", name: "Sea waves", synth: "sea", icon: "travel" },
    { id: "b:drone", name: "Dungeon dread", synth: "drone", icon: "death" },
    { id: "b:heart", name: "Heartbeat", synth: "heart", icon: "social" },
    { id: "b:crowd", name: "Tavern murmur", synth: "crowd", icon: "social" },
  ],
  sfx: [
    { id: "b:thunder", name: "Thunder", synth: "thunder" },
    { id: "b:clash", name: "Sword clash", synth: "clash" },
    { id: "b:knock", name: "Door knock", synth: "knock" },
    { id: "b:bell", name: "Bell toll", synth: "bell" },
    { id: "b:magic", name: "Spell shimmer", synth: "magic" },
    { id: "b:gong", name: "Gong", synth: "gong" },
    { id: "b:arrow", name: "Arrow", synth: "arrow" },
    { id: "b:growl", name: "Growl", synth: "growl" },
  ],
};

export function createSoundEngine() {
  let ctx = null, master = null;
  const playing = new Map(); // key -> { gain, stop() }
  let masterVol = 0.8;
  const ensure = () => {
    if (!ctx) { ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = masterVol; master.connect(ctx.destination); }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };
  let noiseBuf = null;
  const noise = () => {
    if (noiseBuf) return noiseBuf;
    const len = ctx.sampleRate * 3; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate); const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  };
  const src = (loop = true) => { const s = ctx.createBufferSource(); s.buffer = noise(); s.loop = loop; s.loopStart = Math.random(); return s; };
  const filt = (type, f, q = 1) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; return n; };
  const lfo = (rate, depth, target, offset) => { const o = ctx.createOscillator(); o.frequency.value = rate; const g = ctx.createGain(); g.gain.value = depth; o.connect(g).connect(target); if (offset != null) target.value = offset; o.start(); return o; };
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
  const tone = (out, type, f, t, a, peak, d, bend) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (bend) o.frequency.exponentialRampToValueAtTime(bend, t + a + d);
    const g = ctx.createGain(); env(g, t, a, peak, d); o.connect(g).connect(out); o.start(t); o.stop(t + a + d + .05);
  };
  const burst = (out, t, dur, type, f, q, peak) => { const s = src(false); const fl = filt(type, f, q); const g = ctx.createGain(); env(g, t, .005, peak, dur); s.connect(fl).connect(g).connect(out); s.start(t, Math.random() * 2, dur + .1); };
  // every synth gets an output node and returns a cleanup function
  const SYN = {
    rain(out) {
      const s = src(); const hp = filt("highpass", 500); const lp = filt("lowpass", 7000); const g = ctx.createGain(); g.gain.value = .35;
      s.connect(hp).connect(lp).connect(g).connect(out); s.start();
      const iv = setInterval(() => { const t = ctx.currentTime; for (let i = 0; i < 4; i++) burst(out, t + Math.random() * .1, .02, "bandpass", 2500 + Math.random() * 4000, 4, .08 + Math.random() * .1); }, 90);
      return () => { clearInterval(iv); s.stop(); };
    },
    wind(out) {
      const s = src(); const bp = filt("bandpass", 450, 1.2); const g = ctx.createGain(); g.gain.value = .5;
      s.connect(bp).connect(g).connect(out); s.start();
      const l1 = lfo(.07, 260, bp.frequency, 450), l2 = lfo(.11, .3, g.gain, .45);
      return () => { s.stop(); l1.stop(); l2.stop(); };
    },
    fire(out) {
      const s = src(); const lp = filt("lowpass", 380); const g = ctx.createGain(); g.gain.value = .6;
      s.connect(lp).connect(g).connect(out); s.start();
      const l = lfo(.3, .15, g.gain, .55);
      let alive = true;
      const pop = () => { if (!alive) return; const t = ctx.currentTime; burst(out, t, .015 + Math.random() * .03, "bandpass", 1500 + Math.random() * 4500, 2, .15 + Math.random() * .35); setTimeout(pop, 40 + Math.random() * 260); };
      pop();
      return () => { alive = false; s.stop(); l.stop(); };
    },
    cave(out) {
      const s = src(); const lp = filt("lowpass", 160); const g = ctx.createGain(); g.gain.value = .5; s.connect(lp).connect(g).connect(out); s.start();
      const dl = ctx.createDelay(1); dl.delayTime.value = .32; const fb = ctx.createGain(); fb.gain.value = .45; dl.connect(fb).connect(dl); dl.connect(out);
      let alive = true;
      const drip = () => { if (!alive) return; const t = ctx.currentTime, f = 1400 + Math.random() * 1600; tone(dl, "sine", f, t, .002, .25, .12, f * .55); tone(out, "sine", f, t, .002, .2, .1, f * .55); setTimeout(drip, 500 + Math.random() * 2200); };
      drip();
      return () => { alive = false; s.stop(); };
    },
    sea(out) {
      const s = src(); const lp = filt("lowpass", 700); const g = ctx.createGain(); g.gain.value = .05;
      s.connect(lp).connect(g).connect(out); s.start();
      const l = lfo(.09, .45, g.gain, .5), l2 = lfo(.09, 500, lp.frequency, 800);
      return () => { s.stop(); l.stop(); l2.stop(); };
    },
    drone(out) {
      const lp = filt("lowpass", 260, 3); const g = ctx.createGain(); g.gain.value = .22; lp.connect(g).connect(out);
      const os = [55, 55.6, 82.4].map(f => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(lp); o.start(); return o; });
      const l = lfo(.05, 120, lp.frequency, 260);
      return () => { os.forEach(o => o.stop()); l.stop(); };
    },
    heart(out) {
      let alive = true;
      const beat = () => { if (!alive) return; const t = ctx.currentTime; tone(out, "sine", 62, t, .01, .9, .18, 40); tone(out, "sine", 55, t + .24, .01, .6, .2, 38); setTimeout(beat, 860); };
      beat(); return () => { alive = false; };
    },
    crowd(out) {
      const parts = [];
      for (let i = 0; i < 4; i++) {
        const s = src(); const bp = filt("bandpass", 300 + i * 180, 3); const g = ctx.createGain(); g.gain.value = .25;
        s.connect(bp).connect(g).connect(out); s.start(); parts.push(s, lfo(1.5 + Math.random() * 3, 160, bp.frequency, 300 + i * 180), lfo(.6 + Math.random(), .15, g.gain, .22));
      }
      let alive = true;
      const clink = () => { if (!alive) return; const t = ctx.currentTime; tone(out, "sine", 2400 + Math.random() * 1800, t, .002, .05, .25); setTimeout(clink, 1200 + Math.random() * 4000); };
      clink();
      return () => { alive = false; parts.forEach(p => p.stop()); };
    },
    thunder(out) {
      const t = ctx.currentTime; burst(out, t, .25, "highpass", 1500, .7, .8);
      const s = src(false); const lp = filt("lowpass", 900); lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(120, t + 3.5);
      const g = ctx.createGain(); env(g, t + .05, .08, 1.4, 3.8); s.connect(lp).connect(g).connect(out); s.start(t, 0, 4.2);
      return 4.5;
    },
    clash(out) {
      const t = ctx.currentTime; burst(out, t, .06, "highpass", 3000, 1, .6);
      [1830, 2650, 3910, 5230, 6870].forEach((f, i) => tone(out, "sine", f, t, .001, .18 / (i + 1), 1.3 - i * .15));
      return 1.6;
    },
    knock(out) {
      const t = ctx.currentTime;
      [0, .28, .52].forEach(o => { burst(out, t + o, .08, "lowpass", 400, 1, 1.2); tone(out, "sine", 110, t + o, .003, .7, .12, 70); });
      return 1;
    },
    bell(out) {
      const t = ctx.currentTime;
      [1, 2.0, 2.4, 3.0, 4.2, 5.4].forEach((m, i) => tone(out, "sine", 196 * m, t, .005, .35 / (i + 1), 6 - i * .7));
      return 6.5;
    },
    magic(out) {
      const t = ctx.currentTime; const dl = ctx.createDelay(1); dl.delayTime.value = .18; const fb = ctx.createGain(); fb.gain.value = .5; dl.connect(fb).connect(dl); dl.connect(out);
      [880, 1108.7, 1318.5, 1760, 2217.5].forEach((f, i) => { tone(out, "triangle", f, t + i * .07, .01, .12, .6); tone(dl, "sine", f * 2, t + i * .07, .01, .05, .5); });
      return 2.5;
    },
    gong(out) {
      const t = ctx.currentTime;
      [92, 151, 233, 347, 482].forEach((f, i) => tone(out, "sine", f, t, .02, .5 / (i + 1), 7 - i));
      burst(out, t, .3, "lowpass", 600, 1, .4);
      return 7.5;
    },
    arrow(out) {
      const t = ctx.currentTime; const s = src(false); const bp = filt("bandpass", 400, 4);
      bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(3200, t + .35);
      const g = ctx.createGain(); env(g, t, .05, .9, .35); s.connect(bp).connect(g).connect(out); s.start(t, 0, .5);
      burst(out, t + .42, .05, "lowpass", 900, 1, .9);
      return .8;
    },
    growl(out) {
      const t = ctx.currentTime; const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(75, t); o.frequency.linearRampToValueAtTime(58, t + 1.6);
      const lp = filt("lowpass", 420, 2); const g = ctx.createGain(); env(g, t, .2, .7, 1.5);
      const trem = ctx.createGain(); trem.gain.value = .6; lfo(23, .4, trem.gain, .6);
      o.connect(lp).connect(trem).connect(g).connect(out); o.start(t); o.stop(t + 1.9);
      const s = src(false); const n = filt("bandpass", 300, 1); const ng = ctx.createGain(); env(ng, t, .2, .3, 1.4); s.connect(n).connect(ng).connect(out); s.start(t, 0, 1.8);
      return 2;
    },
  };

  function makeOut(vol) { const g = ctx.createGain(); g.gain.value = vol; g.connect(master); return g; }
  function fadeTo(g, v, sec) { const t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(.0001, g.gain.value), t); g.gain.linearRampToValueAtTime(Math.max(.0001, v), t + Math.max(.02, sec)); }

  function play(cmd) {
    ensure();
    const { key, sound, loop, vol = .8, fade = 0 } = cmd;
    if (playing.has(key)) stop({ key, fade: .2 });
    const out = makeOut(fade ? .0001 : vol);
    let cleanup = () => {}, auto = 0;
    if (sound.synth && SYN[sound.synth]) {
      const r = SYN[sound.synth](out);
      if (typeof r === "function") cleanup = r; else auto = r;
    } else if (sound.url) {
      const a = new Audio(sound.url); a.loop = !!loop; a.crossOrigin = "anonymous";
      const node = ctx.createMediaElementSource(a); node.connect(out);
      a.play().catch(() => {});
      cleanup = () => { a.pause(); a.src = ""; };
      if (!loop) a.onended = () => stop({ key });
    }
    if (fade) fadeTo(out, vol, fade);
    const rec = { out, cleanup };
    playing.set(key, rec);
    if (auto) setTimeout(() => { if (playing.get(key) === rec) stop({ key }); }, auto * 1000);
  }
  function stop({ key, fade = 0 }) {
    const p = playing.get(key); if (!p) return; playing.delete(key);
    if (fade && ctx) { fadeTo(p.out, .0001, fade); setTimeout(() => { p.cleanup(); p.out.disconnect(); }, fade * 1000 + 60); }
    else { p.cleanup(); try { p.out.disconnect(); } catch {} }
  }
  function run(cmd) {
    try {
      if (cmd.op === "play") play(cmd);
      else if (cmd.op === "stop") stop(cmd);
      else if (cmd.op === "vol") { const p = playing.get(cmd.key); if (p && ctx) fadeTo(p.out, cmd.vol, .08); }
      else if (cmd.op === "master") { masterVol = cmd.vol; if (master) fadeTo(master, cmd.vol, .08); }
      else if (cmd.op === "stopAll") [...playing.keys()].forEach(k => stop({ key: k, fade: cmd.fade || 0 }));
    } catch (e) { console.warn("sound", e); }
  }
  return { run, isPlaying: k => playing.has(k) };
}
