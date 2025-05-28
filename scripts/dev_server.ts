// scripts/dev_server.ts - Enhanced Development Server
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.208.0/http/file_server.ts";
import { exists } from "https://deno.land/std@0.208.0/fs/exists.ts";
import { extname, join, resolve } from "https://deno.land/std@0.208.0/path/mod.ts";
import { transpile, type LoadResponse } from "jsr:@deno/emit"; // Adjust version as needed

const PORT = 8000;
const HOST = "localhost";

interface ServerConfig {
    port: number;
    host: string;
    cors: boolean;
    transpileTS: boolean;
    hotReload: boolean;
    compression: boolean;
    verbose: boolean;
}

class VertexLinkDevServer {
    private config: ServerConfig;
    private connectedClients: Set<WebSocket> = new Set();
    private watchedFiles: Set<string> = new Set();

    constructor(config: Partial<ServerConfig> = {}) {
        this.config = {
            port: PORT,
            host: HOST,
            cors: true,
            transpileTS: true,
            hotReload: true,
            compression: false,
            verbose: true,
            ...config
        };
    }

    async start(): Promise<void> {
        this.printWelcomeMessage();

        // Start file watcher for hot reload
        if (this.config.hotReload) {
            this.startFileWatcher();
        }

        await serve(this.handleRequest.bind(this), {
            port: this.config.port,
            hostname: this.config.host,
            onListen: () => {
                console.log(`🌐 Server running at http://${this.config.host}:${this.config.port}`);
                this.printAvailableRoutes();
            }
        });
    }

    private async handleRequest(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const pathname = url.pathname;

        // Log requests in verbose mode
        if (this.config.verbose) {
            console.log(`${new Date().toLocaleTimeString()} ${req.method} ${pathname}`);
        }

        try {
            // Handle CORS preflight
            if (req.method === "OPTIONS") {
                return this.createCORSResponse();
            }

            // Handle WebSocket upgrade for hot reload
            if (pathname === "/ws" && req.headers.get("upgrade") === "websocket") {
                return this.handleWebSocketUpgrade(req);
            }

            // Handle API endpoints
            if (pathname.startsWith("/api/")) {
                return this.handleAPIRequest(req, pathname);
            }

            // Handle special routes
            const specialResponse = await this.handleSpecialRoutes(req, pathname);
            if (specialResponse) {
                return specialResponse;
            }

            // Handle static files
            return await this.handleStaticFile(req, pathname);

        } catch (error) {
            console.error(`❌ Error handling ${pathname}:`, error);
            return this.createErrorResponse(500, "Internal Server Error", error.message);
        }
    }

    private async handleStaticFile(req: Request, pathname: string): Promise<Response> {
        // Default to examples/index.html for root
        if (pathname === "/" || pathname === "/index.html" || pathname === "/examples/phase3") { // Added /examples/phase3
            pathname = "/examples/phase3/index.html"; // Point to phase 3 demo
        }

        // Try to serve the file
        let filePath = `.${pathname}`;

        // Check if file exists
        if (!(await exists(filePath))) {
            // Try common extensions for convenience
            const alternatives = [
                `${filePath}.html`,
                `${filePath}/index.html`,
                `./examples${pathname}`,
                `./examples${pathname}.html`,
                `./examples${pathname}/index.html`
            ];

            let found = false;
            for (const alt of alternatives) {
                if (await exists(alt)) {
                    filePath = alt;
                    found = true;
                    break;
                }
            }

            if (!found && pathname.endsWith('/')) { // Check index.html for directories
                const indexTry = `${filePath}index.html`;
                if (await exists(indexTry)) {
                    filePath = indexTry;
                    found = true;
                }
            }


            if (!found) {
                // Check if it's likely a directory access and serve index.html
                if (!extname(filePath) && await exists(`${filePath}/index.html`)) {
                    filePath = `${filePath}/index.html`;
                } else {
                    return this.createErrorResponse(404, "File Not Found", `Could not find: ${pathname}`);
                }
            }
        }

        // Handle TypeScript files
        if (this.config.transpileTS && extname(filePath) === ".ts") {
            return await this.handleTypeScriptFile(filePath);
        }

        // Serve regular files
        let response = await serveDir(req, {
            fsRoot: ".",
            urlRoot: "",
            quiet: !this.config.verbose,
        });

        // Add hot reload script to HTML files
        if (this.config.hotReload && response.headers.get("content-type")?.includes("text/html")) {
            response = await this.injectHotReload(response);
        }

        // --- FIX: Create a new response with new headers for CORS ---
        if (this.config.cors) {
            // Create a new Headers object, copying from the original response
            const newHeaders = new Headers(response.headers);
            const corsHeaders = this.getCORSHeaders();

            // Add/overwrite CORS headers on the *new* Headers object
            for (const [key, value] of Object.entries(corsHeaders)) {
                newHeaders.set(key, value);
            }

            // Return a *new* Response using the original body/status but the *new* headers
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders,
            });
        }
        // --- End FIX ---

        // If CORS is not enabled, return the (potentially hot-reloaded) response
        return response;
    }

    private async handleTypeScriptFile(filePath: string): Promise<Response> {
        try {
            const currentWorkingDir = Deno.cwd(); // Root of your project, e.g., /home/aaron/projects/vertex-link/visualizer
            console.log(`Transpiling (@deno/emit) ${filePath} from CWD: ${currentWorkingDir}`);

            // Ensure filePath is correctly resolved to an absolute file URL for the entry point
            const entryPointUrl = new URL(filePath, `file://${currentWorkingDir}/`).toString();
            console.log(`Entry point URL for @deno/emit: ${entryPointUrl}`);

            const result = await transpile(entryPointUrl, {
                // Custom load function to intercept and potentially correct paths
                async load(specifier: string): Promise<LoadResponse | undefined> {
                    console.log(`@deno/emit load request: ${specifier}`);
                    const url = new URL(specifier);

                    if (url.protocol === "file:") {
                        const fsPath = decodeURIComponent(url.pathname);
                        try {
                            // Check if the file exists at the path @deno/emit resolved
                            if (await exists(fsPath)) {
                                const content = await Deno.readTextFile(fsPath);
                                console.log(`Loaded via custom load: ${fsPath}`);
                                return {
                                    kind: "module",
                                    specifier: specifier, // Use the original absolute file URL specifier
                                    content: content,
                                };
                            } else {
                                console.warn(`Custom load: File does not exist at path: ${fsPath}`);
                            }
                        } catch (e) {
                            console.error(`Custom load: Error reading file ${fsPath}:`, e);
                        }
                    } else {
                        console.log(`Custom load: Skipping non-file specifier: ${specifier}`);
                    }
                    // If not found or not a file URL, let @deno/emit handle or error
                    return undefined;
                },
                compilerOptions: {
                    // experimentalDecorators: true,
                    // emitDecoratorMetadata: true,
                    "lib": ["deno.ns", "dom", "dom.iterable", "dom.asynciterable", "deno.unstable"],
                    "target": "esnext",
                    inlineSourceMap: true,
                    // Consider adding if you have a deno.json with an import map
                    // importMap: "./deno.json" // or path to your import map
                },
            });

            // Find the emitted code for the entry point
            let jsCode = "";
            for (const [outPathSpecifier, emittedSource] of result) {
                // The output specifier from transpile is the same as the input specifier
                if (outPathSpecifier === entryPointUrl) {
                    jsCode = emittedSource;
                    break;
                }
            }

            if (!jsCode) {
                // If the entryPointUrl itself wasn't in the output map keys,
                // it implies an issue with the transpile process for that specific file.
                console.error("Output map from @deno/emit:", result);
                throw new Error(`@deno/emit did not produce JavaScript output for the entry point ${entryPointUrl}. Check logs for load errors.`);
            }

            // IMPORTANT: Rewrite .ts imports to .ts for the browser.
            // This regex aims to catch imports like:
            // from './foo.ts' -> from './foo.ts' (no change)
            // from './foo.js' -> from './foo.ts' (if @deno/emit changed it)
            // from './foo'    -> from './foo.ts' (if @deno/emit removed extension)
            jsCode = jsCode.replace(
                /(from\s+["'])(.+?)(["'])/g,
                (match, prefix, modulePath, suffix) => {
                    let cleanModulePath = modulePath.split('?')[0]; // Remove query parameters like ?t=123

                    if (cleanModulePath.endsWith('.ts')) {
                        // Already ends with .ts, path is correct
                        return `${prefix}${cleanModulePath}${suffix}`;
                    } else if (cleanModulePath.endsWith('.js')) {
                        // Ends with .js, replace with .ts
                        return `${prefix}${cleanModulePath.slice(0, -3)}.ts${suffix}`;
                    } else if (cleanModulePath.endsWith('.mjs')) {
                        // Ends with .mjs, replace with .ts
                        return `${prefix}${cleanModulePath.slice(0, -4)}.ts${suffix}`;
                    } else {
                        // No recognized extension, or a different one (e.g. import from a directory)
                        // Append .ts, assuming it's a module that needs transpilation.
                        // This also handles cases where @deno/emit might strip extensions.
                        return `${prefix}${cleanModulePath}.ts${suffix}`;
                    }
                }
            );
            console.log(`Transpilation successful for ${filePath}. Output size: ${jsCode.length}`);

            return new Response(jsCode, {
                headers: {
                    "Content-Type": "application/javascript;charset=utf-8",
                    ...this.getCORSHeaders()
                }
            });

        } catch (error) {
            console.error(`❌ TypeScript Transpilation Error (@deno/emit) for ${filePath}:`, error);
            return this.createErrorResponse(500, "TypeScript Transpilation Error", error.message + (error.stack ? `\nStack: ${error.stack}` : ''));
        }
    }
    
    private async handleAPIRequest(req: Request, pathname: string): Response {
        const apiPath = pathname.replace("/api/", "");

        switch (apiPath) {
            case "status":
                return Response.json({
                    status: "running",
                    timestamp: new Date().toISOString(),
                    config: this.config,
                    connectedClients: this.connectedClients.size
                });

            case "examples":
                return Response.json(await this.getAvailableExamples());

            case "reload":
                this.broadcastReload();
                return Response.json({ message: "Reload signal sent" });

            default:
                return this.createErrorResponse(404, "API Endpoint Not Found", `Unknown API: ${apiPath}`);
        }
    }

    private async handleSpecialRoutes(req: Request, pathname: string): Promise<Response | null> {
        // Handle favicon
        if (pathname === "/favicon.ico") {
            return new Response(null, { status: 204 });
        }

        // Redirect old paths to examples
        const redirects: Record<string, string> = {
            "/test-phase1.html": "/examples/phase1/test-phase1.html",
            "/test-phase2.html": "/examples/phase2/test-phase2.html",
            "/phase2-demo.html": "/examples/phase2/demo.html"
        };

        if (redirects[pathname]) {
            return Response.redirect(`http://${this.config.host}:${this.config.port}${redirects[pathname]}`, 302);
        }

        return null;
    }

    private handleWebSocketUpgrade(req: Request): Response {
        const { socket, response } = Deno.upgradeWebSocket(req);

        socket.onopen = () => {
            this.connectedClients.add(socket);
            console.log(`🔌 WebSocket client connected (${this.connectedClients.size} total)`);
        };

        socket.onclose = () => {
            this.connectedClients.delete(socket);
            console.log(`🔌 WebSocket client disconnected (${this.connectedClients.size} total)`);
        };

        socket.onerror = (error) => {
            console.error("❌ WebSocket error:", error);
            this.connectedClients.delete(socket);
        };

        return response;
    }

    private async startFileWatcher(): Promise<void> {
        const watchPaths = ["./src", "./examples", "./scripts"];
        console.log("👀 File watcher started for:", watchPaths.join(", "));

        try {
            for (const path of watchPaths) {
                if (await exists(path)) {
                    this.watchDirectory(path);
                }
            }
        } catch (error) {
            console.warn("⚠️ File watcher setup failed:", error.message);
        }
    }

    private async watchDirectory(dirPath: string): Promise<void> {
        try {
            const watcher = Deno.watchFs(dirPath);

            // Debounce file changes
            let timeout: number | null = null;

            for await (const event of watcher) {
                if (event.kind === "modify" || event.kind === "create") {
                    if (timeout) clearTimeout(timeout);

                    timeout = setTimeout(() => {
                        const files = event.paths.filter(p =>
                            p.endsWith('.ts') || p.endsWith('.js') || p.endsWith('.html') || p.endsWith('.css')
                        );

                        if (files.length > 0) {
                            console.log(`📁 File changed: ${files[0]}`);
                            this.broadcastReload();
                        }
                    }, 100);
                }
            }
        } catch (error) {
            if (this.config.verbose) {
                console.warn(`⚠️ Could not watch directory ${dirPath}:`, error.message);
            }
        }
    }

    private broadcastReload(): void {
        const message = JSON.stringify({ type: "reload", timestamp: Date.now() });

        for (const client of this.connectedClients) {
            try {
                client.send(message);
            } catch (error) {
                console.warn("⚠️ Failed to send reload signal to client:", error.message);
                this.connectedClients.delete(client);
            }
        }

        if (this.connectedClients.size > 0) {
            console.log(`🔄 Reload signal sent to ${this.connectedClients.size} clients`);
        }
    }

    private async injectHotReload(response: Response): Promise<Response> {
        if (!response.body) return response;

        const text = await response.text();
        const hotReloadScript = `
    <script>
      (function() {
        console.log('🔥 Hot reload enabled');
        const ws = new WebSocket('ws://localhost:${this.config.port}/ws');
        ws.onmessage = function(event) {
          const data = JSON.parse(event.data);
          if (data.type === 'reload') {
            console.log('🔄 Hot reload triggered');
            location.reload();
          }
        };
        ws.onerror = function() { console.warn('⚠️ Hot reload WebSocket connection failed'); };
      })();
    </script>
  `;

        const modifiedHTML = text.replace('</body>', `${hotReloadScript}</body>`);

        return new Response(modifiedHTML, {
            headers: response.headers
        });
    }

    private async getAvailableExamples(): Promise<any> {
        const examples: any = {};

        try {
            const examplesDir = "./examples";
            if (await exists(examplesDir)) {
                for await (const entry of Deno.readDir(examplesDir)) {
                    if (entry.isDirectory) {
                        examples[entry.name] = await this.scanExampleDirectory(join(examplesDir, entry.name));
                    } else if (entry.name.endsWith('.html')) {
                        examples[entry.name] = { type: 'html', path: `/examples/${entry.name}` };
                    }
                }
            }
        } catch (error) {
            console.warn("⚠️ Could not scan examples directory:", error.message);
        }

        return examples;
    }

    private async scanExampleDirectory(dirPath: string): Promise<any> {
        const files: any = {};

        try {
            for await (const entry of Deno.readDir(dirPath)) {
                if (entry.isFile) {
                    const ext = extname(entry.name);
                    files[entry.name] = {
                        type: ext.slice(1) || 'file',
                        path: `/${dirPath}/${entry.name}`.replace('./','')
                    };
                }
            }
        } catch (error) {
            // Directory might not be readable
        }

        return files;
    }

    private createCORSResponse(): Response {
        return new Response(null, {
            status: 200,
            headers: this.getCORSHeaders()
        });
    }

    private createErrorResponse(status: number, title: string, message: string): Response {
        const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #1a1a1a; color: white; }
        h1 { color: #ff6b6b; }
        .error-box { background: #333; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .back-link { color: #4ecdc4; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>⚠️ ${title}</h1>
      <div class="error-box">
        <p><strong>Error:</strong> ${message}</p>
        <p><strong>Status:</strong> ${status}</p>
      </div>
      <p><a href="/examples/" class="back-link">← Back to Examples</a></p>
      <script>
        setTimeout(() => {
          console.log('🔄 Auto-refresh in 3 seconds...');
          setTimeout(() => location.reload(), 3000);
        }, 1000);
      </script>
    </body>
    </html>
    `;

        return new Response(html, {
            status,
            headers: {
                "Content-Type": "text/html",
                ...this.getCORSHeaders()
            }
        });
    }

    private getCORSHeaders(): Record<string, string> {
        if (!this.config.cors) return {};

        return {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400"
        };
    }

    private addCORSHeaders(response: Response): void {
        if (!this.config.cors) return;

        const headers = this.getCORSHeaders();
        for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
        }
    }

    private printWelcomeMessage(): void {
        console.log(`
🚀 Vertex Link Development Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️  Configuration:
   • Port: ${this.config.port}
   • Host: ${this.config.host}
   • CORS: ${this.config.cors ? '✅' : '❌'}
   • TypeScript: ${this.config.transpileTS ? '✅' : '❌'}
   • Hot Reload: ${this.config.hotReload ? '✅' : '❌'}
   • Compression: ${this.config.compression ? '✅' : '❌'}
   • Verbose: ${this.config.verbose ? '✅' : '❌'}
`);
    }

    private printAvailableRoutes(): void {
        console.log(`
🎮 Available Routes:
━━━━━━━━━━━━━━━━━━━━━━

📱 Main Examples:
   • http://${this.config.host}:${this.config.port}/
   • http://${this.config.host}:${this.config.port}/examples/

🧪 Phase 1 Tests:
   • http://${this.config.host}:${this.config.port}/examples/phase1/

🔬 Phase 2 Tests:
   • http://${this.config.host}:${this.config.port}/examples/phase2/
   • http://${this.config.host}:${this.config.port}/examples/phase2/demo.html

📡 API Endpoints:
   • http://${this.config.host}:${this.config.port}/api/status
   • http://${this.config.host}:${this.config.port}/api/examples
   • http://${this.config.host}:${this.config.port}/api/reload

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
    }
}

// Start the server
if (import.meta.main) {
    const server = new VertexLinkDevServer({
        port: parseInt(Deno.env.get("PORT") || "8000"),
        host: Deno.env.get("HOST") || "localhost",
        verbose: Deno.env.get("VERBOSE") === "true",
        hotReload: Deno.env.get("HOT_RELOAD") !== "false"
    });

    try {
        await server.start();
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        Deno.exit(1);
    }
}