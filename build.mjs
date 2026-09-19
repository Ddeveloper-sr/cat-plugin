import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";

await mkdir("dist", { recursive: true });

await build({
  entryPoints: ["src/index.tsx"],
  outfile: "dist/index.js",
  bundle: true,
  format: "iife",
  platform: "neutral",
  target: "es2020",
  minify: false,
  external: ["@metro/*", "@vendetta/*"],
  logLevel: "info",
});

await copyFile("manifest.json", "dist/manifest.json");
console.log("Built dist/index.js + dist/manifest.json");
