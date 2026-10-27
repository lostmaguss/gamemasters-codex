// Fails the release if the packed app is missing a file that main-process code requires.
// (1.12–1.20 shipped without bot.js and crashed on launch.)
const fs = require("fs"), path = require("path");
const { listPackage } = require("@electron/asar");
const asar = process.argv[2];
const packed = new Set(listPackage(asar).map(p => p.replace(/\\/g, "/")));
const seen = new Set(), missing = [];
(function walk(file) {
  if (seen.has(file)) return; seen.add(file);
  if (!packed.has("/" + file)) return missing.push(file);
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/require\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g)) {
    let f = path.posix.normalize(path.posix.join(path.posix.dirname(file), m[1]));
    if (!f.endsWith(".js") && !f.endsWith(".json")) f += ".js";
    walk(f);
  }
})("main.js");
if (missing.length) { console.error("Missing from the package:", missing.join(", ")); process.exit(1); }
console.log(`Package OK: ${seen.size} main-process files present`);
