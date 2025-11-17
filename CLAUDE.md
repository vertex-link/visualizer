# visualizer Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-09-11

## Active Technologies
- TypeScript 5.9.2 with Bun runtime (001-i-want-to)
- WebGPU for 3D rendering (001-i-want-to)
- @vertex-link/orbits for Actor-Component-System architecture (001-i-want-to)
- @vertex-link/engine for rendering and resource management (001-i-want-to)
- Vite for development builds (001-i-want-to)
- @gltf-transform/core for JavaScript glTF parsing (002-building-a-feature)
- @gltf-transform/web for web-based glTF I/O (002-building-a-feature)
- zgltf for WebAssembly glTF parsing via ComputeResource (002-building-a-feature)
- vite-plugin-zig for Zig to WebAssembly compilation (002-building-a-feature)

## Project Structure
```
packages/
├── orbits/                 # Core Orbits framework (Actor-Component-System)
├── engine/                 # Rendering/Resource management (WebGPU)
├── documentation/          # Vite site with examples and docs
│   └── src/docs/examples/  # Game examples and demonstrations
└── desktop/                # Electron-based editor (experimental)
```

## Commands
- `bun install` - Install dependencies
- `bun run dev` - Local development server
- `bun run build:all-libs` - Build all libraries
- `bun run typecheck` - Type checking across packages

## Code Style
- Orbits-first design: Actors are containers, Components hold data/behavior
- No decorator DI: Resolve dependencies explicitly via cached getters
- Use EngineContext for engine-scoped services
- Resources follow create → setDevice() → compile() lifecycle
- Maintain TS path aliases for inter-package dependencies

## Architecture Patterns
- Finite State Machine for combat phases (Turn-Based Strategy)
- Observer pattern for equipment stat modifications (Turn-Based Strategy)
- Perlin noise for procedural encounter generation (Turn-Based Strategy)
- Instanced rendering with compute shader culling for WebGPU performance
- Component-based entities with Orbits integration
- Resource-based architecture: Resources → Components → Rendering (3D Models)
- Dual backend pattern: JavaScript development + WebAssembly performance (3D Models)
- ComputeResource integration for WebAssembly modules (3D Models)

## Recent Changes
- 001-i-want-to: Added turn-based strategy game example with character progression, combat, and equipment systems
- 002-building-a-feature: Added resource-based 3D model import with dual backends (JS/WASM), GltfResource system, and ModelComponent Orbits integration

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->