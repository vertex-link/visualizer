# Project Guidelines — Vertex Link Visualizer (Bun + TypeScript Monorepo)

Audience: Advanced contributors to this repository. This document captures project-specific details: build/configuration, testing (with a verified example), stack/structure, do’s/don’ts, and development best practices/architecture guidelines.

## Stack and Project Structure

- Runtime/Tooling: Bun (primary runtime, package manager, bundler), TypeScript 5, Vite (documentation), Electron + electron-vite (desktop), esbuild.
- Monorepo layout using Bun workspaces (declared in root package.json):
  - packages/acs — Core Actor-Component-System library.
  - packages/engine — Rendering/Resource management built on top of ACS; targets WebGPU and provides processors/services.
  - packages/documentation — Vite site with examples and docs; consumes acs and engine via TS path aliases.
  - packages/desktop — Electron-based editor shell (experimental). Uses electron-vite.
- Root entry point (index.ts) exists for runtime checks; most development happens in workspace packages.
- TypeScript configuration:
  - Root tsconfig.json extends tsconfig.base.json.
  - tsconfig.base.json defines strict TS settings, ESM, DOM libs, WebGPU types, and path aliases:
    - @vertex-link/acs -> ./packages/acs/src/index.ts (and subpaths)
    - @vertex-link/engine -> ./packages/engine/src/index.ts (and subpaths)

## Build and Configuration Instructions

Prerequisites
- Bun installed locally. Alternatively, use the provided Docker Compose to get a Bun shell.
- A modern browser with WebGPU support for documentation examples.

Install dependencies (root and all workspaces):
- bun install

Local development (concurrent libs + documentation):
- bun run dev
  - Starts watch builds for packages/acs and packages/engine.
  - Starts Vite dev server in packages/documentation (typically http://localhost:8000).

Per-package development:
- packages/acs: bun run dev (watch build)
- packages/engine: bun run dev (watch build)
- packages/documentation: bun run dev (Vite dev server)
- packages/desktop: bun run dev (electron-vite dev)

Building:
- Build libraries: bun run build:all-libs
- Build a specific library:
  - bun run --cwd ./packages/acs build
  - bun run --cwd ./packages/engine build
- Build documentation (static site):
  - bun run --cwd ./packages/documentation build
- Build desktop (electron-vite):
  - bun run --cwd ./packages/desktop build

Type checking:
- Entire repo: bun run typecheck (tsc --noEmit using root tsconfig)
- Per package: cd packages/<name> && bun run typecheck

Docker (optional):
- docker-compose up bun_dev
- This launches an interactive Bun environment with repo mounted at /app, PORT=8000 exposed; run the same bun commands inside the container.

Vite/aliases setup:
- Vite in packages/documentation resolves @vertex-link/acs and @vertex-link/engine to their src entries via tsconfig paths. Keep paths current if moving source files.

## Testing

Testing framework: Bun’s built-in test runner (no separate dependency).

How to run tests:
- bun test
- bun test <path-pattern>

Where to put tests:
- Any *.test.ts or *.spec.ts discovered by Bun under the repo.
- For package-scoped tests, place them under that package (e.g., packages/engine/tests). For cross-package sanity tests, use a top-level tests/ folder.

Create and run a simple test (verified example):
1) Create a file tests/smoke.test.ts with content:

import { describe, it, expect } from "bun:test";

describe("repo sanity", () => {
  it("has expected workspace layout", () => {
    const hasPackages = Bun.file("packages/engine/package.json");
    const hasTsconfig = Bun.file("tsconfig.base.json");
    expect(hasPackages).toBeTruthy();
    expect(hasTsconfig).toBeTruthy();
  });

  it("can execute TypeScript under Bun", () => {
    const add = (a: number, b: number) => a + b;
    expect(add(2, 3)).toBe(5);
  });
});

2) Run the tests:
- bun test

3) Expected output (observed during verification):
- 2 tests pass across 1 file in ~<100ms.

4) Cleanup (remove temporary example test):
- rm -rf tests (or remove the created file)

Guidelines for adding new tests:
- Prefer colocating tests near the code under test inside each package (e.g., packages/engine/src/... with tests in a sibling tests/ or __tests__/ folder) or keep them all in packages/<name>/tests.
- Keep test runtime assumptions aligned with Bun (no Node-only globals unless polyfilled).
- For browser/WebGPU examples, favor integration validation in packages/documentation (manual verification) and keep unit tests pure/fast.

## Additional Development Information

Code style and linting:
- Strict TypeScript is enabled ("strict": true). Avoid any as much as possible; prefer precise types and generics.
- ESM only; do not introduce CommonJS. Ensure module: ESNext and bundler resolution remain intact.
- Decorators: experimentalDecorators and emitDecoratorMetadata are intentionally disabled; do not add decorator-based DI. Use explicit dependency resolution patterns.
- Follow the explicit component dependency pattern shown in README (lazy getters that cache, throw on missing dependencies).

Debugging tips:
- Use source maps emitted by bun build for packages (sourcemap=external). For dev, bun’s watch builds give quick feedback.
- In documentation (Vite), open devtools and enable “Pause on exceptions” to surface cross-package stack traces.
- WebGPU: device/adapter initialization failures are often permissions or browser-flag related; test in latest Chromium-based browsers with WebGPU enabled.

Release/build hygiene:
- Keep workspace exports pointing to src for dev and to dist for published builds if/when publishing. Currently exports map to ./src for fast iteration; do not change without understanding the Vite aliasing impact.
- Ensure build:all-libs completes before building documentation or desktop if you switch exports to dist in the future.

## Architecture Guidelines and Best Practices

- ACS-first design:
  - Actors are thin containers; Components encapsulate data/behavior.
  - Services provide cross-cutting functionality; Processors own lifecycle/update loops (e.g., WebGPUProcessor).
- Dependency handling:
  - No decorator DI. Resolve dependencies explicitly via getters (cache result; throw informative errors on missing dependencies).
  - Use the `EngineContext` to access engine-scoped services like the `WebGPUProcessor` and the engine's `EventBus`.
  - Component addition order lives in Actor.onBeforeInitialize; access components in onInitialize when they are guaranteed present.
- Resource management:
  - Use handle/compile pattern (create handle, get(), setDevice(), compile()) as in README examples. Avoid implicit device coupling.
  - Device-dependent resources must be recompiled on device/context changes.
- Rendering/WebGPU:
  - Keep RenderGraph stages narrowly scoped and data-oriented.
  - Avoid leaking GPUDevice across layers; pass via services or explicit method parameters.
- Monorepo boundaries:
  - Shared primitives live in acs; rendering specifics in engine; UI/examples in documentation; editor tooling in desktop.
  - Do not introduce circular dependencies between packages.
- Performance:
  - Prefer immutable data where possible and stable object shapes; avoid accidental megamorphic hot paths.
  - Use typed arrays and preallocated buffers for rendering code.

## Do’s and Don’ts

Do:
- Use Bun for scripts, builds, tests.
- Maintain TS path aliases and keep package exports consistent.
- Keep tests fast and deterministic; isolate WebGPU from unit tests.
- Update README and this guidelines file when changing developer workflows.

Don’t:
- Introduce decorator-based DI or enable experimentalDecorators/emitDecoratorMetadata.
- Use the global `ProcessorRegistry`. It is deprecated and will be removed.
- Mix CommonJS with ESM or rely on Node-only APIs without shims.
- Break path aliases used by Vite without updating tsconfig.base.json and documentation configuration.
- Commit large generated artifacts from Vite or bun build; use clean scripts.

## Quick Commands Reference
- Install: bun install
- Dev (all): bun run dev
- Typecheck (all): bun run typecheck
- Build libs: bun run build:all-libs
- Build docs: bun run --cwd ./packages/documentation build
- Test: bun test (place tests as *.test.ts)
- Docker dev shell: docker-compose up bun_dev


## Architecture Deep Dive — How ACS and Engine Work

This section summarizes the actual code structure and responsibilities observed in the repo, to help contributors quickly navigate and extend the system correctly.

- ACS package (packages/acs/src)
  - Actor (Actor.ts)
    - Owns components and their lifecycle. Provides addComponent/removeComponent/getComponent and initialization hooks.
    - Registers decorated update methods against processors via metadata and ProcessorRegistry.
  - Component system (component/)
    - Component.ts: Base class with lifecycle and a strong Actor association, includes dispose() emitting ComponentRemovedEvent and unregistering event listeners.
    - ComponentRegistry.ts: ComponentTypeRegistry maps component classes to stable numeric IDs and supports building bigint bitmasks for fast Scene queries.
    - ResourceComponent.ts: Bridge component to access resources from actors (see engine resources below).
  - Events (events/)
    - Event.ts/EventBus.ts: A simple event system using EventTarget under the hood. Exposes IEventBus, global getEventBus(), emit/on/off/once helpers, and initializeEventBus().
    - CoreEvents.ts: Canonical event types used by the framework (entity, component, scene, input examples, and game examples).
    - Decorators.ts: Event listener decorators and utilities for registering/unregistering handlers on components or services.
    - EmitToQuery.ts: Utility to emit an event to all actors matching a query in a scene.
  - Scene and Querying (scene/)
    - Scene.ts: Stores Actors, maintains indices:
      - By component bitmask (using ComponentTypeRegistry) for fast “has all components” queries.
      - By tags (any/all/exclude) to filter actors.
      - Provides query() and a SceneQueryBuilder to compose conditions; emitToQuery integrates with events.
    - QueryCondition.ts/QueryBuilder.ts: Encodes component/tag conditions and defines IQueryDataProvider contract used by Scene.
  - Processors (processor/)
    - Processor.ts: Base processor and IProcessable contract for update loops.
    - ProcessorRegistry.ts: Global registry for processors by name (e.g., 'webgpu') so components/resources can find the right processor without direct coupling. This is being deprecated in favor of `EngineContext`.
    - Decorators.ts: createProcessorUpdateDecorator produces the Update decorator type (e.g., WebGPUUpdate) used to hook component methods into a processor’s loop.
  - Resources (resources/)
    - Resource.ts: Async lifecycle with statuses (load/compile/unload). Device- or context-dependent resources should set the device, then compile().
    - ComputeResource.ts: Wraps Zig→Wasm modules as Resources. Supports vite-plugin-zig formats via payload.instantiate() or ?instantiate. Returns a Proxy so exported Zig functions are callable as methods once ready.

- Engine package (packages/engine/src)
  - EngineContext.ts: A container for engine-scoped services, including the `WebGPUProcessor` and the engine-specific `EventBus`. It replaces the global `ProcessorRegistry`.
  - WebGPUProcessor (processors/WebGPUProcessor.ts)
    - Central frame loop owner; created and managed by the `EngineContext`.
    - Responsibilities (non-exhaustive):
      - Initialization: acquires adapter/device/swapchain via WebGPURenderer.initialize(canvas).
      - Scene coupling: setScene(scene), keeps active camera (CameraComponent) updated.
      - Batching: collects MeshRendererComponent instances into instanced render batches keyed by material+vertex layout, tracks dirty state.
      - Per-frame flow (simplified):
        1) handle resource-ready events (ResourceReadyEvent) and transform updates.
        2) update active camera + global uniforms.
        3) update/merge render batches; (re)create instance buffers as needed.
        4) beginFrame() on WebGPURenderer, bind pipeline/buffers, draw instanced, endFrame().
      - Resize handling and aspect ratio updates.
      - Exposes getDevice(), getResourcePool() to resource classes; markDirty() to request re-batching.
  - Rendering components (rendering/components)
    - TransformComponent: math for position/rotation/scale, used broadly by renderer and cameras.
    - MeshRendererComponent: bridges ACS Components with engine resources. Ensures mesh/material are compiled against the current GPU device and participates in WebGPUProcessor’s update via WebGPUUpdate decorator.
  - Cameras (rendering/camera)
    - CameraComponent + PerspectiveCamera: manage projection data; WebGPUProcessor queries active camera and uploads camera uniforms.
  - Resources (resources)
    - MeshResource, MaterialResource, ShaderResource, GeometryUtils: CPU-side descriptors with compile() methods that use `engineContext.get(WebGPUProcessor)` to access the GPUDevice/format via WebGPURenderer. This keeps GPU-specific details centralized.
  - WebGPU wrappers (webgpu)
    - WebGPURenderer: wraps device/surface/swapchain, command encoder, and helper methods (create buffers, set pipeline, bind groups, draw, etc.).
    - WebGPUPipeline, WebGPUBuffer: thin wrappers over WebGPU pipeline/buffer creation and usage.
  - RenderGraph (rendering/RenderGraph.ts)
    - ForwardPass/PostProcessPass and RenderBatch types for organizing draw work; WebGPUProcessor coordinates their execution.

- End-to-end flow sketch
  1) Construct `EngineContext` with a canvas.
  2) Create a Scene, add Actors with TransformComponent + MeshRendererComponent (and camera Actor with CameraComponent).
  3) Set the scene on the `EngineContext`.
  4) Start the context: it initializes WebGPU, discovers renderables, batches them, uploads instance data, and renders per frame.
  5) Resource classes call compile() after setDevice(); they get the `WebGPUProcessor` from the `EngineContext` to access the WebGPU context.

## Zig/Wasm Setup and Usage

- What we use:
  - vite-plugin-zig in packages/documentation/vite.config.ts compiles Zig sources (*.zig) to WebAssembly modules during Vite dev/build.
  - TypeScript declaration packages/documentation/src/types/zig-modules.d.ts declares module '*.zig' to satisfy TS.
  - ACS ComputeResource handles the plugin’s module format (payload.instantiate()).

- Prerequisites
  - Install Zig (latest stable recommended). On macOS: brew install zig. On Linux/Windows: see https://ziglang.org/download/ and ensure zig is on PATH.
  - No manual zig build steps are required during dev; Vite + the plugin compile on the fly.

- Authoring a Zig module (example)
  - File: packages/documentation/src/compute/math.zig
    export fn add(a: f32, b: f32) f32 { return a + b; }
    export fn multiply(a: f32, b: f32) f32 { return a * b; }

- Importing and using from TS/Vue via ComputeResource
  - Vite config already includes zig() and an explicit '*.zig' module declaration.
  - Example usage (see packages/documentation/src/examples/resourecs/ResourceExample.vue):
    import { ComputeResource } from '@vertex-link/acs'
    import * as mathModule from '@/compute/math.zig'
    // Optionally type the exports
    interface MathExports { add(a: number, b: number): number; multiply(a: number, b: number): number; }
    const math = new ComputeResource<MathExports>(mathModule);
    await math.ready; // waits for instantiate()
    const sum = math.add(5, 3);

- Notes and troubleshooting
  - If you see “Unsupported WASM module format” from ComputeResource, ensure the Zig import comes from Vite with vite-plugin-zig enabled and not from a raw .wasm file; the module should provide an instantiate() function or ?instantiate.
  - Ensure TS picks up '*.zig' by keeping the declarations file and tsconfig include globs (packages/documentation/tsconfig.json includes "src/**/*.zig").
  - Hot module replacement will recompile Zig code on save in documentation dev server.

## Project Structure Map (expanded quick reference)
- acs
  - Actor, Component, ComponentRegistry, Scene, QueryBuilder/Condition
  - Events: Event, EventBus, CoreEvents, Decorators, EmitToQuery
  - Processor: Processor, ProcessorRegistry, Decorators (Update hooks)
  - Resources: Resource, ComputeResource
  - Utils: uuid
- engine
  - Processors: WebGPUProcessor
  - Rendering: RenderGraph, GPUResourcePool, components (Transform, MeshRenderer), camera (CameraComponent, PerspectiveCamera), interfaces (IBuffer, IPipeline)
  - Resources: MeshResource, MaterialResource, ShaderResource, GeometryUtils
  - WebGPU: WebGPURenderer, WebGPUPipeline, WebGPUBuffer
  - index.ts public API
- documentation
  - vite.config.ts (zig(), WGSL loader, aliases), src/compute/*.zig, src/types/zig-modules.d.ts, Vue examples
