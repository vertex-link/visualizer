# Textured Cube Example

This example demonstrates the new **ImageResource** and **SamplerResource** system with the slot-based architecture.

## Features

- **Automatic slot discovery**: Material auto-creates slots from shader `@binding` declarations
- **ImageResource**: Loads and uploads textures to GPU
- **SamplerResource**: Automatic deduplication of identical samplers
- **Fluent API**: Chain `.slot()` calls to fill resources
- **Smart fallbacks**: Samplers can come from explicit slots OR texture's default sampler

## How It Works

### 1. Shader Declares Bindings

```wgsl
// textured.frag.wgsl
@group(0) @binding(1) var diffuseTexture: texture_2d<f32>;
@group(0) @binding(2) var diffuseSampler: sampler;
```

### 2. Material Auto-Creates Slots

```typescript
const shader = new ShaderResource("TexturedShader", {
  vertexSource: vertexWGSL,
  fragmentSource: fragmentWGSL,
});

const material = MaterialResource.createBasic("TexturedMaterial", shader);
await material.whenReady();

// Material now has slots: "diffuseTexture" and "diffuseSampler"
console.log(Array.from(material.getSlots().keys()));
// → ["diffuseTexture", "diffuseSampler"]
```

### 3. Fill Slots with Resources

```typescript
// Create texture
const textureData = await createCheckerboardTexture();
const diffuseTexture = new ImageResource("DiffuseTexture", {
  source: textureData,
  sRGB: true,
});

// Create sampler (optional - texture has default)
const sampler = new SamplerResource("LinearRepeat", {
  magFilter: "linear",
  minFilter: "linear",
  addressModeU: "repeat",
  addressModeV: "repeat",
});

// Fill slots using fluent API
material
  .slot("diffuseTexture", diffuseTexture)
  .slot("diffuseSampler", sampler);
```

### 4. Automatic Bind Group Creation

When the material compiles:
1. Iterates through shader bindings
2. Fills bind group entries from slots
3. Falls back to texture's default sampler if no explicit sampler slot
4. Creates `GPUBindGroup` automatically

## Key Classes

- **ImageResource**: Texture loading + GPU upload
  - Has a "sampler" slot with default LinearRepeat sampler
  - Loads from URL, ArrayBuffer, or ImageBitmap
  - Supports sRGB and mipmap generation

- **SamplerResource**: GPU sampler configuration
  - Static cache for automatic deduplication
  - Multiple resources with identical configs → single GPUSampler

- **Resource.slot()**: Unified get/set method
  - `resource.slot("name")` → getter
  - `resource.slot("name", value)` → setter (fluent)
  - Auto-creates slot if doesn't exist

## Architecture Benefits

✅ No factory patterns
✅ No service managers
✅ Shader-driven (auto-discovers bindings)
✅ Automatic sampler pooling
✅ Type-safe slot validation
✅ Fluent API for chaining
✅ Smart fallbacks (texture's sampler OR explicit sampler slot)

## Usage

```typescript
import { createTexturedCube, createCamera } from "./composables";

// In your scene setup
const camera = createCamera(scene, canvas);
const cube = await createTexturedCube(scene);

// The cube is automatically textured and rotating!
```
