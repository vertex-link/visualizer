# Desktop Editor Implementation Plan

## ✅ Completed (Phase 1 - Basic Architecture)

### Core Architecture
- **EditorEvents.ts** - Custom event types for editor (selection, resources, properties, file changes)
- **SelectionProcessor** - Manages actor selection state
- **PersistenceProcessor** - Auto-saves project to LokiDB every 5 seconds
- **ResourceManagerProcessor** - Handles resource import and metadata
- **IPCBridgeProcessor** - Bridges SPACe EventBus with Electron IPC
- **WindowManager** - Creates and manages multiple editor windows
- **ProjectManager** - Handles project lifecycle (open, create, close) with LokiDB

### Main Process
- Updated to use new SPACe-based architecture
- Creates test project automatically
- Opens outliner and preview windows on startup
- WebGPU enabled via command line flags

### Preload Script
- Exposes editor APIs to renderer (getScene, getActor, sendCommand, onEditorEvent)
- TypeScript declarations for window.electronAPI

### Windows
- **Outliner Window** - Fully functional Vue component that:
  - Lists all actors in scene
  - Creates new actors
  - Selects actors (communicates via IPC)
  - Receives real-time updates from main process
- **Preview Window** - Placeholder (for Engine integration)
- **Inspector Window** - Placeholder (for component properties)

### Configuration
- Updated electron.vite.config.ts for multi-window build
- Added lokijs and chokidar dependencies

## 🔄 Next Steps (Phase 2 - Scene Serialization & Preview)

### 1. Scene Serialization
Create `src/main/serialization/SceneSerializer.ts`:
- Serialize Scene → JSON (save to file)
- Deserialize JSON → Scene (load from file)
- Component serializers registry (TransformComponent, MeshRendererComponent, etc.)
- Resource reference resolution

### 2. Preview Window with Engine
Create `src/windows/preview/PreviewView.vue`:
- Initialize Engine with canvas
- Create Context for preview
- Deserialize scene from main process
- Render scene with WebGPUProcessor
- Handle real-time updates (hot reload)

### 3. File Watching
Create `src/main/processors/FileWatchProcessor.ts`:
- Watch project files with chokidar
- Emit events when scene files change
- Debounced updates (500ms)

### 4. Hot Reload
Create `src/main/processors/HotReloadProcessor.ts`:
- Listen for file change events
- Reload scene from disk
- Swap scene in Context (triggers SceneChangedEvent)
- Preview window automatically updates

## 🚀 Future Phases

### Phase 3 - Inspector & Property Editing
- Inspector window Vue component
- Property mutation processor
- Real-time property editing
- Component-specific property editors

### Phase 4 - Undo/Redo
- UndoRedoProcessor with event sourcing
- History stack (max 100 entries)
- Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)

### Phase 5 - Resource Management
- Resource browser window
- Thumbnail generation
- Drag & drop import
- Resource compilation in preview window only

### Phase 6 - WebSocket Server
- Connect browser games to editor
- Live editing in running games
- Bi-directional sync

### Phase 7 - Build System
- BuildSystemProcessor
- Run/build project commands
- Output console window

## 🎯 Architecture Highlights

### SPACe Integration
- **Main Process** = Editor Context with editor processors (no rendering)
- **Preview Window** = Separate Context with Engine + WebGPUProcessor
- **Other Windows** = Pure Vue UIs, no SPACe runtime
- **EventBus** = Unified communication across all systems
- **IPC** = Serializes events between main and renderer processes

### Data Flow
```
User Action (Outliner)
  → IPC Command
    → IPCBridgeProcessor
      → Scene Mutation
        → EventBus.emit(EntityCreatedEvent)
          → IPCBridgeProcessor forwards to all windows
            → Outliner updates list
            → Preview renders new entity
```

### Resource Strategy
- **Main Process**: Metadata only (path, type, size)
- **Preview Window**: Actual compilation (GPU resources)
- **Other Windows**: Display metadata only (thumbnails, info)

## 📝 Development Commands

```bash
# Install dependencies (requires Bun)
bun install

# Run in development mode
cd packages/desktop
bun run dev

# Build for production
bun run build

# Package as executable
bun run package
```

## 🔧 Testing the Current Implementation

1. Run `bun install` in root directory
2. Run `cd packages/desktop && bun run dev`
3. Two windows should open: Outliner and Preview
4. In Outliner, click "+ Actor" button
5. New actor should appear in list immediately
6. Check console logs in main process - processors starting
7. Check console logs in Outliner - events received

## 🏗️ Project Structure

```
packages/desktop/
├── src/
│   ├── main/
│   │   ├── events/
│   │   │   └── EditorEvents.ts        # ✅ Custom editor events
│   │   ├── processors/
│   │   │   ├── SelectionProcessor.ts       # ✅ Selection management
│   │   │   ├── PersistenceProcessor.ts     # ✅ Auto-save with LokiDB
│   │   │   ├── ResourceManagerProcessor.ts # ✅ Resource imports
│   │   │   └── IPCBridgeProcessor.ts       # ✅ EventBus ↔ IPC bridge
│   │   ├── ProjectManager.ts          # ✅ Project lifecycle
│   │   ├── WindowManager.ts           # ✅ Multi-window management
│   │   └── index.ts                   # ✅ Main entry point
│   │
│   ├── preload/
│   │   └── preload.ts                 # ✅ IPC API exposure
│   │
│   └── windows/
│       ├── outliner/
│       │   ├── index.html             # ✅ Outliner entry
│       │   ├── main.ts                # ✅ Vue mount
│       │   ├── OutlinerView.vue       # ✅ Functional UI
│       │   └── style.css              # ✅ Dark theme
│       ├── preview/
│       │   └── index.html             # ✅ Placeholder
│       └── inspector/
│           └── index.html             # ✅ Placeholder
│
├── electron.vite.config.ts            # ✅ Multi-window build config
└── package.json                       # ✅ Dependencies added
```

## 🎨 Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│         MAIN PROCESS (Editor Context)           │
│                                                 │
│  Context (SPACe)                               │
│  ├─ Scene (user's project)                    │
│  ├─ EventBus (shared)                         │
│  └─ Processors:                               │
│      ├─ SelectionProcessor                    │
│      ├─ PersistenceProcessor                  │
│      ├─ ResourceManagerProcessor              │
│      └─ IPCBridgeProcessor ─────┐            │
│                                  │             │
└──────────────────────────────────┼─────────────┘
                                   │ IPC (events)
                    ┌──────────────┼──────────┐
                    │              │          │
                    ▼              ▼          ▼
            ┌───────────┐  ┌─────────┐  ┌─────────┐
            │ OUTLINER  │  │ PREVIEW │  │INSPECTOR│
            │           │  │         │  │         │
            │ Vue UI ✅ │  │ Engine  │  │ Vue UI  │
            │ Reactive  │  │ Context │  │ (TODO)  │
            └───────────┘  │ (TODO)  │  └─────────┘
                          └─────────┘
```

## 💡 Key Concepts

1. **Editor State = Processors** (not Actors/Components)
2. **Multiple Contexts** (editor vs preview, different processors each)
3. **Scene = User's Game Data** (editor UI is separate)
4. **EventBus = Universal Communication** (IPC just serializes it)
5. **Resources Compiled Only in Preview** (metadata elsewhere)

## 📚 References

- SPACe Architecture: `/packages/space/`
- Engine Architecture: `/packages/engine/`
- Example Usage: `/packages/documentation/src/docs/examples/`
