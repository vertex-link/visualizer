---
title: "Resources"
description: "Manage loading and compilation of assets and data with Resources."
---

# Resources

A `Resource` is a specialized object designed to manage the lifecycle of data that needs to be loaded and/or compiled before it can be used. This is perfect for managing assets like textures, 3D models, shader code, or configuration files.

The loading and compiling process begins **automatically** when a resource is instantiated.

## The Resource Lifecycle

A Resource goes through a series of statuses, managed internally:

1.  **UNLOADED**: The initial state before any action is taken.
2.  **LOADING**: The `loadInternal` method is in progress.
3.  **LOADED**: The `loadInternal` method has completed successfully. If a `compile` method exists, it is then called.
4.  **FAILED**: An error occurred during either loading or compilation.

The `whenReady()` promise only resolves after both loading and compilation (if applicable) are complete.

## Creating a Resource

To create a new type of resource, you extend the base `Resource<TData>` class. You typically override the `loadInternal` method to fetch your data asynchronously.

```typescript
import { Resource } from '@vertex-link/orbits';

// The data structure for our resource
interface LevelData {
  name: string;
  enemies: string[];
}

class LevelDataResource extends Resource<LevelData> {
  private url: string;

  constructor(name: string, url: string) {
    // Pass a default/empty payload to the super constructor
    super(name, {} as LevelData);
    this.url = url;
  }

  // Override loadInternal to fetch the data from a URL
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

Since resources load automatically, you can create an instance and then use the `whenReady()` method to await its completion.

```typescript
const level1 = new LevelDataResource('Level 1', '/levels/1.json');

try {
  // whenReady() returns a promise that resolves when the resource is loaded and compiled
  await level1.whenReady();
  console.log('Level is ready!', level1.payload.name);
} catch (error) {
  console.error('Could not load level:', error);
}
```

## The Compilation Step

Some resources need a "compilation" step after being loaded. For example, you might load shader source code (text) and then need to compile it into a `GPUShaderModule` for the GPU.

To do this, simply add a `compile()` method to your resource class. The base `Resource` will automatically call it after `loadInternal()` succeeds and will wait for it to complete.

```typescript
class ShaderResource extends Resource<string> {
  public compiledShader: GPUShaderModule | null = null;

  // loadInternal would fetch the shader code as a string...

  // This method will be called automatically after the code is loaded.
  async compile(): Promise<void> {
    // Assume getGpuDevice() is a function that returns the WebGPU device
    const device = getGpuDevice(); 
    this.compiledShader = device.createShaderModule({ code: this.payload });
  }
}
```

## Associating Resources with Actors

The standard way to use resources is to attach them to an `Actor` using a `ResourceComponent`. This keeps your scene graph organized.

```typescript
import { Actor, ResourceComponent } from '@vertex-link/orbits';

// Create a shader and a material resource
const shader = new ShaderResource(...);
const material = new MaterialResource(...);

// Create an actor and attach the resources via a component
const cube = new Actor('MyCube');
cube.addComponent(new ResourceComponent(cube, [shader, material]));

// Later, a processor can find this actor and use its resources
const resources = cube.getComponent(ResourceComponent)!;
const shaderResource = resources.get(ShaderResource)!;
```
