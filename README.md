# Vertex Link - Modular TypeScript Game Engine/Framework

> ⚠️ **EXPERIMENTAL PLAYGROUND WARNING** ⚠️  
> This is a highly experimental, very unstable, and completely untested project! It's my overengineering and vibecoding playground where I explore wild ideas and architectural patterns. Expect frequent breaking changes, half-implemented features, and code that might make you question my sanity. Use at your own risk, and don't say I didn't warn you! 🚧🎮✨

Vertex Link is a modular and flexible TypeScript framework designed for game development and interactive 3D applications, aiming to become a powerful, open-source web engine with features like WebGPU rendering and buffer streaming.

**This repository contains the core `acs` (Actor-Component-System) package, the `engine` package for rendering and resource management, and `documentation` including examples.**

## Core Philosophy

Vertex Link emphasizes a decoupled, component-based architecture. It provides a set of core concepts:

-   **Scenes**: Manage collections of Actors and provide querying capabilities.
-   **Actors**: Represent entities, acting as containers for Components.
-   **Components**: Encapsulate data and behavior for Actors.
-   **Services**: Provide shared, cross-cutting functionalities.
-   **Processors**: Manage distinct update loops (e.g., rendering, game logic).
-   **Events**: Facilitate type-safe, decoupled communication via an EventBus.

The framework uses explicit dependency resolution for simplicity and maintainability, avoiding complex decorator-based dependency injection in favor of straightforward component access patterns.

## Key Features

-   **Actor-Component-System (ACS)**: A robust foundation for entity management.
-   **Event-Driven**: Decoupled communication using a central EventBus.
-   **Explicit Component Dependencies**: Clear, maintainable component relationships without decorator complexity.
-   **Resource Management**: System for loading, compiling, and managing assets like meshes, materials, and shaders.
-   **WebGPU Rendering**: High-performance rendering using the modern WebGPU API, managed by the `WebGPUProcessor` and `RenderGraph`.
-   **Modular Design**: Core logic (`@vertex-link/acs`) is separate from the rendering engine (`@vertex-link/engine`), promoting flexibility.

## Component Dependency Pattern

Components now handle dependencies explicitly through getter methods and manual resolution:

```typescript
class MyComponent extends Component {
  private _transform?: TransformComponent;
  private _resources?: ResourceComponent;
  
  constructor(actor: Actor) {
    super(actor);
  }

  get transform(): TransformComponent {
    if (this._transform) {
      return this._transform;
    }

    this._transform = this.actor.getComponent(TransformComponent);
    if (!this._transform) {
      throw new Error('TransformComponent not found');
    }
    return this._transform;
  }
  
  get resources(): ResourceComponent {
    if (this._resources) {
      return this._resources;
    }

    this._resources = this.actor.getComponent(ResourceComponent);
    if (!this._resources) {
      throw new Error('ResourceComponent not found');
    }
    return this._resources;
  }
}
```


## Actor Lifecycle

Actors provide lifecycle hooks for proper component initialization:

```typescript
class CustomActor extends Actor {
  resources?: ResourceComponent;

  constructor() {
    super('customactor');
  }

  protected onBeforeInitialize(): void {
    // Add components here - before dependency resolution
    this.addComponent(ResourceComponent);
    this.addComponent(TransformComponent);
    this.addComponent(MyCustomComponent);
  }

  protected onInitialize(): void {
    // Access components after they're all added and initialized
    this.resources = this.getComponent(ResourceComponent);
  }
}
```


## Dive Deeper

For comprehensive information, please refer to the full **Vertex Link Visualizer Documentation**.This documentation includes:

-   Detailed Architectural Overview
-   Getting Started Guide & Project Setup
-   Complete API Documentation for `@vertex-link/acs` and `@vertex-link/engine`
-   Information on Upcoming Features (like Component-Driven Resources and Buffer Streaming)

## Development Setup

This project uses [Bun](https://bun.sh/) as the primary JavaScript runtime, package manager, and bundler. It's structured as a monorepo using Bun's workspaces feature.

### Prerequisites

-   Install [Bun](https://bun.sh/docs/installation).
-   A modern browser with WebGPU support (for running the visualizer examples).

### Local Setup & Running

1.  **Clone the repository:**
```shell script
git clone git@github.com:vertex-link/visualizer.git
    cd visualizer
```


2.  **Install Dependencies:**
    Bun automatically installs dependencies when you run scripts if they are not already present. Or, you can explicitly install them:
```shell script
bun install
```

    This will install dependencies for the root project and all packages within the `packages/*` workspaces (e.g., `@vertex-link/acs`, `@vertex-link/engine`, `@vertex-link/documentation`).

3.  **Running the Development Environment:**
    To develop the libraries (`acs`, `engine`) and the visualizer examples (`documentation`) concurrently with live reloading:
```shell script
bun run dev
```

    This command:
    -   Runs `bun run dev:libs`, which concurrently starts the development build process (with watching) for `@vertex-link/acs` and `@vertex-link/engine`.
        -   `packages/acs` dev script: `bun build ./src/index.ts --outdir ./dist --watch`
        -   `packages/engine` dev script: `bun build ./src/index.ts --outdir ./dist --watch`
    -   Runs `bun run dev:visualizer`, which starts the Vite development server for the `@vertex-link/documentation` package.
        -   This typically serves the examples on `http://localhost:8000`.

    The `@vertex-link/documentation` package uses Vite, which is configured to resolve `@vertex-link/acs` and `@vertex-link/engine` to their source `index.ts` files, enabling hot-reloading across packages.

4.  **Accessing the Examples:**
    Open your browser and navigate to the URL provided by the Vite development server (usually `http://localhost:8000`). The `index.html` in the `documentation` package serves as the entry point for examples.

### Building Packages

-   **Build a specific library:**
```shell script
bun run --cwd ./packages/acs build
    # or
    bun run --cwd ./packages/engine build
```

    These scripts use `bun build` to compile the TypeScript source to ESM format in the `dist` directory of each package, including sourcemaps.

-   **Build all libraries (`acs` and `engine`):**
```shell script
bun run build:all-libs
```



-   **Build the documentation/visualizer examples:**
```shell script
bun run --cwd ./packages/documentation build
```

    This uses Vite to build the documentation site.

### Type Checking

-   **Type check a specific package:**
    Navigate to the package directory (e.g., `cd packages/engine`) and run:
```shell script
bun run typecheck
```

    This executes `tsc --noEmit -p ./tsconfig.json` for that package.

-   **Type check the entire project:**
    From the root directory:
```shell script
bun run typecheck
```

    This runs `tsc --noEmit -p ./tsconfig.json` using the root `tsconfig.json`, which should cover all workspace packages due to project references or includes if configured appropriately. The root `tsconfig.json` extends `tsconfig.base.json`.

### Docker (Optional)

A `docker-compose.yml` is provided for a Bun development environment.
To use it:
```shell script
docker-compose up bun_dev
```

This will mount the current directory into `/app` in the container and expose port 8000. You can then run the Bun commands from within the container's shell.

## Getting Started (Quick Look)

A brief example of creating an actor and adding components:

```typescript
// --- In your main application setup ---

// Initialize the engine context
const engineContext = new EngineContext(canvas);
await engineContext.initialize();

// Create a scene and set it on the context
const scene = new Scene("MyScene");
engineContext.setScene(scene);

// Create an Actor
const myActor = new Actor("MyCube");
scene.addActor(myActor);

// Add components explicitly
const transform = myActor.addComponent(TransformComponent);
transform.setPosition(0, 0, 0);

const meshRenderer = myActor.addComponent(MeshRendererComponent, {
    mesh: myMeshResource,
    material: myMaterialResource
});

// Add custom behavior components
const rotator = myActor.addComponent(RotatingComponent);
rotator.speed = 1.0;

// Create camera
const cameraActor = new Actor("MainCamera");
const cameraTransform = cameraActor.addComponent(TransformComponent);
cameraTransform.setPosition(0, 1.5, 8);

cameraActor.addComponent(CameraComponent, {
    projectionType: ProjectionType.PERSPECTIVE,
    perspectiveConfig: {
        fov: Math.PI / 3,
        aspect: canvas.width / canvas.height,
        near: 0.1,
        far: 100.0,
    },
    isActive: true,
});

scene.addActor(cameraActor);

// Start the engine
engineContext.start();
```


## Resource Management Pattern

Resources are created and managed through handles with explicit compilation:

```typescript
// Create shader handle
const shaderHandle = createShaderHandle(
    resourceManager,
    "StandardShader",
    vertexShaderSource,
    fragmentShaderSource,
);

// Get and compile the resource
const standardShader = await shaderHandle.get();
standardShader.setDevice(device);
await standardShader.compile();

// Create mesh and material similarly
const meshHandle = createMeshHandle(resourceManager, "CubeMesh", meshDescriptor);
const mesh = await meshHandle.get();
mesh.setDevice(device);
await mesh.compile();

const materialHandle = createMaterialHandle(
    resourceManager,
    "CubeMaterial",
    shaderHandle,
    uniforms,
    vertexLayout,
);
const material = await materialHandle.get();
material.setDevice(device, preferredFormat);
await material.compile();
```


## Development Plan Highlights

-   **Simplified Architecture**: Removing decorator complexity for better maintainability and debugging.
-   **Component-Driven Resources**: Simplifying how resources are accessed and managed by actors.
-   **Streamlined Material System**: More flexible and instance-based material properties.
-   **Declarative Scene Setup API**: Reducing boilerplate for scene creation.
-   **Advanced Hierarchy System**: Robust parent-child relationships for actors.
-   **Buffer Streaming**: A key long-term goal for efficient handling of large-scale scenes and data.

We encourage you to explore the code, examples, and the full documentation to understand the capabilities and future direction of Vertex Link.



## Composable-like helpers (decorator replacement)

You can replace update/event decorators with thin, context-aware functions inspired by Vue composables. This keeps the OOP style (classes, methods) while avoiding decorators and global singletons.

Helper location: src/composables/context.ts
- runWithContext(ctx, fn): enter a context for the synchronous duration of fn.
- getCurrentContext(strict?): fetch current context (throw if strict and missing).
- useActor/useComponent/useScene/useEventBus/useProcessor/useService: read from the current context.
- deriveContext(partial): shallow-merge a new context from the current.
- withContext(ctx, fn): convenience alias for class methods.

Example: OOP component using helpers

import { withContext, useActor, useEventBus } from "./src/composables/context";

class MyComponent {
  constructor(public actor: any, public bus: any) {}

  update() {
    return withContext({ component: this, actor: this.actor, eventBus: this.bus }, () => {
      const actor = useActor<{ name: string }>();
      const bus = useEventBus<{ emit: (e: string) => void }>();
      // ... your update logic here
      bus.emit(`updated:${actor.name}`);
    });
  }
}

Procedural usage:

import { runWithContext, useProcessor } from "./src/composables/context";

runWithContext({ scene, processors: new Map([["webgpu", webgpuProcessor]]) }, () => {
  const p = useProcessor<any>("webgpu");
  // ... use the processor
});

Notes:
- The helpers are synchronous-scope only. If you jump async (e.g., setTimeout/await), re-enter a context around the async callback or pass dependencies explicitly.
- This is an incremental migration path: you can start by wrapping selected methods with withContext and gradually remove decorators.
- The helpers are engine-agnostic. You control what goes into the context (actor, component, eventBus, processors/services), keeping boundaries clear.
