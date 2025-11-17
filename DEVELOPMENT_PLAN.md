# Vertex Link Architecture Development Plan

## Current Status (As of Fact-Check)

### ✅ Implemented & Stable
- **Core ACS Framework**: `Actor`, `Component`, `Scene`, and the query system are the stable foundation.
- **Event System**: The `EventBus` provides a solid, type-safe mechanism for decoupled communication.
- **Composable-Based Architecture**: A new system using `runWithContext` and composables (`useOnEvent`, `useUpdate`, etc.) is the new standard for dependency injection and side effects, replacing older patterns.
- **Basic WebGPU Rendering**: The `WebGPUProcessor` can render un-instanced meshes with basic materials.
- **Documentation Site**: A functional Vue 3 + Vite documentation platform with auto-discovery of content and live examples is in place.
- **Basic Electron Shell**: A minimal Electron app with WebGPU enabled can run the engine.

### 🚧 In Progress / Partially Implemented
- **EngineContext**: Implemented and serves as the main entry point for the engine, but still has legacy ties to the deprecated `ProcessorRegistry`.
- **Component-Driven Resources**: The `ResourceComponent` exists and is the designated way to associate resources with an actor. However, the planned descriptor-based API (`.addDescriptor(...)`) is not yet implemented; resources must be added manually.
- **Resource Lifecycle**: The `setDevice()` + `compile()` pattern is established, but resource management is still manual.

### ⚠️ Deprecated / Needs Removal

- **`ServiceRegistry`**: Has been completely removed from the `acs` package.
- **Decorator Patterns**: Mentioned in old plans but are not used and are explicitly forbidden by the new architecture.

## Architecture Principles (Revised)

1.  **Explicit Dependencies**: All dependencies are resolved explicitly. For components, use `this.actor.getComponent()`. For everything else, use the **composable pattern** (`useScene`, `useEventBus`, etc.) within a context.
2.  **Component-Driven Resources**: Actors are made renderable by adding a `ResourceComponent` and populating it with `MeshResource` and `MaterialResource` instances.
3.  **Context Scoping**: The `EngineContext` provides the top-level context for the engine. Composables make this context available to lower-level parts of the system without global singletons.
4.  **Engine/ACS Separation**: The `@vertex-link/orbits` package remains completely engine-agnostic.
5.  **Auto-Discovery**: The documentation system automatically discovers and presents content, requiring no manual registration.

## Implementation Roadmap

### Phase 0: Core Boundaries & Context Hardening ✅ (100%)
**Status**: Complete. The new composable pattern is a success.
**Remaining:**
- [x] Purge all uses of `ProcessorRegistry` and remove the class entirely.

### Phase 1: Component-Driven Resource System 🚧 (40%)
**Status**: The foundation is laid with `ResourceComponent`. The next step is to build the ergonomic, descriptor-based API on top of it.
**TODO:**
- [ ] Implement the `.addDescriptor()` API on `ResourceComponent`.
- [ ] Create a system that can resolve these descriptors into actual `Resource` instances (e.g., a `primitive: 'cube'` descriptor becomes a `MeshResource`).
- [ ] Implement default resources (e.g., a default cube mesh, a default standard material).

**Target API:**
```typescript
// This is the GOAL, not the current implementation
actor.addComponent(ResourceComponent)
  .addDescriptor("mesh", { type: "primitive", primitive: "cube" })
  .addDescriptor("material", { type: "shader", shader: "standard", color: [1,0,0,1] });
```

### Phase 2: Streamlined Material System 📋
**Goals**: Automate uniform buffer management. Create material presets.
**Status**: Not started. Currently, uniforms are managed manually.

### Phase 3: Scene Integration & Declarative API 📋
**Goals**: Create a fluent API for building actors and scenes.
**Status**: Not started.

### Phase 4: Hierarchy System 📋
**Goals**: Implement parent-child relationships for actors via the `TransformComponent`.
**Status**: Not started.

---

## Migration Guidelines

### From Manual Event Subscription -> `useOnEvent`
**Old Pattern:**
```typescript
getEventBus().on(MyEvent, this.handler, this);
// ... must remember to call .off() in dispose()
```

**New Pattern (Preferred):**
```typescript
// Returns a disposer function for easy cleanup
this.disposer = useOnEvent(MyEvent, this.handler, this);
// ... call this.disposer() in dispose()
```

### From Direct Resource Injection -> `ResourceComponent`
**Old Pattern (DEPRECATED):**
`new MyComponent(actor, mesh, material)`

**New Pattern:**
```typescript
// In setup code:
const resources = actor.addComponent(ResourceComponent);
resources.add(mesh);
resources.add(material);

// In a component:
const mesh = this.actor.getComponent(ResourceComponent)?.get(MeshResource);
```

## Breaking Changes Log

### Version 0.2.0 (In Progress)
-   **REMOVED**: `ProcessorRegistry`. Use `EngineContext` or `useUpdate`.
-   **ADDED**: Composable-based context system (`runWithContext`, `use...` functions).
-   **CHANGED**: The primary way to make an actor renderable is now via `ResourceComponent` + `MeshRendererComponent`.
