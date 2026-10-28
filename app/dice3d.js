// 3D dice tray: three.js for rendering, cannon-es for physics.
// Every die is a real convex polyhedron; the result is read from whichever face ends up on top.
import * as THREE from "../node_modules/three/build/three.module.js";
import * as CANNON from "../node_modules/cannon-es/dist/cannon-es.js";

const PHI = (1 + Math.sqrt(5)) / 2;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const centroid = ps => scale(ps.reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]), 1 / ps.length);

function facesByNormals(verts, normals) {
  return normals.map(n => {
    n = norm(n);
    const d = verts.map(v => dot(v, n));
    const mx = Math.max(...d);
    return d.map((x, i) => [x, i]).filter(([x]) => x > mx - 1e-4).map(([, i]) => i);
  });
}
// Order a face's vertices counter-clockwise seen from outside; optionally start at `first`.
function sortFace(verts, idx, first) {
  const ps = idx.map(i => verts[i]);
  const c = centroid(ps), n = norm(c);
  let e1 = sub(ps[0], c); e1 = norm(sub(e1, scale(n, dot(e1, n))));
  const e2 = cross(n, e1);
  const ang = i => { const d = sub(verts[i], c); return Math.atan2(dot(d, e2), dot(d, e1)); };
  const out = idx.slice().sort((a, b) => ang(a) - ang(b));
  if (first != null && out.includes(first)) while (out[0] !== first) out.push(out.shift());
  return out;
}
// Give opposite faces values that add up to n+1, like real dice.
function oppositeValues(normals, n) {
  const vals = new Array(normals.length).fill(0); let next = 1;
  const N = normals.map(norm);
  for (let i = 0; i < N.length; i++) {
    if (vals[i]) continue;
    vals[i] = next;
    const j = N.findIndex((m, k) => !vals[k] && dot(m, N[i]) < -0.999);
    if (j >= 0) vals[j] = n + 1 - next;
    next++;
  }
  return vals;
}
function signs3() { const o = []; for (const x of [1, -1]) for (const y of [1, -1]) for (const z of [1, -1]) o.push([x, y, z]); return o; }

const DEFS = (() => {
  const D = {};
  let v = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
  D[4] = { verts: v, faces: facesByNormals(v, v.map(p => scale(p, -1))), vertexValues: [1, 2, 3, 4], size: 1.35, read: "vertex", font: 64 };
  v = signs3();
  let n = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  D[6] = { verts: v, faces: facesByNormals(v, n), values: oppositeValues(n, 6), size: 1.05, font: 150 };
  v = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  n = signs3();
  D[8] = { verts: v, faces: facesByNormals(v, n), values: oppositeValues(n, 8), size: 1.15, font: 112 };
  v = [];
  for (let i = 0; i < 10; i++) { const a = i * Math.PI * 2 / 10; v.push([Math.cos(a), (i % 2 ? -1 : 1) * 0.105, Math.sin(a)]); }
  v.push([0, 1, 0], [0, -1, 0]);
  const f10 = [], first10 = [], vals10 = [];
  for (let k = 0; k < 5; k++) {
    f10.push([10, 2 * k, 2 * k + 1, (2 * k + 2) % 10]); first10.push(10); vals10.push(2 * k + 1);
    f10.push([11, 2 * k + 1, (2 * k + 2) % 10, (2 * k + 3) % 10]); first10.push(11); vals10.push(2 * k + 2);
  }
  D[10] = { verts: v, faces: f10, first: first10, values: vals10, size: 1.1, font: 96 };
  const ip = 1 / PHI;
  v = [...signs3()];
  for (const a of [1, -1]) for (const b of [1, -1]) { v.push([0, a * ip, b * PHI], [a * ip, b * PHI, 0], [a * PHI, 0, b * ip]); }
  n = [];
  for (const a of [1, -1]) for (const b of [1, -1]) { n.push([0, a * PHI, b], [a * PHI, b, 0], [a, 0, b * PHI]); }
  D[12] = { verts: v, faces: facesByNormals(v, n), values: oppositeValues(n, 12), size: 1.2, font: 104 };
  const v20 = n.slice();
  const n20 = v.slice();
  D[20] = { verts: v20, faces: facesByNormals(v20, n20), values: oppositeValues(n20, 20), size: 1.25, font: 92 };
  for (const k in D) {
    const d = D[k];
    d.verts = d.verts.map(p => scale(norm(p), d.size));
    d.faces = d.faces.map((f, i) => sortFace(d.verts, f, d.first ? d.first[i] : undefined));
  }
  return D;
})();

export const THEMES = {
  ember:    { label: "Ember",    face: "#ff7a3d", face2: "#d1501b", ink: "#2a1206", rim: "#ffc4a3", rough: .38, metal: .05 },
  bone:     { label: "Bone",     face: "#eadfca", face2: "#c8b89c", ink: "#2b1d18", rim: "#fff6e6", rough: .55, metal: 0 },
  obsidian: { label: "Obsidian", face: "#26212a", face2: "#141117", ink: "#ff8f57", rim: "#4b4150", rough: .22, metal: .25 },
  jade:     { label: "Jade",     face: "#3e8f6c", face2: "#24614a", ink: "#f4efe4", rim: "#93d3b5", rough: .3, metal: .05 },
  amethyst: { label: "Amethyst", face: "#6f4a99", face2: "#4a2e6b", ink: "#ffd36b", rim: "#c7a6ee", rough: .28, metal: .1 },
  blood:    { label: "Blood",    face: "#8f1d2c", face2: "#5c0f1b", ink: "#f6e9dc", rim: "#e2707f", rough: .3, metal: .08 },
  neon:     { label: "Neon",     face: "#16121f", face2: "#0b0910", ink: "#ff2e88", rim: "#3cf2ff", rough: .2, metal: .3, glow: "#ff2e88" },
  chrome:   { label: "Chrome",   face: "#d9dde3", face2: "#8b939e", ink: "#11151a", rim: "#ffffff", rough: .12, metal: .85 },
  holo:     { label: "Hologram", face: "#53e6ff", face2: "#1b6d9c", ink: "#eaffff", rim: "#bff7ff", rough: .1, metal: .1, glow: "#2ad4ff", alpha: .72 },
  hull:     { label: "Hull plate", face: "#3a4a56", face2: "#222d35", ink: "#39d0c0", rim: "#6f8796", rough: .5, metal: .4 },
  party:    { label: "Mixed set" },
};
// a player's own dice: their sheet color for the body, ink picked for contrast
export function colorTheme(hex) {
  const n = parseInt(String(hex || "").replace("#", ""), 16); if (isNaN(n)) return null;
  const r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255, lum = (r * .299 + g * .587 + b * .114) / 255;
  const mix = (k, t) => "#" + [r, g, b].map(v => Math.round(t === "d" ? v * k : v + (255 - v) * k).toString(16).padStart(2, "0")).join("");
  return { label: "c:" + hex, face: hex, face2: mix(.6, "d"), ink: lum > .55 ? "#1d1418" : "#fff8f0", rim: mix(.55, "l"), rough: .32, metal: .06 };
}
const PARTY = { 4: "jade", 6: "bone", 8: "amethyst", 10: "ember", 12: "blood", 20: "obsidian", 100: "ember" };
export const FELTS = {
  oxblood: { label: "Oxblood felt", color: "#4d1a21" },
  moss:    { label: "Moss felt",    color: "#28402c" },
  slate:   { label: "Slate felt",   color: "#2a2f36" },
  walnut:  { label: "Walnut tray",  color: "#4a3022", wood: true },
  neon:    { label: "Neon grid",    color: "#120e1a", grid: "#ff2e88" },
  deck:    { label: "Ship deck",    color: "#1b252d", grid: "#39d0c0", plates: true },
  green:   { label: "Green screen", color: "#00b140", flat: true },
};

const texCache = new Map();
function faceTexture(type, label, theme, uvPts, mode, vertexLabels) {
  const font = getComputedStyle(document.documentElement).getPropertyValue("--display").trim() || '"Grenze Gotisch", serif';
  const key = [type, label, theme.label, mode, vertexLabels && vertexLabels.join(), font].join("|");
  if (texCache.has(key)) return texCache.get(key);
  const S = 256, cv = document.createElement("canvas"); cv.width = cv.height = S;
  const g = cv.getContext("2d");
  const grad = g.createRadialGradient(S * .4, S * .35, 10, S * .5, S * .5, S * .75);
  grad.addColorStop(0, theme.face); grad.addColorStop(1, theme.face2);
  g.fillStyle = grad; g.fillRect(0, 0, S, S);
  // speckle so faces don't look like plastic
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? "255,255,255" : "0,0,0"},${Math.random() * .05})`; g.fillRect(Math.random() * S, Math.random() * S, 2, 2); }
  const P = uvPts.map(([u, v]) => [u * S, (1 - v) * S]);
  g.beginPath(); P.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath();
  g.lineWidth = 7; g.strokeStyle = theme.rim; g.globalAlpha = .55; g.stroke(); g.globalAlpha = 1;
  g.fillStyle = theme.ink; g.textAlign = "center"; g.textBaseline = "middle";
  const DEF = DEFS[type === 100 ? 10 : type];
  if (mode === "vertex") {
    const cx = P.reduce((s, p) => s + p[0], 0) / 3, cy = P.reduce((s, p) => s + p[1], 0) / 3;
    g.font = `700 ${DEF.font * (font.includes("Grenze") ? 1 : .82)}px ${font}`;
    P.forEach(([x, y], i) => {
      const tx = cx + (x - cx) * .58, ty = cy + (y - cy) * .58;
      g.save(); g.translate(tx, ty); g.rotate(Math.atan2(x - cx, -(y - cy))); g.fillText(vertexLabels[i], 0, 4); g.restore();
    });
  } else {
    const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cy = P.reduce((s, p) => s + p[1], 0) / P.length;
    const n = Array.from(label).length;
    const fs = n > 3 ? DEF.font * Math.min(.62, 2 / n) : n > 2 ? DEF.font * .62 : n > 1 ? DEF.font * .82 : DEF.font;
    g.font = `700 ${fs * (font.includes("Grenze") ? 1 : .82)}px ${font}`;
    const oy = type === 10 || type === 100 ? -S * .06 : 0;
    // Fate faces: bold bars that read from any angle (a font's thin "−" looks like "/" on a tilted die)
    if (mode === "fate") {
      // line the bars up with the face's own edge: the face can sit tilted in its texture
      const L = S * .5, T = S * .13, ang = Math.atan2(P[1][1] - P[0][1], P[1][0] - P[0][0]);
      g.save(); g.translate(cx, cy); g.rotate(ang);
      if (label) { g.beginPath(); g.roundRect(-L / 2, -T / 2, L, T, T / 3); g.fill(); }
      if (label === "+") { g.beginPath(); g.roundRect(-T / 2, -L / 2, T, L, T / 3); g.fill(); }
      g.restore();
    } else g.fillText(label, cx, cy + oy + fs * .04);
    if (mode !== "fate" && (label === "6" || label === "9")) { g.fillRect(cx - fs * .2, cy + oy + fs * .42, fs * .4, Math.max(4, fs * .06)); }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

function labelFor(type, value, variant) {
  if (variant === "fate") return value <= 2 ? "−" : value <= 4 ? "" : "+";
  if (variant === "tens") return value === 10 ? "00" : String(value * 10);
  if (variant === "units") return String(value % 10);
  return String(value);
}

function buildDie(type, themeKey, variant, faces) {
  const T = typeof themeKey === "object" && themeKey ? themeKey : THEMES[themeKey === "party" ? PARTY[variant === "tens" || variant === "units" ? 100 : type] : themeKey] || THEMES.ember;
  const def = DEFS[type];
  const pos = [], uv = [], mats = [], faceNormals = [], faceEdges = [];
  const geo = new THREE.BufferGeometry();
  def.faces.forEach((f, fi) => {
    const pts = f.map(i => def.verts[i]);
    const c = centroid(pts);
    let nrm = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
    if (dot(nrm, c) < 0) nrm = scale(nrm, -1);
    faceNormals.push(nrm); faceEdges.push(norm(sub(pts[1], pts[0])));
    let e1 = sub(pts[0], c); e1 = norm(sub(e1, scale(nrm, dot(e1, nrm))));
    const e2 = cross(e1, nrm);
    const R = Math.max(...pts.map(p => Math.hypot(...sub(p, c))));
    const k = type === 10 ? .5 : .47;
    const uvs = pts.map(p => { const d = sub(p, c); return [.5 + dot(d, e2) / R * k, .5 + dot(d, e1) / R * k]; });
    const start = pos.length / 3;
    for (let t = 1; t < pts.length - 1; t++) for (const j of [0, t, t + 1]) { pos.push(...pts[j]); uv.push(...uvs[j]); }
    geo.addGroup(start, 3 * (pts.length - 2), fi);
    const tex = def.read === "vertex"
      ? faceTexture(type, "", T, uvs, "vertex", f.map(i => faces ? faces[def.vertexValues[i] - 1] || "" : String(def.vertexValues[i])))
      : faceTexture(variant && variant !== "fate" && variant !== "custom" ? 100 : type, faces ? faces[def.values[fi] - 1] || "" : labelFor(type, def.values[fi], variant), T, uvs, variant === "fate" ? "fate" : "face");
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: T.rough, metalness: T.metal, flatShading: true, transparent: true, opacity: T.alpha || 1 });
    if (T.glow) { m.emissive = new THREE.Color(T.glow); m.emissiveMap = tex; m.emissiveIntensity = .55; }
    m.userData.baseOpacity = T.alpha || 1; m.userData.glow = T.glow;
    mats.push(m);
  });
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats);
  mesh.castShadow = true; mesh.receiveShadow = true;
  const shape = new CANNON.ConvexPolyhedron({
    vertices: def.verts.map(p => new CANNON.Vec3(...p)),
    faces: def.faces.map(f => f.slice()),
  });
  return { mesh, shape, def, faceNormals, faceEdges, type, variant };
}

function readDie(d) {
  const q = d.body.quaternion;
  const up = new CANNON.Vec3(0, 1, 0);
  if (d.def.read === "vertex") {
    let best = -Infinity, val = 1;
    d.def.verts.forEach((p, i) => { const w = q.vmult(new CANNON.Vec3(...p)); if (w.y > best) { best = w.y; val = d.def.vertexValues[i]; } });
    return val;
  }
  let best = -Infinity, fi = 0;
  d.faceNormals.forEach((n, i) => { const w = q.vmult(new CANNON.Vec3(...n)); const s = w.dot(up); if (s > best) { best = s; fi = i; } });
  return d.def.values[fi];
}

// a cube lying on the table, turned about the vertical so its edges run along the screen:
// at 45° a Fate "+" reads as "×"
function squareUp(d) {
  const q = d.body.quaternion;
  const side = [[1, 0, 0], [0, 0, 1], [0, 1, 0]].map(a => q.vmult(new CANNON.Vec3(...a))).sort((a, b) => Math.abs(a.y) - Math.abs(b.y))[0];
  const yaw = Math.atan2(side.x, side.z), step = Math.PI / 2;
  let delta = Math.round(yaw / step) * step - yaw;
  const turn = new CANNON.Quaternion(); turn.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), delta);
  // a "−" should lie flat, not stand up like a "|": its bar runs along the top face's first edge
  if (d.value <= 2) {
    let fi = 0, best = -Infinity; d.faceNormals.forEach((n, i) => { const y = q.vmult(new CANNON.Vec3(...n)).y; if (y > best) { best = y; fi = i; } });
    const bar = turn.mult(q).vmult(new CANNON.Vec3(...d.faceEdges[fi]));
    if (Math.abs(bar.z) > Math.abs(bar.x)) { delta += step; turn.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), delta); }
  }
  if (Math.abs(delta) < .01) return;
  d.snap = { from: q.clone(), to: turn.mult(q), t0: performance.now() };
}

function feltTexture(felt) {
  const S = 512, cv = document.createElement("canvas"); cv.width = cv.height = S;
  const g = cv.getContext("2d");
  g.fillStyle = felt.color; g.fillRect(0, 0, S, S);
  if (felt.flat) return new THREE.CanvasTexture(cv);
  if (felt.grid) {
    g.strokeStyle = felt.grid; g.globalAlpha = felt.plates ? .25 : .35; g.lineWidth = felt.plates ? 3 : 2;
    const step = felt.plates ? 128 : 64;
    for (let x = 0; x <= S; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(S, x); g.stroke(); }
    if (felt.plates) { g.fillStyle = felt.grid; for (let x = 12; x < S; x += 128) for (let y = 12; y < S; y += 128) { g.fillRect(x, y, 4, 4); g.fillRect(x + 100, y, 4, 4); g.fillRect(x, y + 100, 4, 4); g.fillRect(x + 100, y + 100, 4, 4); } }
    g.globalAlpha = 1;
  }
  if (felt.wood) {
    for (let y = 0; y < S; y += 2) { const t = Math.sin(y * .05 + Math.sin(y * .013) * 4) * .5 + .5; g.fillStyle = `rgba(0,0,0,${.05 + t * .12})`; g.fillRect(0, y, S, 1 + (t > .8)); }
  }
  for (let i = 0; i < 26000; i++) { const l = Math.random(); g.fillStyle = `rgba(${l > .5 ? "255,255,255" : "0,0,0"},${Math.random() * .07})`; g.fillRect(Math.random() * S, Math.random() * S, 1.4, 1.4); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---- tiny synthesized clack for impacts ----
const Clack = {
  ctx: null, last: 0, enabled: false,
  hit(strength) {
    if (!this.enabled) return;
    const now = performance.now(); if (now - this.last < 28) return; this.last = now;
    try {
      this.ctx ||= new AudioContext();
      const c = this.ctx, len = .045, buf = c.createBuffer(1, c.sampleRate * len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4);
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1400 + Math.random() * 2200; f.Q.value = 3;
      const gn = c.createGain(); gn.gain.value = Math.min(.9, strength / 9);
      src.connect(f).connect(gn).connect(c.destination); src.start();
    } catch {}
  },
};
export function setDiceSound(on) { Clack.enabled = !!on; if (on) { try { Clack.ctx ||= new AudioContext(); Clack.ctx.resume(); } catch {} } }

export class DiceTray {
  constructor(host, opts = {}) {
    this.host = host; this.opts = opts;
    this.theme = opts.theme || "ember"; this.feltKey = opts.felt || "oxblood";
    this.dice = []; this.tags = [];
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !!opts.transparent, premultipliedAlpha: false, preserveDrawingBuffer: !!opts.preserve });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.append(this.renderer.domElement);
    this.tagLayer = document.createElement("div"); this.tagLayer.className = "die-tags"; host.append(this.tagLayer);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, .1, 200);
    this.camera.position.set(0, 30, 10); this.camera.lookAt(0, 0, .6);
    this.scene.add(new THREE.HemisphereLight(0xfff1e0, 0x2a1a1e, .9));
    const key = new THREE.DirectionalLight(0xffe2c4, 2.4);
    key.position.set(-8, 22, 10); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -22, right: 22, top: 16, bottom: -16, near: 1, far: 60 });
    key.shadow.radius = 5; key.shadow.bias = -0.0006;
    this.scene.add(key);
    const rim = new THREE.PointLight(0xff8a50, 60, 60); rim.position.set(12, 8, -10); this.scene.add(rim);
    // transparent: for OBS, the floor only catches shadows and the stream shows through
    this.floorMat = opts.transparent ? new THREE.ShadowMaterial({ opacity: .4 }) : new THREE.MeshStandardMaterial({ roughness: .95, metalness: 0 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), this.floorMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; this.scene.add(floor);
    this.setFelt(this.feltKey);

    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -38, 0) });
    this.world.allowSleep = false;
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 14;
    this.dieMat = new CANNON.Material("die"); this.floorPMat = new CANNON.Material("floor"); this.wallMat = new CANNON.Material("wall");
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.dieMat, this.floorPMat, { friction: .32, restitution: .38 }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.dieMat, this.dieMat, { friction: .1, restitution: .45 }));
    this.world.addContactMaterial(new CANNON.ContactMaterial(this.dieMat, this.wallMat, { friction: .05, restitution: .65 }));
    const plane = (mat, pos, euler) => {
      const b = new CANNON.Body({ mass: 0, material: mat, shape: new CANNON.Plane() });
      b.position.set(...pos); b.quaternion.setFromEuler(...euler); this.world.addBody(b); return b;
    };
    plane(this.floorPMat, [0, 0, 0], [-Math.PI / 2, 0, 0]);
    this.walls = {
      l: plane(this.wallMat, [-10, 0, 0], [0, Math.PI / 2, 0]),
      r: plane(this.wallMat, [10, 0, 0], [0, -Math.PI / 2, 0]),
      t: plane(this.wallMat, [0, 0, -7], [0, 0, 0]),
      b: plane(this.wallMat, [0, 0, 7], [0, Math.PI, 0]),
      c: plane(this.wallMat, [0, 16, 0], [Math.PI / 2, 0, 0]),
    };
    this.running = false; this.lastT = 0;
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host);
    this.resize();
  }
  setTheme(k) { this.theme = k; }
  setFelt(k) {
    this.feltKey = FELTS[k] ? k : "oxblood";
    if (this.opts.transparent) { this.scene.background = null; this.renderer.setClearColor(0x000000, 0); this.renderOnce(); return; }
    this.floorMat.map?.dispose?.();
    this.floorMat.map = feltTexture(FELTS[this.feltKey]); this.floorMat.needsUpdate = true;
    this.scene.background = new THREE.Color(FELTS[this.feltKey].color).multiplyScalar(FELTS[this.feltKey].flat ? 1 : .55);
    this.renderOnce();
  }
  resize() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = "100%"; this.renderer.domElement.style.height = "100%";
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    // walls follow the visible table area
    const dist = this.camera.position.length();
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * dist * .9;
    const halfW = halfH * this.camera.aspect;
    this.bounds = { w: Math.max(3, halfW - 1.1), d: Math.max(2.5, halfH - 1.3) };
    this.walls.l.position.x = -this.bounds.w; this.walls.r.position.x = this.bounds.w;
    this.walls.t.position.z = -this.bounds.d; this.walls.b.position.z = this.bounds.d + .6;
    this.renderOnce();
  }
  renderOnce() { this.renderer.render(this.scene, this.camera); this.updateTags(); }
  clear() {
    for (const d of this.dice) { this.scene.remove(d.mesh); this.world.removeBody(d.body); d.mesh.geometry.dispose(); d.mesh.material.forEach(m => m.dispose()); }
    this.dice = []; this.tagLayer.innerHTML = ""; this.tags = [];
    this.renderOnce();
  }
  // groups: [{sides, count}] -> Promise<number[][]> (values per group, in roll order)
  roll(groups, { color } = {}) {
    const theme = (color && colorTheme(color)) || this.theme;
    this.clear();
    const list = [];
    groups.forEach((g, gi) => {
      for (let i = 0; i < g.count; i++) {
        if (g.sides === 100) { list.push({ gi, type: 10, variant: "tens", pair: i }); list.push({ gi, type: 10, variant: "units", pair: i }); }
        else if (g.fate) list.push({ gi, type: 6, variant: "fate" });
        else if (g.faces && DEFS[g.sides]) list.push({ gi, type: g.sides, variant: "custom", faces: g.faces });
        else if (DEFS[g.sides]) list.push({ gi, type: g.sides });
        else list.push({ gi, type: null, sides: g.sides });
      }
    });
    const physical = list.filter(x => x.type).slice(0, 40);
    const fromLeft = Math.random() < .5, B = this.bounds;
    physical.forEach((x, i) => {
      const d = buildDie(x.type, theme, x.variant, x.faces);
      const body = new CANNON.Body({ mass: 1, material: this.dieMat, shape: d.shape, linearDamping: .12, angularDamping: .12 });
      const row = i % 6, col = Math.floor(i / 6);
      body.position.set((fromLeft ? -1 : 1) * (B.w - 1.2 - col * 1.6), 3 + Math.random() * 2.5, (row - 2.5) * Math.min(1.7, B.d / 3.2) + Math.random() * .5);
      body.quaternion.setFromEuler(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3);
      const sp = 16 + Math.random() * 10;
      body.velocity.set((fromLeft ? 1 : -1) * sp, -2 - Math.random() * 3, (Math.random() - .5) * 10);
      body.angularVelocity.set((Math.random() - .5) * 40, (Math.random() - .5) * 40, (Math.random() - .5) * 40);
      body.addEventListener("collide", e => { const v = Math.abs(e.contact.getImpactVelocityAlongNormal()); if (v > 1.2) Clack.hit(v); });
      this.world.addBody(body); this.scene.add(d.mesh);
      d.body = body; d.meta = x; this.dice.push(d);
      const tag = document.createElement("div"); tag.className = "die-tag"; this.tagLayer.append(tag); this.tags.push(tag);
    });
    return new Promise(resolve => {
      this.resolve = resolve; this.list = list; this.settleFrames = 0; this.t0 = performance.now();
      this.start();
    });
  }
  start() { if (this.running) return; this.running = true; this.lastT = performance.now(); requestAnimationFrame(t => this.loop(t)); }
  loop(t) {
    if (!this.running) return;
    const dt = Math.min(.05, (t - this.lastT) / 1000); this.lastT = t;
    this.world.step(1 / 120, dt, 8);
    for (const d of this.dice) {
      if (d.snap) { // ease a settled Fate die square to the camera
        const k = Math.min(1, (t - d.snap.t0) / 260), e = 1 - Math.pow(1 - k, 3);
        d.snap.from.slerp(d.snap.to, e, d.body.quaternion); d.body.velocity.setZero(); d.body.angularVelocity.setZero();
        if (k >= 1) d.snap = null;
      }
      d.mesh.position.copy(d.body.position); d.mesh.quaternion.copy(d.body.quaternion);
    }
    this.renderer.render(this.scene, this.camera);
    if (this.resolve) {
      const still = this.dice.every(d => d.body.velocity.lengthSquared() < .02 && d.body.angularVelocity.lengthSquared() < .02);
      this.settleFrames = still ? this.settleFrames + 1 : 0;
      if (this.settleFrames > 14 || t - this.t0 > 7000) this.finish();
    }
    this.updateTags();
    if (this.resolve || this.glowUntil > t) requestAnimationFrame(n => this.loop(n));
    else this.running = false;
  }
  finish() {
    const values = this.list.map(() => null);
    let pi = 0;
    this.list.forEach((x, i) => {
      if (!x.type) { values[i] = 1 + Math.floor(Math.random() * x.sides); return; }
      const d = this.dice[pi++]; values[i] = d ? readDie(d) : 1 + Math.floor(Math.random() * (x.type));
      if (d) d.value = values[i];
      if (d && d.variant === "fate") squareUp(d);
    });
    if (this.dice.some(d => d.snap)) { this.glowUntil = performance.now() + 320; this.start(); }
    // combine d100 pairs and group
    const out = [];
    for (let i = 0; i < this.list.length; i++) {
      const x = this.list[i]; out[x.gi] ||= [];
      if (x.variant === "tens") {
        const tens = values[i] % 10, units = values[i + 1] % 10;
        out[x.gi].push(tens * 10 + units === 0 ? 100 : tens * 10 + units); i++;
      } else out[x.gi].push(values[i]);
    }
    const r = this.resolve; this.resolve = null;
    r(out);
  }
  // after the caller decides which dice count, show value tags and dim dropped dice
  mark(states) {
    // states: per physical die index -> {dropped, max, min}
    this.dice.forEach((d, i) => {
      const s = states[i] || {};
      d.mesh.material.forEach(m => {
        m.opacity = s.dropped ? .3 : m.userData.baseOpacity;
        if (s.max || s.min) { m.emissive = new THREE.Color(s.max ? 0xffb347 : 0xff2a2a); m.emissiveIntensity = .35; m.emissiveMap = null; }
        m.needsUpdate = true;
      });
      const tag = this.tags[i]; if (!tag) return;
      tag.textContent = d.meta?.faces ? (d.meta.faces[d.value - 1] || "·") : d.variant === "tens" ? (d.value === 10 ? "00" : d.value * 10) : d.variant === "units" ? d.value % 10 : d.variant === "fate" ? (d.value <= 2 ? "−" : d.value <= 4 ? "0" : "+") : d.value;
      tag.className = "die-tag show" + (s.dropped ? " dropped" : "") + (s.max ? " max" : "") + (s.min ? " min" : "");
    });
    this.glowUntil = performance.now() + 50; this.start();
  }
  physicalIndex() { // maps physical dice back to [groupIndex, rollIndex]
    const map = []; const counters = {};
    this.list.filter(x => x.type).slice(0, 40).forEach(x => {
      counters[x.gi] ||= 0;
      const idx = x.variant === "units" ? counters[x.gi] - 1 : counters[x.gi]++;
      map.push([x.gi, idx]);
    });
    return map;
  }
  updateTags() {
    if (!this.tags.length) return;
    const w = this.host.clientWidth, h = this.host.clientHeight, v = new THREE.Vector3();
    this.dice.forEach((d, i) => {
      const tag = this.tags[i]; if (!tag) return;
      v.copy(d.mesh.position); v.y += 1.6; v.project(this.camera);
      tag.style.transform = `translate(${(v.x * .5 + .5) * w}px, ${(-v.y * .5 + .5) * h}px) translate(-50%,-100%)`;
    });
  }
  dispose() { this.running = false; this.ro.disconnect(); this.clear(); this.renderer.dispose(); }
}
