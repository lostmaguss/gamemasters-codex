// The GM remote on the GM's phone. Talks to the desk through the table server with the GM's own key.
const g = new URLSearchParams(location.search).get("g") || "";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const post = a => fetch(`/act?g=${encodeURIComponent(g)}`, { method: "POST", body: JSON.stringify(a) }).catch(() => {});
// the GM's interface language (Settings → General) reaches the phone with every update
const TR = {
  "No fight running.": "Süren savaş yok.", "Start one in Combat on the computer, then run the turns from here.": "Bilgisayarda Savaş'tan bir tane başlat, sonra turları buradan yönet.",
  "Back": "Geri", "Next turn": "Sonraki tur", "Round": "Tur", "damage, +heal, =set": "hasar, +iyileş, =ayarla", "No session planned yet.": "Henüz planlanmış oturum yok.",
  "Nothing planned.": "Plan yok.", "Scenes": "Sahneler", "Secrets & clues": "Sırlar ve ipuçları", "Log it": "Kaydet", "What just happened": "Az önce ne oldu", "Log": "Kaydet",
  "Break screen": "Ara ekranı", "Back to the table": "Masaya dön", "Open the stream window": "Yayın penceresini aç", "Handouts": "Belgeler", "Take down": "Kaldır", "Show": "Göster",
  "No handouts yet.": "Henüz belge yok.", "Secret: only you saw it": "Gizli: sadece sen gördün", "Secret roll (not on stream)": "Gizli atış (yayında değil)", "Roll": "At",
  "Party": "Grup", "Session": "Oturum", "Live": "Canlı", "Next up": "Sıradaki", "GM remote": "OY kumandası", "Fight": "Savaş", "Scene": "Sahne",
  "Lost the connection to the GM's computer.": "OY'nin bilgisayarıyla bağlantı koptu.", "Trying again…": "Yeniden deneniyor…",
};
const L = s => S.st?.lang === "tr" ? TR[s] ?? s : s;
const S = { tab: localStorage.getItem("gm.tab") || "fight", st: null, last: null, secret: localStorage.getItem("gm.secret") === "1" };
const clock = ms => { const m = Math.max(0, Math.floor(ms / 60000)); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`; };
const buzz = () => navigator.vibrate?.(12);

function bar(hp, max) { const h = Number(hp) || 0, m = Number(max) || 0; return m ? `<div class="bar"><i style="width:${Math.max(0, Math.min(100, h / m * 100))}%"></i></div>` : ""; }

const TABS = {
  fight(st) {
    const b = st.combat;
    if (!b.active) return `<p class="muted">${L("No fight running.")}<br>${L("Start one in Combat on the computer, then run the turns from here.")}</p>${party(st)}`;
    return `<div class="row2"><button class="big alt" data-act="prev">${L("Back")}</button><button class="big" data-act="next">${L("Next turn")}</button></div>
      <h2>${L("Round")} ${b.round}</h2>
      ${b.list.map(x => `<div class="card who ${x.cur ? "cur" : ""} ${Number(x.max) && Number(x.hp) <= 0 ? "down" : ""}"><b>${esc(x.name)}</b><span class="hp">${Number(x.max) ? `${esc(x.hp)}<small>/${esc(x.max)}</small>` : ""}</span>${bar(x.hp, x.max)}
        ${x.conds.length ? `<div class="meta">${x.conds.map(esc).join(" · ")}</div>` : ""}
        <div class="ctl"><input type="text" inputmode="numeric" placeholder="${L("damage, +heal, =set")}" data-dmg="${x.id}"><button data-apply="${x.id}">OK</button></div></div>`).join("")}
      ${party(st)}`;
  },
  scene(st) {
    const s = st.session, P = st.plan;
    if (!s) return `<p class="muted">${L("No session planned yet.")}</p>`;
    const list = (L, kind) => L.map(x => `<label class="card chk ${x.done ? "done" : ""}"><input type="checkbox" data-plan="${kind}" data-id="${x.id}" ${x.done ? "checked" : ""}><span>${esc(x.text)}</span></label>`).join("") || `<p class="muted" style="padding:10px">${L("Nothing planned.")}</p>`;
    return `${P.start ? `<div class="card start">${esc(P.start)}</div>` : ""}<h2>${L("Scenes")}</h2>${list(P.scenes, "scene")}<h2>${L("Secrets & clues")}</h2>${list(P.secrets, "secret")}
      ${s.live ? `<h2>${L("Log it")}</h2><div class="row2" style="grid-template-columns:1fr auto"><input type="text" id="log" placeholder="${L("What just happened")}"><button class="big alt" style="width:84px" id="logGo">${L("Log")}</button></div>` : ""}`;
  },
  show(st) {
    return `<div class="row2"><button class="big alt" data-act="break">${L("Break screen")}</button><button class="big alt" data-act="sceneOff">${L("Back to the table")}</button></div>
      ${st.stream ? "" : `<button class="big alt" data-act="stage">${L("Open the stream window")}</button>`}
      <h2>${L("Handouts")}</h2>${st.handouts.map(h => `<div class="card ho ${st.onAir === h.id ? "on" : ""}"><b>${esc(h.title)}</b><button data-ho="${h.id}">${st.onAir === h.id ? L("Take down") : L("Show")}</button></div>`).join("") || `<p class="muted">${L("No handouts yet.")}</p>`}`;
  },
  roll(st) {
    const r = S.last;
    return `${r ? `<div class="card res">${esc(r.label || r.expr)}<b>${esc(r.total)}</b>${r.note ? `<div>${esc(r.note)}</div>` : ""}<small>${esc(r.breakdown)}</small>${r.secret ? `<div style="color:var(--faint);margin-top:4px">${L("Secret: only you saw it")}</div>` : ""}</div>` : ""}
      <label class="card chk" style="padding:10px 12px"><input type="checkbox" id="sec" ${S.secret ? "checked" : ""}><span>${L("Secret roll (not on stream)")}</span></label>
      <div class="chips">${st.presets.map((p, i) => `<button data-p="${i}">${esc(p.name)}<span>${esc(p.expr)}</span></button>`).join("")}${["1d20", "1d100", "2d6", "4dF"].map(e => `<button data-e="${e}">${e}</button>`).join("")}</div>
      <div class="row2" style="grid-template-columns:1fr auto"><input type="text" id="expr" placeholder="2d6+3, 1d100<=45…" autocapitalize="off" autocorrect="off"><button class="big" style="width:84px;height:48px" id="rollGo">${L("Roll")}</button></div>`;
  },
};
function party(st) {
  if (!st.party.length) return "";
  return `<h2>${L("Party")}</h2>${st.party.map(m => `<div class="card who"><b style="border-left:0">${esc(m.name)}</b><span class="hp">${Number(m.max) ? `${esc(m.hp)}<small>/${esc(m.max)}</small>` : ""}</span>${bar(m.hp, m.max)}<div class="ctl pm"><button data-pc="${m.id}" data-d="-5">−5</button><button data-pc="${m.id}" data-d="-1">−1</button><button data-pc="${m.id}" data-d="1">+1</button><button data-pc="${m.id}" data-d="5">+5</button></div></div>`).join("")}`;
}

function render() {
  const st = S.st; if (!st) return;
  const s = st.session;
  $("#title").textContent = s ? `${s.title || `Session ${s.num}`}` : st.campaign;
  $("#sub").textContent = s ? `${L(s.live ? "Live" : "Next up")} · ${L("Session")} ${s.num}` : L("GM remote");
  $("#clock").textContent = s?.live && s.startedAt ? clock(Date.now() - s.startedAt) : "";
  const keep = document.activeElement?.id || document.activeElement?.dataset?.dmg, val = document.activeElement?.value;
  $("#main").innerHTML = TABS[S.tab](st);
  document.querySelectorAll(".tabs button").forEach(b => b.lastChild.nodeValue = L(b.dataset.label ||= b.lastChild.nodeValue));
  $("#offMsg").innerHTML = `${L("Lost the connection to the GM's computer.")}<br>${L("Trying again…")}`; document.documentElement.lang = st.lang || "en";
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === S.tab));
  // keep what the GM was typing when an update arrives
  if (keep) { const el = document.getElementById(keep) || document.querySelector(`[data-dmg="${keep}"]`); if (el) { el.value = val || ""; el.focus(); } }
  wire(st);
}
function wire(st) {
  const on = (sel, fn) => document.querySelectorAll(sel).forEach(el => el.onclick = e => { buzz(); fn(el, e); });
  on("[data-act]", el => post({ type: el.dataset.act }));
  on("[data-apply]", el => { const i = document.querySelector(`[data-dmg="${el.dataset.apply}"]`); if (i.value.trim()) { post({ type: "dmg", id: el.dataset.apply, raw: i.value.trim() }); i.value = ""; i.blur(); } });
  document.querySelectorAll("[data-dmg]").forEach(i => i.onkeydown = e => { if (e.key === "Enter") document.querySelector(`[data-apply="${i.dataset.dmg}"]`).click(); });
  on("[data-pc]", el => post({ type: "pc", id: el.dataset.pc, delta: Number(el.dataset.d) }));
  document.querySelectorAll("[data-plan]").forEach(c => c.onchange = () => { buzz(); post({ type: "plan", kind: c.dataset.plan, id: c.dataset.id, done: c.checked }); });
  const lg = $("#log"); if (lg) { const go = () => { if (lg.value.trim()) { post({ type: "log", text: lg.value.trim() }); lg.value = ""; buzz(); } }; $("#logGo").onclick = go; lg.onkeydown = e => { if (e.key === "Enter") go(); }; }
  on("[data-ho]", el => post(st.onAir === el.dataset.ho ? { type: "hide" } : { type: "show", id: el.dataset.ho }));
  const sec = $("#sec"); if (sec) sec.onchange = () => { S.secret = sec.checked; localStorage.setItem("gm.secret", S.secret ? "1" : "0"); };
  const roll = (expr, label) => post({ type: "roll", expr, label, secret: S.secret });
  on("[data-p]", el => { const p = st.presets[+el.dataset.p]; roll(p.expr, p.name); });
  on("[data-e]", el => roll(el.dataset.e, ""));
  const ex = $("#expr"); if (ex) { const go = () => { if (ex.value.trim()) roll(ex.value.trim(), ""); }; $("#rollGo").onclick = () => { buzz(); go(); }; ex.onkeydown = e => { if (e.key === "Enter") go(); }; }
}
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => { S.tab = b.dataset.tab; localStorage.setItem("gm.tab", S.tab); render(); window.scrollTo(0, 0); });

let es = null, retry = 1000;
function connect() {
  es?.close();
  es = new EventSource(`/events?g=${encodeURIComponent(g)}`);
  es.onopen = () => { retry = 1000; $("#off").classList.remove("show"); $("#dot").classList.add("on"); };
  es.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.t === "gm") { S.st = m.v; render(); }
    if (m.t === "result") { S.last = m.v; if (S.tab === "roll") render(); else { S.tab = "roll"; render(); } navigator.vibrate?.([20, 40, 20]); }
  };
  es.onerror = () => { $("#dot").classList.remove("on"); $("#off").classList.add("show"); es.close(); setTimeout(connect, retry); retry = Math.min(15000, retry * 2); };
}
connect();
setInterval(() => { if (S.st?.session?.live) $("#clock").textContent = clock(Date.now() - S.st.session.startedAt); }, 20000);
