import { dropZone } from "./dnd.js";
// Live: the screen you run the session from. Soundboard, handouts on stream, and tonight's plan.
import { $, $$, esc, h, icon, toast, uid, ls, debounce } from "./util.js";
import { C, save } from "./store.js";
import { BUILTIN } from "./sound.js";
import { BEATS } from "./chronicle.js";
import { rollTable } from "./tables.js";
import { shrinkImage } from "./board.js";
import { nextPlanned } from "./bestiary.js";
import { startSession } from "./prep.js";
import { GEN, NAMES, makeName } from "./gen.js";

const fmt = ms => { const m = Math.floor(ms / 60000); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };

export function createLive(el, App) {
  const st = { beatType: "social", secret: ls.get("live.secret", true), tableOut: [] };
  el.innerHTML = `<div class="liveview">
    <header class="live-head" id="lvHead"></header>
    <div class="live-grid">
      <section class="lv-col" id="lvSound"></section>
      <section class="lv-col" id="lvHand"></section>
      <section class="lv-col lv-plan" id="lvPlan"></section>
    </div></div>`;
  const live = () => C().sessions.find(s => s.status === "live");
  dropZone($("#lvHand", el), { image: async (url, f) => { C().handouts.push({ id: uid(), title: f.name.replace(/\.[^.]+$/, ""), type: "image", src: url }); save(); renderHand(); toast("Handout added"); }, max: 1800, label: "Drop to add a handout" });
  const touch = debounce(save, 300);
  let timer = null;

  // ---------- header ----------
  function renderHead() {
    const s = live(), box = $("#lvHead", el);
    clearInterval(timer);
    if (!s) {
      const p = nextPlanned(C(), false);
      box.innerHTML = `<div class="lv-dot off"></div><div><div class="eyebrow">No session running</div><h2>${p ? `Session ${esc(p.num)}${p.title ? ": " + esc(p.title) : ""} is planned` : "Soundboard & handouts"}</h2></div><div style="flex:1"></div>
        ${p ? `<button class="btn" id="lvPrep">${icon("book")} Open prep</button><button class="btn primary" id="lvStart">Start session ${esc(p.num)}</button>` : `<button class="btn primary" id="lvQuick">Start an unplanned session</button>`}`;
      $("#lvPrep", box)?.addEventListener("click", () => App.go("prep"));
      $("#lvStart", box)?.addEventListener("click", () => startSession(App, p));
      $("#lvQuick", box)?.addEventListener("click", () => startSession(App, nextPlanned(C())));
      return;
    }
    box.innerHTML = `<div class="lv-dot"></div><div><div class="eyebrow">Live · Session ${esc(s.num)}</div><h2>${esc(s.title || "Untitled session")}</h2></div>
      <div class="lv-clock mono" id="lvClock">0:00</div>
      <div class="spotlight" title="Tap a player when they get the spotlight. The one who's waited longest glows.">${C().party.map(m => { const sp = (s.plan.spot ||= {})[m.id] || { n: 0, at: s.plan.startedAt || 0 }; return `<button class="sp" data-sp="${m.id}" style="--mc:${esc(m.color)}"><span>${esc((m.character || m.player || "?").split(" ")[0])}</span><b>${sp.n}</b></button>`; }).join("")}</div>
      <div style="flex:1"></div>
      <div class="lv-log"><select id="lvBT" aria-label="Beat type">${Object.entries(BEATS).map(([k, b]) => `<option value="${k}" ${k === st.beatType ? "selected" : ""}>${b.label}</option>`).join("")}</select><input type="text" id="lvBeat" placeholder="Log what just happened, press Enter"></div>
      <button class="btn" id="lvEnd">End session</button>`;
    const tick = () => { const c = $("#lvClock", el); if (c) c.textContent = fmt(Date.now() - (s.plan?.startedAt || Date.now())); };
    const markQuiet = () => {
      const sp = s.plan.spot || {}, party = C().party; if (!party.length) return;
      const oldest = party.map(m => [m.id, (sp[m.id] || {}).at || s.plan.startedAt || 0]).sort((a, b) => a[1] - b[1])[0];
      $$(".sp", box).forEach(b => b.classList.toggle("quiet", b.dataset.sp === oldest[0] && Date.now() - oldest[1] > 10 * 60000));
    };
    $$(".sp", box).forEach(b => b.onclick = () => { const sp = (s.plan.spot ||= {}); const x = sp[b.dataset.sp] ||= { n: 0, at: 0 }; x.n++; x.at = Date.now(); save(); b.querySelector("b").textContent = x.n; markQuiet(); });
    markQuiet();
    tick(); timer = setInterval(() => { tick(); markQuiet(); }, 15000);
    $("#lvBT", box).onchange = e => st.beatType = e.target.value;
    $("#lvBeat", box).onkeydown = e => { if (e.key === "Enter" && e.target.value.trim()) { App.logBeat(st.beatType, e.target.value.trim()); e.target.value = ""; } };
    $("#lvEnd", box).onclick = () => App.confirm(`End session ${s.num}?`, "The time played is saved and the session moves to the Chronicle, where you can finish the write-up.", "End session", () => {
      const ms = Date.now() - (s.plan?.startedAt || Date.now());
      s.status = "played"; s.plan.endedAt = Date.now(); s.hours = Math.max(.5, Math.round(ms / 1800000) / 2);
      // turn spotlight taps into the Chronicle's 0-3 stars
      const sp = s.plan.spot || {}, max = Math.max(0, ...Object.values(sp).map(x => x.n));
      if (max) { s.spotlight ||= {}; for (const [id, x] of Object.entries(sp)) s.spotlight[id] = Math.max(1, Math.round(x.n / max * 3)); }
      if (App.discord.settings().autoSessions && App.discord.connected()) {
        App.discord.postRecap(s, { quiet: true });
      }
      App.sound.send({ op: "stopAll", fade: 2 }); save(); App.go("chronicle", { session: s.id }); toast("Session saved to the Chronicle");
    });
  }

  // ---------- sound ----------
  function sounds(cat) {
    if (cat === "music") return C().sounds.filter(x => x.cat === "music");
    const g = C().genre || "fantasy", all = ls.get("live.allSounds", false);
    const built = BUILTIN[cat].filter(x => all || !x.genre || x.genre.split(" ").includes(g)).sort((a, b) => (b.genre || "").includes(g) - (a.genre || "").includes(g));
    return [...C().sounds.filter(x => x.cat === cat).map(x => ({ ...x, user: true })), ...built];
  }
  function srcOf(x) { return x.synth ? { synth: x.synth } : { url: `codexmedia://media/${encodeURIComponent(x.file)}` }; }
  function renderSound() {
    const box = $("#lvSound", el), S = App.sound;
    const vol = id => ls.get("vol." + id, .7);
    box.innerHTML = `<div class="sec-h"><h3>Soundboard</h3><div class="line"></div></div>
      <div class="lv-out"><div class="mode-seg"><button data-out="stream" class="${S.out === "stream" ? "on" : ""}" title="Plays from the stream window, so Discord's screen share can carry it">Stream window</button><button data-out="local" class="${S.out === "local" ? "on" : ""}">This window</button></div>
        <input type="range" min="0" max="1" step=".01" id="lvMaster" value="${S.master}" title="Master volume"><button class="btn sm ghost" id="lvStop" title="Stop everything">${icon("x")} Stop</button></div>
      ${S.out === "stream" && !App.streamLive ? `<p class="lv-note">The stream window is closed, so sound plays here until you open it.</p>` : ""}
      <div class="eyebrow" style="margin:14px 0 8px">Soundscapes · one click sets the whole mood</div>
      <div class="chips scapes">${(C().soundscapes || []).map(sc => `<span class="chip scape" data-sc="${sc.id}">${esc(sc.name)}<button class="x" data-scdel title="Delete">${icon("x")}</button></span>`).join("")}<button class="chip" id="lvScSave" title="Save the loops (and weather) playing now">${icon("plus")} Save current mix</button></div>
      <div class="eyebrow" style="margin:14px 0 8px">Ambience · layer as many as you like</div>
      <div class="amb-grid">${sounds("ambience").map(x => `<div class="amb ${S.active.has(x.id) ? "on" : ""}" data-id="${x.id}"><button class="amb-b">${S.active.has(x.id) ? `<span class="eq"><i></i><i></i><i></i></span>` : icon("sound")}<span>${esc(x.name)}</span></button>
        <input type="range" min="0" max="1" step=".01" value="${vol(x.id)}" aria-label="${esc(x.name)} volume">${x.user ? `<button class="rm" title="Remove sound">${icon("x")}</button>` : ""}</div>`).join("")}</div>
      <div class="eyebrow" style="margin:16px 0 8px">Effects · click to fire</div>
      <div class="sfx-grid">${sounds("sfx").map(x => `<button class="sfx" data-id="${x.id}">${esc(x.name)}${x.user ? `<span class="rm" title="Remove">${icon("x")}</span>` : ""}</button>`).join("")}</div>
      <div class="eyebrow" style="margin:16px 0 8px">Music · your own tracks, one after another</div>
      ${(() => { const tracks = C().sounds.filter(x => x.cat === "music"); return tracks.length ? `<div class="music"><div class="row" style="gap:6px"><button class="btn sm ${App.sound.music ? "on" : ""}" id="muPlay">${icon("sound")} ${App.sound.music ? "Playing" : "Play"}</button><button class="btn sm" id="muShuf">Shuffle</button><button class="btn sm" id="muNext" ${App.sound.music ? "" : "disabled"}>Next</button><button class="btn sm ghost" id="muStop" ${App.sound.music ? "" : "disabled"}>Stop</button><input type="range" id="muVol" min="0" max="1" step=".01" value="${ls.get("music.vol", .5)}" title="Music volume"></div>
        <ul class="mu-list">${tracks.map(t => `<li data-id="${t.id}"><span>${esc(t.name)}</span><button class="rm" title="Remove">${icon("x")}</button></li>`).join("")}</ul></div>` : `<p class="lv-note" style="margin-top:0">Add music files below and pick "Music track".</p>`; })()}
      <div class="eyebrow" style="margin:16px 0 8px">Weather on stream</div><div id="lvFx"></div>
      <label class="toggle" style="margin-top:12px"><input type="checkbox" id="lvAll" ${ls.get("live.allSounds", false) ? "checked" : ""}> Show built-in sounds from every genre</label>
      <div class="drop" id="lvDrop">${icon("plus")} <span><b>Add your own sounds</b><br>Drop mp3/ogg/wav files here or click to pick</span></div>`;
    $$("[data-out]", box).forEach(b => b.onclick = () => { S.setOut(b.dataset.out); renderSound(); });
    $("#lvMaster", box).oninput = e => S.setMaster(+e.target.value);
    $("#lvStop", box).onclick = () => { S.send({ op: "stopAll", fade: 1 }); renderSound(); };
    $$(".amb", box).forEach(d => {
      const x = sounds("ambience").find(y => y.id === d.dataset.id);
      $(".amb-b", d).onclick = () => {
        if (S.active.has(x.id)) S.send({ op: "stop", key: x.id, fade: 1.5 });
        else S.send({ op: "play", key: x.id, sound: srcOf(x), loop: true, vol: vol(x.id), fade: 1.5 });
        renderSound();
      };
      $("input", d).oninput = e => { ls.set("vol." + x.id, +e.target.value); if (S.active.has(x.id)) S.send({ op: "vol", key: x.id, vol: +e.target.value }); };
      $(".rm", d)?.addEventListener("click", () => removeSound(x));
    });
    $$(".sfx", box).forEach(b => b.onclick = e => {
      const x = sounds("sfx").find(y => y.id === b.dataset.id);
      if (e.target.closest(".rm")) return removeSound(x);
      S.send({ op: "play", key: x.id + ":" + uid(), sound: srcOf(x), loop: false, vol: .9 });
      b.classList.remove("hit"); void b.offsetWidth; b.classList.add("hit");
    });
    const tracks = C().sounds.filter(x => x.cat === "music");
    const startMusic = shuffle => { S.send({ op: "music", tracks: tracks.map(t => `codexmedia://media/${encodeURIComponent(t.file)}`), shuffle, vol: ls.get("music.vol", .5) }); S.music = true; renderSound(); };
    $("#muPlay", box)?.addEventListener("click", () => startMusic(false));
    $("#muShuf", box)?.addEventListener("click", () => startMusic(true));
    $("#muNext", box)?.addEventListener("click", () => S.send({ op: "musicNext" }));
    $("#muStop", box)?.addEventListener("click", () => { S.send({ op: "musicStop" }); S.music = false; renderSound(); });
    $("#muVol", box)?.addEventListener("input", e => { ls.set("music.vol", +e.target.value); S.send({ op: "musicVol", vol: +e.target.value }); });
    $$(".mu-list li", box).forEach(li => $(".rm", li).onclick = () => removeSound(C().sounds.find(x => x.id === li.dataset.id)));
    $("#lvScSave", box).onclick = () => {
      if (!S.active.size) return toast("Start some ambience loops first, then save the mix");
      App.modal(`<h2>Save soundscape</h2><label class="f"><span>Name</span><input type="text" id="scN" placeholder="Tavern at night"></label><label class="toggle"><input type="checkbox" id="scF" checked> Include the current weather on stream</label><div class="foot"><button class="btn primary" data-ok>Save</button></div>`, (m, close) => {
        const ok = () => { (C().soundscapes ||= []).push({ id: uid(), name: $("#scN", m).value.trim() || "Soundscape", loops: [...S.active.values()].map(c => ({ key: c.key, sound: c.sound, vol: c.vol })), fx: $("#scF", m).checked ? { ...App.fx.state.on } : null }); save(); close(); renderSound(); };
        $("[data-ok]", m).onclick = ok; $("#scN", m).onkeydown = e => { if (e.key === "Enter") ok(); };
      });
    };
    $$(".scape", box).forEach(ch => ch.onclick = e => {
      const sc = C().soundscapes.find(x => x.id === ch.dataset.sc);
      if (e.target.closest("[data-scdel]")) { C().soundscapes = C().soundscapes.filter(x => x !== sc); save(); renderSound(); return; }
      const keep = new Set(sc.loops.map(l => l.key));
      for (const k of [...S.active.keys()]) if (!keep.has(k)) S.send({ op: "stop", key: k, fade: 2 });
      for (const l of sc.loops) { if (S.active.has(l.key)) S.send({ op: "vol", key: l.key, vol: l.vol }); else S.send({ op: "play", key: l.key, sound: l.sound, loop: true, vol: l.vol, fade: 2 }); ls.set("vol." + l.key, l.vol); }
      if (sc.fx) App.fx.setAll(sc.fx);
      renderSound(); toast(sc.name);
    });
    App.fx.controls($("#lvFx", box));
    $("#lvAll", box).onchange = e => { ls.set("live.allSounds", e.target.checked); renderSound(); };
    const drop = $("#lvDrop", box);
    drop.onclick = () => importSounds();
    drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
    drop.ondragleave = () => drop.classList.remove("over");
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); const paths = [...e.dataTransfer.files].map(f => window.codex?.pathForFile(f)).filter(Boolean); if (paths.length) importSounds(paths); };
  }
  async function importSounds(paths) {
    if (!window.codex) return toast("Adding sound files works in the desktop app");
    const got = await window.codex.importMedia(paths); if (!got.length) return;
    App.modal(`<h2>New sounds</h2><p style="margin:0;color:var(--dim)">Loops play until you stop them. Effects play once. Music tracks play one after another.</p>
      <div style="display:flex;flex-direction:column;gap:8px">${got.map((g, i) => `<div class="row"><input type="text" data-i="${i}" value="${esc(g.name)}" style="flex:1"><select data-c="${i}" style="width:150px"><option value="ambience">Ambience loop</option><option value="sfx">One-shot effect</option><option value="music">Music track</option></select></div>`).join("")}</div>
      <div class="foot"><button class="btn primary" data-ok>Add ${got.length} sound${got.length > 1 ? "s" : ""}</button></div>`, (m, close) => {
      $("[data-ok]", m).onclick = () => { got.forEach((g, i) => C().sounds.push({ id: "u:" + uid(), name: $(`[data-i="${i}"]`, m).value.trim() || g.name, file: g.file, cat: $(`[data-c="${i}"]`, m).value })); save(); close(); renderSound(); };
    });
  }
  function removeSound(x) {
    App.confirm(`Remove "${x.name}"?`, "The file is deleted from the app's sound folder.", "Remove", async () => {
      App.sound.send({ op: "stop", key: x.id }); C().sounds = C().sounds.filter(y => y.id !== x.id); save(); await window.codex?.removeMedia(x.file); renderSound();
    });
  }

  // ---------- handouts ----------
  function renderHand() {
    const box = $("#lvHand", el), H = C().handouts, s = live() || nextPlanned(C(), false), ready = s?.plan?.handouts || [];
    const onAir = App.onAir;
    const sorted = [...H].sort((a, b) => (ready.includes(b.id) ? 1 : 0) - (ready.includes(a.id) ? 1 : 0));
    box.innerHTML = `<div class="sec-h"><h3>Handouts</h3><div class="line"></div></div>
      <div class="on-air ${onAir ? "live" : ""}">${onAir ? `<div class="eyebrow" style="color:var(--ember)">On stream now</div><b>${esc(onAir.title || "Handout")}</b><button class="btn sm" id="lvHide">${icon("x")} Take it down</button>` : `<span class="eyebrow">Nothing on stream</span><span style="color:var(--faint);font-size:13.5px">Click a handout to put it in front of your players.</span>`}</div>
      <div class="row" style="margin:12px 0"><button class="btn sm" id="hImg">${icon("image")} Image</button><button class="btn sm" id="hTxt">${icon("codex")} Letter or note</button><button class="btn sm primary" id="hMake" title="Letters, wanted posters, newspapers, decrees, data pads, chat logs">${icon("plus")} Make one</button><input type="file" id="hFile" accept="image/*" multiple hidden></div>
      <div class="hand-grid">${sorted.map(hd => `<div class="hand ${onAir?.id === hd.id ? "air" : ""}" data-id="${hd.id}">
        <button class="hand-face ${hd.type === "image" ? "img" : "txt s-" + (hd.style || "letter")}" ${hd.type === "image" ? `style="background-image:url(${hd.src})"` : ""}>${hd.type === "image" ? "" : `<span>${esc((hd.text || "").slice(0, 90))}</span>`}</button>
        <div class="hand-meta"><b>${esc(hd.title || "Untitled")}</b>${ready.includes(hd.id) ? `<span class="eyebrow" style="color:var(--ember)">Tonight</span>` : ""}<span style="flex:1"></span><button class="tb" data-post title="Post to Discord">${icon("discord")}</button><button class="tb" data-wh title="Whisper to one player">${icon("lock")}</button><button class="tb" data-ed title="Edit">${icon("type")}</button><button class="tb" data-del title="Delete">${icon("trash")}</button></div></div>`).join("")
        || `<p style="color:var(--faint);grid-column:1/-1">Maps, portraits, letters, wanted posters. Show them full-size on the stream window.</p>`}</div>`;
    $("#lvHide", box)?.addEventListener("click", () => { App.hideHandout(); });
    $("#hImg", box).onclick = () => $("#hFile", box).click();
    $("#hFile", box).onchange = async e => { for (const f of e.target.files) C().handouts.push({ id: uid(), title: f.name.replace(/\.[^.]+$/, ""), type: "image", src: await shrinkImage(f, 1800) }); save(); renderHand(); e.target.value = ""; };
    $("#hTxt", box).onclick = () => editText();
    $("#hMake", box).onclick = () => import("./handoutmaker.js").then(x => x.handoutMaker(App, { onDone: renderHand }));
    $$(".hand", box).forEach(d => {
      const hd = H.find(x => x.id === d.dataset.id);
      $(".hand-face", d).onclick = () => App.onAir?.id === hd.id ? App.hideHandout() : App.showHandout(hd);
      $("[data-wh]", d).onclick = () => App.whisperPicker(hd.type === "image" ? { title: hd.title, image: hd.src } : { title: hd.title, text: hd.text });
      $("[data-post]", d).onclick = () => App.discord.postHandout(hd).then(ok => ok && toast("Posted to Discord"));
      $("[data-ed]", d).onclick = () => hd.type === "image" ? rename(hd) : editText(hd);
      $("[data-del]", d).onclick = () => App.confirm(`Delete "${hd.title}"?`, "The handout is removed from the library.", "Delete", () => { C().handouts = H.filter(x => x !== hd); save(); renderHand(); });
    });
  }
  function rename(hd) {
    App.modal(`<h2>Handout</h2><label class="f"><span>Title</span><input type="text" id="hT" value="${esc(hd.title)}"></label><div class="foot"><button class="btn primary" data-ok>Save</button></div>`, (m, close) => { $("[data-ok]", m).onclick = () => { hd.title = $("#hT", m).value; save(); close(); renderHand(); }; });
  }
  function editText(hd) {
    const isNew = !hd; hd ||= { id: uid(), type: "text", style: "letter", title: "", text: "" };
    App.modal(`<h2>${isNew ? "New" : "Edit"} handout</h2>
      <label class="f"><span>Title (shown to players)</span><input type="text" id="hT" value="${esc(hd.title)}" placeholder="A letter sealed with black wax"></label>
      <label class="f"><span>Text</span><textarea id="hX" rows="8" placeholder="They know about the maps…">${esc(hd.text)}</textarea></label>
      <label class="f"><span>Look</span><select id="hS"><option value="letter">Handwritten letter</option><option value="parchment">Old parchment</option><option value="card">Index card</option><option value="plain">Plain title card</option></select></label>
      <div class="foot"><button class="btn ghost" data-x>Cancel</button><button class="btn primary" data-ok>${isNew ? "Add handout" : "Save"}</button></div>`, (m, close) => {
      $("#hS", m).value = hd.style || "letter";
      $("[data-x]", m).onclick = close;
      $("[data-ok]", m).onclick = () => { hd.title = $("#hT", m).value; hd.text = $("#hX", m).value; hd.style = $("#hS", m).value; if (isNew) C().handouts.push(hd); save(); close(); renderHand(); if (App.onAir?.id === hd.id) App.showHandout(hd); };
    });
  }

  // ---------- tonight ----------
  function renderPlan() {
    const box = $("#lvPlan", el), s = live() || nextPlanned(C(), false), c = C();
    const tables = c.tables.slice(0, 40);
    const tableBlock = `<section><div class="sec-h"><h3>Quick tables</h3><div class="line"></div></div>
      <div class="chips">${tables.map(t => `<button class="chip" data-tb="${t.id}">${esc(t.name)}</button>`).join("")}</div>
      <ul class="lv-tout">${st.tableOut.map(r => `<li><span class="eyebrow">${esc(r.name)} · ${r.num}</span>${r.html}</li>`).join("")}</ul></section>`;
    const imp = st.improv;
    const improv = `<section><div class="sec-h"><h3>Improvise</h3><div class="line"></div></div>
      <div class="row" style="gap:6px"><button class="btn sm" data-imp="npc">${icon("social")} NPC</button><button class="btn sm" data-imp="place">${icon("explore")} Place</button><button class="btn sm" data-imp="loot">${icon("save")} Loot</button><button class="btn sm" data-imp="name">${icon("type")} 5 names</button></div>
      ${imp ? `<div class="imp-card">${imp.names ? `<div class="chips">${imp.names.map(n => `<button class="chip" data-copy="${esc(n)}">${esc(n)}</button>`).join("")}</div>` : `<b>${esc(imp.title)}</b><span class="eyebrow">${esc(imp.sub)}</span><ul>${imp.lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>
        <div class="row" style="gap:6px"><button class="btn sm" data-imp-intro>${icon("stream")} Introduce</button><button class="btn sm ghost" data-imp-save>${icon("save")} Save to Codex</button>${st.improv.kind === "loot" ? `<button class="btn sm ghost" data-imp-stash>${icon("loot")} To stash</button>` : ""}<button class="btn sm ghost" data-imp-log>${icon("chronicle")} Log it</button></div>`}</div>` : ""}</section>`;
    const quick = `<section><div class="sec-h"><h3>Quick rolls</h3><div class="line"></div></div><div class="row" style="gap:6px">
      <label class="toggle" title="Secret rolls stay on your desk"><input type="checkbox" id="lvSec" ${st.secret ? "checked" : ""}> Secret</label>
      ${["1d20", "2d20kh1", "1d6", "1d100"].map(e => `<button class="btn sm" data-qr="${e}">${e === "2d20kh1" ? "Adv" : e}</button>`).join("")}</div></section>`;
    if (!s) { box.innerHTML = improv + quick + tableBlock + `<p style="color:var(--faint)">Plan a session in Prep and tonight's scenes, secrets and monsters appear here.</p>`; bindPlan(box, null); return; }
    const P = s.plan ||= { start: "", scenes: [], secrets: [], cast: [], encounters: [], treasure: [], handouts: [] };
    const check = (arr, key, cls = "") => `<ul class="checks lv-checks ${cls}">${arr.filter(t => t.text).map(t => `<li class="${t.done ? "done" : ""}" data-k="${key}" data-id="${t.id}"><input type="checkbox" ${t.done ? "checked" : ""}><span>${esc(t.text)}</span><span></span></li>`).join("") || `<li style="display:block;color:var(--faint)">None planned.</li>`}</ul>`;
    box.innerHTML = `${P.start ? `<section class="lv-start"><span class="eyebrow">Strong start</span><p>${esc(P.start)}</p></section>` : ""}
      <section><div class="sec-h"><h3>Secrets & clues</h3><div class="line"></div><span class="eyebrow">${P.secrets.filter(x => x.done).length}/${P.secrets.length} revealed</span></div>${check(P.secrets, "secrets", "secrets")}</section>
      <section><div class="sec-h"><h3>Encounters</h3><div class="line"></div><button class="btn sm" id="lvFight">${icon("combat")} Open combat</button></div>
        ${P.encounters.map(e => { const x = c.bestiary.find(b => b.id === e.creature); if (!x) return ""; const max = parseInt(x.stats?.HP || x.hp) || 0;
          return `<div class="lv-enc" data-e="${e.id}"><div class="row" style="justify-content:space-between"><b class="lv-mname" data-open="${x.id}">${esc(x.name)}</b><span class="eyebrow">${esc(x.stats?.Defense ? "Def " + x.stats.Defense : x.kind || "")}</span></div>
            <div class="hp-row">${e.hp.map((v, i) => `<div class="hp ${v <= 0 ? "down" : v <= max / 2 ? "hurt" : ""}" data-i="${i}"><span>#${i + 1}</span><button data-d="-1">−</button><input type="number" value="${v}" aria-label="HP"><button data-d="1">+</button></div>`).join("")}</div>
            <div class="row" style="gap:6px">${(x.abilities || []).filter(a => a.roll).map(a => `<button class="rollchip sm" data-roll="${x.id}|${a.id}">${esc(a.name)} <span>${esc(a.roll)}</span></button>`).join("")}</div></div>`; }).join("") || `<p style="color:var(--faint);margin:0">No encounters planned.</p>`}
      </section>
      <section><div class="sec-h"><h3>Scenes</h3><div class="line"></div></div>${check(P.scenes, "scenes")}</section>
      ${P.cast.length ? `<section><div class="sec-h"><h3>Cast</h3><div class="line"></div></div><div class="chips">${P.cast.map(id => { const n = c.notes.find(x => x.id === id); return n ? `<span class="chip cast-chip"><button class="lnk" data-note="${id}">${esc(n.title)}</button><button class="lnk" data-intro="${id}" title="Introduce on stream">${icon("social")}</button></span>` : ""; }).join("")}</div></section>` : ""}
      <section><div class="sec-h"><h3>Treasure</h3><div class="line"></div></div>${check(P.treasure, "treasure")}</section>
      ${improv}${quick}${tableBlock}`;
    bindPlan(box, s);
  }
  function bindPlan(box, s) {
    const c = C();
    $$("[data-imp]", box).forEach(b => b.onclick = () => {
      const k = b.dataset.imp;
      if (k === "name") { st.improv = { names: Array.from({ length: 5 }, () => makeName(Object.keys(NAMES)[Math.floor(Math.random() * Object.keys(NAMES).length)])) }; renderPlan(); return; }
      const g = GEN[k], o = {}; for (const x in g.opts) o[x] = "any";
      const ctx = g.init(o), f = {}; for (const [kk, [, fn]] of Object.entries(g.fields)) f[kk] = fn(ctx, f);
      const show = Object.entries(g.fields).filter(([kk]) => !(g.hidden || []).includes(kk)).slice(0, 4).map(([kk, [lab]]) => `${lab}: ${f[kk]}`);
      st.improv = { kind: k, title: g.title(ctx), sub: g.sub(ctx, f), lines: show, cat: g.noteCat, card: { kind: k, title: g.title(ctx), ctx, fields: f } }; st.improv.card.title = st.improv.title; renderPlan();
    });
    $$("[data-copy]", box).forEach(b => b.onclick = () => navigator.clipboard.writeText(b.dataset.copy).then(() => toast(`Copied ${b.dataset.copy}`), () => {}));
    $("[data-imp-intro]", box)?.addEventListener("click", () => App.lowerThird({ name: st.improv.title, sub: st.improv.sub, color: st.improv.kind === "npc" ? "#f39da8" : "#b8d8a8" }));
    $("[data-imp-save]", box)?.addEventListener("click", () => { c.notes.unshift({ id: uid(), title: st.improv.title, cat: st.improv.cat, tags: "improvised", body: st.improv.sub + "\n\n" + st.improv.lines.map(l => l.replace(/^([^:]+): /, "**$1:** ")).join("\n"), updated: Date.now() }); save(); toast(`Saved to Codex · ${st.improv.cat}`); });
    $("[data-imp-stash]", box)?.addEventListener("click", () => import("./stash.js").then(({ addToStash, fromForgeCard }) => { const got = addToStash(fromForgeCard(st.improv.card, GEN.loot)); toast(`To the stash: ${got.join(", ")}`); App.refreshAll(); }));
    $("[data-imp-log]", box)?.addEventListener("click", () => App.logBeat(st.improv.kind === "npc" ? "social" : st.improv.kind === "loot" ? "loot" : "explore", `${st.improv.title} (${st.improv.sub})`));
    $("#lvSec", box).onchange = e => { st.secret = e.target.checked; ls.set("live.secret", st.secret); };
    $$("[data-qr]", box).forEach(b => b.onclick = () => App.roll(b.dataset.qr, b.textContent, { secret: st.secret }));
    $$("[data-tb]", box).forEach(b => b.onclick = () => { const r = rollTable(c, b.dataset.tb); st.tableOut.unshift({ name: r.table?.name, num: r.num, html: r.html, text: r.text }); st.tableOut.length = Math.min(st.tableOut.length, 4); renderPlan(); });
    if (!s) return;
    const P = s.plan;
    $$("li[data-k]", box).forEach(li => $("input", li).onchange = e => { const t = P[li.dataset.k].find(x => x.id === li.dataset.id); t.done = e.target.checked; li.classList.toggle("done", t.done); save();
      if (t.done && li.dataset.k === "secrets" && live()) App.logBeat("discovery", t.text, true);
      if (li.dataset.k === "secrets") renderPlan(); });
    $$(".lv-enc", box).forEach(d => {
      const e = P.encounters.find(x => x.id === d.dataset.e);
      $$(".hp", d).forEach(hp => {
        const i = +hp.dataset.i, inp = $("input", hp);
        const set = v => { e.hp[i] = v; save(); renderPlan(); };
        $$("[data-d]", hp).forEach(b => b.onclick = ev => set(e.hp[i] + +b.dataset.d * (ev.shiftKey ? 5 : 1)));
        inp.onchange = () => set(Number(inp.value) || 0);
        inp.onkeydown = ev => { if (ev.key === "Enter") inp.blur(); };
      });
    });
    $$("[data-roll]", box).forEach(b => b.onclick = () => { const [xid, aid] = b.dataset.roll.split("|"); const x = c.bestiary.find(y => y.id === xid); const a = x.abilities.find(y => y.id === aid); App.roll(a.roll, `${x.name}: ${a.name}`, { secret: st.secret }); });
    $("#lvFight", box)?.addEventListener("click", () => App.go("combat"));
    $$("[data-open]", box).forEach(b => b.onclick = () => App.go("bestiary", { creature: b.dataset.open }));
    $$("[data-note]", box).forEach(b => b.onclick = () => App.go("codex", { note: b.dataset.note }));
    $$("[data-intro]", box).forEach(b => b.onclick = () => { const n = c.notes.find(x => x.id === b.dataset.intro); App.lowerThird({ name: n.title, sub: n.tags || n.cat, color: n.cat === "NPCs" ? "#f39da8" : "#b8d8a8", portrait: n.img }); });
  }
  function renderAll() { renderHead(); renderSound(); renderHand(); renderPlan(); }
  App.sound.onChange(() => { if (!el.closest("[hidden]")) renderSound(); });
  App.onAirChange(() => renderHand());
  renderAll();
  return { show() { renderAll(); }, refresh() { renderAll(); }, destroy() { clearInterval(timer); } };
}
