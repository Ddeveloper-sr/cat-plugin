import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { rollup } from "rollup";
import esbuild from "rollup-plugin-esbuild";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";

const plugins = [
  nodeResolve(),
  commonjs(),
  esbuild({
    minify: true,
    loaders: {
      ".ts": "tsx",
      ".tsx": "tsx",
      ".js": "js",
      ".jsx": "jsx"
    },
    target: "es2020"
  })
];

const manifest = JSON.parse(await readFile("./manifest.json", "utf8"));
await mkdir("./dist", { recursive: true });

const bundle = await rollup({
  input: `./${manifest.main}`,
  onwarn: () => {},
  external: (id) =>
    id.startsWith("@vendetta/") ||
    id.startsWith("@metro/") ||
    id === "react" ||
    id === "react-native",
  plugins,
});

await bundle.write({
  file: "./dist/index.js",
  format: "iife",
  compact: true,
  exports: "default",
  globals(id) {
    if (id.startsWith("@vendetta/")) return id.substring(1).replace(/\//g, ".");
    if (id.startsWith("@metro/")) return id.substring(1).replace(/\\//g, ".");
    if (id === "react") return "window.React";
    if (id === "react-native") return "window.ReactNative";
    return id;
  },
});

await bundle.close();

const js = await readFile("./dist/index.js");
manifest.main = "index.js";
manifest.hash = createHash("sha256").update(js).digest("hex");
await writeFile("./dist/manifest.json", JSON.stringify(manifest, null, 2));
console.log("Built dist/index.js + dist/manifest.json");
