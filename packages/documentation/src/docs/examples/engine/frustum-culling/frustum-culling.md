# Frustum Culling

This example demonstrates high-performance frustum culling using WebAssembly (Zig) to dramatically improve rendering performance in scenes with many objects.

## Features

- **8,000 cubes** arranged in a 20×20×20 grid
- **WebAssembly-powered culling** using Zig for maximum performance
- **Automatic camera orbit** to show culling in action
- **Real-time statistics** showing visible vs culled objects
- **Bounding sphere tests** for fast and efficient culling

## How It Works

Frustum culling optimizes rendering by testing each object's bounding volume against the camera's view frustum (the visible region). Objects outside the frustum are marked as invisible and skipped during rendering.

### Key Components

1. **FrustumCullingProcessor** - Tests all objects against camera frustum
2. **FrustumCullingResource** - WebAssembly module for high-performance math
3. **Bounding Spheres** - Calculated automatically for each mesh
4. **MeshRendererComponent.setVisible()** - Controls object visibility

### Performance Benefits

Without frustum culling, all 8,000 cubes would be processed and sent to the GPU every frame. With culling enabled:

- Only visible objects are batched for rendering
- Typical visibility: 500-1500 objects (80-90% reduction!)
- Culling overhead: <1ms per frame
- Dramatic FPS improvement, especially on lower-end GPUs

## Code Example

```typescript
import {
  Context,
  FrustumCullingProcessor,
  WebGPUProcessor,
} from "@vertex-link/engine";

// Create processors
const frustumCulling = new FrustumCullingProcessor();
const webgpu = new WebGPUProcessor();

// IMPORTANT: Add frustum culling BEFORE rendering
context.addProcessor(frustumCulling);
context.addProcessor(webgpu);

// Initialize
await frustumCulling.initialize();

// Get statistics
const stats = frustumCulling.getStats();
console.log(`Visible: ${stats.visibleObjects}/${stats.totalObjects}`);
```

## Architecture

```
Camera → Extract Frustum Planes
    ↓
For each MeshRenderer:
    1. Get bounding sphere from mesh
    2. Transform by world matrix
    3. Test against frustum (WASM)
    4. setVisible(result)
    ↓
WebGPUProcessor → Only batch visible objects
```

## Try It Out

Open the demo and watch the statistics in the top-left corner. The camera automatically orbits the grid, and you'll see the number of visible/culled objects change as the view changes.

Notice how the FPS remains high even with 8,000 objects in the scene!
