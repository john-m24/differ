import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/client/index.tsx"],
    format: ["iife"],
    platform: "browser",
    target: "es2020",
    outDir: "dist",
    globalName: "DifferApp",
    minify: true,
    noExternal: [/.*/],
    treeshake: true,
    esbuildOptions(options) {
      options.jsx = "automatic";
      options.jsxImportSource = "react";
    },
  },
  {
    entry: ["src/cli.ts"],
    format: ["esm"],
    target: "node20",
    outDir: "dist",
    clean: false,
    dts: false,
    banner: { js: "#!/usr/bin/env node" },
  },
]);
