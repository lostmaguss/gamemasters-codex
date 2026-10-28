// Linux: put a small launcher in front of the app binary. Ubuntu 24.04+ blocks the user
// namespaces Chromium's sandbox needs unless the app has an AppArmor profile; the .deb installs
// one, but an AppImage can't, so there (and only there, or when asked) the app runs unsandboxed.
const fs = require("fs");
const path = require("path");
exports.default = async function (ctx) {
  if (ctx.electronPlatformName !== "linux") return;
  const name = ctx.packager.executableName, dir = ctx.appOutDir;
  fs.renameSync(path.join(dir, name), path.join(dir, name + ".bin"));
  fs.writeFileSync(path.join(dir, name), `#!/bin/bash
HERE="$(dirname "$(readlink -f "$0")")"
sandbox_ok() {
  [ -z "$APPIMAGE$APPDIR" ] && [ -f /etc/apparmor.d/gamemasters-codex ] && return 0  # .deb: our AppArmor profile allows it
  unshare --user --map-root-user true 2>/dev/null && return 0                         # the system allows user namespaces
  [ -u "$HERE/chrome-sandbox" ] && [ -z "$APPIMAGE$APPDIR" ] && return 0              # the setuid sandbox helper is set up
  return 1
}
if [ -n "$CODEX_NO_SANDBOX" ] || ! sandbox_ok; then exec "$HERE/${name}.bin" --no-sandbox "$@"; fi
exec "$HERE/${name}.bin" "$@"
`, { mode: 0o755 });
};
