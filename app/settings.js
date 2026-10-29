// Settings: one window for the campaign, rules, look, accessibility, connections, data and legal.
// app.js hands in what it owns (applyGenre, backups, dialogs) through ctx.
import { $, $$, esc, icon, toast, uid, ls } from "./util.js";
import { S, C, save, flush } from "./store.js";
import { SYSTEMS, systemById, applySystem } from "./systems.js";
import { DEFAULT_RULES } from "./roll.js";
import { LANGS } from "./i18n.js";
import { THEMES as DICE, FELTS } from "./dice3d.js";
import { md } from "./codex.js";

// app themes: palette preview [background, sidebar, surface, accent, text]
export const LOOKS = [
  { id: "lantern", name: "Lantern", mood: "Warm, blackletter", c: ["#1a1517", "#201a1c", "#2a2124", "#ff7a3d", "#f3ebe1"] },
  { id: "neon", name: "Neon", mood: "Cyberpunk", c: ["#0d0b12", "#131019", "#1b1624", "#ff2e88", "#ece8f5"] },
  { id: "void", name: "Void", mood: "Sci-fi hull", c: ["#0e141a", "#121b22", "#18232c", "#39d0c0", "#e5eef2"] },
  { id: "tavern", name: "Tavern", mood: "Firelit browns", c: ["#1d2021", "#232625", "#282828", "#fe8019", "#ebdbb2"] },
  { id: "grove", name: "Grove", mood: "Forest and gold", c: ["#141a15", "#19211a", "#202a21", "#d9b44a", "#ecf0e4"] },
  { id: "moonlit", name: "Moonlit", mood: "Night blue, silver", c: ["#0f1424", "#131a2d", "#192238", "#b9c6ff", "#e8ecf8"] },
  { id: "frost", name: "Frost", mood: "Cool northern greys", c: ["#242933", "#2b303b", "#313744", "#88c0d0", "#eceff4"] },
  { id: "nightshade", name: "Nightshade", mood: "Gothic purple", c: ["#1b1923", "#211e2b", "#282a36", "#ff79c6", "#f8f8f2"] },
  { id: "rosewood", name: "Rosewood", mood: "Dark rose", c: ["#1c1216", "#23171c", "#2c1d23", "#f27aa0", "#f7e9ee"] },
  { id: "abyss", name: "Abyss", mood: "True black, for OLED", c: ["#000000", "#050505", "#0d0d0f", "#2ee6c5", "#f2f2f2"] },
  { id: "parchment", name: "Parchment", mood: "Light · old paper", light: true, c: ["#f4ecdc", "#efe5d1", "#fbf6ea", "#b4432a", "#2b2018"] },
  { id: "daylight", name: "Daylight", mood: "Light · clean", light: true, c: ["#f5f6f8", "#eceef2", "#ffffff", "#3b6ef5", "#1d2330"] },
  { id: "solar", name: "Solar", mood: "Light · soft cream", light: true, c: ["#fdf6e3", "#f5eed8", "#fffbef", "#cb4b16", "#073642"] },
  { id: "sakura", name: "Sakura", mood: "Light · blossom", light: true, c: ["#fbf1f3", "#f6e6ea", "#fffafb", "#d6457a", "#3a2429"] },
  { id: "contrast", name: "High contrast", mood: "Black, white, yellow", c: ["#000000", "#000000", "#0a0a0a", "#ffd400", "#ffffff"] },
];
const LOOK_OF = { fantasy: "lantern", cyberpunk: "neon", scifi: "void" };
export const lookFor = c => !c.look || c.look === "auto" ? LOOK_OF[c.genre || "fantasy"] : c.look;

// accessibility switches live in the app's preferences (all campaigns)
const A11Y = [
  ["motion", "Reduce motion", "Turns off slides, fades and shakes in the app. Dice still roll."],
  ["cb", "Colour-blind safe colours", "Success, failure and criticals use blue, orange and yellow instead of green and red."],
  ["font", "Readable fonts", "Plain sans-serif headings instead of blackletter or display fonts, with a bit more line spacing."],
  ["focus", "Strong focus outline", "A thick ring around whatever the keyboard is on."],
  ["under", "Underline links", "Links and [[wiki links]] are underlined, not only coloured."],
];
export function applyPrefs() {
  const a = S.data.prefs.a11y || {}, r = document.documentElement;
  for (const [k] of A11Y) r.classList.toggle("a11y-" + k, !!a[k]);
}

const TABS = [["general", "General", "gear"], ["rules", "Game & rules", "dice"], ["look", "Appearance", "image"], ["a11y", "Accessibility", "fit"], ["connect", "Connections", "discord"], ["data", "Backups & data", "save"], ["legal", "Legal & credits", "book"]];

export function openSettings(App, ctx, tab = "general") {
  let dirty = false; // rules changed: views rebuild when the window closes
  App.modal(`<nav class="set-nav"><h2>Settings</h2>${TABS.map(([k, n, ic]) => `<button data-tab="${k}">${icon(ic)} ${n}</button>`).join("")}<div class="grow"></div><button data-x>${icon("x")} Close</button></nav><div class="set-body" id="setBody"></div>`, (m, close) => {
    m.classList.add("settings");
    const body = $("#setBody", m);
    const done = () => { close(); if (dirty) ctx.remount(); };
    $("[data-x]", m).onclick = done;
    const go = k => { tab = k; $$("[data-tab]", m).forEach(b => b.classList.toggle("on", b.dataset.tab === k)); body.scrollTop = 0; PANES[k](body); };
    $$("[data-tab]", m).forEach(b => b.onclick = () => go(b.dataset.tab));

    const PANES = {
      general(el) {
        const c = C();
        el.innerHTML = `<h3>General</h3>
          <div class="grp"><label class="f"><span>Campaign name</span><input type="text" id="sName" value="${esc(c.name)}"></label>
          <label class="f"><span>Tagline</span><input type="text" id="sTag" value="${esc(c.tagline || "")}" placeholder="Grim frontier fantasy · Fridays on Discord"></label></div>
          <div class="grp"><div class="set-row"><div><b>Interface size</b><small>Also ${esc(ctx.keys("Ctrl + / −"))}. For every campaign.</small></div><div class="row" style="gap:8px;align-items:center"><input type="range" id="sZoom" min="70" max="150" step="10" value="${Math.round((S.data.prefs.zoom || 1) * 100)}"><b id="sZoomV" class="mono" style="width:48px">${Math.round((S.data.prefs.zoom || 1) * 100)}%</b></div></div></div>
          <div class="grp"><div class="set-row"><div><b>Help</b><small>Shortcuts, the guide and what changed lately.</small></div><div class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sm" id="sKeys">${icon("type")} Shortcuts (F1)</button><button class="btn sm" id="sNews">${icon("star")} What's new</button><button class="btn sm" id="sGuide">${icon("book")} User guide</button>${window.codex ? `<button class="btn sm" id="sUpd">${icon("reroll")} Check for updates</button>` : ""}</div></div>
          <div class="set-row"><div><b>Setup checklist</b><small>The first-launch steps, in case you hid them.</small></div><button class="btn sm" id="sCheck">${icon("check")} Show it</button></div></div>`;
        $("#sName", el).oninput = e => { c.name = e.target.value.trim() || "Untitled campaign"; save(); ctx.renderCampName(); };
        $("#sTag", el).oninput = e => { c.tagline = e.target.value.trim(); save(); };
        $("#sZoom", el).oninput = e => { const z = +e.target.value / 100; $("#sZoomV", el).textContent = e.target.value + "%"; ctx.setZoom(z); };
        $("#sKeys", el).onclick = () => { done(); ctx.helpSheet(); };
        $("#sNews", el).onclick = () => { done(); ctx.showNews(); };
        $("#sGuide", el).onclick = () => window.open("https://github.com/lostmaguss/gamemasters-codex#readme");
        $("#sUpd", el)?.addEventListener("click", ctx.checkUpdates);
        $("#sCheck", el).onclick = () => { S.data.prefs.checklistHidden = false; save(); done(); App.checklist?.(true); };
      },
      rules(el) {
        const c = C(), R = { ...DEFAULT_RULES, ...(c.rules || {}) }, cur = systemById(c.system);
        el.innerHTML = `<h3>Game & rules</h3>
          <div class="grp"><label class="f"><span>Game system</span><select id="rgS"><option value="">${cur ? `${esc(cur.name)} (current)` : "Keep what I have"}</option>${SYSTEMS.filter(s => s.id !== c.system).map(s => `<option value="${s.id}">${esc(s.name)}: ${esc(s.blurb)}</option>`).join("")}</select></label>
          <p class="md-help" style="margin:-6px 0 0">Switching resets the dice rules, the party sheet layout and the bestiary's stat block, and adds the system's quick rolls. Characters keep their numbers, and Ctrl+Z undoes it.</p></div>
          <div class="grp"><div class="two"><label class="f"><span>Genre</span><select id="rgG"><option value="fantasy">Fantasy</option><option value="scifi">Sci-fi</option><option value="cyberpunk">Cyberpunk</option></select></label>
          <label class="f"><span>Players' language</span><select id="rgLang">${Object.entries(LANGS).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></label></div>
          <p class="md-help" style="margin:-6px 0 0">Genre sets what the Forge generates, the built-in sounds and starter tables. Players' language is for their phones, the stream window and Discord.</p></div>
          <div class="grp"><div class="two"><label class="f"><span>Critical die</span><select id="rgD"><option value="20">d20</option><option value="100">d100 (percentile)</option><option value="10">d10</option><option value="12">d12</option><option value="6">d6</option><option value="any">Any single die</option></select></label>
          <label class="f"><span>What's good</span><select id="rgM"><option value="high">High rolls (max = critical, 1 = fumble)</option><option value="low">Low rolls (1 = critical, max = fumble)</option><option value="none">No criticals</option></select></label></div>
          <label class="f"><span>Initiative order</span><select id="rgI"><option value="high">Highest goes first</option><option value="low">Lowest goes first</option></select></label>
          <p class="md-help" style="margin:0">Roll-under: <code>1d100&lt;=45</code> shows Success or Failure. Dice pools: <code>8d6&gt;=5</code> counts hits. Fate: <code>4dF+2</code>.</p></div>`;
        $("#rgG", el).value = c.genre || "fantasy"; $("#rgLang", el).value = c.playerLang || "en"; $("#rgD", el).value = String(R.critDie); $("#rgM", el).value = R.critMode; $("#rgI", el).value = R.initHigh ? "high" : "low";
        const saveRules = () => { const d = $("#rgD", el).value; c.rules = { critDie: d === "any" ? "any" : Number(d), critMode: $("#rgM", el).value, initHigh: $("#rgI", el).value === "high" }; save(); ls.set("rules", c.rules); App.botConfig?.(); dirty = true; toast("Rules saved"); };
        ["#rgD", "#rgM", "#rgI"].forEach(id => $(id, el).onchange = saveRules);
        $("#rgLang", el).onchange = e => { c.playerLang = e.target.value; save(); ctx.applyGenre(c); dirty = true; toast("Players' language saved"); };
        $("#rgG", el).onchange = e => { c.genre = e.target.value; save(); App.genreChanged?.(c); dirty = true; PANES.rules(el); };
        $("#rgS", el).onchange = e => {
          const s = systemById(e.target.value); if (!s) return;
          applySystem(c, s.id, uid); const g = s.genre !== (c.genre || "fantasy"); c.genre = s.genre; save(); ls.set("rules", c.rules); App.botConfig?.();
          if (g) App.genreChanged?.(c, true); else ctx.applyGenre(c);
          dirty = true; toast(`Switched to ${s.name}. Ctrl+Z undoes it`); PANES.rules(el);
        };
      },
      look(el) {
        const c = C(), on = c.look || "auto";
        const card = t => `<button class="theme-card ${on === t.id ? "on" : ""}" data-look="${t.id}" title="${esc(t.mood)}"><div class="tp" style="background:${t.c[0]}"><i class="side" style="background:${t.c[1]}"></i><div class="main"><i class="bar" style="background:${t.c[2]};width:80%"></i><i class="bar" style="background:${t.c[2]};width:55%"></i><i class="btnp" style="background:${t.c[3]}"></i><i class="bar" style="background:${t.c[4]};opacity:.55;width:40%;height:5px"></i></div></div><div class="tn">${esc(t.name)}<small>${esc(t.mood)}</small></div></button>`;
        el.innerHTML = `<h3>Appearance</h3>
          <div class="grp"><div class="set-row"><div><b>Theme</b><small>For this campaign. "Match the genre" picks Lantern, Neon or Void by itself.</small></div><button class="btn sm ${on === "auto" ? "primary" : ""}" data-look="auto">${icon("reroll")} Match the genre</button></div>
          <div class="theme-grid">${LOOKS.map(card).join("")}</div></div>
          <div class="grp"><div class="two"><label class="f"><span>Dice</span><select id="sDice">${Object.entries(DICE).map(([k, t]) => `<option value="${k}">${esc(t.label)}</option>`).join("")}</select></label>
          <label class="f"><span>Dice tray felt</span><select id="sFelt">${Object.entries(FELTS).map(([k, t]) => `<option value="${k}">${esc(t.label)}</option>`).join("")}</select></label></div>
          <p class="md-help" style="margin:-6px 0 0">The stream window uses these too.</p></div>`;
        $$("[data-look]", el).forEach(b => b.onclick = () => { c.look = b.dataset.look; save(); ctx.applyGenre(c); PANES.look(el); });
        $("#sDice", el).value = ls.get("dice.theme", "ember"); $("#sFelt", el).value = ls.get("dice.felt", "oxblood");
        $("#sDice", el).onchange = e => { ls.set("dice.theme", e.target.value); dirty = true; };
        $("#sFelt", el).onchange = e => { ls.set("dice.felt", e.target.value); dirty = true; };
      },
      a11y(el) {
        const a = (S.data.prefs.a11y ||= {});
        el.innerHTML = `<h3>Accessibility</h3><div class="grp">${A11Y.map(([k, n, d]) => `<label class="set-row" style="cursor:pointer"><div><b>${esc(n)}</b><small>${esc(d)}</small></div><input type="checkbox" data-a="${k}" ${a[k] ? "checked" : ""} style="width:20px;height:20px"></label>`).join("")}</div>
          <div class="grp"><div class="set-row"><div><b>High contrast theme</b><small>Black, white and yellow, with outlined controls.</small></div><button class="btn sm" id="sHC">${icon("image")} Use it for this campaign</button></div>
          <div class="set-row"><div><b>Interface size</b><small>In General, or ${esc(ctx.keys("Ctrl + / −"))} anywhere.</small></div><button class="btn sm" id="sBig">${icon("fit")} Make it bigger</button></div></div>
          <p class="md-help" style="margin:0">These apply to every campaign on this computer.</p>`;
        $$("[data-a]", el).forEach(x => x.onchange = () => { a[x.dataset.a] = x.checked; save(); applyPrefs(); });
        $("#sHC", el).onclick = () => { C().look = "contrast"; save(); ctx.applyGenre(C()); toast("High contrast on"); };
        $("#sBig", el).onclick = () => ctx.setZoom(Math.min(1.5, (S.data.prefs.zoom || 1) + .1));
      },
      connect(el) {
        const dc = ctx.discordConnected();
        el.innerHTML = `<h3>Connections</h3><div class="grp">
          <div class="set-row"><div><b>Discord</b><small>${dc ? "Connected. Rolls, recaps and handouts can post to your server." : "Post rolls, recaps and handouts, and let players roll with the bot."}</small></div><button class="btn sm ${dc ? "" : "primary"}" id="sDc">${icon("discord")} ${dc ? "Discord settings" : "Connect Discord"}</button></div>
          <div class="set-row"><div><b>Phones & OBS</b><small>The table link players scan, and transparent overlays for OBS.</small></div><button class="btn sm" id="sTbl">${icon("stream")} Table link</button></div>
          <div class="set-row"><div><b>Phone remote for you</b><small>Run the table from your own phone: next turn, rolls, handouts, sounds.</small></div><button class="btn sm" id="sRem">${icon("dice")} GM remote</button></div>
          <div class="set-row"><div><b>Print</b><small>Session sheets, NPC cards and handouts as PDFs.</small></div><button class="btn sm" id="sPrint">${icon("book")} Print…</button></div></div>`;
        $("#sDc", el).onclick = () => { done(); ctx.discordModal(); };
        $("#sTbl", el).onclick = () => { done(); ctx.tableModal(); };
        $("#sRem", el).onclick = () => { done(); App.gmRemote ? App.gmRemote() : toast("Coming in this update"); };
        $("#sPrint", el).onclick = () => { done(); ctx.printModal(); };
      },
      data(el) {
        const c = C(), desk = !!window.codex;
        el.innerHTML = `<h3>Backups & data</h3><div class="grp">
          <div class="set-row"><div><b>Export this campaign</b><small>One file with its pictures inside, so it opens on any computer.</small></div><button class="btn sm" id="sExp">${icon("save")} Export…</button></div>
          <div class="set-row"><div><b>Import a campaign</b><small>A backup file from this app.</small></div><button class="btn sm" id="sImp">${icon("copy")} Import…</button></div>
          <div class="set-row"><div><b>Homebrew packs</b><small>Share your system, monsters, spells and tables with other GMs, or load theirs.</small></div><button class="btn sm" id="sPack">${icon("plus")} Packs…</button></div>
          ${desk ? `<div class="set-row"><div><b>Daily backups</b><small>The app keeps one copy a day for 14 days.</small></div><div class="row" style="gap:6px"><button class="btn sm" id="sRes">${icon("clock")} Restore…</button><button class="btn sm" id="sDir">${icon("book")} Open save folder</button></div></div>` : ""}
          </div><div class="grp" style="border-color:color-mix(in srgb, var(--bad) 45%, transparent)"><div class="set-row"><div><b>Delete ${esc(c.name)}</b><small>Removes every note, board, session and roll in it. Ctrl+Z can bring it back until you close the app.</small></div><button class="btn sm" id="sDel" style="color:var(--bad)">${icon("trash")} Delete campaign</button></div></div>`;
        $("#sExp", el).onclick = ctx.exportBackup; $("#sImp", el).onclick = () => { done(); ctx.importBackup(); };
        $("#sPack", el).onclick = () => { done(); App.packs ? App.packs() : toast("Coming in this update"); };
        $("#sRes", el)?.addEventListener("click", () => { done(); ctx.restoreModal(); });
        $("#sDir", el)?.addEventListener("click", () => window.codex.openFolder());
        $("#sDel", el).onclick = () => { done(); ctx.deleteCampaign(); };
      },
      async legal(el) {
        el.innerHTML = `<p class="md-help">Loading…</p>`;
        el.innerHTML = `<div class="prose nocap legal">${md(await ctx.legalText(), [])}</div>`;
      },
    };
    go(tab);
  });
}
