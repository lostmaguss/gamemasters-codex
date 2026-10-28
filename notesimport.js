// Import a folder of Markdown notes (an Obsidian vault or any folder of .md files) into the Codex.
const { ipcMain, dialog } = require("electron");
const fs = require("fs");
const path = require("path");

const IMG = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
// folder or front-matter words → Codex category
const GUESS = [
  ["NPCs", /\b(npcs?|people|persons?|characters?|cast|villains?|allies|contacts?)\b/i],
  ["Locations", /\b(locations?|places?|regions?|cities|city|towns?|villages?|dungeons?|maps?|geography|planets?|systems?|districts?)\b/i],
  ["Factions", /\b(factions?|organi[sz]ations?|guilds?|groups?|houses?|corps?|corporations?|gangs?|orders?|cults?)\b/i],
  ["Quests", /\b(quests?|missions?|adventures?|plots?|hooks?|jobs?|arcs?|sessions?)\b/i],
  ["Items", /\b(items?|loot|equipment|gear|artifacts?|artefacts?|weapons?|magic items|tech|cyberware)\b/i],
  ["Lore", /\b(lore|history|religions?|gods?|deities|pantheon|world|setting|cosmology|languages?|culture)\b/i],
];
const guessCat = (...hints) => { for (const h of hints) for (const [cat, re] of GUESS) if (h && re.test(h)) return cat; return "Other"; };

function walk(dir, out, files, depth = 0) {
  if (depth > 12 || out.md.length > 3000) return;
  let list = []; try { list = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of list) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out, files, depth + 1);
    else if (/\.md$/i.test(e.name)) out.md.push(p);
    else if (IMG.includes(path.extname(e.name).toLowerCase())) (files[e.name.toLowerCase()] ||= p);
  }
}
// tiny YAML front matter: title, tags, aliases, type/category
function frontMatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/); if (!m) return { meta: {}, body: text };
  const meta = {}; let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/), li = line.match(/^\s*-\s+(.*)$/);
    if (kv) { key = kv[1].toLowerCase(); const v = kv[2].trim(); meta[key] = v.startsWith("[") ? v.slice(1, -1).split(",").map(x => x.trim().replace(/^["']|["']$/g, "")).filter(Boolean) : v.replace(/^["']|["']$/g, ""); if (v === "") meta[key] = []; }
    else if (li && key) { if (!Array.isArray(meta[key])) meta[key] = meta[key] ? [meta[key]] : []; meta[key].push(li[1].trim().replace(/^["']|["']$/g, "")); }
  }
  return { meta, body: text.slice(m[0].length) };
}

async function readVault(root, saveImage) {
  const out = { md: [] }, files = {}; walk(root, out, files);
  const pages = [];
  for (const file of out.md) {
    let text; try { const st = fs.statSync(file); if (st.size > 2e6) continue; text = fs.readFileSync(file, "utf8"); } catch { continue; }
    const { meta, body: raw } = frontMatter(text);
    const rel = path.relative(root, file), folder = path.dirname(rel) === "." ? "" : path.dirname(rel);
    const title = String(meta.title || path.basename(file, path.extname(file))).trim();
    // the first embedded picture becomes the page picture
    let img = null;
    const embeds = [...raw.matchAll(/!\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]|!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g)];
    for (const e of embeds) {
      const name = e[1] || decodeURIComponent(e[2] || ""); if (!name || /^https?:/i.test(name)) continue;
      const p = files[path.basename(name).toLowerCase()] || (fs.existsSync(path.resolve(path.dirname(file), name)) ? path.resolve(path.dirname(file), name) : null);
      if (p && IMG.includes(path.extname(p).toLowerCase())) { try { img = await saveImage(p); } catch {} break; }
    }
    const tagSet = new Set([].concat(meta.tags || [], meta.tag || []).map(t => String(t).replace(/^#/, "")).filter(Boolean));
    let body = raw
      .replace(/!\[\[[^\]]*\]\]|!\[[^\]]*\]\([^)]*\)/g, "")                 // picture embeds
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g, "[[$1]]")   // [[Note#Heading|alias]] → [[Note]]
      .replace(/^>\s*\[!(\w+)\][-+]?\s*/gm, (m, k) => `> **${k[0].toUpperCase() + k.slice(1)}:** `) // callouts
      .replace(/%%[\s\S]*?%%/g, "")                                           // Obsidian comments
      .replace(/\n{3,}/g, "\n\n").trim();
    for (const m of body.matchAll(/(?:^|\s)#([A-Za-z][\w/-]*)/g)) tagSet.add(m[1]);
    const cat = guessCat(meta.type, meta.category, meta.cat, folder, ...[...tagSet]);
    pages.push({ title, body, tags: [...tagSet].slice(0, 8).join(", "), cat, img, folder, aliases: [].concat(meta.aliases || []) });
  }
  return pages;
}

function setup(getDesk, mediaDir) {
  const saveImage = async p => {
    await fs.promises.mkdir(mediaDir(), { recursive: true });
    const file = Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + path.extname(p).toLowerCase();
    await fs.promises.copyFile(p, path.join(mediaDir(), file));
    return `codexmedia://media/${file}`;
  };
  ipcMain.handle("notes:importFolder", async (_e, dir) => {
    if (process.env.CODEX_IMPORT_TEST) dir = process.env.CODEX_IMPORT_TEST; // test hook: skip the folder picker
    else {
      const r = await dialog.showOpenDialog(getDesk(), { title: "Pick your notes folder (an Obsidian vault works too)", properties: ["openDirectory"] });
      if (r.canceled || !r.filePaths[0]) return null;
      dir = r.filePaths[0];
    }
    return { folder: path.basename(dir), pages: await readVault(dir, saveImage) };
  });
}
module.exports = { setup, readVault, guessCat };
