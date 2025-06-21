// electron.vite.config.ts
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: resolve(__dirname, 'src/main/index.ts')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: resolve(__dirname, 'src/preload/preload.ts')
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/app'),
    worker: {
      format: 'es',
    },
    esbuild: {
      target: 'ES2022',
      keepNames: true,
    },
    build: {
      target: 'esnext',
      outDir: 'dist/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'src/app/index.html')
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/app/src'),
        '@vertex-link/acs': resolve(__dirname, '../acs/src/index.ts'),
        '@vertex-link/engine': resolve(__dirname, '../engine/src/index.ts')
      }
    },
    plugins: [vue()]
  }
})
