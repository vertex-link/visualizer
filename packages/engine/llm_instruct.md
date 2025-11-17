# Engine Package - LLM Implementation Instructions

## Package Purpose
The `@vertex-link/engine` package provides WebGPU rendering, resource management, and visual components built on top of the `@vertex-link/orbits` framework. This package handles all GPU-related functionality.

## Directory Structure
```
packages/engine/src/
├── EngineContext.ts              # Central engine context
├── index.ts                      # Package entry point
├── events.ts                     # Engine-specific events (input, resources)
├── processors/
│   ├── WebGPUProcessor.ts       # Main rendering processor
│   ├── RenderProcessor.ts       # Generic render processor base
│   └── FixedTickProcessor.ts    # Fixed timestep processor
├── rendering/
│   ├── components/
│   │   ├── TransformComponent.ts    # Position/rotation/scale
│   │   └── MeshRendererComponent.ts # Links mesh and material
│   ├── camera/
│   │   ├── CameraComponent.ts       # Camera configuration
│   │   └── PerspectiveCamera.ts     # Perspective projection logic
│   ├── math/
│   │   └── Transform.ts            # Transform matrix utilities
│   ├── GPUResourcePool.ts          # Caching for GPU assets (pipelines, etc.)
│   └── RenderGraph.ts              # Manages render passes
├── resources/
│   ├── ShaderResource.ts           # WGSL shader management
│   ├── MeshResource.ts             # Geometry data
│   ├── MaterialResource.ts         # Material/uniform data
│   └── GeometryUtils.ts            # Primitive generation (cubes, planes)
├── services/
│   └── LoggingService.ts           # Logging implementation
└── webgpu/
    ├── WebGPURenderer.ts           # Core WebGPU device/context wrapper
    ├── WebGPUPipeline.ts           # Pipeline creation helper
    └── WebGPUBuffer.ts             # Buffer creation helper
```

## Core Concepts

### EngineContext
This class is the main entry point for the engine. It sets up the rendering processor and event bus.
```typescript
class EngineContext {
  public readonly eventBus: IEventBus;

  constructor(canvas: HTMLCanvasElement);
  async initialize(): Promise<void>;
  setScene(scene: Scene): void;
  start(): void;
  stop(): void;
}
```
- **Key Idea**: It initializes the `WebGPUProcessor` and provides a central place for the scene and event bus. 

### Resource Management
Resources are classes that manage GPU data (meshes, shaders, materials). They extend the base `Resource` class from `@vertex-link/orbits`.

**Resource Lifecycle:**
1.  Instantiate the specific resource class (e.g., `MeshResource`).
2.  The `WebGPUProcessor` provides the `GPUDevice` to the resource via `setDevice(device)`.
3.  The processor then calls `compile()` on the resource, which creates the actual GPU buffers, textures, and pipelines.
4.  The resource's `status` becomes `ResourceStatus.Ready`.

**Key Resource Types:**
-   `ShaderResource`: Holds WGSL vertex and fragment shader source code.
-   `MeshResource`: Holds vertex and index data for a piece of geometry.
-   `MaterialResource`: Holds a reference to a `ShaderResource` and uniform data. It compiles into a `GPURenderPipeline`.

### Rendering Components

-   **TransformComponent**: Manages an actor's position, rotation, and scale in 3D space. It can calculate local and world matrices.
-   **MeshRendererComponent**: A simple component that acts as a flag to the `WebGPUProcessor` indicating that this actor should be rendered. It relies on the actor having a `ResourceComponent` that holds a `MeshResource` and a `MaterialResource`.
-   **CameraComponent**: Defines a camera, including its projection type (e.g., perspective) and manages the view and projection matrices.

### Rendering Pipeline

-   **WebGPUProcessor**: The heart of the engine. It runs the main render loop.
    1.  On startup, it initializes the `WebGPURenderer` to get a `GPUDevice`.
    2.  On each frame, it queries the scene for all actors with a `MeshRendererComponent`.
    3.  It finds the active `CameraComponent`.
    4.  It iterates through the renderable actors, ensuring their associated `MeshResource` and `MaterialResource` are compiled.
    5.  It batches draw calls (though instancing is not fully implemented) and submits them to the GPU.
-   **RenderGraph**: A system used by `WebGPUProcessor` to organize rendering into passes (e.g., a forward pass). It is not as complex as the old `RenderStage` system.

## Important Implementation Rules

### ✅ DO's
-   **Use `EngineContext` to initialize and run the engine.**
-   **Add `MeshResource` and `MaterialResource` to an actor's `ResourceComponent` to make it renderable.**
-   Follow the resource lifecycle: instantiate, `setDevice`, `compile`.
-   Check for `navigator.gpu` support before initializing the engine.
-   Handle cleanup by calling `dispose()` on resources.

### ❌ DON'Ts

-   **Don't look for a `ResourceManager`. It does not exist.**
-   Don't create GPU resources outside of the `compile()` method.
-   Don't leak GPU resources. Ensure `dispose()` is called.

## Common Patterns

### Creating a Renderable Actor
To make an actor appear on screen, you need to give it geometry, a material, and a transform.

```typescript
import {
  Actor,
  ResourceComponent
} from "@vertex-link/orbits";
import {
  TransformComponent,
  MeshRendererComponent,
  MeshResource,
  MaterialResource,
  ShaderResource,
  GeometryUtils
} from "@vertex-link/engine";

// 1. Create an Actor
const scene = new Scene();
const cubeActor = new Actor("my-cube");

// 2. Add a Transform to position it
cubeActor.addComponent(TransformComponent);

// 3. Create Shader, Mesh, and Material resources
const shader = new ShaderResource('basic-shader', vsCode, fsCode);
const mesh = new MeshResource('cube-mesh', GeometryUtils.createCube());
const material = new MaterialResource('red-material', shader);

// 4. Add resources to the actor via ResourceComponent
const resources = cubeActor.addComponent(ResourceComponent);
resources.add(shader);
resources.add(mesh);
resources.add(material);

// 5. Add MeshRendererComponent to mark it as renderable
cubeActor.addComponent(MeshRendererComponent);

// 6. Add the actor to the scene
scene.addActor(cubeActor);
```

## Current Issues & TODOs

1.  **Instancing**: The rendering pipeline batches draws but does not yet use GPU instancing effectively.
2.  **Material System**: Uniform buffer management is manual and needs to be automated.
3.  **Advanced Rendering**: Features like shadow mapping and post-processing are not implemented.
4.  **Device Loss**: Graceful recovery from GPU device loss is not implemented.
5.  **Culling**: No view frustum or occlusion culling is performed.

## Build & Development

```bash
# Build the package
bun run build

# Watch mode for development
bun run dev

# Type checking
bun run typecheck
```
