---
title: "Resources"
description: "Manage loading and compilation of assets and data with Resources."
---

# Resources

A `Resource` is a specialized object designed to manage the lifecycle of data that needs to be loaded, and potentially compiled, before it can be used. This is perfect for things like textures, 3D models, shader code, or configuration files.

## The Resource Lifecycle

A Resource goes through a series of statuses:

1.  **UNLOADED**: The initial state.
2.  **LOADING**: The resource is fetching its data.
3.  **LOADED**: The data has been fetched and the resource is ready for use (or compilation).
4.  **FAILED**: An error occurred during loading or compilation.

## Creating a Resource

To create a new type of resource, you extend the base `Resource` class. You must implement the `loadInternal` method.

```typescript
import { Resource } from '@vertex-link/acs';

interface LevelData {
  name: string;
  enemies: string[];
}

class LevelDataResource extends Resource<LevelData> {
  private url: string;

  constructor(name: string, url: string) {
    super(name, {} as LevelData); // Start with empty payload
    this.url = url;
  }

  protected async loadInternal(): Promise<LevelData> {
    const response = await fetch(this.url);
    if (!response.ok) {
      throw new Error(`Failed to load level data from ${this.url}`);
    }
    return await response.json();
  }
}
```

## Using a Resource

When you create a resource, its loading process starts automatically. You can use the `whenReady()` method to wait for it to be fully loaded and compiled.

```typescript
const level1 = new LevelDataResource('Level 1', '/levels/1.json');

try {
  await level1.whenReady();
  console.log('Level is ready!', level1.payload.name);
} catch (error) {
  console.error('Could not load level:', error);
}
```

## Compilation

Some resources, especially those for rendering, need a "compilation" step after being loaded. For example, you might load shader source code (text) and then need to compile it into a `GPUShaderModule`.

You can optionally implement a `compile()` method in your resource. This method will be called automatically after `loadInternal()` succeeds.

```typescript
class ShaderResource extends Resource<string> {
  // ... loadInternal fetches the shader code ...

  public compiledShader: GPUShaderModule | null = null;

  async compile(): Promise<void> {
    // Assume getGpuDevice() is a function that returns the WebGPU device
    const device = getGpuDevice(); 
    this.compiledShader = device.createShaderModule({ code: this.payload });
  }
}
```
