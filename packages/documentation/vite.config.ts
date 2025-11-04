import * as fs from "node:fs";
import * as path from "node:path";
import vue from "@vitejs/plugin-vue";
import { globSync } from "glob";
import { defineConfig } from "vite";
// @ts-expect-error
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

const exampleEntryPoints = globSync("src/features/**/index.html", {
  cwd: __dirname,
}).reduce(
  (acc, file) => {
    // Create a logical name for the entry point
    const name = path.dirname(file).split("/").slice(2).join("/");
    acc[name] = path.resolve(__dirname, file);
    return acc;
  },
  {} as Record<string, string>,
);

export default defineConfig({
  plugins: [vue(), zig(), wgslLoader()],
  server: {
    host: "0.0.0.0",
    origin: "http://192.168.88.14:8000",
    port: 8000,
    allowedHosts: [".orb.local"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@vertex-link/space": path.resolve(__dirname, "../space/src/index.ts"),
      "@vertex-link/engine": path.resolve(__dirname, "../engine/src/index.ts"),
    },
  },
  optimizeDeps: {
    exclude: ["@vertex-link/space", "@vertex-link/engine"],
    esbuildOptions: {
      target: "ES2022",
      keepNames: true,
    },
  },
  build: {
    target: "esnext",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"), // Keep the main app entry
        ...exampleEntryPoints, // Add all discovered examples
      },
    },
  },
  worker: {
    format: "es",
  },
  esbuild: {
    target: "ES2022",
    keepNames: true,
  },
});
