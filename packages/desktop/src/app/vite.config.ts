import fs from "node:fs";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
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
  plugins: [vue(), wgslLoader()],
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
  resolve: {
    alias: {
      "@vertex-link/acs": "../../../acs/src/index.ts",
      "@vertex-link/engine": "../../../engine/src/index.ts",
    },
  },
});
