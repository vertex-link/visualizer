# Desktop Package - LLM Implementation Instructions

## Package Purpose
The desktop package provides an Electron-based editor application for visual scene editing with the Vertex Link engine. It uses **Electron**, **Vite**, and **Vue 3**.

---

> ⚠️ **Aspirational Document Warning**
> This document describes the **target architecture** and planned features for the editor. As of the last update, only the basic Electron shell, WebGPU initialization, and a minimal Vue renderer process are implemented. Most features described below (Inspector, Hierarchy, Serialization, etc.) are **not yet implemented**.

---

## Current Status (High-Level)

-   **Implemented**: Basic Electron setup with `electron-vite`, a Vue 3 renderer process, WebGPU initialization, and basic window controls via IPC.
-   **TODO**: The vast majority of editor features, including UI panels, scene manipulation, asset pipeline, and project serialization.

## Core Architecture (As Implemented)

### Directory Structure
```
packages/desktop/
├── src/
│   ├── main/                      # Electron main process
│   │   └── index.ts               # Main process entry point
│   ├── preload/                   # Preload scripts (context bridge)
│   │   └── preload.ts             # Exposes safe APIs to the renderer
│   └── app/                       # Renderer process (Vue 3 application)
│       ├── index.html             # UI entry point
│       └── src/                   # Vue app source
│           ├── App.vue
│           └── main.ts
├── electron.vite.config.ts        # Electron-vite configuration
└── package.json
```

### Main Process (`src/main/index.ts`)
The main process is responsible for creating the `BrowserWindow` and enabling WebGPU.
```typescript
// Key snippet from src/main/index.ts
const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    frame: false, // Using a custom title bar
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
    }
  });

  // Load from Vite dev server in development
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
  }
};

// Enable WebGPU flags
app.commandLine.appendSwitch("enable-unsafe-webgpu");
app.commandLine.appendSwitch("enable-features", "Vulkan,WebGPU");
```

### Preload Script (`src/preload/preload.ts`)
The preload script uses a context bridge to expose a very limited, secure API to the Vue renderer process. Currently, this only includes window controls.
```typescript
// src/preload/preload.ts
contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.invoke("window-minimize"),
  close: () => ipcRenderer.invoke("window-close"),
});
```

### Renderer Process (`src/app/`)
This is a standard Vue 3 application that serves as the UI for the editor. It is where all the editor panels and the 3D viewport will be built.

## Planned Editor Features (Design Specification)

The following sections describe the **intended design** for the editor's features.

### Planned: Scene Viewport
The 3D viewport where the scene is rendered. It will have its own camera controller for editor navigation (orbit, pan, zoom) and render helpers like a grid and transform gizmos.

### Planned: Property Inspector
A UI panel that displays the properties of the selected actor and its components. It should allow for real-time editing of values.
```typescript
// Conceptual design
class Inspector {
  showActor(actor: Actor): void {
    // Reflect on actor's components
    // Generate UI controls for each property (e.g., Vec3 for position)
    // Bind UI controls to component properties for two-way data flow
  }
}
```

### Planned: Scene Hierarchy
A tree view that lists all actors in the scene. It will allow for selecting, renaming, deleting, and parenting actors.

### Planned: Project Management & Serialization
A system for saving and loading entire scenes or projects. This involves serializing actors and their components to a JSON format.
```typescript
// Conceptual design
class ProjectSerializer {
  serialize(scene: Scene): SceneData; // Returns a JSON-compatible object
  deserialize(data: SceneData): Scene; // Reconstructs a Scene from data
}
```

### Planned: Asset Pipeline
A set of tools for importing and managing assets like models and textures. This will involve using the main process (via IPC) to read files from disk and processing them in the renderer.

## Build & Development

This project uses `electron-vite`.

```bash
# Install dependencies (from monorepo root)
bun install

# Run in development mode
bun run dev

# Build for production
bun run build

# Package for distribution
bun run package
```
