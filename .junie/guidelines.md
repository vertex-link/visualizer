# Project Guidelines — Vertex Link Visualizer (Bun + TypeScript Monorepo)

Audience: Advanced contributors to this repository. This document captures project-specific details: build/configuration, testing (with a verified example), stack/structure, do's/don'ts, and development best practices/architecture guidelines. For detailed information on specific packages, please refer to the `LLM_INSTRUCT.md` file within each package's directory.

## Stack and Project Structure

- **Runtime/Tooling**: Bun (primary runtime, package manager, bundler), TypeScript 5, Vite (documentation), Electron + electron-vite (desktop), esbuild.
- **Monorepo layout** using Bun workspaces (declared in root package.json):
  - `packages/orbits`: Core Orbits (Actor-Component-System) framework. For more details, see `packages/orbits/llm_instruct.md`.
  - `packages/engine`: Rendering/Resource management built on top of Orbits; targets WebGPU and provides processors/services. For more details, see `packages/engine/LLM_INSTRUCT.md`.
  - `packages/documentation`: Vite site with examples and docs; consumes `orbits` and `engine` via TS path aliases.
  - `packages/desktop`: Electron-based editor shell (experimental).

## Build and Configuration Instructions

-   **Install dependencies**: `bun install`
-   **Local development**: `bun run dev`
-   **Building libraries**: `bun run build:all-libs`
-   **Type checking**: `bun run typecheck`

## Architecture Guidelines and Best Practices

-   **Orbits-first design**:
  -   Actors are thin containers; Components encapsulate data/behavior.
  -   Services provide cross-cutting functionality; Processors own lifecycle/update loops (orbits).
-   **Dependency handling**:
  -   No decorator DI. Resolve dependencies explicitly via cached getters.
  -   Use the `EngineContext` to access engine-scoped services.
-   **Resource management**:
  -   Resources are managed through `ResourceComponent` on Actors.
  -   Resources follow a `create -> setDevice() -> compile()` lifecycle.

## Do's and Don'ts

-   **Do**:
  -   Use Bun for scripts, builds, and tests.
  -   Maintain TS path aliases for inter-package dependencies.
  -   Follow the explicit dependency and resource management patterns.
-   **Don't**:
  -   Introduce decorator-based DI.
  
  -   Mix CommonJS with ESM.