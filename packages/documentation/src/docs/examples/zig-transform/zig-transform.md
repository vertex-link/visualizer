# Zig Transform Math Module

This example demonstrates the **ztransform** WebAssembly module - a high-performance 3D math library written in Zig and integrated as a ComputeResource.

## Overview

The ztransform module provides:

- **Vector Operations**: Vec2, Vec3, Vec4 with add, subtract, multiply, dot product, cross product, normalize, length, distance, and lerp
- **Matrix Operations**: Mat4 with identity, multiply, translate, scale, rotate (X/Y/Z axes), perspective, orthographic, lookAt, invert, and transpose
- **Quaternion Operations**: Identity, from axis-angle, multiply, to matrix, and slerp (spherical linear interpolation)
- **Utility Functions**: Degree/radian conversion, clamp, lerp

## Architecture

The module follows a dual-backend pattern:

1. **Zig Backend**: Optimized math operations compiled to WebAssembly for performance
2. **TypeScript Wrapper**: High-level API with memory management and TypeScript types

This approach provides:
- Native performance for compute-intensive operations
- Type-safe, developer-friendly API
- Seamless integration with existing TypeScript code

## Usage Example

```typescript
import { TransformMath } from "@vertex-link/engine";

// Initialize the module
const math = await TransformMath.create();

// Vector operations
const v1 = math.vec3(1, 2, 3);
const v2 = math.vec3(4, 5, 6);
const sum = math.vec3Add(v1, v2);
const cross = math.vec3Cross(v1, v2);
const normalized = math.vec3Normalize(v1);

// Matrix transformations
const identity = math.mat4Identity();
const translated = math.mat4Translate(identity, 10, 0, 0);
const rotated = math.mat4RotateY(translated, math.degToRad(45));
const scaled = math.mat4Scale(rotated, 2, 2, 2);

// Camera matrices
const projection = math.mat4Perspective(
  math.degToRad(60),  // FOV
  16/9,               // Aspect ratio
  0.1,                // Near plane
  100                 // Far plane
);

const view = math.mat4LookAt(
  math.vec3(0, 5, 10),  // Eye position
  math.vec3(0, 0, 0),   // Look at target
  math.vec3(0, 1, 0)    // Up vector
);

// Quaternion rotations
const axis = math.vec3Normalize(math.vec3(1, 1, 0));
const quat = math.quatFromAxisAngle(axis, math.degToRad(90));
const rotationMatrix = math.quatToMat4(quat);
```

## Performance

All mathematical operations are executed in WebAssembly, providing near-native performance for:
- Real-time 3D transformations
- Physics simulations
- Particle systems
- Skeletal animations
- Camera controls

## Integration with SPACe

The TransformMath module can be used alongside SPACe components:

```typescript
import { Actor, Engine } from "@vertex-link/space";
import { TransformMath, TransformComponent } from "@vertex-link/engine";

const math = await TransformMath.create();
const engine = new Engine();
const actor = new Actor();

// Use ztransform for complex calculations
const position = math.vec3(10, 0, 0);
const rotation = math.quatFromAxisAngle(
  math.vec3(0, 1, 0),
  math.degToRad(45)
);

// Apply to TransformComponent
const transform = actor.addComponent(TransformComponent);
transform.position = [position[0], position[1], position[2]];
```

## Memory Management

The TypeScript wrapper handles all memory allocation and deallocation automatically. Each operation:
1. Allocates temporary buffers in WebAssembly memory
2. Calls the Zig function
3. Copies results back to JavaScript
4. Returns new Float32Array instances

This ensures no memory leaks while maintaining performance for typical use cases.

## Advanced: Direct WASM Access

For maximum performance in tight loops, you can access the raw WASM module:

```typescript
const math = await TransformMath.create();
const module = (math as any).module;

// Allocate persistent buffers
const buffer = new Float32Array(module.memory.buffer, 0, 16);

// Use directly in render loop
function renderLoop() {
  module.mat4_rotate_y(0, angle, 0);
  // buffer now contains the result
  requestAnimationFrame(renderLoop);
}
```

## Technical Details

- **Compiled Target**: wasm32-freestanding
- **Optimization**: ReleaseSmall (size-optimized)
- **Matrix Format**: Column-major (OpenGL-style)
- **Coordinate System**: Right-handed
- **Angles**: Radians (use degToRad/radToDeg for conversion)
