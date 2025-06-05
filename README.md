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

Modern TypeScript features, including decorators, are leveraged for an intuitive and efficient developer experience.

## Key Features

-   **Actor-Component-System (ACS)**: A robust foundation for entity management.
-   **Event-Driven**: Decoupled communication using a central EventBus and `@OnEvent` decorators.
-   **Decorator-Based API**: Simplifies hooking into update loops (`@Update`, `@WebGPUUpdate`), event handling, and dependency injection (`@RequireComponent`).
-   **Resource Management**: System for loading, compiling, and managing assets like meshes, materials, and shaders.
-   **WebGPU Rendering**: High-performance rendering using the modern WebGPU API, managed by the `WebGPUProcessor` and `RenderGraph`.
-   **Modular Design**: Core logic (`@vertex-link/acs`) is separate from the rendering engine (`@vertex-link/engine`), promoting flexibility.

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
    ```bash
    git clone git@github.com:vertex-link/visualizer.git
    cd visualizer
    ```

2.  **Install Dependencies:**
    Bun automatically installs dependencies when you run scripts if they are not already present. Or, you can explicitly install them:
    ```bash
    bun install
    ```
    This will install dependencies for the root project and all packages within the `packages/*` workspaces (e.g., `@vertex-link/acs`, `@vertex-link/engine`, `@vertex-link/documentation`).

3.  **Running the Development Environment:**
    To develop the libraries (`acs`, `engine`) and the visualizer examples (`documentation`) concurrently with live reloading:
    ```bash
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
    ```bash
    bun run --cwd ./packages/acs build
    # or
    bun run --cwd ./packages/engine build
    ```
    These scripts use `bun build` to compile the TypeScript source to ESM format in the `dist` directory of each package, including sourcemaps.

-   **Build all libraries (`acs` and `engine`):**
    ```bash
    bun run build:all-libs
    ```


-   **Build the documentation/visualizer examples:**
    ```bash
    bun run --cwd ./packages/documentation build
    ```
    This uses Vite to build the documentation site.

### Type Checking

-   **Type check a specific package:**
    Navigate to the package directory (e.g., `cd packages/engine`) and run:
    ```bash
    bun run typecheck
    ```
    This executes `tsc --noEmit -p ./tsconfig.json` for that package.

-   **Type check the entire project:**
    From the root directory:
    ```bash
    bun run typecheck
    ```
    This runs `tsc --noEmit -p ./tsconfig.json` using the root `tsconfig.json`, which should cover all workspace packages due to project references or includes if configured appropriately. The root `tsconfig.json` extends `tsconfig.base.json`.

### Docker (Optional)

A `docker-compose.yml` is provided for a Bun development environment.
To use it:
```bash
docker-compose up bun_dev
```
This will mount the current directory into `/app` in the container and expose port 8000. You can then run the Bun commands from within the container's shell.

## Getting Started (Quick Look)

A brief example of creating an actor and adding components, based on the structure in `packages/documentation/src/main.ts`:

1.  **Initialize Core Systems**: Set up `ResourceManager`, `ServiceRegistry`, `WebGPUProcessor`, and `Scene`.
2.  **Load Resources**: Use `ResourceManager` to load/create `ShaderResource`, `MeshResource`, `MaterialResource`.
3.  **Create Actors**: Instantiate `Actor` and add `TransformComponent`, `MeshRendererComponent`, and custom behavior `Component`s.
4.  **Set up Camera**: Create an `Actor` with `CameraComponent` and `TransformComponent`.
5.  **Start Processors**: Call `.start()` on your registered processors (e.g., `WebGPUProcessor`).

```typescript
// --- In your main application setup ---

// (Assuming scene, myMeshResource, myMaterialResource are already initialized)

// Create an Actor
const myActor = new Actor("MyCube");
scene.addActor(myActor); // Add actor to the scene

// Add TransformComponent and set its initial position
myActor.addComponent(TransformComponent, { position: [0, 0, 0] });

// Add MeshRendererComponent with the pre-loaded mesh and material
myActor.addComponent(MeshRendererComponent, {
    mesh: myMeshResource,
    material: myMaterialResource
});

// Add a custom component for behavior
// Assuming MyCustomRotationComponent is defined elsewhere
// and takes an options object with a 'speed' property
myActor.addComponent(MyCustomRotationComponent, { speed: 1.0 });

// (Continue with camera setup and starting processors)
```

## Development Plan Highlights

-   **Component-Driven Resources**: Simplifying how resources are accessed and managed by actors.
-   **Streamlined Material System**: More flexible and instance-based material properties.
-   **Declarative Scene Setup API**: Reducing boilerplate for scene creation.
-   **Advanced Hierarchy System**: Robust parent-child relationships for actors.
-   **Buffer Streaming**: A key long-term goal for efficient handling of large-scale scenes and data.

We encourage you to explore the code, examples, and the full documentation to understand the capabilities and future direction of Vertex Link.
