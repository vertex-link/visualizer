# Vertex Link Architecture Development Plan

## Core Architecture Principles

1. **Component-Driven Resources**: Components pull resources from `ResourceComponent`
2. **No Manual Pipeline**: Resources auto-compile when needed
3. **Declarative Scene Setup**: Minimal boilerplate, component-driven
4. **Actor-as-Prefab**: Any Actor can be instantiated as a prefab

## Status Sync (current session)

- Guidelines updated with Architecture Deep Dive and Zig/WASM setup (see .junie/guidelines.md). ✓
- Testing verified with Bun’s test runner (temporary smoke test ran and was removed). ✓
- EngineContext introduced and integrated in rotating-cubes example; ProcessorRegistry shim retained for legacy resources. ✓
- Engine-specific events moved out of ACS; CoreEvents remains engine-agnostic. ✓
- WebGPU resource lifecycle currently uses explicit setDevice()+compile; decorators are disabled in tsconfig. ✓

## Implementation Phases

### Phase 0: Core Boundaries & Context Hardening

- Goals:
  - Replace the global ProcessorRegistry singleton with a scoped EngineContext/World and pass it explicitly to scenes/components/resources.
  - Move engine-specific events out of ACS; keep ACS engine-agnostic.
  - Replace stringly lookups (e.g., 'webgpu') with typed constants/symbols and context.get<T>() accessors.
  - Clarify decorator policy: do not use decorators for component requirements or update hooks; prefer explicit registration and cached getters. Keep tsconfig without experimental decorators.
  - Prepare for multi-scene/multi-canvas scenarios (no global static state leaks).
- Deliverables:
  - EngineContext skeleton with typed accessors (device, renderer, processors, resource pool, event bus).
  - Adapter layer for existing code paths (temporary shims) to avoid large rewrites.
  - Documentation updates to reflect non-decorator dependency patterns.
- Acceptance criteria:
  - One end-to-end example runs using EngineContext (no ProcessorRegistry.get('webgpu') in that path).
  - No engine-specific types referenced from ACS.

### Phase 1: Component-Driven Resource System

#### New Implementations

- `ResourceComponent.ts`: Holds and manages actor resources
```typescript
class ResourceComponent extends Component {
    resources: Map<string, Resource>
    pending: Map<string, Promise<Resource>>
    
    getResource<T>(key: string): Promise<T>
    getResourceOrDefault<T>(key, defaultKey): T
}
```

- Resource Descriptor Interfaces
  - MeshDescriptor
  - MaterialDescriptor
  - TextureDescriptor

- Default Resources System
  - Debug cube
  - Error material
  - Missing texture

#### Refactoring Requirements

- `MeshRendererComponent`: Remove direct resource references
- `ResourceManager`: Become internal utility
- Remove `ResourceHandle` abstraction

#### Deletions

- Resource handle helper functions
- Complex implicit resource initialization patterns

#### Clarifications

- Keep explicit setDevice()+compile lifecycle. Do not introduce implicit device coupling.

#### Completed Components

- ✅ Base Resource classes
- ✅ GeometryUtils for primitive generation
- ✅ WebGPU device management

### Phase 2: Streamlined Material System

#### New Implementations

- `MaterialComponent.ts`: Instance data holder
```typescript
class MaterialComponent extends Component {
    // Depends on ResourceComponent; resolve via explicit getter on demand
    materialKey: string = "material"
    overrides: Map<string, any> // Instance uniforms
}
```

- `MeshComponent.ts`: Mesh reference holder
```typescript
class MeshComponent extends Component {
    // Depends on ResourceComponent; resolve via explicit getter on demand
    meshKey: string = "mesh"
}
```

- Material preset system
  - Standard
  - Unlit
  - PBR

#### Refactoring Requirements

- `MaterialResource`: Focus on template/layout
- `ForwardPass`: Get pipeline from `MaterialResource`
- Uniform buffer packing

#### Completed Components

- ✅ GPUResourcePool for bind group caching
- ✅ Basic material/shader compilation

### Phase 3: Scene Integration & Declarative API

#### New Implementations

- Scene Builder API
```typescript
scene.createActor("cube")
  .with(TransformComponent, {position: [0,0,0]})
  .with(ResourceComponent, [{key: "mesh", type: "primitive", primitive: "cube"}])
  .with(MeshComponent)
  .with(MaterialComponent, {overrides: {color: [1,0,0,1]}})
```

- Resource descriptor registry
- Automatic `ResourceComponent` injection

#### Refactoring Requirements

- Update all example files
- `WebGPUProcessor` resource handling

### Phase 4: Hierarchy System

#### Hierarchy Options

1. **HierarchyComponent**
   - Pros: Pure ACS, flexible
   - Cons: Performance overhead

2. **Enhanced Queries**
   - Pros: Powerful queries
   - Cons: Complex implementation

3. **SceneGraphComponent**
   - Pros: Efficient algorithms
   - Cons: Breaks pure ACS

4. **Transform-Integrated (Recommended)**
   - Pros: Expected pattern, efficient
   - Cons: Couples concepts

### Phase 5: Advanced Features

#### New Implementations

- `StreamableComponent` for buffer streaming
- Render layers via `RenderLayerComponent`
- Asset loading via resource descriptors
  - GLTF
  - OBJ
- Material editor component system
- Debug visualization components

#### Refactoring Requirements

- Resource classes: Support delta/streaming
- `RenderGraph`: Multiple pass support
- `GPUResourcePool`: Streaming buffer management

### Phase 6: Hardening & Scalability

- Device loss handling and re-initialization policy; recompile on device change.
- Visibility: frustum culling and a simple spatial index service.
- Dirty-flag refinement: separate structural vs transform dirtiness; geometric buffer growth strategy.
- ComputeResource ergonomics: enforce .ready before use; correct sync types; optional Worker offloading.
- Testing: unit tests for scene querying, EventBus cleanup, resource lifecycle and device change, context scoping; one compute integration test in documentation package.
- Desktop/Electron posture: document required flags and fallback when WebGPU is unavailable.
- Publishing posture: dist exports switch and prepublish checks.

## Migration Path

### Immediate Actions (Phase 0)

- Introduce EngineContext and adapt one example path to use it
- Replace ProcessorRegistry.get('webgpu') with typed constant/symbol via context in that path
- Move engine-specific events out of ACS; rehome them under engine
- Document non-decorator dependency pattern in README/guidelines

### Immediate Actions (Phase 1)

- Create `ResourceComponent`
- Update `MeshRendererComponent`
- Hide `ResourceManager`
- Test with one example

### Quick Wins

- Standardize explicit setDevice()+compile lifecycle with guards and clear errors
- Delete `ResourceHandle` usage
- Simplify material creation

### Breaking Changes

- Examples require rewrite
- Components need `ResourceComponent` dependency
- No manual resource handle management; explicit setDevice()+compile lifecycle remains

## Detailed Component Designs

### ResourceComponent

```typescript
class ResourceComponent extends Component {
    constructor(actor: Actor, ...resources: Resource[]) {
        this.resources = new Set(resources);
    }

    get<T extends Resource>(type: new (...args: any[]) => T): T | undefined
    getAll<T extends Resource>(type: new (...args: any[]) => T): T[]
}
```

### Actor Hierarchy

```typescript
class Actor {
    private _parent: Actor | null = null;
    private _children = new Set<Actor>();

    setParent(newParent: Actor | null): void
    get parent(): Actor | null
    get children(): ReadonlySet<Actor>
}
```

### Transform Spatial Hierarchy

```typescript
class TransformComponent {
    private spatialParent?: TransformComponent;

    setSpatialParent(parent: TransformComponent | null): void
    getWorldMatrix(): Mat4 // Combines with parent
}
```

## Resource Loading Pattern

```typescript
class TextureResource extends Resource<GPUTexture> {
    async compile(device: GPUDevice): Promise<void>
}

class TextureLoader {
    static async load(path: string): Promise<ImageBitmap>
}
```

## Query System

```typescript
scene.query()
    .withComponent(EnemyComponent)
    .whereParentIs(spawner)
    .execute();

scene.queryHierarchy()
    .getRoots()
    .getChildren(actor)
    .findByPath("player/weapon/muzzle");
```
