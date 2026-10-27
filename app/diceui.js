// Pieces shared by the desk's Dice view and the stream window.
import { esc } from "./util.js";
import { breakdown, critLabel, shownTotal } from "./roll.js";

const SHAPES = {
  4: `<polygon class="f" points="50,8 94,88 6,88"/><line class="e" x1="50" y1="8" x2="50" y2="88"/>`,
  6: `<rect class="f" x="12" y="12" width="76" height="76" rx="12"/>`,
  8: `<polygon class="f" points="50,5 92,50 50,95 8,50"/><polyline class="e" points="8,50 50,62 92,50"/><line class="e" x1="50" y1="5" x2="50" y2="62"/>`,
  10: `<polygon class="f" points="50,5 92,42 50,95 8,42"/><polyline class="e" points="8,42 50,60 92,42"/><line class="e" x1="50" y1="60" x2="50" y2="95"/>`,
  12: `<polygon class="f" points="50,5 94,37 77,92 23,92 6,37"/><polygon class="e" points="50,24 73,41 64,71 36,71 27,41"/>`,
  20: `<polygon class="f" points="50,4 91,27 91,73 50,96 9,73 9,27"/><polygon class="e" points="50,24 75,67 25,67"/>`,
  100: `<polygon class="f" points="32,8 58,32 32,92 6,32"/><polygon class="f" points="68,8 94,32 68,92 42,32"/>`,
};
export const dieIcon = s => `<svg viewBox="0 0 100 100" aria-hidden="true">${SHAPES[s] || SHAPES[6]}</svg>`;

export function createOverlay(host) {
  const ov = document.createElement("div"); ov.className = "result-ov"; ov.hidden = true;
  const fl = document.createElement("div"); fl.className = "flash";
  host.append(fl, ov);
  return {
    wait(label) { ov.hidden = false; ov.className = "result-ov wait"; ov.innerHTML = `<div class="rl">${esc(label)}</div><div class="rt">rolling…</div>`; },
    show(r) {
      ov.hidden = false; ov.className = "result-ov" + (r.crit ? " crit" : r.fumble ? " fumble" : "");
      ov.innerHTML = `${r.who ? `<div class="rwho" style="--wc:${esc(r.color || "var(--ember)")}">${esc(r.who)}</div>` : ""}<div class="rl">${esc(r.label || r.expr)}</div><div class="rt">${shownTotal(r)}${r.successMode && r.single == null ? `<small class="succ">success${r.total === 1 ? "" : "es"}</small>` : ""}</div><div class="rb">${esc(breakdown(r))}</div><div class="banner ${r.success === true ? "ok" : r.success === false ? "no" : ""}">${esc(critLabel(r))}</div>`;
      void ov.offsetWidth; ov.classList.add("show");
      if (r.crit || r.fumble) { fl.className = "flash " + (r.crit ? "crit" : "fumble"); void fl.offsetWidth; fl.classList.add("go"); }
    },
    hide() { ov.hidden = true; },
  };
}
export function logItem(r) {
  const li = document.createElement("li"); li.className = (r.crit ? "crit" : r.fumble ? "fumble" : "") + (r.secret ? " secret" : "");
  li.innerHTML = `<span class="ll">${r.secret ? `<span style="color:var(--plum,#cfb2e2)">Secret · </span>` : ""}${esc(r.label || r.expr)}${r.who ? ` <span style="color:var(--faint);font-weight:400">· ${esc(r.who)}</span>` : ""}</span><span class="lv">${shownTotal(r)}${r.success != null ? `<small class="${r.success ? "ok" : "no"}">${r.success ? "✓" : "✗"}</small>` : ""}</span><span class="lb">${esc(breakdown(r))}</span>`;
  return li;
}
