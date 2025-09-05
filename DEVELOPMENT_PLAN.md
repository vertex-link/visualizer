# Vertex Link Architecture Development Plan

## Current Status (As of Analysis)

### ✅ Completed Features
- **Core ACS Framework**: Actor, Component, Scene, Query system
- **Event System**: EventBus with typed events
- **WebGPU Rendering**: Basic pipeline with instanced rendering
- **Resource Management**: Handle/compile pattern established
- **Component System**: Transform, MeshRenderer, Camera components
- **Documentation System**: Auto-discovery with interactive examples
- **Build Infrastructure**: Bun monorepo with TypeScript

### 🚧 In Progress
- **Phase 0**: Context hardening (90% complete)
    - EngineContext implemented and integrated
    - ProcessorRegistry deprecated but not fully removed
    - Engine events separated from ACS
- **Phase 1**: Component-driven resources (30% complete)
    - ResourceComponent exists but needs expansion
    - MeshRendererComponent updated to use ResourceComponent

### ⚠️ Outdated/Incorrect References
- ProcessorRegistry still referenced in some code
- Decorator patterns mentioned but disabled
- Some examples use old patterns
- Desktop package minimally functional

## Architecture Principles (Updated)

1. **Explicit Dependencies**: No decorator-based DI, use explicit component getters
2. **Component-Driven Resources**: Components pull resources from ResourceComponent
3. **Context Scoping**: Use EngineContext instead of global registries
4. **Resource Lifecycle**: Explicit setDevice() + compile() pattern
5. **Engine Separation**: ACS remains engine-agnostic
6. **Auto-Discovery**: Documentation and examples self-organize

## Implementation Roadmap

### Phase 0: Core Boundaries & Context Hardening ✅ 90%

**Completed:**
- ✅ EngineContext implemented with typed accessors
- ✅ Engine events moved out of ACS
- ✅ Composables pattern established
- ✅ WebGPU processor uses context

**Remaining:**
- [ ] Complete ProcessorRegistry removal
- [ ] Update all examples to use EngineContext
- [ ] Document migration patterns

### Phase 1: Component-Driven Resource System 🚧 30%

**Completed:**
- ✅ Basic ResourceComponent implementation
- ✅ Resource base classes established
- ✅ MeshRendererComponent uses ResourceComponent

**TODO:**
- [ ] Expand ResourceComponent with lazy loading
- [ ] Resource descriptor interfaces
- [ ] Default resources system
- [ ] Automatic resource injection
- [ ] Resource pooling improvements

**Target API:**
```typescript
// Declarative resource setup
actor.addComponent(ResourceComponent)
  .addDescriptor("mesh", { type: "primitive", primitive: "cube" })
  .addDescriptor("material", { shader: "standard", color: [1,0,0,1] });
```

### Phase 2: Streamlined Material System 📋

**Goals:**
- Simplify material creation
- Automatic uniform buffer management
- Material presets (Standard, Unlit, PBR)
- Instance-specific overrides

**New Components:**
```typescript
class MaterialComponent extends Component {
  materialKey: string = "default";
  overrides: Map<string, any>; // Instance uniforms
}

class MeshComponent extends Component {
  meshKey: string = "default";
}
```

### Phase 3: Scene Integration & Declarative API 📋

**Goals:**
- Fluent scene builder API
- Prefab system
- Scene templates
- Component presets

**Target API:**
```typescript
scene.createActor("cube")
  .with(TransformComponent, { position: [0,0,0] })
  .with(MeshComponent, { meshKey: "cube" })
  .with(MaterialComponent, { 
    materialKey: "standard",
    overrides: { color: [1,0,0,1] }
  })
  .asPrefab("RedCube");

// Instantiate prefab
scene.instantiate("RedCube", { position: [5,0,0] });
```

### Phase 4: Hierarchy System 📋

**Implementation Strategy:** Transform-Integrated (Recommended)

```typescript
class TransformComponent extends Component {
  private spatialParent?: TransformComponent;
  private spatialChildren: Set<TransformComponent>;
  
  setSpatialParent(parent: TransformComponent | null): void;
  getWorldMatrix(): Mat4; // Accounts for parent chain
}
```

**Query Extensions:**
```typescript
scene.query()
  .withHierarchy()
  .whereParentIs(rootActor)
  .whereDepth(2)
  .execute();
```

### Phase 5: Advanced Features 📋

**Streaming & Dynamic Loading:**
- StreamableComponent for large buffers
- Progressive mesh loading
- Texture streaming
- LOD system

**Rendering Features:**
- Shadow mapping
- Post-processing pipeline
- Render layers
- Instanced rendering improvements

**Asset Loading:**
- GLTF/GLB support
- OBJ with MTL
- Texture formats (PNG, JPG, WebP, KTX2)
- Async asset pipeline

### Phase 6: Production Hardening 📋

**Robustness:**
- Device loss recovery
- Memory management
- Error boundaries
- Performance monitoring

**Optimization:**
- Frustum culling
- Occlusion culling
- Batch optimization
- Draw call reduction

**Developer Experience:**
- Debug overlays
- Performance profiler
- Memory profiler
- Validation layers

## Migration Guidelines

### From ProcessorRegistry to EngineContext

**Old Pattern (Deprecated):**
```typescript
const processor = ProcessorRegistry.get("webgpu");
```

**New Pattern:**
```typescript
const context = new EngineContext(canvas);
const processor = context.webgpuProcessor;
```

### From Direct Resources to ResourceComponent

**Old Pattern:**
```typescript
class MyComponent {
  constructor(mesh: MeshResource, material: MaterialResource) {
    this.mesh = mesh;
    this.material = material;
  }
}
```

**New Pattern:**
```typescript
class MyComponent {
  get mesh(): MeshResource | undefined {
    return this.actor.getComponent(ResourceComponent)?.get(MeshResource);
  }
}
```

## Testing Strategy

### Unit Tests
- Component lifecycle
- Query system
- Event propagation
- Resource compilation

### Integration Tests
- Scene serialization
- Render pipeline
- Resource management
- WebGPU initialization

### E2E Tests
- Documentation examples
- Interactive demos
- Performance benchmarks
- Memory leak detection

## Performance Targets

- **Frame Time**: <16ms (60 FPS) for typical scenes
- **Memory**: <100MB baseline, <500MB typical
- **Draw Calls**: <100 for simple, <1000 for complex
- **Actors**: Support 10,000+ actors
- **Components**: 100,000+ components

## Breaking Changes Log

### Version 0.2.0 (Upcoming)
- ProcessorRegistry removed
- Decorator patterns removed
- Resource handles simplified
- Component dependency patterns changed

### Version 0.1.0 (Current)
- Initial architecture established

## Future Considerations

### Potential Features
- WebGL2 fallback renderer
- Physics integration (Rapier)
- Audio system
- Networking/multiplayer
- Visual scripting
- AI/behavior trees

### Architecture Evolution
- Worker-based rendering
- WASM modules for performance
- GPU-driven rendering
- Mesh shaders (when available)
- WebGPU compute utilization

## Success Metrics

- **API Simplicity**: Reduce boilerplate by 50%
- **Performance**: Match or exceed Three.js
- **Bundle Size**: Core <100KB, Engine <500KB
- **Documentation**: 100% API coverage
- **Examples**: 50+ interactive demos
- **Community**: Active contributions

## Timeline

- **Q1 2024**: Phase 0-1 completion
- **Q2 2024**: Phase 2-3 completion
- **Q3 2024**: Phase 4-5 completion
- **Q4 2024**: Phase 6 and 1.0 release

## Contributing

See package-specific `llm_instruct.md` files for detailed implementation guidance:
- `packages/acs/llm_instruct.md`
- `packages/engine/llm_instruct.md`
- `packages/documentation/llm_instruct.md`
- `packages/desktop/llm_instruct.md`