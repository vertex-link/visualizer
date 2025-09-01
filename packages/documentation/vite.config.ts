import * as fs from "node:fs";
// @ts-ignore
import * as path from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import zig from "vite-plugin-zig";

// Custom plugin to handle WGSL shader files
function wgslLoader() {
  return {
    name: "wgsl-loader",
    load(id: string) {
      if (id.endsWith(".wgsl")) {
        const shaderContent = fs.readFileSync(id, "utf-8");
        return `export default ${JSON.stringify(shaderContent)};`;
      }
    },
  };
}

export default defineConfig({
  plugins: [vue(), zig(), wgslLoader()],
  server: {
    port: 8000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@vertex-link/acs": path.resolve(__dirname, "../acs/src/index.ts"),
      "@vertex-link/engine": path.resolve(__dirname, "../engine/src/index.ts"),
    },
  },
  optimizeDeps: {
    include: ["reflect-metadata"],
    exclude: ["@vertex-link/acs", "@vertex-link/engine"],
    esbuildOptions: {
      target: "ES2022",
      keepNames: true,
    },
  },
  build: {
    target: "esnext",
  },
  worker: {
    format: "es",
  },
  esbuild: {
    target: "ES2022",
    keepNames: true,
  },
});
