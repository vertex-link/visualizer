# Render Passes

This directory contains render pass implementations for the engine's rendering pipeline.

## What is a Render Pass?

A render pass represents a distinct rendering operation in the rendering pipeline. Each pass:
- Extends the `RenderPass` base class
- Has a priority value (lower executes first)
- Receives a `RenderPassContext` with scene data
- Can read from and write to GPU textures/buffers

## Available Passes

### ShadowPass (Priority: 5)
Renders the scene from light perspectives to generate shadow maps for shadow casting.

**Usage:**
```typescript
import { Engine, ShadowPass } from "@vertex-link/engine";

const engine = new Engine({ canvas });
await engine.initialize();

// Add shadow pass to render graph
const shadowPass = new ShadowPass();
engine.getRenderGraph().addPass(shadowPass);

// The shadow pass will automatically execute before the forward pass
// due to its lower priority value (5 vs 10)
```

**Features:**
- Depth-only rendering for performance
- Supports directional and point lights (via ShadowMapResource)
- Automatically integrates with the lighting system
- Uses instanced rendering for efficiency

**Architecture:**
- Shader: `webgpu/shaders/shadow.wgsl`
- Outputs: Shadow maps (depth textures)
- Inputs: Scene geometry, light transforms

## Creating a Custom Pass

```typescript
import { RenderPass, type RenderPassContext } from "@vertex-link/engine";

export class MyCustomPass extends RenderPass {
  constructor(priority = 50) {
    super("MyCustomPass", priority);
  }

  initialize(device: GPUDevice): void {
    // Setup GPU resources (pipelines, buffers, etc.)
  }

  execute(context: RenderPassContext): void {
    const { renderer, batches, camera, deltaTime } = context;

    // Implement your rendering logic here
    // Access global uniforms via context.globalBindGroup
    // Access lighting via context.lightBindGroup
  }

  dispose(): void {
    // Cleanup GPU resources
  }
}
```

## Pass Execution Order

Passes execute in priority order (lower values first):

1. **ShadowPass (5)** - Generate shadow maps
2. **ForwardPass (10)** - Main scene rendering
3. **PostProcessPass (100)** - Post-processing effects

You can insert custom passes at any priority level to control execution order.

## Best Practices

### DRY (Don't Repeat Yourself)
- Reuse existing bind group layouts (see `StandardBindGroupLayouts.ts`)
- Share shader code via WGSL imports
- Leverage the `RenderPassContext` for common data

### KISS (Keep It Simple, Stupid)
- Each pass should have a single, clear responsibility
- Minimize state management within passes
- Use the priority system instead of complex dependencies

### SPACe Architecture
- Query scene via the Actor-Component-System
- Use Resources for GPU data (textures, buffers)
- Processors should coordinate, not contain business logic
