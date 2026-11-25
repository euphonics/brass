import esbuild from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import { builtinModules } from "node:module";
import { fontBytesEsbuildPlugin } from "../../scripts/font-bytes.mjs";
import { workerSourceEsbuildPlugin } from "../../scripts/worker-source.mjs";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const vault =
  process.argv[2] ??
  path.join(os.homedir(), "Code", "Obsidian Dev Vault", "Dev");
await esbuild.build({
  absWorkingDir: repo,
  entryPoints: ["src/main.ts"],
  bundle: true,
  plugins: [fontBytesEsbuildPlugin(), workerSourceEsbuildPlugin()],
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtinModules,
  ],
  format: "cjs",
  target: "es2018",
  logLevel: "warning",
  treeShaking: true,
  minify: false,
  keepNames: true,
  outfile: path.join(vault, ".obsidian", "plugins", "brass", "main.js"),
});
console.log(
  "Unminified build installed in " +
    vault +
    " (reinstall with npm run install-vault when done)",
);
