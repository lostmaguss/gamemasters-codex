// Release notes from the newest "What's new" entry, plus a download table.
const fs = require("fs");
const src = fs.readFileSync(require("path").join(__dirname, "..", "app", "whatsnew.js"), "utf8");
const m = src.match(/\{\s*v:\s*"([^"]+)",\s*title:\s*"((?:[^"\\]|\\.)*)",\s*items:\s*\[([\s\S]*?)\]\s*\}/);
const un = s => s.replace(/\\(["'\\])/g, "$1");
const items = m ? [...m[3].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(x => "- " + un(x[1])) : [];
const v = require("../package.json").version;
console.log(`## ${m ? un(m[2]) : "Gamemaster's Codex " + v}

${items.join("\n")}

### Download

| | |
|---|---|
| **Windows** | \`GamemastersCodex-Setup-${v}.exe\` |
| **macOS** (Apple Silicon) | \`GamemastersCodex-${v}-arm64.dmg\` |
| **macOS** (Intel) | \`GamemastersCodex-${v}-x64.dmg\` |
| **Linux** (any distro) | \`GamemastersCodex-${v}-x86_64.AppImage\` |
| **Ubuntu / Debian** | \`GamemastersCodex-${v}-amd64.deb\` |

Already installed? The app updates itself (on macOS it tells you when there's a new version to download).
First launch on Windows: *More info → Run anyway*. On macOS: *System Settings → Privacy & Security → Open Anyway*.`);
