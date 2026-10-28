// macOS: there's no Apple Developer certificate, so sign the app ad hoc. Apple Silicon refuses to
// run unsigned apps at all ("damaged"); ad-hoc signed ones open after the usual "Open Anyway".
const { execFileSync } = require("child_process");
const path = require("path");
exports.default = async function (ctx) {
  if (ctx.electronPlatformName !== "darwin") return;
  const appPath = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.app`);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], { stdio: "inherit" });
  execFileSync("codesign", ["--verify", "--deep", "--strict", appPath], { stdio: "inherit" });
};
