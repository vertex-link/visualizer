# Zig Compute Example

This example demonstrates calling WebAssembly compiled from Zig using the ComputeResource abstraction from the ACS package.

## Zig Module

File: `src/compute/math.zig`

```
export fn add(a: f32, b: f32) f32 { return a + b; }
export fn multiply(a: f32, b: f32) f32 { return a * b; }
```

The Vite plugin compiles this Zig file to a WASM module and provides an `instantiate()` method used by `ComputeResource`.

## TypeScript Usage

```
import { ComputeResource } from '@vertex-link/acs'
import * as zigModule from '@/compute/math.zig'

const math = new ComputeResource(zigModule)
await math.whenReady()
const sum = math.add(5, 3)
```

Move the sliders to change input values `a` and `b`. The results are computed via Zig WASM.
