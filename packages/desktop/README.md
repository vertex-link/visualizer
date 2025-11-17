# @vertex-link/desktop

Desktop editor for Vertex Link game engine built with Electron, Vue, and SPACe architecture.

## Overview

The desktop editor is a multi-window application that provides visual tools for creating and editing Vertex Link projects. It's built entirely on **SPACe** (Actor-Component-System) patterns, where editor functionality is implemented as **Processors** rather than traditional UI state management.

> **Status:** Phase 1 complete - Basic architecture, outliner window, and IPC bridge functional. See `IMPLEMENTATION_PLAN.md` for roadmap.

## Architecture

### SPACe-First Design

The editor itself is a SPACe application:
- **Main Process** runs an editor Context with processors for selection, persistence, resources, etc.
- **Preview Window** runs a separate Context with the full Engine + WebGPUProcessor
- **Other Windows** are lightweight Vue UIs that communicate via IPC

```
Main Process (Editor Context)
├── SelectionProcessor - Manages actor selection
├── PersistenceProcessor - Auto-saves to LokiDB
├── ResourceManagerProcessor - Handles asset imports
└── IPCBridgeProcessor - Bridges EventBus ↔ IPC

Renderer Windows
├── Outliner - Scene hierarchy ✅ Functional
├── Preview - 3D viewport 🚧 Placeholder
└── Inspector - Component properties 🚧 Placeholder
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime

### Installation

From the repository root:
```bash
bun install
```

### Development

```bash
cd packages/desktop
bun run dev
```

This will:
1. Create a test project in your user data directory
2. Open the Outliner window (actor list)
3. Open the Preview window (placeholder)

### Testing Current Features

**Create an Actor:**
- Click "+ Actor" in the Outliner window
- New actor appears in the list immediately
- Main process logs show `EntityCreatedEvent`

**Select an Actor:**
- Click on any actor in the Outliner
- Selection highlight appears
- `SelectionChangedEvent` is emitted

**Auto-Save:**
- Create or delete actors
- Wait 5 seconds
- Console shows "💾 Project auto-saved"

## Current Implementation

### ✅ Phase 1 Complete

- Multi-window architecture with WindowManager
- SPACe-based processor system
- IPC bridge connecting EventBus to Electron IPC
- Outliner window (fully functional Vue UI)
- Project management with LokiDB
- Auto-save every 5 seconds
- Selection system
- Real-time event propagation

### 🚧 Next: Phase 2

- Scene serialization/deserialization
- Preview window with Engine integration
- File watching and hot reload
- Property editing

See `IMPLEMENTATION_PLAN.md` for complete roadmap.

## Development Guide

### Project Structure

```
src/
├── main/              # Main process (Node.js)
│   ├── events/        # Custom editor events
│   ├── processors/    # Editor system processors
│   ├── ProjectManager.ts
│   ├── WindowManager.ts
│   └── index.ts
│
├── preload/           # IPC bridge (contextBridge)
│   └── preload.ts
│
└── windows/           # Renderer processes
    ├── outliner/      # ✅ Scene hierarchy window
    ├── preview/       # 🚧 3D viewport window
    └── inspector/     # 🚧 Properties window
```

### Adding a New Processor

```typescript
// src/main/processors/MyProcessor.ts
import { Processor, Context, Tickers } from '@vertex-link/space'

export class MyProcessor extends Processor {
  constructor() {
    super('my-processor', Tickers.fixedInterval(1000))
  }

  async initialize() {
    const eventBus = Context.current().eventBus
    eventBus.on(SomeEvent, (event) => {
      // Handle event
    }, this)
  }
}
```

Register in `ProjectManager.ts`:
```typescript
this.context.addProcessor(new MyProcessor())
```

### Window API (Renderer)

```typescript
// Get scene data
const scene = await window.electronAPI.getScene()

// Send command to main process
window.electronAPI.sendCommand({
  type: 'actor/create',
  label: 'New Actor'
})

// Listen for events
const cleanup = window.electronAPI.onEditorEvent((event) => {
  if (event.type === 'core.entity.created') {
    console.log('New actor:', event.payload.entity)
  }
})

// Cleanup on unmount
onUnmounted(cleanup)
```

## Building

```bash
# Build for production
bun run build

# Package as executable
bun run package
```

## Technology Stack

- **Electron** - Desktop framework
- **electron-vite** - Build tool
- **Vue 3** - UI framework
- **LokiJS** - Embedded database
- **Chokidar** - File watcher
- **@vertex-link/space** - SPACe architecture
- **@vertex-link/engine** - WebGPU rendering

## Documentation

- `IMPLEMENTATION_PLAN.md` - Detailed roadmap and phase planning
- `llm_instruct.md` - LLM development guidelines

## License

MIT
