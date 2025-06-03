import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    plugins: [vue()],
    server: {
        port: 8000,
        open: false,
    },
    // resolve: {
    //     alias: {
    //         // Point to BUILT files, not source
    //         '@vertex-link/acs': path.resolve(__dirname, '../acs/dist'),
    //         '@vertex-link/engine': path.resolve(__dirname, '../engine/dist'),
    //     },
    // },
});