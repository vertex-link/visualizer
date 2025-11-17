// electron.vite.config.ts
import { resolve } from "path";
import vue from "@vitejs/plugin-vue";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist/main",
      rollupOptions: {
        input: resolve(__dirname, "src/main/index.ts"),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "dist/preload",
      rollupOptions: {
        input: resolve(__dirname, "src/preload/preload.ts"),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, "src/windows"),
    worker: {
      format: "es",
    },
    esbuild: {
      target: "ES2022",
      keepNames: true,
    },
    build: {
      target: "esnext",
      outDir: "dist/renderer",
      rollupOptions: {
        input: {
          outliner: resolve(__dirname, "src/windows/outliner/index.html"),
          preview: resolve(__dirname, "src/windows/preview/index.html"),
          inspector: resolve(__dirname, "src/windows/inspector/index.html"),
        },
      },
    },
    resolve: {
      alias: {
        "@vertex-link/space": resolve(__dirname, "../space/src/index.ts"),
        "@vertex-link/engine": resolve(__dirname, "../engine/src/index.ts"),
      },
    },
    plugins: [vue()],
  },
});
