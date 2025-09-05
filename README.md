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

3.  **Running the Development Environment:**
    To develop the libraries (`acs`, `engine`) and the visualizer examples (`documentation`) concurrently with live reloading:
    ```shell script
    bun run dev
    ```
    This will start the development servers for all packages and the documentation visualizer, typically available at `http://localhost:8000`.

4.  **Accessing the Examples:**
    Open your browser and navigate to the URL provided by the Vite development server. The documentation system automatically discovers and presents all available documentation and examples.