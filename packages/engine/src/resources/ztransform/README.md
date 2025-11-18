# ztransform - High-Performance 3D Math Library

A WebAssembly-based 3D math library written in Zig, providing optimized vector, matrix, and quaternion operations for graphics programming.

## Features

### Vector Operations
- **Vec2**: 2D vectors with add, subtract, multiply, dot product, length, normalize, distance, and lerp
- **Vec3**: 3D vectors with all Vec2 operations plus cross product
- **Vec4**: 4D vectors for homogeneous coordinates and quaternions

### Matrix Operations (Mat4)
- Identity, multiply, transpose, invert
- Transformations: translate, scale, rotate (X/Y/Z axes)
- Camera matrices: perspective, orthographic, lookAt

### Quaternion Operations
- Identity, from axis-angle
- Multiply, to matrix (Mat4)
- Slerp (spherical linear interpolation)

### Utility Functions
- Angle conversion: degrees ↔ radians
- Clamp, lerp (linear interpolation)

## Architecture

The module uses a **dual-backend pattern**:

1. **Zig Backend** (`src/main.zig`): Low-level math operations compiled to WebAssembly
2. **TypeScript Wrapper** (`TransformResource.ts`): High-level API with memory management

### Memory Layout

All operations use column-major matrix format (OpenGL-style):

```
Mat4:
[ 0  4  8 12 ]
[ 1  5  9 13 ]
[ 2  6 10 14 ]
[ 3  7 11 15 ]
```

Matrices are stored as flat arrays in WebAssembly linear memory, with TypeScript managing allocation and data transfer.

## Usage

### Basic Usage

```typescript
import { TransformMath } from "@vertex-link/engine";

// Initialize
const math = await TransformMath.create();

// Vectors
const v1 = math.vec3(1, 2, 3);
const v2 = math.vec3(4, 5, 6);
const sum = math.vec3Add(v1, v2);  // [5, 7, 9]
const cross = math.vec3Cross(v1, v2);
const normalized = math.vec3Normalize(v1);

// Matrices
const identity = math.mat4Identity();
const translated = math.mat4Translate(identity, 10, 0, 0);
const rotated = math.mat4RotateY(translated, math.degToRad(45));

// Camera
const projection = math.mat4Perspective(
  math.degToRad(60),  // FOV
  16/9,               // Aspect
  0.1,                // Near
  100                 // Far
);

const view = math.mat4LookAt(
  math.vec3(0, 5, 10),  // Eye
  math.vec3(0, 0, 0),   // Target
  math.vec3(0, 1, 0)    // Up
);

// Quaternions
const axis = math.vec3(0, 1, 0);
const quat = math.quatFromAxisAngle(axis, math.degToRad(90));
const rotationMatrix = math.quatToMat4(quat);
```

### Integration with SPACe Components

```typescript
import { Actor } from "@vertex-link/space";
import { TransformMath, TransformComponent } from "@vertex-link/engine";

const math = await TransformMath.create();
const actor = new Actor();
const transform = actor.addComponent(TransformComponent);

// Use ztransform for calculations
const position = math.vec3(10, 5, 0);
transform.position = [position[0], position[1], position[2]];

// Build transform matrix
let matrix = math.mat4Identity();
matrix = math.mat4Translate(matrix, ...transform.position);
matrix = math.mat4RotateY(matrix, transform.rotation[1]);
matrix = math.mat4Scale(matrix, ...transform.scale);
```

### Performance Optimization

For maximum performance in tight loops:

```typescript
// Allocate buffers once
const buffer = new Float32Array(16);
const module = (math as any).module;

// Reuse in render loop
function renderLoop() {
  // Write directly to WebAssembly memory
  const view = new Float32Array(module.memory.buffer, 0, 16);
  module.mat4_rotate_y(0, angle, 0);
  // view now contains the result

  requestAnimationFrame(renderLoop);
}
```

## API Reference

### Vec2 Operations

```typescript
vec2(x: number, y: number): Float32Array
vec2Add(a: Float32Array, b: Float32Array): Float32Array
vec2Sub(a: Float32Array, b: Float32Array): Float32Array
vec2Mul(a: Float32Array, scalar: number): Float32Array
vec2Dot(a: Float32Array, b: Float32Array): number
vec2Length(v: Float32Array): number
vec2Normalize(v: Float32Array): Float32Array
vec2Distance(a: Float32Array, b: Float32Array): number
vec2Lerp(a: Float32Array, b: Float32Array, t: number): Float32Array
```

### Vec3 Operations

```typescript
vec3(x: number, y: number, z: number): Float32Array
vec3Add(a: Float32Array, b: Float32Array): Float32Array
vec3Sub(a: Float32Array, b: Float32Array): Float32Array
vec3Mul(a: Float32Array, scalar: number): Float32Array
vec3Dot(a: Float32Array, b: Float32Array): number
vec3Cross(a: Float32Array, b: Float32Array): Float32Array
vec3Length(v: Float32Array): number
vec3Normalize(v: Float32Array): Float32Array
vec3Distance(a: Float32Array, b: Float32Array): number
vec3Lerp(a: Float32Array, b: Float32Array, t: number): Float32Array
```

### Vec4 Operations

```typescript
vec4(x: number, y: number, z: number, w: number): Float32Array
vec4Add(a: Float32Array, b: Float32Array): Float32Array
vec4Sub(a: Float32Array, b: Float32Array): Float32Array
vec4Mul(a: Float32Array, scalar: number): Float32Array
vec4Dot(a: Float32Array, b: Float32Array): number
vec4Length(v: Float32Array): number
vec4Normalize(v: Float32Array): Float32Array
```

### Mat4 Operations

```typescript
mat4Identity(): Float32Array
mat4Multiply(a: Float32Array, b: Float32Array): Float32Array
mat4Translate(mat: Float32Array, x: number, y: number, z: number): Float32Array
mat4Scale(mat: Float32Array, x: number, y: number, z: number): Float32Array
mat4RotateX(mat: Float32Array, angle: number): Float32Array
mat4RotateY(mat: Float32Array, angle: number): Float32Array
mat4RotateZ(mat: Float32Array, angle: number): Float32Array
mat4Perspective(fovy: number, aspect: number, near: number, far: number): Float32Array
mat4Ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Float32Array
mat4LookAt(eye: Float32Array, center: Float32Array, up: Float32Array): Float32Array
mat4Invert(mat: Float32Array): Float32Array | null
mat4Transpose(mat: Float32Array): Float32Array
```

### Quaternion Operations

```typescript
quatIdentity(): Float32Array
quatFromAxisAngle(axis: Float32Array, angle: number): Float32Array
quatMultiply(a: Float32Array, b: Float32Array): Float32Array
quatToMat4(quat: Float32Array): Float32Array
quatSlerp(a: Float32Array, b: Float32Array, t: number): Float32Array
```

### Utility Functions

```typescript
degToRad(degrees: number): number
radToDeg(radians: number): number
clamp(value: number, min: number, max: number): number
lerp(a: number, b: number, t: number): number
```

## Build Configuration

The module is compiled via `vite-plugin-zig` with the following configuration:

```typescript
{
  name: "ztransform",
  path: path.resolve(__dirname, "src/resources/ztransform"),
  entry: "src/main.zig",
  target: "wasm32-freestanding",
  optimize: "ReleaseSmall"
}
```

### Build Settings

- **Target**: `wasm32-freestanding` - Standalone WebAssembly without OS dependencies
- **Optimization**: `ReleaseSmall` - Size-optimized for web delivery
- **Entry Point**: `src/main.zig` - All exported functions

## Performance

Typical performance on modern hardware:

- **Vec3 operations**: ~1-2 million ops/sec
- **Mat4 multiply**: ~500k-1M ops/sec
- **Full transformation chain**: ~100k-500k ops/sec

Performance characteristics:
- All operations execute in WebAssembly with near-native speed
- No garbage collection during computation
- Predictable performance for real-time applications

## Testing

Run the example to verify functionality:

```bash
cd packages/documentation
bun run dev
# Navigate to /docs/examples/zig-transform
```

The example demonstrates:
- All vector, matrix, and quaternion operations
- Camera matrix generation
- Matrix inversion and verification
- Performance benchmarking

## Future Enhancements

Potential additions:
- SIMD optimizations for parallel operations
- Additional matrix operations (decompose, compose)
- More quaternion utilities (from/to euler angles)
- Plane, ray, and frustum utilities
- Bounding volume calculations (AABB, OBB, sphere)

## License

Part of the @vertex-link/engine package.
