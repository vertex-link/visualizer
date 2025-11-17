import { BrowserWindow } from "electron";
import { join } from "path";

export type WindowType = "preview" | "outliner" | "inspector";

interface WindowConfig {
  width: number;
  height: number;
  title: string;
  htmlPath: string;
}

const WINDOW_CONFIGS: Record<WindowType, WindowConfig> = {
  preview: {
    width: 1024,
    height: 768,
    title: "Preview",
    htmlPath: "windows/preview/index.html",
  },
  outliner: {
    width: 400,
    height: 800,
    title: "Outliner",
    htmlPath: "windows/outliner/index.html",
  },
  inspector: {
    width: 400,
    height: 600,
    title: "Inspector",
    htmlPath: "windows/inspector/index.html",
  },
};

/**
 * Manages multiple editor windows
 */
export class WindowManager {
  private windows = new Map<string, BrowserWindow>();
  private isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV === "development";
  }

  /**
   * Create a window of specified type
   */
  createWindow(type: WindowType): BrowserWindow {
    const config = WINDOW_CONFIGS[type];

    const win = new BrowserWindow({
      width: config.width,
      height: config.height,
      title: config.title,
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, "../preload/preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    // In dev: Vite serves it
    // In prod: Load from built files
    const url = this.isDev
      ? `http://localhost:5173/${config.htmlPath}`
      : `file://${join(__dirname, `../renderer/${config.htmlPath}`)}`;

    win.loadURL(url);

    if (this.isDev) {
      win.webContents.openDevTools();
    }

    // Track window
    this.windows.set(type, win);

    // Clean up on close
    win.on("closed", () => {
      this.windows.delete(type);
    });

    return win;
  }

  /**
   * Get window by type
   */
  getWindow(type: WindowType): BrowserWindow | undefined {
    return this.windows.get(type);
  }

  /**
   * Broadcast message to all windows
   */
  broadcast(channel: string, data: any): void {
    this.windows.forEach((win) => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    });
  }

  /**
   * Send message to specific window type
   */
  sendToWindow(type: WindowType, channel: string, data: any): void {
    const win = this.windows.get(type);
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }

  /**
   * Close all windows
   */
  closeAll(): void {
    this.windows.forEach((win) => {
      if (!win.isDestroyed()) {
        win.close();
      }
    });
    this.windows.clear();
  }
}
