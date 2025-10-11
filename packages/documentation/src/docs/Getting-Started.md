---
title: "Getting Started with Vertex Link"
description: "Complete guide to building your first application with Vertex Link framework"
---

# Getting Started with Vertex Link

This guide covers the essential patterns and examples you need to start building applications with the Vertex Link framework. Learn how to set up scenes, create actors, manage resources, and use the modern composable-based architecture.

## Quick Look - Basic Application Setup

Here's a complete example of creating an actor and adding components:

```typescript
// --- In your main application setup ---

// Initialize the engine context
const engineContext = new EngineContext(canvas);
await engineContext.initialize();

// Create a scene and set it on the context
const scene = new Scene("MyScene");
engineContext.setScene(scene);

// Create an Actor
const myActor = new Actor("MyCube");
scene.addActor(myActor);

// Add components explicitly
const transform = myActor.addComponent(TransformComponent);
transform.setPosition(0, 0, 0);

const meshRenderer = myActor.addComponent(MeshRendererComponent, {
    mesh: myMeshResource,
    material: myMaterialResource
});

// Add custom behavior components
const rotator = myActor.addComponent(RotatingComponent);
rotator.speed = 1.0;

// Create camera
const cameraActor = new Actor("MainCamera");
const cameraTransform = cameraActor.addComponent(TransformComponent);
cameraTransform.setPosition(0, 1.5, 8);

cameraActor.addComponent(CameraComponent, {
    projectionType: ProjectionType.PERSPECTIVE,
    perspectiveConfig: {
        fov: Math.PI / 3,
        aspect: canvas.width / canvas.height,
        near: 0.1,
        far: 100.0,
    },
    isActive: true,
});

scene.addActor(cameraActor);

// Start the engine
engineContext.start();
```

Note:
- EngineContext currently manages a single active Scene at a time via `setScene(scene)`. You can prepare other scenes off-thread or swap them in later, but concurrent rendering of multiple scenes is not provided by the default WebGPU processor yet.


## Resource Management Pattern

Resources in Vertex Link are plain classes you instantiate (e.g., MeshResource, MaterialResource). They lazy-load and compile as needed when first used by systems like the WebGPU renderer. You typically attach them to an Actor via ResourceComponent.

```typescript
// Create resources directly (no global resource manager required)
const mesh = new MeshResource("CubeMesh", meshDescriptor);
const material = new MaterialResource("CubeMaterial", {
  // shader/material setup depends on your renderer configuration
  // e.g., references to shader code, pipeline layout, uniforms, etc.
});

// Attach resources to an actor via ResourceComponent
const resources = myActor.addComponent(ResourceComponent, [mesh, material]);

// Optionally, ensure GPU readiness ahead of time
await mesh.whenReady();
await material.whenReady();

// MeshRendererComponent will read MeshResource/MaterialResource from ResourceComponent
const meshRenderer = myActor.addComponent(MeshRendererComponent);
```

### Key Resource Management Concepts

1. **Direct Instantiation**: Create resources via `new MeshResource(...)`, `new MaterialResource(...)`.
2. **Lazy Readiness**: Use `await resource.whenReady()` if you need to ensure readiness ahead of time; otherwise, render systems request readiness on demand.
3. **Device Binding**: GPU device binding is handled internally via the current WebGPU processor; you do not manually pass the device.
4. **Compilation**: `compile()` is called by systems as needed; you can call it explicitly, but it is not required in typical flows.
5. **Recompilation**: Resources manage their own recompile lifecycle when renderer/device changes occur.

## Composable-like Helpers (Decorator Replacement)

Vertex Link uses thin, context-aware functions inspired by Vue composables instead of decorators. This keeps the OOP style (classes, methods) while avoiding decorators and global singletons.

### Available Context Helpers

**Helper location**: `src/composables/context.ts`

- `runWithContext(ctx, fn)`: enter a context for the synchronous duration of fn
- `getCurrentContext(strict?)`: fetch current context (throw if strict and missing)
- `useActor/useComponent/useScene/useEventBus/useProcessor`: read from the current context
- `deriveContext(partial)`: shallow-merge a new context from the current
- `withContext(ctx, fn)`: convenience alias for class methods

### Example: OOP Component Using Helpers

```typescript
import { withContext, useActor, useEventBus } from "@vertex-link/space/composables/context";

class MyComponent {
  constructor(public actor: any, public bus: any) {}

  update() {
    return withContext({ component: this, actor: this.actor, eventBus: this.bus }, () => {
      const actor = useActor<{ name: string }>();
      const bus = useEventBus<{ emit: (e: string) => void }>();
      // ... your update logic here
      bus.emit(`updated:${actor.name}`);
    });
  }
}
```

### Procedural Usage

```typescript
import { runWithContext, useProcessor } from "@vertex-link/space/composables/context";

runWithContext({ scene, processors: new Map([["webgpu", webgpuProcessor]]) }, () => {
  const p = useProcessor<any>("webgpu");
  // ... use the processor
});
```

### Important Notes

- **Synchronous scope only**: The helpers work within synchronous execution. If you use async operations (e.g., `setTimeout`/`await`), re-enter a context around the async callback or pass dependencies explicitly.
- **Incremental migration**: Start by wrapping selected methods with `withContext` and gradually remove decorators.
- **Engine-agnostic**: You control what goes into the context (actor, component, eventBus, processors/services), keeping boundaries clear.

### Additional SPACe Composables

**Event Management** (`packages/space/src/composables/events.ts`):
- `useOnEvent/useOnceEvent`: Subscribe to events on the current context's event bus. Both return disposer functions.

```typescript
import { useOnEvent, useOnceEvent } from '@vertex-link/space/composables/events';

// In a component or system
const disposeHandler = useOnEvent('playerDied', (event) => {
  console.log('Player died:', event.data);
});

// Clean up when done
disposeHandler();
```

**Processor Management** (`packages/space/src/composables/processors.ts`):
- `useUpdate(processorName, fn, context[, id])`: Register per-frame/fixed-tick work without decorators.

```typescript
import { useUpdate } from '@vertex-link/space/composables/processors';

// Register update function
useUpdate('render', () => {
  // Update logic here
  transform.rotation.y += deltaTime * rotationSpeed;
}, myContext, 'myUniqueId');
```

## Decorator Status and Migration

**Current Status**: Decorator-based hooks are removed/disabled. `tsconfig.base.json` sets `experimentalDecorators=false` and `emitDecoratorMetadata=false`.

**Migration Path**: Prefer the explicit composable APIs described above instead of decorators.

### Before (Decorators - Deprecated)
```typescript
class MyComponent extends Component {
  @OnUpdate('render')
  updateRender() {
    // Update logic
  }

  @OnEvent('entityDestroyed')
  handleDestroyed(event: EntityDestroyedEvent) {
    // Event handling
  }
}
```

### After (Composables - Current)
```typescript
class MyComponent extends Component {
  constructor(actor: Actor) {
    super(actor);
    
    // Set up update and event handling in constructor or init
    this.setupUpdateLoop();
    this.setupEventHandlers();
  }

  private setupUpdateLoop() {
    useUpdate('render', () => {
      // Update logic
      this.updateRender();
    }, this.getContext());
  }

  private setupEventHandlers() {
    useOnEvent('entityDestroyed', (event) => {
      this.handleDestroyed(event);
    });
  }

  private updateRender() {
    // Your update logic here
  }

  private handleDestroyed(event: EntityDestroyedEvent) {
    // Your event handling here
  }
}
```

## Component Dependency Pattern

Components handle dependencies explicitly through getter methods and manual resolution:

```typescript
class MyComponent extends Component {
  private _transform?: TransformComponent;
  private _resources?: ResourceComponent;
  
  constructor(actor: Actor) {
    super(actor);
  }

  get transform(): TransformComponent {
    if (this._transform) {
      return this._transform;
    }

    this._transform = this.actor.getComponent(TransformComponent);
    if (!this._transform) {
      throw new Error('TransformComponent not found');
    }
    return this._transform;
  }
  
  get resources(): ResourceComponent {
    if (this._resources) {
      return this._resources;
    }

    this._resources = this.actor.getComponent(ResourceComponent);
    if (!this._resources) {
      throw new Error('ResourceComponent not found');
    }
    return this._resources;
  }
}
```

## Scene Management and Querying

Vertex Link provides powerful querying capabilities for finding actors in scenes:

```typescript
// Basic query - find all actors with specific components
const renderableActors = scene.query()
  .withComponent(TransformComponent)
  .withComponent(MeshRendererComponent)
  .execute();

// Advanced query - find enemies with AI that are currently active
const activeEnemies = scene.query()
  .withComponent(EnemyComponent)
  .withComponent(AIComponent)
  .withTag('active')
  .withoutTag('dead')
  .execute();

// Query with filtering
const nearbyActors = scene.query()
  .withComponent(TransformComponent)
  .where((actor) => {
    const transform = actor.getComponent(TransformComponent);
    return transform && Vector3.distance(transform.position, playerPosition) < 10;
  })
  .execute();
```

## Development Plan Highlights

Understanding the future direction of Vertex Link helps in making architectural decisions:

- **Simplified Architecture**: Removing decorator complexity for better maintainability and debugging.
- **Component-Driven Resources**: Simplifying how resources are accessed and managed by actors.
- **Streamlined Material System**: More flexible and instance-based material properties.
- **Declarative Scene Setup API**: Reducing boilerplate for scene creation.
- **Advanced Hierarchy System**: Robust parent-child relationships for actors.
- **Buffer Streaming**: A key long-term goal for efficient handling of large-scale scenes and data.

## Next Steps

Now that you understand the basic patterns, explore:

1. **[Component Architecture](./components/overview)** - Deep dive into component design
2. **[Resource Management](./resources/overview)** - Advanced resource patterns
3. **[Rendering Pipeline](./rendering/overview)** - WebGPU rendering concepts
4. **[Event System](./events/overview)** - Event-driven communication
5. **[Examples](./examples/)** - Interactive examples and tutorials

We encourage you to explore the code, examples, and the full documentation to understand the capabilities and future direction of Vertex Link.