# Desktop Package - LLM Implementation Instructions

## Package Purpose
The desktop package provides an Electron-based editor application for visual scene editing with the Vertex Link engine. This is an experimental package aimed at providing a native desktop experience for development and content creation.

## Directory Structure
```
packages/desktop/
├── src/
│   ├── main/                      # Electron main process
│   │   └── index.ts               # Main process entry
│   ├── preload/                   # Preload scripts
│   │   └── preload.ts            # Context bridge setup
│   └── renderer/                  # Renderer process
│       ├── index.html            # UI entry point
│       ├── editor/               # Editor implementation
│       │   ├── Editor.ts         # Main editor class
│       │   ├── SceneView.ts      # 3D viewport
│       │   ├── Inspector.ts      # Property inspector
│       │   └── Hierarchy.ts      # Scene hierarchy
│       └── styles/               # UI styles
├── electron.vite.config.ts       # Electron-vite config
├── package.json
└── tsconfig.json
```

## Electron Architecture

### Main Process
```typescript
// src/main/index.ts
import { BrowserWindow, app, ipcMain } from "electron";

let mainWindow: BrowserWindow;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    frame: false,                    // Custom title bar
    transparent: true,
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,           // For local file access
      experimentalFeatures: true    // For WebGPU
    }
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
};

// Enable WebGPU flags
app.commandLine.appendSwitch("enable-unsafe-webgpu");
app.commandLine.appendSwitch("enable-features", "Vulkan,WebGPU");
```

### Preload Script
```typescript
// src/preload/preload.ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // File operations
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  saveFile: (data: any) => ipcRenderer.invoke("dialog:saveFile", data),
  
  // Window controls
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
  
  // Project management
  loadProject: (path: string) => ipcRenderer.invoke("project:load", path),
  saveProject: (data: any) => ipcRenderer.invoke("project:save", data),
  
  // Asset management
  importAsset: (path: string) => ipcRenderer.invoke("asset:import", path),
  getAssetList: () => ipcRenderer.invoke("asset:list")
});
```

### Renderer Process
```typescript
// src/renderer/editor/Editor.ts
import { EngineContext, Scene } from "@vertex-link/engine";

export class Editor {
  private engineContext: EngineContext;
  private currentScene: Scene;
  private viewport: SceneView;
  private inspector: Inspector;
  private hierarchy: Hierarchy;
  
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    // Initialize engine with WebGPU
    this.engineContext = new EngineContext(canvas);
    await this.engineContext.initialize();
    
    // Setup editor panels
    this.viewport = new SceneView(this.engineContext);
    this.inspector = new Inspector();
    this.hierarchy = new Hierarchy();
    
    // Load or create scene
    this.currentScene = new Scene("EditorScene");
    this.engineContext.setScene(this.currentScene);
    
    // Start render loop
    this.engineContext.start();
  }
}
```

## Editor Features

### Scene Viewport
```typescript
class SceneView {
  private canvas: HTMLCanvasElement;
  private cameraController: EditorCameraController;
  private gizmoRenderer: GizmoRenderer;
  private gridRenderer: GridRenderer;
  
  constructor(context: EngineContext) {
    // Setup viewport camera
    this.cameraController = new EditorCameraController();
    
    // Setup editor helpers
    this.gizmoRenderer = new GizmoRenderer();
    this.gridRenderer = new GridRenderer();
  }
  
  // Handle mouse/keyboard for navigation
  handleInput(event: InputEvent): void {
    // Orbit, pan, zoom controls
    this.cameraController.handleInput(event);
  }
  
  // Selection and manipulation
  selectActor(actor: Actor): void {
    this.gizmoRenderer.attachTo(actor);
  }
}
```

### Property Inspector
```typescript
class Inspector {
  private selectedActor?: Actor;
  private propertyFields: Map<string, PropertyField>;
  
  showActor(actor: Actor): void {
    this.selectedActor = actor;
    this.clearFields();
    
    // Show transform
    const transform = actor.getComponent(TransformComponent);
    if (transform) {
      this.addVector3Field("Position", transform.position);
      this.addVector3Field("Rotation", transform.rotation);
      this.addVector3Field("Scale", transform.scale);
    }
    
    // Show other components
    for (const component of actor.getAllComponents()) {
      this.showComponent(component);
    }
  }
  
  private showComponent(component: Component): void {
    // Reflect on component properties
    // Generate appropriate UI controls
    // Bind two-way data updates
  }
}
```

### Scene Hierarchy
```typescript
class Hierarchy {
  private treeView: TreeView;
  private scene: Scene;
  
  refresh(): void {
    const actors = this.scene.getAllActors();
    this.treeView.clear();
    
    for (const actor of actors) {
      const node = this.createNode(actor);
      this.treeView.addRoot(node);
    }
  }
  
  private createNode(actor: Actor): TreeNode {
    return {
      id: actor.id,
      label: actor.name,
      icon: this.getActorIcon(actor),
      children: [], // For future hierarchy support
      onSelect: () => this.selectActor(actor),
      onRename: (name) => actor.name = name,
      onDelete: () => this.deleteActor(actor)
    };
  }
}
```

## UI Implementation

### Custom Title Bar
```html
<!-- Custom title bar for frameless window -->
<div class="title-bar">
  <div class="title-bar-logo">Vertex Link Editor</div>
  <div class="title-bar-menu">
    <button>File</button>
    <button>Edit</button>
    <button>Assets</button>
    <button>Tools</button>
  </div>
  <div class="title-bar-controls">
    <button onclick="window.electronAPI.minimize()">_</button>
    <button onclick="window.electronAPI.maximize()">□</button>
    <button onclick="window.electronAPI.close()">×</button>
  </div>
</div>
```

### Layout System
```typescript
// Dockable panels using a layout library
interface PanelLayout {
  type: "horizontal" | "vertical" | "tab";
  children: (PanelLayout | Panel)[];
  sizes?: number[];
}

const defaultLayout: PanelLayout = {
  type: "horizontal",
  children: [
    { id: "hierarchy", title: "Hierarchy", width: 200 },
    {
      type: "vertical",
      children: [
        { id: "viewport", title: "Scene", flex: 1 },
        { id: "console", title: "Console", height: 150 }
      ]
    },
    { id: "inspector", title: "Inspector", width: 300 }
  ]
};
```

## Project Management

### Project Structure
```typescript
interface Project {
  name: string;
  version: string;
  scenes: SceneData[];
  assets: AssetReference[];
  settings: ProjectSettings;
}

interface SceneData {
  id: string;
  name: string;
  actors: SerializedActor[];
}

interface SerializedActor {
  id: string;
  name: string;
  components: SerializedComponent[];
}
```

### Serialization
```typescript
class ProjectSerializer {
  serialize(scene: Scene): SceneData {
    return {
      id: scene.id,
      name: scene.name,
      actors: scene.getAllActors().map(actor => ({
        id: actor.id,
        name: actor.name,
        components: this.serializeComponents(actor)
      }))
    };
  }
  
  deserialize(data: SceneData): Scene {
    const scene = new Scene(data.name);
    
    for (const actorData of data.actors) {
      const actor = new Actor(actorData.name);
      
      for (const compData of actorData.components) {
        this.deserializeComponent(actor, compData);
      }
      
      scene.addActor(actor);
    }
    
    return scene;
  }
}
```

## Asset Pipeline

### Asset Import
```typescript
class AssetImporter {
  async importModel(path: string): Promise<MeshResource> {
    const data = await window.electronAPI.importAsset(path);
    
    // Parse based on file type
    if (path.endsWith(".obj")) {
      return this.parseOBJ(data);
    } else if (path.endsWith(".gltf")) {
      return this.parseGLTF(data);
    }
    
    throw new Error(`Unsupported format: ${path}`);
  }
}
```

### Hot Reload
```typescript
class AssetWatcher {
  watch(assetPath: string, callback: () => void): void {
    // Use Node.js fs.watch via IPC
    window.electronAPI.watchAsset(assetPath, callback);
  }
}
```

## Important Implementation Rules

### ✅ DO's
- Use IPC for all Node.js operations
- Maintain context isolation
- Handle WebGPU initialization failures
- Save projects incrementally
- Implement undo/redo system
- Use virtual scrolling for large scenes

### ❌ DON'Ts
- Don't access Node.js directly in renderer
- Don't block the UI thread
- Don't load entire projects into memory
- Don't assume WebGPU availability
- Don't skip input validation
- Don't leak GPU resources

## WebGPU in Electron

### Initialization
```typescript
async function initWebGPU(): Promise<GPUDevice> {
  if (!navigator.gpu) {
    throw new Error("WebGPU not available in Electron");
  }
  
  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance"
  });
  
  if (!adapter) {
    throw new Error("No GPU adapter found");
  }
  
  return await adapter.requestDevice({
    requiredFeatures: ["timestamp-query"],
    requiredLimits: {
      maxBindGroups: 4,
      maxUniformBuffersPerShaderStage: 12
    }
  });
}
```

### Required Flags
```javascript
// Main process - required for WebGPU
app.commandLine.appendSwitch("enable-unsafe-webgpu");
app.commandLine.appendSwitch("enable-features", "Vulkan,WebGPU");
app.commandLine.appendSwitch("use-angle", "vulkan");
```

## Tooling & Extensions

### Editor Tools
- Transform gizmo (move, rotate, scale)
- Grid and axis helpers
- Statistics overlay (FPS, draw calls)
- Material preview
- Asset browser
- Console output

### Future Extensions
- Visual scripting
- Timeline/animation editor
- Particle system editor
- Shader graph editor
- Performance profiler
- Lightmap baker

## Testing Approach

```typescript
describe("Editor", () => {
  it("should initialize with WebGPU", async () => {
    const canvas = document.createElement("canvas");
    const editor = new Editor();
    await editor.initialize(canvas);
    expect(editor.isReady()).toBe(true);
  });
  
  it("should serialize/deserialize scenes", () => {
    const scene = createTestScene();
    const data = serializer.serialize(scene);
    const restored = serializer.deserialize(data);
    expect(restored.actors.length).toBe(scene.actors.length);
  });
});
```

## Current Status & TODOs

### Implemented
- ✅ Basic Electron setup
- ✅ WebGPU initialization
- ✅ Window controls
- ⚠️ Basic viewport (needs work)

### TODO
1. **UI Framework**: Choose between custom or library (imgui-js?)
2. **Gizmos**: Implement transform manipulation
3. **Asset Pipeline**: Model/texture import
4. **Serialization**: Save/load projects
5. **Undo System**: Command pattern implementation
6. **Multi-viewport**: Multiple camera views
7. **Play Mode**: Test scenes in editor

## Build & Development

```bash
# Install dependencies
bun install

# Development mode
bun run dev

# Build for production
bun run build

# Package for distribution
bun run package

# Type checking
bun run typecheck
```

## Distribution

### Packaging Configuration
```json
{
  "build": {
    "appId": "com.vertexlink.editor",
    "productName": "Vertex Link Editor",
    "directories": {
      "output": "dist"
    },
    "files": [
      "dist/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.developer-tools"
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

## Integration Requirements

### With Engine Package
- Full access to all engine features
- Custom render passes for editor
- Debug visualization components

### With ACS Package
- Scene serialization
- Component reflection
- Actor manipulation

### With Documentation
- Share example assets
- Consistent API usage
- Tutorial integration

## Performance Considerations

- Use virtual lists for large hierarchies
- Lazy load assets
- Cache viewport renders when idle
- Batch property updates
- Defer non-critical operations

## Platform-Specific Notes

### Windows
- WebGPU via D3D12/Vulkan
- Native file dialogs
- Custom title bar styling

### macOS
- WebGPU via Metal (limited)
- Native menu bar
- Code signing required

### Linux
- WebGPU via Vulkan
- GTK file dialogs
- AppImage distribution