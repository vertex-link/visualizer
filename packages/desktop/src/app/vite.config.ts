import fs from "node:fs";
// Type cast applied to satisfy Vite's PluginOption overload in this Electron context
// without affecting runtime behavior.
import vuePlugin from "@vitejs/plugin-vue";
import { defineConfig, type Plugin } from "vite";

function wgslLoader(): Plugin {
  return {
    name: "wgsl-loader",
    load(id) {
      if (id.endsWith(".wgsl")) {
        const shaderContent = fs.readFileSync(id, "utf-8");
        return `export default ${JSON.stringify(shaderContent)};`;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [vuePlugin() as unknown as Plugin, wgslLoader()],
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
      "@vertex-link/space": "../../../space/src/index.ts",
      "@vertex-link/engine": "../../../engine/src/index.ts",
    },
  },
});
