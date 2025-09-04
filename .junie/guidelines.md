# Project Guidelines — Vertex Link Visualizer (Bun + TypeScript Monorepo)

Audience: Advanced contributors to this repository. This document captures project-specific details: build/configuration, testing (with a verified example), stack/structure, do's/don'ts, and development best practices/architecture guidelines.

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

## Documentation System Architecture

**Location**: All documentation lives in `packages/documentation/src/docs/`

**Auto-Discovery**: The system automatically discovers and organizes documentation based on file structure. No manual registration needed.

**File Structure Patterns**:
```
docs/
├── simple-doc.md                    # Simple documentation page
├── category/
│   ├── nested-doc.md               # Simple doc in category  
│   └── complex-feature/            # Complex feature with demo
│       ├── complex-feature.md      # Main docs (folder name = file name)
│       ├── demo.html              # Interactive demo entry point
│       ├── script.ts              # Demo logic
│       └── assets/                # Demo assets
└── deeply/nested/content.md        # Unlimited nesting supported
```

**Document Types**:
1. **Simple Documents**: Standalone `.md` files → documentation pages
2. **Complex Documents**: Folder + matching `.md` file → can include interactive demos
3. **Interactive Examples**: Complex documents with `entry` frontmatter or conventional demo files

**Frontmatter Schema**:
```yaml
---
title: "Human-readable title"
description: "Brief description"
entry: "demo.html"                  # Entry point for interactive demos
interactive: true|false             # Force interactive mode
complexity: "beginner|intermediate|advanced"
parameters:                        # For interactive parameter controls
  - name: "paramName"
    type: "range|color|boolean|select"
    min: 0                         # For range inputs
    max: 100
    default: 50
    options: ["a", "b", "c"]       # For select inputs
---
```

**Navigation Generation Rules**:
- Folders become categories in navigation tree
- Files become items within categories
- Complex items (folder + matching file) appear as single navigation items
- Navigation structure mirrors file system hierarchy exactly
- Category names derive from folder names (kebab-case → Title Case)
- Item names derive from frontmatter title → folder name → file name

**Route Generation**:
- Simple docs: `/features/category/item-name`
- Complex docs: `/features/category/folder-name`
- Root level docs: `/features/item-name`
- Categories can be nested unlimited levels

**Interactive Demo Requirements**:
- Must be in a complex document structure (folder + matching .md)
- Entry point specified via `entry` frontmatter or conventional files: `demo.html`, `index.html`
- Demo files should be self-contained or reference relative assets
- Parameters in frontmatter automatically generate UI controls

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
- Per package: cd packages/<n> && bun run typecheck

Docker (optional):
- docker-compose up bun_dev
- This launches an interactive Bun environment with repo mounted at /app, PORT=8000 exposed; run the same bun commands inside the container.

Vite/aliases setup:
- Vite in packages/documentation resolves @vertex-link/acs and @vertex-link/engine to their src entries via tsconfig paths. Keep paths current if moving source files.

## Testing

Testing framework: Bun's built-in test runner (no separate dependency).

How to run tests:
- bun test
- bun test <path-pattern>

Where to put tests:
- Any *.test.ts or *.spec.ts discovered by Bun under the repo.
- For package-scoped tests, place them under that package (e.g., packages/engine/tests). For cross-package sanity tests, use a top-level tests/ folder.

Create and run a simple test (verified example):
1) Create a file tests/smoke.test.ts with content:

```typescript
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
```

2) Run the tests:
- bun test

3) Expected output (observed during verification):
- 2 tests pass across 1 file in ~<100ms.

4) Cleanup (remove temporary example test):
- rm -rf tests (or remove the created file)

Guidelines for adding new tests:
- Prefer colocating tests near the code under test inside each package (e.g., packages/engine/src/... with tests in a sibling tests/ or __tests__/ folder) or keep them all in packages/<n>/tests.
- Keep test runtime assumptions aligned with Bun (no Node-only globals unless polyfilled).
- For browser/WebGPU examples, favor integration validation in packages/documentation (manual verification) and keep unit tests pure/fast.

## Additional Development Information

Code style and linting:
- Strict TypeScript is enabled ("strict": true). Avoid any as much as possible; prefer precise types and generics.
- ESM only; do not introduce CommonJS. Ensure module: ESNext and bundler resolution remain intact.
- Decorators: experimentalDecorators and emitDecoratorMetadata are intentionally disabled; do not add decorator-based DI. Use explicit dependency resolution patterns.
- Follow the explicit component dependency pattern shown in README (lazy getters that cache, throw on missing dependencies).

Debugging tips:
- Use source maps emitted by bun build for packages (sourcemap=external). For dev, bun's watch builds give quick feedback.
- In documentation (Vite), open devtools and enable "Pause on exceptions" to surface cross-package stack traces.
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

## Documentation Creation Guidelines for LLM Agents

When creating or updating documentation:

**Simple Documentation**:
1. Create `.md` files directly in appropriate category folders
2. Use descriptive frontmatter with title and description
3. Write clear, comprehensive content with code examples
4. Use relative links to reference other documentation

**Interactive Examples**:
1. Create folder structure: `feature-name/feature-name.md`
2. Add demo files: `demo.html`, `script.ts`, `styles.css` as needed
3. Set `entry: "demo.html"` in frontmatter
4. Include parameter definitions for UI controls
5. Ensure demos are self-contained and functional
6. Provide clear code comments and explanations

**Category Organization**:
- Group related content in folders (e.g., `components/`, `examples/`, `guides/`)
- Use descriptive folder names (kebab-case)
- Create logical hierarchies that match user mental models
- Keep nesting reasonable (2-3 levels max for most content)

**Content Quality Standards**:
- Include working code examples
- Provide both basic and advanced usage patterns
- Link to related concepts and dependencies
- Use consistent terminology and formatting
- Test interactive examples thoroughly

**File Naming Conventions**:
- Use kebab-case for files and folders
- Match folder names to markdown file names for complex docs
- Use descriptive names that clearly indicate content purpose
- Avoid special characters and spaces

## Do's and Don'ts

Do:
- Use Bun for scripts, builds, tests.
- Maintain TS path aliases and keep package exports consistent.
- Keep tests fast and deterministic; isolate WebGPU from unit tests.
- Update README and this guidelines file when changing developer workflows.
- Create comprehensive documentation with working examples.
- Use the automatic documentation discovery system for all new docs.
- Follow the established frontmatter schema for metadata.
- Test interactive examples thoroughly before committing.

Don't:
- Introduce decorator-based DI or enable experimentalDecorators/emitDecoratorMetadata.
- Use the global `ProcessorRegistry`. It is deprecated and will be removed.
- Mix CommonJS with ESM or rely on Node-only APIs without shims.
- Break path aliases used by Vite without updating tsconfig.base.json and documentation configuration.
- Commit large generated artifacts from Vite or bun build; use clean scripts.
- Manually register documentation pages (the system auto-discovers them).
- Create documentation outside the `packages/documentation/src/docs/` directory.
- Use absolute paths in documentation; prefer relative links.
- Skip frontmatter metadata; it's used for navigation and SEO.

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

### ACS package (packages/acs/src)

**Actor (Actor.ts)**
- Owns components and their lifecycle. Provides addComponent/removeComponent/getComponent and initialization hooks.
- Registers decorated update methods against processors via metadata and ProcessorRegistry.

**Component system (component/)**
- Component.ts: Base class with lifecycle and a strong Actor association, includes dispose() emitting ComponentRemovedEvent and unregistering event listeners.
- ComponentRegistry.ts: ComponentTypeRegistry maps component classes to stable numeric IDs and supports building bigint bitmasks for fast Scene queries.
- ResourceComponent.ts: Bridge component to access resources from actors (see engine resources below).

**Events (events/)**
- Event.ts/EventBus.ts: A simple event system using EventTarget under the hood. Exposes IEventBus, global getEventBus(), emit/on/off/once helpers, and initializeEventBus().
- CoreEvents.ts: Canonical event types used by the framework (entity, component, scene, input examples, and game examples).
- Decorators.ts: Event listener decorators and utilities for registering/unregistering handlers on components or services.
- EmitToQuery.ts: Utility to emit an event to all actors matching a query in a scene.

**Scene and Querying (scene/)**
- Scene.ts: Stores Actors, maintains indices:
  - By component bitmask (using ComponentTypeRegistry) for fast "has all components" queries.
  - By tags (any/all/exclude) to filter actors.
  - Provides query() and a SceneQueryBuilder to compose conditions; emitToQuery integrates with events.
- QueryCondition.ts/QueryBuilder.ts: Encodes component/tag conditions and defines IQueryDataProvider contract used by Scene.

**Processors (processor/)**
- Processor.ts: Base processor and IProcessable contract for update loops.
- ProcessorRegistry.ts: DEPRECATED. Do not use in new code.

### Engine package (packages/engine/src)

**Core (core/)**
- EngineContext.ts: Access point for engine-scoped services (WebGPUProcessor, EventBus). Use this instead of ProcessorRegistry.
- Engine.ts: Top-level engine coordination and lifecycle.

**Components (components/)**
- TransformComponent.ts: Position, rotation, scale with matrix calculations.
- MeshRendererComponent.ts: Associates a mesh and material for rendering.
- CameraComponent.ts: View/projection matrices for cameras.

**Resources (resources/)**
- Resource.ts: Base class for all engine resources with handle/compile pattern.
- ResourceManager.ts: Central resource loading and management.
- MeshResource.ts: Geometry data (vertices, indices) for WebGPU buffers.
- MaterialResource.ts: Shader materials with uniform data.
- ShaderResource.ts: WGSL shader compilation and management.
- ComputeResource.ts: Compute shader resources for GPU computation.

**Rendering (rendering/)**
- WebGPUProcessor.ts: Main rendering processor managing GPU device, command encoding, and render passes.
- RenderGraph.ts: Declarative rendering pipeline with stages and dependencies.
- RenderStage.ts: Individual rendering stages (forward, shadow, post-process, etc.).

**Services (services/)**
- Various engine services that can be accessed via EngineContext.

### Key Patterns

**Resource Lifecycle**:
1. Create resource handle
2. Call get() to load data
3. Call setDevice(device) to prepare for GPU
4. Call compile() to create GPU resources
5. Resource is ready for use

**Component Dependencies**:
```typescript
class MyComponent extends Component {
  private _transform?: TransformComponent;
  
  get transform(): TransformComponent {
    if (this._transform) return this._transform;
    
    this._transform = this.actor.getComponent(TransformComponent);
    if (!this._transform) {
      throw new Error('TransformComponent required');
    }
    return this._transform;
  }
}
```

**Engine Context Usage**:
```typescript
import { getEngineContext } from '@vertex-link/engine/core/EngineContext';

const context = getEngineContext();
const webgpuProcessor = context.getWebGPUProcessor();
const eventBus = context.getEventBus();
```

**Scene Querying**:
```typescript
const enemiesWithAI = scene.query()
  .withComponent(EnemyComponent)
  .withComponent(AIComponent)
  .withTag('active')
  .execute();
```

This architecture provides clear separation of concerns while maintaining performance through efficient querying and explicit dependency management.