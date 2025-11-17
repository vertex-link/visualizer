# GLTF Model Loading Example

This example demonstrates how to load and render GLTF 3D models in the Vertex Link engine.

## Architecture

The GLTF import system follows the existing Resource → Component → Processor pattern:

### 1. **GltfResource** (Resource Layer)
- Extends `Resource<GltfData>`
- Parses GLTF files using `@gltf-transform/core`
- Creates child `MeshResource` and `MaterialResource` instances
- Auto-loads and compiles in constructor

### 2. **ModelComponent** (Component Layer)
- Extends `Component`
- References `GltfResource` via `ResourceComponent`
- Provides access to multiple meshes/materials (primitives)
- Uses lazy getter pattern (same as `MeshRendererComponent`)

### 3. **WebGPUProcessor** (Processor Layer)
- Queries scene for actors with `ModelComponent`
- Batches primitives by material+mesh for instanced rendering
- No new rendering code paths - reuses existing batching system

## Usage

### Basic Example

```typescript
import { Engine, GltfResource, ModelComponent, TransformComponent } from "@vertex-link/engine";
import { Actor, ResourceComponent, Scene } from "@vertex-link/space";

// 1. Create actor
const modelActor = new Actor("MyModel");

// 2. Add components
const transform = modelActor.addComponent(TransformComponent);
modelActor.addComponent(ModelComponent);

transform.position = [0, 0, -5];

// 3. Create GLTF resource (auto-loads and compiles)
const gltfResource = new GltfResource("Model", {
  url: "/path/to/model.gltf"
});

// 4. Attach resource to actor
const resources = modelActor.addComponent(ResourceComponent);
resources.add(gltfResource);

// 5. Add to scene
scene.addActor(modelActor);
```

### Using the Composable Helper

```typescript
import { createGltfModel } from "./composables";

const model = createGltfModel(
  scene,
  "/path/to/model.gltf",
  [0, 0, -5], // position
  [1, 1, 1],  // scale
  [0, 0, 0]   // rotation
);
```

## GLTF Model Sources

You can find free GLTF models at:

- [Khronos glTF Sample Models](https://github.com/KhronosGroup/glTF-Sample-Models) - Official sample models
- [Sketchfab](https://sketchfab.com) - Filter by glTF format
- [Poly Haven](https://polyhaven.com) - Free 3D assets

## Supported Features

Currently supported GLTF features:
- ✅ Mesh geometry (vertices, normals, indices)
- ✅ Multiple meshes per model
- ✅ Basic materials (base color, metallic, roughness)
- ✅ Multiple materials
- ✅ Scene hierarchy (nodes)

Not yet supported:
- ❌ Textures
- ❌ Animations
- ❌ Skinning/Morphing
- ❌ Cameras/Lights from GLTF

## Implementation Details

### Resource Lifecycle

```
GltfResource constructor
  ↓
loadInternal() - Parse GLTF file
  ↓
compile() - Create child resources
  ↓
  ├─> ShaderResource (shared)
  ├─> MaterialResource[] (one per material)
  └─> MeshResource[] (one per primitive)
  ↓
READY for rendering
```

### Component Pattern

```typescript
class ModelComponent extends Component {
  // Lazy getter (cached)
  get model(): GltfResource | undefined {
    if (!this.resources) {
      this.resources = this.actor.getComponent(ResourceComponent);
    }
    return this.resources?.get(GltfResource);
  }

  // Access primitives
  getAllPrimitives(): ModelPrimitive[] {
    const model = this.model;
    if (!model) return [];

    return model.payload.meshes.map((_, i) => ({
      mesh: model.getMesh(i),
      material: model.getMaterial(i),
      // ...
    }));
  }
}
```

### Processor Integration

The `WebGPUProcessor` queries for both `MeshRendererComponent` and `ModelComponent`:

```typescript
// Query for GLTF models
const modelRenderables = this.scene
  .query()
  .withComponent(TransformComponent)
  .withComponent(ModelComponent)
  .execute();

// Process each primitive
for (const actor of modelRenderables) {
  const modelComponent = actor.getComponent(ModelComponent);
  const primitives = modelComponent.getAllPrimitives();

  // Each primitive is batched like a regular MeshRenderer
  for (const primitive of primitives) {
    // Add to batching system...
  }
}
```

## Troubleshooting

### Model not appearing

1. **Check console for errors** - The GltfResource logs its loading progress
2. **Verify GLTF file is valid** - Use [glTF Validator](https://github.khronos.org/glTF-Validator/)
3. **Check camera position** - Model might be too large/small or out of view
4. **Wait for compilation** - GLTF resources need time to load and compile

### Performance issues

1. **Use smaller models** - High poly counts impact performance
2. **Check mesh count** - Each primitive creates a separate draw call
3. **Monitor GPU usage** - Use browser DevTools Performance tab

## Next Steps

- Add texture support
- Implement GLTF animations
- Support skinned meshes
- Add LOD (Level of Detail) system
