import * as path from "node:path";
import { defineConfig } from "vite";
// @ts-expect-error
import zig from "vite-plugin-zig";

export default defineConfig({
  plugins: [
    zig({
      // Configure zgltf WebAssembly compilation
      projects: [
        {
          name: "zgltf",
          path: path.resolve(__dirname, "src/resources/zgltf"),
          entry: "src/main.zig",
          target: "wasm32-freestanding",
          optimize: "ReleaseSmall",
        },
        {
          name: "ztransform",
          path: path.resolve(__dirname, "src/resources/ztransform"),
          entry: "src/main.zig",
          target: "wasm32-freestanding",
          optimize: "ReleaseSmall",
        },
      ],
    }),
  ],
  build: {
    target: "esnext",
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "VertexLinkEngine",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["@vertex-link/space"],
    },
  },
  resolve: {
    alias: {
      "@vertex-link/space": path.resolve(__dirname, "../space/src/index.ts"),
    },
  },
  esbuild: {
    target: "ES2022",
    keepNames: true,
  },
});
