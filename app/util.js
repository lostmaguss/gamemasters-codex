export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function rnd(n) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
export const pick = a => a[rnd(a.length)];
export function wpick(pairs) { const tot = pairs.reduce((s, p) => s + p[1], 0); let r = rnd(tot); for (const [v, w] of pairs) { if ((r -= w) < 0) return v; } return pairs[0][0]; }
export const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
export const uid = () => Date.now().toString(36) + rnd(1e9).toString(36);
export function h(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
export const ls = {
  get(k, d) { try { const v = localStorage.getItem("codex:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("codex:" + k, JSON.stringify(v)); } catch {} },
};
export function toast(msg) {
  let t = $("#toast");
  if (!t) { t = h(`<div id="toast" class="toast" role="status"></div>`); document.body.append(t); }
  t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2000);
}
export async function copyText(text, msg = "Copied") {
  try { await navigator.clipboard.writeText(text); toast(msg); } catch { toast("Couldn't reach the clipboard"); }
}
export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
// Small inline icon set (24px stroke icons)
const ICONS = {
  forge: "M14 4l6 6-9 9H5v-6zM12 6l6 6M3 21h18",
  board: "M4 4h16v16H4zM8 8h3v3H8zM14 13h3v3h-3zM9.5 11l5 3",
  codex: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10M9 8h5",
  chronicle: "M12 3v18M12 6h6M12 11H6M12 16h5M5 4h0",
  dice: "M12 2l9 5v10l-9 5-9-5V7zM12 2v20M3 7l9 5 9-5",
  plus: "M12 5v14M5 12h14",
  check: "M5 12l4 4 10-10",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  map: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  tables: "M4 5h16v14H4zM4 10h16M4 15h16M10 5v14",
  x: "M6 6l12 12M18 6L6 18",
  min: "M5 12h14",
  max: "M5 5h14v14H5z",
  reroll: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  pin: "M12 17v5M8 3h8l-1 7 3 3H6l3-3z",
  copy: "M8 8h12v12H8zM4 16V4h12",
  save: "M5 3h11l3 3v15H5zM8 3v6h8M8 14h8v7H8z",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3",
  stream: "M3 5h18v12H3zM8 21h8M12 17v4M10 9l4 2-4 2z",
  image: "M4 4h16v16H4zM4 16l5-5 5 5 2-2 4 4M15 9h.01",
  type: "M5 6V4h14v2M12 4v16M9 20h6",
  link: "M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1",
  fit: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  up: "M6 15l6-6 6 6", down: "M6 9l6 6 6-6",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5",
  discord: "M7 7c3-1.5 7-1.5 10 0l2 9c-2 1.5-4 2-4 2l-1-2M7 7L5 16c2 1.5 4 2 4 2l1-2M9.5 12h.01M14.5 12h.01",
  gear: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12l2 1-2 4-2-1-2 2 1 2-4 2-1-2h-2l-1 2-4-2 1-2-2-2-2 1-2-4 2-1v-2l-2-1 2-4 2 1 2-2-1-2 4-2 1 2h2l1-2 4 2-1 2 2 2 2-1 2 4-2 1z",
  sound: "M4 9h4l5-4v14l-5-4H4zM17 8a5 5 0 0 1 0 8",
  combat: "M4 4l11 11M20 4L9 15M3 17l4 4M17 21l4-4M13 17l4-4M7 13l4 4",
  social: "M4 5h16v10H10l-5 4v-4H4z",
  explore: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z",
  discovery: "M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5",
  loot: "M6 4h12l3 5-9 11L3 9zM3 9h18M9 4l3 5 3-5",
  rest: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  twist: "M4 9h12l-3-3M20 15H8l3 3",
  death: "M12 3a7 7 0 0 0-7 7c0 2.5 1.3 4 3 5v3h8v-3c1.7-1 3-2.5 3-5a7 7 0 0 0-7-7zM9.5 10h.01M14.5 10h.01M10 21h4",
  travel: "M3 20c3-1 4-4 7-6s6 0 8-3 2-5 3-7M6 20h.01M18 4h.01",
};
export function icon(name, cls = "") {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name] || ""}"/></svg>`;
}
