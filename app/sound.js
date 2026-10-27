// Sound engine: layered ambience loops and one-shot effects.
// Built-in sounds are synthesized with WebAudio, so the board works before any files are added.
export const BUILTIN = {
  ambience: [
    { id: "b:neonrain", name: "Neon rain", synth: "neonrain", genre: "cyberpunk" },
    { id: "b:server", name: "Server room", synth: "server", genre: "cyberpunk" },
    { id: "b:club", name: "Club bass", synth: "club", genre: "cyberpunk" },
    { id: "b:traffic", name: "City traffic", synth: "traffic", genre: "cyberpunk" },
    { id: "b:shiphum", name: "Ship engines", synth: "shiphum", genre: "scifi" },
    { id: "b:station", name: "Station corridor", synth: "station", genre: "scifi" },
    { id: "b:reactor", name: "Reactor core", synth: "reactor", genre: "scifi" },
    { id: "b:wilds", name: "Alien wilds", synth: "wilds", genre: "scifi" },
    { id: "b:rain", name: "Rain", synth: "rain", genre: "fantasy", icon: "rest" },
    { id: "b:wind", name: "Howling wind", synth: "wind", genre: "fantasy", icon: "travel" },
    { id: "b:fire", name: "Campfire", synth: "fire", genre: "fantasy", icon: "forge" },
    { id: "b:cave", name: "Cave drips", synth: "cave", genre: "fantasy", icon: "explore" },
    { id: "b:sea", name: "Sea waves", synth: "sea", genre: "fantasy", icon: "travel" },
    { id: "b:drone", name: "Dungeon dread", synth: "drone", genre: "fantasy", icon: "death" },
    { id: "b:heart", name: "Heartbeat", synth: "heart", genre: "fantasy", icon: "social" },
    { id: "b:crowd", name: "Tavern murmur", synth: "crowd", genre: "fantasy", icon: "social" },
  ],
  sfx: [
    { id: "b:gun", name: "Gunshot", synth: "gun", genre: "cyberpunk" },
    { id: "b:burst", name: "SMG burst", synth: "burst", genre: "cyberpunk" },
    { id: "b:glitch", name: "Hack glitch", synth: "glitch", genre: "cyberpunk" },
    { id: "b:alarm", name: "Alarm", synth: "alarm", genre: "cyberpunk scifi" },
    { id: "b:boom", name: "Explosion", synth: "boom", genre: "cyberpunk scifi" },
    { id: "b:laser", name: "Laser", synth: "laser", genre: "scifi" },
    { id: "b:airlock", name: "Airlock", synth: "airlock", genre: "scifi" },
    { id: "b:comms", name: "Comms beep", synth: "comms", genre: "scifi cyberpunk" },
    { id: "b:warp", name: "Jump drive", synth: "warp", genre: "scifi" },
    { id: "b:thunder", name: "Thunder", synth: "thunder", genre: "fantasy" },
    { id: "b:clash", name: "Sword clash", synth: "clash", genre: "fantasy" },
    { id: "b:knock", name: "Door knock", synth: "knock", genre: "fantasy" },
    { id: "b:bell", name: "Bell toll", synth: "bell", genre: "fantasy" },
    { id: "b:magic", name: "Spell shimmer", synth: "magic", genre: "fantasy" },
    { id: "b:gong", name: "Gong", synth: "gong", genre: "fantasy" },
    { id: "b:arrow", name: "Arrow", synth: "arrow", genre: "fantasy" },
    { id: "b:growl", name: "Growl", synth: "growl", genre: "fantasy" },
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
  const rnd8 = () => Math.floor(Math.random() * 8);
  const pick8 = a => a[Math.floor(Math.random() * a.length)];
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
    neonrain(out) {
      const stop1 = SYN.rain(out);
      const lp = filt("lowpass", 900, 2); const g = ctx.createGain(); g.gain.value = .12; lp.connect(g).connect(out);
      const os = [110, 164.8, 220.5].map(f => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(lp); o.start(); return o; });
      const l = lfo(.04, 500, lp.frequency, 900);
      return () => { stop1(); os.forEach(o => o.stop()); l.stop(); };
    },
    server(out) {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 120; const og = ctx.createGain(); og.gain.value = .25; o.connect(og).connect(out); o.start();
      const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = 240.5; const og2 = ctx.createGain(); og2.gain.value = .08; o2.connect(og2).connect(out); o2.start();
      const s = src(); const hp = filt("highpass", 3000); const g = ctx.createGain(); g.gain.value = .06; s.connect(hp).connect(g).connect(out); s.start();
      let alive = true;
      const blip = () => { if (!alive) return; const t = ctx.currentTime; tone(out, "square", 1800 + rnd8() * 200, t, .002, .025, .03); setTimeout(blip, 120 + Math.random() * 900); };
      blip();
      return () => { alive = false; o.stop(); o2.stop(); s.stop(); };
    },
    club(out) {
      const lp = filt("lowpass", 380); lp.connect(out);
      let alive = true, step = 0;
      const beat = () => {
        if (!alive) return; const t = ctx.currentTime;
        tone(lp, "sine", 120, t, .002, .9, .22, 45);
        if (step % 2) burst(lp, t, .05, "highpass", 6000, 1, .08);
        if (step % 4 === 2) tone(lp, "sawtooth", [55, 65.4, 49, 58.3][(step >> 2) % 4], t, .01, .25, .35);
        step++; setTimeout(beat, 484);
      };
      beat(); return () => { alive = false; };
    },
    traffic(out) {
      const s = src(); const lp = filt("lowpass", 500); const g = ctx.createGain(); g.gain.value = .5; s.connect(lp).connect(g).connect(out); s.start();
      const l = lfo(.13, .2, g.gain, .45);
      let alive = true;
      const pass = () => { if (!alive) return; const t = ctx.currentTime; const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(70, t + 2.5); const f = filt("lowpass", 300); const gg = ctx.createGain(); env(gg, t, 1.2, .25, 1.4); o.connect(f).connect(gg).connect(out); o.start(t); o.stop(t + 2.8);
        if (Math.random() < .2) tone(out, "square", 440, t + 1, .01, .05, .25); setTimeout(pass, 1500 + Math.random() * 4000); };
      pass();
      return () => { alive = false; s.stop(); l.stop(); };
    },
    shiphum(out) {
      const lp = filt("lowpass", 180, 4); const g = ctx.createGain(); g.gain.value = .35; lp.connect(g).connect(out);
      const os = [40, 40.4, 80.2].map(f => { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(lp); o.start(); return o; });
      const s = src(); const bp = filt("bandpass", 250, 1); const ng = ctx.createGain(); ng.gain.value = .12; s.connect(bp).connect(ng).connect(out); s.start();
      const l = lfo(.2, .06, g.gain, .35);
      return () => { os.forEach(o => o.stop()); s.stop(); l.stop(); };
    },
    station(out) {
      const s = src(); const lp = filt("lowpass", 300); const g = ctx.createGain(); g.gain.value = .35; s.connect(lp).connect(g).connect(out); s.start();
      let alive = true;
      const chirp = () => { if (!alive) return; const t = ctx.currentTime; const f = pick8([880, 1320, 660, 990]); tone(out, "sine", f, t, .005, .06, .12); if (Math.random() < .5) tone(out, "sine", f * 1.5, t + .15, .005, .05, .12); setTimeout(chirp, 2500 + Math.random() * 5000); };
      chirp();
      return () => { alive = false; s.stop(); };
    },
    reactor(out) {
      const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = 55; const g = ctx.createGain(); g.gain.value = .3; o.connect(g).connect(out); o.start();
      const l = lfo(1.6, .18, g.gain, .3);
      const s = src(); const bp = filt("bandpass", 1200, 8); const ng = ctx.createGain(); ng.gain.value = .08; s.connect(bp).connect(ng).connect(out); s.start();
      const l2 = lfo(.3, 600, bp.frequency, 1200);
      return () => { o.stop(); l.stop(); s.stop(); l2.stop(); };
    },
    wilds(out) {
      const s = src(); const bp = filt("bandpass", 5200, 6); const g = ctx.createGain(); g.gain.value = .15; s.connect(bp).connect(g).connect(out); s.start();
      const l = lfo(7, .1, g.gain, .12);
      let alive = true;
      const call = () => { if (!alive) return; const t = ctx.currentTime, f = 300 + Math.random() * 900; tone(out, "sine", f, t, .05, .12, .5, f * (Math.random() < .5 ? 2.2 : .5)); setTimeout(call, 900 + Math.random() * 3000); };
      call();
      return () => { alive = false; s.stop(); l.stop(); };
    },
    gun(out) { const t = ctx.currentTime; burst(out, t, .12, "lowpass", 2500, .7, 1.4); tone(out, "sine", 90, t, .002, .9, .2, 40); burst(out, t + .02, .5, "lowpass", 600, 1, .25); return .8; },
    burst(out) { const t = ctx.currentTime; for (let i = 0; i < 7; i++) { burst(out, t + i * .075, .06, "lowpass", 2800, .7, 1); tone(out, "sine", 100, t + i * .075, .002, .5, .07, 50); } return 1; },
    glitch(out) { const t = ctx.currentTime; for (let i = 0; i < 14; i++) tone(out, "square", 200 + Math.random() * 3000, t + i * .03, .001, .08, .025); burst(out, t + .1, .2, "bandpass", 4000, 5, .2); return .7; },
    alarm(out) { const t = ctx.currentTime; for (let i = 0; i < 4; i++) { const o = ctx.createOscillator(); o.type = "square"; o.frequency.setValueAtTime(700, t + i * .6); o.frequency.linearRampToValueAtTime(1000, t + i * .6 + .3); o.frequency.linearRampToValueAtTime(700, t + i * .6 + .6); const g = ctx.createGain(); g.gain.value = .07; o.connect(g).connect(out); o.start(t + i * .6); o.stop(t + i * .6 + .58); } return 2.6; },
    boom(out) { const t = ctx.currentTime; tone(out, "sine", 70, t, .005, 1.2, 1.2, 25); const s = src(false); const lp = filt("lowpass", 1400); lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(100, t + 2.5); const g = ctx.createGain(); env(g, t, .01, 1.5, 2.6); s.connect(lp).connect(g).connect(out); s.start(t, 0, 3); return 3.2; },
    laser(out) { const t = ctx.currentTime; tone(out, "sawtooth", 1800, t, .002, .25, .22, 180); tone(out, "square", 2400, t, .002, .08, .18, 300); return .5; },
    airlock(out) { const t = ctx.currentTime; tone(out, "sine", 140, t, .01, .5, .25, 90); const s = src(false); const bp = filt("bandpass", 2000, .8); bp.frequency.setValueAtTime(3000, t + .2); bp.frequency.exponentialRampToValueAtTime(400, t + 1.6); const g = ctx.createGain(); env(g, t + .2, .05, .7, 1.4); s.connect(bp).connect(g).connect(out); s.start(t + .2, 0, 1.8); return 2.2; },
    comms(out) { const t = ctx.currentTime; tone(out, "sine", 1200, t, .005, .15, .09); tone(out, "sine", 1600, t + .12, .005, .15, .12); burst(out, t + .28, .25, "bandpass", 2500, 2, .05); return .7; },
    warp(out) { const t = ctx.currentTime; const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(1600, t + 2); const lp = filt("lowpass", 2000, 6); const g = ctx.createGain(); env(g, t, 1.6, .5, .6); o.connect(lp).connect(g).connect(out); o.start(t); o.stop(t + 2.4); burst(out, t + 2, .5, "lowpass", 800, 1, 1); return 2.8; },
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
  // music: a playlist that plays your tracks in order (or shuffled) with a short crossfade
  const music = { list: [], i: 0, vol: .6, shuffle: false, playing: false };
  function playTrack() {
    if (!music.list.length) return;
    const url = music.list[music.i % music.list.length];
    play({ key: "music", sound: { url }, loop: false, vol: music.vol, fade: 1.5 });
    const p = playing.get("music");
    if (p) { const prev = p.cleanup; p.cleanup = () => { prev(); }; }
    // the engine's own 'ended' handling stops the key; when it does, move on
    clearInterval(music.watch);
    music.watch = setInterval(() => { if (music.playing && !music.pending && !playing.has("music")) { music.i = music.shuffle ? Math.floor(Math.random() * music.list.length) : music.i + 1; playTrack(); } }, 700);
  }
  function run(cmd) {
    try {
      if (cmd.op === "music") { music.list = cmd.tracks || []; music.shuffle = !!cmd.shuffle; music.vol = cmd.vol ?? music.vol; music.i = cmd.shuffle ? Math.floor(Math.random() * music.list.length) : 0; music.playing = true; ensure(); playTrack(); return; }
      if (cmd.op === "musicNext") { if (!music.playing || music.pending) return; music.pending = true; music.i = music.shuffle ? Math.floor(Math.random() * music.list.length) : music.i + 1; stop({ key: "music", fade: 1 }); setTimeout(() => { music.pending = false; playTrack(); }, 400); return; }
      if (cmd.op === "musicStop") { music.playing = false; clearInterval(music.watch); stop({ key: "music", fade: 1.5 }); return; }
      if (cmd.op === "musicVol") { music.vol = cmd.vol; const p = playing.get("music"); if (p && ctx) fadeTo(p.out, cmd.vol, .1); return; }
      if (cmd.op === "play") play(cmd);
      else if (cmd.op === "stop") stop(cmd);
      else if (cmd.op === "vol") { const p = playing.get(cmd.key); if (p && ctx) fadeTo(p.out, cmd.vol, .08); }
      else if (cmd.op === "master") { masterVol = cmd.vol; if (master) fadeTo(master, cmd.vol, .08); }
      else if (cmd.op === "stopAll") { [...playing.keys()].filter(k => k !== "music").forEach(k => stop({ key: k, fade: cmd.fade || 0 })); }
    } catch (e) { console.warn("sound", e); }
  }
  return { run, isPlaying: k => playing.has(k) };
}
