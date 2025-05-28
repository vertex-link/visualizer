// scripts/dev_server.ts - Enhanced Development Server
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.208.0/http/file_server.ts";
import { exists } from "https://deno.land/std@0.208.0/fs/exists.ts";
import { extname, join, resolve } from "https://deno.land/std@0.208.0/path/mod.ts";

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
        if (pathname === "/" || pathname === "/index.html") {
            pathname = "/examples/index.html";
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

            if (!found) {
                return this.createErrorResponse(404, "File Not Found", `Could not find: ${pathname}`);
            }
        }

        // Handle TypeScript files
        if (this.config.transpileTS && extname(filePath) === ".ts") {
            return await this.handleTypeScriptFile(filePath);
        }

        // Serve regular files
        const response = await serveDir(req, {
            fsRoot: ".",
            urlRoot: "",
            quiet: !this.config.verbose,
        });

        // Add hot reload script to HTML files
        if (this.config.hotReload && response.headers.get("content-type")?.includes("text/html")) {
            return await this.injectHotReload(response);
        }

        // Add CORS headers
        if (this.config.cors) {
            this.addCORSHeaders(response);
        }

        return response;
    }

    private async handleTypeScriptFile(filePath: string): Promise<Response> {
        try {
            const source = await Deno.readTextFile(filePath);

            // Simple TypeScript to JavaScript transpilation
            // For more complex cases, you might want to use the TypeScript compiler API
            let jsSource = source
                // Remove TypeScript imports with .ts extensions
                .replace(/from\s+["'](.+?)\.ts["']/g, 'from "$1.js"')
                // Remove type annotations (basic)
                .replace(/:\s*\w+(\[\])?(\s*[=,)])/g, '$2')
                // Remove interface declarations (basic)
                .replace(/^interface\s+\w+\s*{[^}]*}/gm, '')
                // Remove type exports
                .replace(/^export\s+type\s+.+$/gm, '');

            return new Response(jsSource, {
                headers: {
                    "Content-Type": "application/javascript",
                    ...this.getCORSHeaders()
                }
            });
        } catch (error) {
            return this.createErrorResponse(500, "TypeScript Transpilation Error", error.message);
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