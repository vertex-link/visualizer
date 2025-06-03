import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue'; // Import the Vue plugin

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(), // Add the Vue plugin
    ],
    server: {
        port: 8000, // Or your preferred port, matching docker-compose.yml if used
        open: true, // Automatically open in browser
    },
    resolve: {
        alias: {
            // You might not need aliases if Bun workspace linking works seamlessly with Vite.
            // However, if you encounter issues or want explicit paths:
            // '@vertex-link/core-acs': path.resolve(__dirname, '../core-acs/src'),
            // '@vertex-link/engine': path.resolve(__dirname, '../engine/src'),
        },
    },
    // If your libraries are not pre-built or Vite has trouble with them,
    // you might need to tell Vite to optimize them.
    // optimizeDeps: {
    //   include: ['@vertex-link/core-acs', '@vertex-link/engine'],
    // },
    build: {
        sourcemap: true,
    }
});