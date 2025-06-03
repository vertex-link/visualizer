// packages/documentation/vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    plugins: [vue()],
    server: {
        port: 8000,
        open: false,
    },
    resolve: {
        alias: {
            '@vertex-link/acs': path.resolve(__dirname, '../acs/src/index.ts'),
            '@vertex-link/engine': path.resolve(__dirname, '../engine/src/index.ts'),
        },
    },
    // Add or modify the esbuild options
    esbuild: {
        // This ensures esbuild uses the settings relevant for decorators
        tsconfigRaw: {
            compilerOptions: {
                // experimentalDecorators: true,
                // emitDecoratorMetadata: true,
                // Preserve JSX for Vue if not already handled by the Vue plugin
                // jsx: "preserve", // Check if your Vue plugin handles this
            },
        },
    },
});