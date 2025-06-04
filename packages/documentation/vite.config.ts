import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import * as path from "node:path";
import * as fs from "node:fs";

// Custom plugin to handle WGSL shader files
function wgslLoader() {
    return {
        name: 'wgsl-loader',
        load(id: string) {
            if (id.endsWith('.wgsl')) {
                const shaderContent = fs.readFileSync(id, 'utf-8');
                return `export default ${JSON.stringify(shaderContent)};`;
            }
        }
    };
}

export default defineConfig({
    plugins: [
        vue(),
        wgslLoader()
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