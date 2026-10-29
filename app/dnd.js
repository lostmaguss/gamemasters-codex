// Drag and drop: image files onto anything that has a picture, and creatures from the Bestiary
// into Combat, Tonight and the Map. Holding a drag over a sidebar section opens it.
import { toast } from "./util.js";
import { shrinkImage } from "./board.js";

const TYPE = "application/x-codex";
let carrying = null; // what's being dragged inside the app: { kind, id, name }
export const carried = () => carrying;
const hasFiles = e => [...(e.dataTransfer?.types || [])].includes("Files");

// an element you can pick up: a creature, a note…
export function draggable(el, payload) {
  el.draggable = true;
  el.addEventListener("dragstart", e => {
    carrying = payload;
    e.dataTransfer.setData(TYPE, JSON.stringify(payload)); e.dataTransfer.setData("text/plain", payload.name || "");
    e.dataTransfer.effectAllowed = "copy";
    document.body.classList.add("dragging-codex");
  });
  el.addEventListener("dragend", () => { carrying = null; document.body.classList.remove("dragging-codex"); });
}

// a place that takes what you carry; accept(payload) says whether this kind fits
export function dropZone(el, { accept, drop, image, max = 900, label }) {
  let depth = 0;
  const fits = e => (image && hasFiles(e)) || (carrying && accept?.(carrying));
  el.addEventListener("dragenter", e => { if (!fits(e)) return; depth++; el.classList.add("drop-over"); if (label) el.dataset.dropLabel = typeof label === "function" ? label(carrying) : label; });
  el.addEventListener("dragover", e => { if (!fits(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; });
  el.addEventListener("dragleave", () => { if (--depth <= 0) { depth = 0; el.classList.remove("drop-over"); } });
  el.addEventListener("drop", async e => {
    depth = 0; el.classList.remove("drop-over");
    if (carrying && accept?.(carrying)) { e.preventDefault(); e.stopPropagation(); const p = carrying; carrying = null; document.body.classList.remove("dragging-codex"); drop?.(p, e); return; }
    if (image && hasFiles(e)) {
      const f = [...e.dataTransfer.files].find(x => x.type.startsWith("image/"));
      if (!f && [...e.dataTransfer.files].some(x => /\.codexpack$/i.test(x.name))) return; // the window opens packs
      e.preventDefault(); e.stopPropagation();
      if (!f) return toast("That isn't a picture");
      try { image(await shrinkImage(f, max), f, e); } catch { toast("Couldn't read that picture"); }
    }
  });
}

// hovering a drag over a sidebar link opens that section, so you can carry things between views
export function railSwitching(rail, go) {
  let timer = null, over = null;
  rail.addEventListener("dragover", e => {
    const a = e.target.closest("a[data-v]"); if (!a || !carrying) return;
    e.preventDefault();
    if (over === a) return; over = a; clearTimeout(timer);
    timer = setTimeout(() => go(a.dataset.v), 450);
  });
  rail.addEventListener("dragleave", e => { if (!rail.contains(e.relatedTarget)) { clearTimeout(timer); over = null; } });
  rail.addEventListener("drop", () => { clearTimeout(timer); over = null; });
}
