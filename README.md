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

## Development Setup

This project uses [Bun](https://bun.sh/) as the primary JavaScript runtime, package manager, and bundler. It's structured as a monorepo using Bun's workspaces feature.

### Prerequisites

-   Install [Bun](https://bun.sh/docs/installation) **OR** use the provided Docker container.
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
    Open your browser and navigate to the URL provided by the Vite development server (usually `http://localhost:8000`). The documentation system automatically discovers and presents all available documentation and examples.

### Docker Development (Alternative)

If you prefer not to install Bun locally, you can use the provided Docker environment:

```shell script
docker-compose up bun_dev
```

This starts a Bun container with the project mounted at `/app` and port 8000 exposed. You can then:

1. **Execute into the container:**
```shell script
docker exec -it vertex-link-bun-dev bash
```

2. **Run development commands inside the container:**
```shell script
cd /app
bun install
bun run dev
```

All the same Bun commands work inside the container, and changes are reflected on your local filesystem due to volume mounting.

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

## Documentation and Examples

The project includes an interactive documentation system that automatically discovers and organizes documentation and examples based on file structure. Simply create `.md` files or interactive examples in `packages/documentation/src/docs/` and they'll appear in the navigation automatically.

For detailed information on the framework architecture, API documentation, and interactive examples, run the development server and navigate to `http://localhost:8000`.

## Dive Deeper

For comprehensive information, please refer to the **Vertex Link Visualizer Documentation** served at `http://localhost:8000` during development. This documentation includes:

-   Detailed Architectural Overview
-   Getting Started Guide & Project Setup
-   Complete API Documentation for `@vertex-link/acs` and `@vertex-link/engine`
-   Interactive Examples and Demos
-   Information on Upcoming Features (like Component-Driven Resources and Buffer Streaming)