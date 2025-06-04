import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    plugins: [
        vue()
    ],
    server: {
        port: 8000,
        open: false,
    },
    resolve: {
        alias: {
            '@vertex-link/acs': path.resolve(__dirname, '../acs/dist/index.js'),
            '@vertex-link/engine': path.resolve(__dirname, '../acs/dist/index.js'),
        },
    },
    optimizeDeps: {
        include: ['reflect-metadata'],
        exclude: ['@vertex-link/acs', '@vertex-link/engine'],
        esbuildOptions: {
            target: 'ESNext',
            keepNames: true,
        }
    },
    build: {
        target: 'ESNext',
    }
});