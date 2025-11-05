# Shader Pass System

The rendering pipeline uses a **render pass** system to organize rendering operations. Passes execute in priority order to perform distinct rendering tasks (shadow mapping, forward rendering, post-processing, etc.).

## Architecture

### Core Concepts

**RenderPass** - Abstract base class defining the pass interface
- `initialize(device)` - Setup GPU resources
- `execute(context)` - Perform rendering
- `dispose()` - Cleanup resources

**RenderGraph** - Manages and executes passes in priority order
- Lives inside `WebGPUProcessor` (not exposed externally)
- Automatically creates default passes (Shadow, Forward, PostProcess)

**RenderPassContext** - Data contract passed to all passes
```typescript
interface RenderPassContext {
  renderer: WebGPURenderer;
  batches: RenderBatch[];          // Pre-batched geometry instances
  camera: CameraComponent;
  deltaTime: number;
  globalBindGroup: GPUBindGroup;   // View-projection matrix
  lightBindGroup?: GPUBindGroup;   // Light data
}
```

### SPACe/Engine Pattern

Following SPACe and engine best practices:

1. **WebGPUProcessor** queries the scene (Actor-Component-System)
2. **WebGPUProcessor** prepares batches and bind groups
3. **RenderGraph** executes passes with prepared data
4. **Passes** only use `RenderPassContext` - they don't query scenes

This maintains clear separation: processors coordinate, passes render.

## Default Passes

The engine automatically creates three default passes:

### ShadowPass (Priority 5)
Renders scene from light perspectives to generate shadow maps for shadow casting.

**Status:** Implemented structure, execution placeholder
**Location:** `packages/engine/src/rendering/RenderGraph.ts`

### ForwardPass (Priority 10)
Main scene rendering with lighting and materials.

**Status:** Fully implemented
**Location:** `packages/engine/src/rendering/RenderGraph.ts`

### PostProcessPass (Priority 100)
Post-processing effects (bloom, tonemapping, etc.)

**Status:** Placeholder for future implementation
**Location:** `packages/engine/src/rendering/RenderGraph.ts`

## Usage

### No Manual Configuration Needed

The pass system works automatically when you use the Engine:

```typescript
import { Engine } from "@vertex-link/engine";
import { Scene } from "@vertex-link/space";

// Create engine - passes are automatically set up
const engine = new Engine({ canvas });
await engine.initialize();

// Create scene with actors/components
const scene = new Scene("MyScene");
// ... add actors, lights, meshes ...

// Set scene - rendering happens automatically
engine.setScene(scene);
engine.start();

// That's it! Shadow, Forward, and PostProcess passes run automatically
```

### How It Works

1. **Engine Constructor**
   ```typescript
   // Inside Engine constructor:
   const processor = new WebGPUProcessor(/* ... */);
   // WebGPUProcessor creates RenderGraph with default passes
   ```

2. **WebGPUProcessor.initialize()**
   ```typescript
   // Initializes RenderGraph, which calls initialize() on all passes
   this.renderGraph.initialize(device);
   ```

3. **Rendering Loop**
   ```typescript
   // Each frame:
   // 1. WebGPUProcessor queries scene for renderables
   // 2. Batches geometry by material/mesh
   // 3. Prepares bind groups (camera, lights)
   // 4. Calls RenderGraph.execute(context)
   // 5. Each pass receives the context and renders
   ```

## Shadow Mapping (Future)

To enable shadow casting, add `ShadowMapResource` to light actors:

```typescript
import {
  ShadowMapResource,
  ShadowMapType,
  DirectionalLightComponent,
  TransformComponent,
} from "@vertex-link/engine";
import { Actor, ResourceComponent } from "@vertex-link/space";

// Create light with shadows
const lightActor = new Actor("DirectionalLight");

// Position and orient light
const transform = lightActor.addComponent(TransformComponent);
transform.setRotation([45, 45, 0]);

// Add light component
const light = lightActor.addComponent(DirectionalLightComponent);
light.color = [1.0, 1.0, 0.9];
light.intensity = 1.0;

// Attach shadow map resource
const shadowMap = new ShadowMapResource("MainShadow", {
  type: ShadowMapType.SINGLE,  // For directional lights
  resolution: 2048,
  format: "depth24plus",
});

const resources = lightActor.addComponent(ResourceComponent);
resources.addResource(shadowMap);

// Add to scene
scene.addActor(lightActor);

// ShadowPass will automatically detect and render to this shadow map
```

**Note:** Full shadow mapping implementation requires:
- Extending `RenderPassContext` with shadow map data
- WebGPUProcessor querying for lights with `ShadowMapResource`
- ShadowPass using the shadow data from context

## Best Practices

### DRY (Don't Repeat Yourself)
✅ Passes are defined once in `RenderGraph.ts` with ForwardPass/PostProcessPass
✅ Reuse bind group layouts and buffer formats across passes
✅ Share shader code through common WGSL includes

### KISS (Keep It Simple, Stupid)
✅ One pass = one responsibility (shadows, forward, post-process)
✅ Passes only use `RenderPassContext` - no complex state management
✅ Priority system handles ordering - no manual dependencies

### SPACe Architecture
✅ WebGPUProcessor queries scene via Actor-Component-System
✅ Passes receive prepared data via context
✅ Resources (ShadowMapResource, MaterialResource) hold GPU data
✅ Components (LightComponent, MeshRendererComponent) hold entity data

## Extending the Pass System

To add a custom pass, edit `RenderGraph.ts`:

```typescript
// In RenderGraph.ts
export class MyCustomPass extends RenderPass {
  constructor(priority = 50) {
    super("MyCustom", priority);
  }

  initialize(device: GPUDevice): void {
    // Create pipelines, buffers, etc.
  }

  execute(context: RenderPassContext): void {
    const { renderer, batches, camera } = context;
    // Render using prepared data
  }

  dispose(): void {
    // Cleanup GPU resources
  }
}

// Add to RenderGraph constructor
constructor() {
  this.addPass(new ShadowPass(5));
  this.addPass(new ForwardPass(10));
  this.addPass(new MyCustomPass(50));  // Your pass here
  this.addPass(new PostProcessPass(100));
}
```

## Implementation Details

### Why Passes Are in RenderGraph.ts

The engine follows these patterns:
- **Cohesion**: Related passes stay together in one file
- **Simplicity**: No complex module system for built-in passes
- **Clarity**: Easy to see all passes and their priorities at once

Looking at `ForwardPass` and `PostProcessPass` in `RenderGraph.ts` shows this pattern is intentional.

### Why RenderGraph Is Internal

The RenderGraph is owned by WebGPUProcessor and not exposed because:
- **Encapsulation**: Rendering details are processor implementation
- **Simplicity**: Users work with Engine/Scene, not low-level graph
- **SPACe pattern**: Configuration happens through Actor-Component-System

This keeps the API surface small and focused.

## Debugging

The RenderGraph logs pass execution:

```
➕ Added render pass: Shadow (priority: 5)
➕ Added render pass: Forward (priority: 10)
➕ Added render pass: PostProcess (priority: 100)
📊 Configured render graph for forward rendering
```

Enable verbose logging to see pass execution details in ForwardPass.

## Future Enhancements

Planned additions to the pass system:
- **Deferred rendering pass** - G-buffer generation
- **SSAO pass** - Screen-space ambient occlusion
- **Bloom pass** - HDR bloom effect
- **TAA pass** - Temporal anti-aliasing

These will follow the same pattern: added to RenderGraph constructor with appropriate priority.
