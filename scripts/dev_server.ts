// scripts/dev_server.ts
import {
    serveDir,
    type ServeDirOptions,
} from 'https://deno.land/std@0.224.0/http/file_server.ts';
import { serve, type ServeOptions } from 'https://deno.land/std@0.224.0/http/server.ts';
import { extname } from 'https://deno.land/std@0.224.0/path/mod.ts';
import { transpile, type TranspileOptions } from "https://deno.land/x/emit/mod.ts"; // Updated import

const PORT = 8080;
const WATCH_PATHS = ['./src', './examples'];

const clients = new Set<WebSocket>();

function broadcastReload() {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send('reload');
        }
    }
}

async function fileWatcher() {
    console.log(`Watching for file changes in: ${WATCH_PATHS.join(', ')}...`);
    const watcher = Deno.watchFs(WATCH_PATHS);
    let lastReloadTime = 0;
    const debounceInterval = 500;

    for await (const event of watcher) {
        if (event.kind !== 'access') {
            const now = Date.now();
            if (now - lastReloadTime > debounceInterval) {
                console.log(
                    `Change detected: ${event.kind} in ${event.paths.join(', ')}. Reloading...`,
                );
                broadcastReload();
                lastReloadTime = now;
            }
        }
    }
}

const serveDirOpts: ServeDirOptions = {
    fsRoot: '.',
    urlRoot: '',
    quiet: true,
    enableCors: true,
};

async function handleHttpRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const extension = extname(pathname).toLowerCase();

    if (pathname === '/livereload-ws') {
        const { socket, response } = Deno.upgradeWebSocket(req);
        clients.add(socket);
        socket.onclose = () => clients.delete(socket);
        socket.onerror = (e) => console.error('Live reload WebSocket error:', e);
        return response;
    }

    if (pathname === '/' || pathname === '/index.html') {
        try {
            let content = await Deno.readTextFile('./examples/index.html');
            const liveReloadScript = `
        <script>
          const socket = new WebSocket('ws://localhost:${PORT}/livereload-ws');
          socket.addEventListener('message', (event) => {
            if (event.data === 'reload') {
              console.log('Reloading page...');
              window.location.reload();
            }
          });
          socket.addEventListener('open', () => console.log('Live reload connected.'));
          socket.addEventListener('error', (err) => console.error('Live reload WS error:', err));
        </script>
      `;
            content = content.replace('</body>', `${liveReloadScript}</body>`);
            return new Response(content, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            });
        } catch (e) {
            console.error('Error serving index.html:', e);
            return new Response('Not Found', { status: 404 });
        }
    }

    // Handle .ts files: Transpile to JavaScript on-the-fly
    if (extension === '.ts') {
        try {
            const absoluteFilePath = await Deno.realPath(`.${pathname}`); // e.g. ./src/main.ts
            const fileUrl = new URL(`file://${absoluteFilePath}`);

            // Deno_emit's default loader should handle local file imports.
            // The browser will request imported .ts files, which will also be transpiled by this logic.
            const transpileOptions: TranspileOptions = {
                // No specific load function needed for local files, deno_emit handles file:// URLs.
                // Add compilerOptions if you need to customize TS behavior:
                compilerOptions: {
                    // "target": "esnext", // Already in deno.jsonc, but can be specific here
                    // "module": "esnext",
                    inlineSourceMap: true, // Helps with debugging in browser dev tools
                    // "jsx": "react-jsx", // If you were using JSX
                }
            };

            const result = await transpile(fileUrl, transpileOptions);
            const emittedJsCode = result.get(fileUrl.href);

            if (typeof emittedJsCode !== 'string') {
                console.error(`Transpilation failed for ${pathname}. Output:`, emittedJsCode);
                throw new Error(`Transpilation returned no/invalid code for ${fileUrl.href}`);
            }

            const headers = new Headers({ 'Content-Type': 'application/javascript; charset=utf-8' });
            if (serveDirOpts.enableCors) {
                headers.set('Access-Control-Allow-Origin', '*');
            }
            return new Response(emittedJsCode, { headers });

        } catch (e) {
            console.error(`Error processing TypeScript file ${pathname}:`, e);
            if (e instanceof Deno.errors.NotFound) {
                return new Response('Not Found', { status: 404 });
            }
            return new Response(`Internal Server Error transpiling TS: ${e.message}`, { status: 500 });
        }
    } else if (extension === '.js') { // Serve .js files directly
        try {
            const filePath = `.${pathname}`;
            const fileStat = await Deno.stat(filePath);
            if (!fileStat.isFile) throw new Deno.errors.NotFound();

            const fileContent = await Deno.readFile(filePath); // Read file content

            const headers = new Headers({ 'Content-Type': 'application/javascript; charset=utf-8' });
            if (serveDirOpts.enableCors) {
                headers.set('Access-Control-Allow-Origin', '*');
            }
            return new Response(fileContent, { headers }); // Serve content
        } catch (e) {
            if (e instanceof Deno.errors.NotFound) {
                return new Response('Not Found', { status: 404 });
            }
            console.error(`Error serving .js file ${pathname}:`, e);
            return new Response('Internal Server Error', { status: 500 });
        }
    }

    // Fallback to serveDir for other static files (CSS, images, etc.)
    try {
        return await serveDir(req, serveDirOpts);
    } catch (e) {
        if (e instanceof Deno.errors.NotFound) {
            return new Response('Not Found', { status: 404 });
        }
        console.error(`Error in serveDir for ${pathname}:`, e);
        return new Response('Internal Server Error', { status: 500 });
    }
}

const serveOptions: ServeOptions = {
    port: PORT,
    onListen: ({ hostname, port }) => {
        console.log(
            `🚀 Development server running at http://${hostname}:${port}/`,
        );
    },
};

fileWatcher().catch((err) => console.error('File watcher crashed:', err));
serve(handleHttpRequest, serveOptions);