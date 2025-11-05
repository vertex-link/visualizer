# Shader Pass System - Usage Guide

This guide demonstrates how to use the shader pass system in the visualizer engine.

## Overview

The shader pass system allows you to organize rendering into distinct, reusable passes. Each pass runs at a specific priority and can read/write GPU resources.

## Architecture

### Core Components

1. **RenderPass** - Abstract base class for all passes
2. **RenderGraph** - Manages and executes passes in priority order
3. **RenderPassContext** - Shared context passed to all passes

### Priority System

Passes execute in priority order (lower numbers first):

```
ShadowPass (5) → ForwardPass (10) → PostProcessPass (100)
```

## Using the ShadowPass

The `ShadowPass` renders scene geometry from light perspectives to generate shadow maps.

### Basic Setup

```typescript
import { Engine, ShadowPass } from "@vertex-link/engine";
import { Scene } from "@vertex-link/space";

async function initWithShadows() {
  const engine = new Engine({ canvas });
  await engine.initialize();

  // Get the render graph
  const renderGraph = engine.getRenderGraph();

  // Add shadow pass (it will automatically execute before forward pass)
  const shadowPass = new ShadowPass();
  renderGraph.addPass(shadowPass);

  // Create your scene
  const scene = new Scene("MyScene");
  engine.setScene(scene);

  // Add lights with shadow maps (see below)
  // ...

  engine.start();
}
```

### Adding Shadow Maps to Lights

To enable shadow casting for a light, attach a `ShadowMapResource`:

```typescript
import {
  ShadowMapResource,
  ShadowMapType,
  DirectionalLightComponent,
  TransformComponent
} from "@vertex-link/engine";
import { Actor, ResourceComponent } from "@vertex-link/space";

// Create a directional light with shadows
const lightActor = new Actor("DirectionalLight");

// Add transform
const transform = lightActor.addComponent(TransformComponent);
transform.setRotation([45, 45, 0]); // Point light direction

// Add light component
const light = lightActor.addComponent(DirectionalLightComponent);
light.color = [1.0, 1.0, 0.9];
light.intensity = 1.0;

// Create shadow map resource
const shadowMap = new ShadowMapResource("MainShadowMap", {
  type: ShadowMapType.SINGLE,
  resolution: 2048,
  format: "depth24plus"
});

// Attach shadow map to light
const resourceComp = lightActor.addComponent(ResourceComponent);
resourceComp.addResource(shadowMap);

// Add to scene
scene.addActor(lightActor);
```

### Shadow Map Types

**SINGLE** - For directional and spot lights
```typescript
{
  type: ShadowMapType.SINGLE,
  resolution: 2048  // 2048x2048 texture
}
```

**CUBE** - For point lights (omnidirectional)
```typescript
{
  type: ShadowMapType.CUBE,
  resolution: 1024  // 1024x1024 per face (6 faces)
}
```

## Creating Custom Passes

### Example: Outline Pass

```typescript
import { RenderPass, type RenderPassContext } from "@vertex-link/engine";

export class OutlinePass extends RenderPass {
  private pipeline: GPURenderPipeline | null = null;

  constructor() {
    super("Outline", 15); // After shadow (5), before post-process (100)
  }

  initialize(device: GPUDevice): void {
    // Create pipeline for outline rendering
    this.pipeline = device.createRenderPipeline({
      // ... pipeline setup
    });
  }

  execute(context: RenderPassContext): void {
    const { renderer, batches, camera } = context;

    // Implement outline rendering
    // 1. Render silhouette to stencil buffer
    // 2. Render expanded geometry where stencil differs
    // 3. Output outlined objects
  }

  dispose(): void {
    this.pipeline = null;
  }
}
```

### Adding Custom Pass to Engine

```typescript
const engine = new Engine({ canvas });
await engine.initialize();

const outlinePass = new OutlinePass();
engine.getRenderGraph().addPass(outlinePass);
```

## Best Practices

### DRY (Don't Repeat Yourself)

✅ **Good** - Reuse standard bind group layouts:
```typescript
import { createGlobalBindGroupLayout } from "@vertex-link/engine";

const layout = createGlobalBindGroupLayout(device);
```

❌ **Bad** - Recreate layouts in every pass:
```typescript
const layout = device.createBindGroupLayout({ /* duplicate code */ });
```

### KISS (Keep It Simple, Stupid)

✅ **Good** - Single responsibility per pass:
```typescript
class ShadowPass extends RenderPass {
  execute(context) {
    // Only render shadow maps
    this.renderShadowMaps(context);
  }
}
```

❌ **Bad** - Multiple responsibilities:
```typescript
class MegaPass extends RenderPass {
  execute(context) {
    this.renderShadows(context);
    this.renderGeometry(context);
    this.renderPostProcess(context);
    this.renderUI(context);
  }
}
```

### SPACe Architecture

✅ **Good** - Query scene for components:
```typescript
execute(context: RenderPassContext) {
  // Query scene through context
  const lights = this.scene
    .query()
    .withComponent(LightComponent)
    .execute();
}
```

❌ **Bad** - Maintain separate light list:
```typescript
class ShadowPass {
  private lights: Light[] = []; // Duplicate state!

  addLight(light: Light) {
    this.lights.push(light);
  }
}
```

## Integration with SPACe

Render passes work seamlessly with the Actor-Component-System:

```typescript
// Actors contain components
const cubeActor = new Actor("Cube");

// Components hold data
cubeActor.addComponent(TransformComponent);
cubeActor.addComponent(MeshRendererComponent);

// Passes query for components
scene.query()
  .withComponent(TransformComponent)
  .withComponent(MeshRendererComponent)
  .execute();
```

## Performance Tips

1. **Minimize State Changes** - Sort batches by material/pipeline
2. **Use Instancing** - The `RenderPassContext.batches` are already instanced
3. **Cache Resources** - Create buffers/pipelines in `initialize()`, not `execute()`
4. **Conditional Execution** - Disable passes when not needed:

```typescript
renderGraph.setPassEnabled("Shadow", shadowsEnabled);
```

## Debugging

Enable pass logging:

```typescript
const renderGraph = engine.getRenderGraph();

// View all passes
console.log(renderGraph.getPasses());

// Get specific pass
const shadowPass = renderGraph.getPass("Shadow");
console.log(shadowPass?.enabled);
```

## Future Enhancements

The pass system is designed for extensibility. Planned passes include:

- **DeferredPass** - Deferred rendering (G-buffer)
- **SSAOPass** - Screen-space ambient occlusion
- **BloomPass** - Bloom post-processing
- **TAA Pass** - Temporal anti-aliasing

---

For more examples, see:
- `packages/engine/src/rendering/passes/README.md`
- `packages/documentation/src/docs/examples/engine/lit-scene/`
