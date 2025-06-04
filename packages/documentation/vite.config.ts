import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import * as path from "node:path";

export default defineConfig({
    plugins: [
        vue()
    ],
    server: {
        port: 8000,
    },
    resolve: {
        alias: {
            '@vertex-link/acs': path.resolve(__dirname, '../acs/src/index.ts'),
            '@vertex-link/engine': path.resolve(__dirname, '../engine/src/index.ts'),
        },
    },
    optimizeDeps: {
        include: ['reflect-metadata'],
        exclude: ['@vertex-link/acs', '@vertex-link/engine'],
        esbuildOptions: {
            target: 'ES2022',
            keepNames: true,
        }
    },
    build: {
        target: 'ES2022',
    },
    esbuild: {
        target: 'ES2022',
        keepNames: true,
    }
});