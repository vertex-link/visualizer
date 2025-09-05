# Engine Package - LLM Implementation Instructions

## Package Purpose
The `@vertex-link/engine` package provides WebGPU rendering, resource management, and visual components built on top of the ACS framework. This package handles all GPU-related functionality and rendering pipelines.

## Directory Structure
```
packages/engine/src/
├── EngineContext.ts              # Central engine context (replaces ProcessorRegistry)
├── events/
│   └── index.ts                 # Engine-specific events
├── processors/
│   ├── WebGPUProcessor.ts       # Main rendering processor
│   ├── RenderProcessor.ts       # Generic render processor
│   └── FixedTickProcessor.ts    # Fixed timestep processor
├── rendering/
│   ├── components/
│   │   ├── TransformComponent.ts    # Position/rotation/scale
│   │   └── MeshRendererComponent.ts # Mesh+Material reference
│   ├── camera/
│   │   ├── CameraComponent.ts       # Camera configuration
│   │   └── PerspectiveCamera.ts     # Perspective projection
│   ├── interfaces/
│   │   ├── IBuffer.ts              # Buffer abstraction
│   │   └── IPipeline.ts            # Pipeline abstraction
│   ├── math/
│   │   └── Transform.ts            # Transform utilities
│   ├── GPUResourcePool.ts          # Resource caching
│   ├── RenderGraph.ts              # Render pipeline graph
│   └── RenderStage.ts              # Individual render stages
├── resources/
│   ├── Resource.ts                 # Base resource class
│   ├── ResourceManager.ts          # Resource loading/caching
│   ├── ShaderResource.ts           # WGSL shader management
│   ├── MeshResource.ts             # Geometry data
│   ├── MaterialResource.ts         # Material/uniform data
│   └── GeometryUtils.ts           # Primitive generation
├── services/
│   └── LoggingService.ts          # Logging implementation
└── webgpu/
    ├── WebGPURenderer.ts           # WebGPU device/context
    ├── WebGPUPipeline.ts          # Pipeline creation
    └── WebGPUBuffer.ts            # Buffer management
```

## Core Concepts

### EngineContext (NEW - Phase 0)
```typescript
class EngineContext {
  private canvas: HTMLCanvasElement;
  private webgpuProcessor: WebGPUProcessor;
  private eventBus: IEventBus;
  private scene?: Scene;
  
  async initialize(): Promise<void>;
  setScene(scene: Scene): void;
  start(): void;
  stop(): void;
  
  get device(): GPUDevice | null;
  get renderer(): WebGPURenderer;
}
```

**Key Implementation:**
- Replaces global ProcessorRegistry
- Scoped context for engine services
- Passed explicitly to components/resources
- Manages WebGPU initialization

### Resource Management

#### Resource Base Class
```typescript
abstract class Resource<T> {
  protected device: GPUDevice | null;
  protected compiled: T | null;
  status: ResourceStatus;
  
  abstract get(): Promise<this>;
  setDevice(device: GPUDevice): void;
  abstract compile(): Promise<void>;
  abstract dispose(): void;
}
```

**Resource Lifecycle:**
1. Create handle via ResourceManager
2. Call `get()` to load/prepare data
3. Call `setDevice(device)` to set GPU device
4. Call `compile()` to create GPU resources
5. Resource ready with `status === ResourceStatus.Ready`

#### Key Resource Types

**ShaderResource:**
```typescript
class ShaderResource extends Resource<GPUShaderModule> {
  constructor(
    public readonly id: string,
    private vertexSource: string,
    private fragmentSource: string
  );
}
```

**MeshResource:**
```typescript
class MeshResource extends Resource<{
  vertexBuffer: GPUBuffer;
  indexBuffer?: GPUBuffer;
}> {
  constructor(
    public readonly id: string,
    private descriptor: MeshDescriptor
  );
}
```

**MaterialResource:**
```typescript
class MaterialResource extends Resource<GPURenderPipeline> {
  uniforms: Map<string, UniformValue>;
  
  constructor(
    public readonly id: string,
    private shaderResource: ShaderResource,
    private descriptor: MaterialDescriptor
  );
}
```

### Components

#### TransformComponent
```typescript
class TransformComponent extends Component {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
  
  getWorldMatrix(): Mat4;
  getLocalMatrix(): Mat4;
  setPosition(x: number, y: number, z: number): void;
  lookAt(target: Vec3): void;
}
```

**Matrix Updates:**
- Lazy evaluation with dirty flag
- Cached world matrix
- Parent hierarchy support (planned)

#### MeshRendererComponent
```typescript
class MeshRendererComponent extends Component {
  enabled: boolean;
  layer: number;
  
  get mesh(): MeshResource | undefined;
  get material(): MaterialResource | undefined;
  
  updateForRender(deltaTime: number): void;
  isRenderable(): boolean;
}
```

**Current Implementation:**
- Gets resources from ResourceComponent
- No direct resource injection
- Manages visibility and layer sorting

#### CameraComponent
```typescript
class CameraComponent extends Component {
  projectionType: ProjectionType;
  isActive: boolean;
  
  getViewMatrix(): Mat4;
  getProjectionMatrix(): Mat4;
  getViewProjectionMatrix(): Mat4;
}
```

### Rendering Pipeline

#### WebGPUProcessor
```typescript
class WebGPUProcessor extends Processor {
  private renderer: WebGPURenderer;
  private renderGraph: RenderGraph;
  private resourcePool: GPUResourcePool;
  
  async initialize(): Promise<void>;
  setScene(scene: Scene): void;
  protected executeTasks(deltaTime: number): void;
}
```

**Rendering Flow:**
1. Query scene for renderable actors
2. Batch by material/mesh for instancing
3. Update instance buffers
4. Execute render graph stages
5. Submit command buffer

#### RenderGraph
```typescript
class RenderGraph {
  private stages: RenderStage[];
  
  addStage(stage: RenderStage): void;
  execute(
    renderer: WebGPURenderer,
    batches: RenderBatch[],
    camera: CameraComponent | null,
    deltaTime: number
  ): void;
}
```

**Built-in Stages:**
- `ForwardPass`: Main geometry rendering
- `PostProcessPass`: Screen-space effects
- `ShadowPass`: Shadow map generation (planned)

### WebGPU Abstraction

#### WebGPURenderer
```typescript
class WebGPURenderer {
  device: GPUDevice | null;
  context: GPUCanvasContext | null;
  
  async initialize(canvas: HTMLCanvasElement): Promise<void>;
  beginFrame(): GPUCommandEncoder;
  endFrame(commandEncoder: GPUCommandEncoder): void;
}
```

## Important Implementation Rules

### ✅ DO's
- Use EngineContext for service access
- Follow resource lifecycle strictly
- Check device before GPU operations
- Handle device loss gracefully
- Cache GPU resources in GPUResourcePool
- Use typed uniforms in materials

### ❌ DON'Ts
- Don't use ProcessorRegistry
- Don't create GPU resources before compile()
- Don't leak GPU resources (call dispose())
- Don't assume WebGPU support
- Don't mix resource management patterns
- Don't access device globally

## Common Patterns

### Resource Creation Pattern
```typescript
// Create and compile a mesh resource
const meshDescriptor: MeshDescriptor = {
  vertices: new Float32Array([...]),
  indices: new Uint16Array([...]),
  vertexLayout: [
    { name: "position", format: "float32x3" },
    { name: "normal", format: "float32x3" }
  ]
};

const mesh = new MeshResource("myMesh", meshDescriptor);
await mesh.get();
mesh.setDevice(device);
await mesh.compile();
```

### Component with Resources Pattern
```typescript
class MyVisualComponent extends Component {
  private resources?: ResourceComponent;
  
  override onInitialize(): void {
    this.resources = this.actor.getComponent(ResourceComponent);
    if (!this.resources) {
      // Add resources to actor
      const mesh = new MeshResource(...);
      const material = new MaterialResource(...);
      this.resources = this.actor.addComponent(
        ResourceComponent,
        mesh,
        material
      );
    }
  }
}
```

### Render Stage Pattern
```typescript
class CustomRenderStage extends RenderStage {
  execute(
    encoder: GPUCommandEncoder,
    batches: RenderBatch[],
    context: RenderPassContext
  ): void {
    const pass = encoder.beginRenderPass({...});
    
    for (const batch of batches) {
      // Set pipeline and bind groups
      pass.setPipeline(batch.pipeline);
      pass.setBindGroup(0, batch.bindGroup);
      
      // Draw instances
      pass.draw(batch.vertexCount, batch.instanceCount);
    }
    
    pass.end();
  }
}
```

## Testing Approach

```typescript
import { describe, it, expect, beforeAll } from "bun:test";

describe("WebGPU Resources", () => {
  let device: GPUDevice;
  
  beforeAll(async () => {
    // Mock or get test device
    const adapter = await navigator.gpu?.requestAdapter();
    device = await adapter?.requestDevice();
  });
  
  it("should compile shader resource", async () => {
    const shader = new ShaderResource("test", vertSrc, fragSrc);
    await shader.get();
    shader.setDevice(device);
    await shader.compile();
    expect(shader.status).toBe(ResourceStatus.Ready);
  });
});
```

## Current Issues & TODOs

1. **Instance Buffer Growth**: Fixed size, needs dynamic resizing
2. **Material System**: Needs uniform buffer automation
3. **Shadow Mapping**: Not yet implemented
4. **Compute Shaders**: Basic support, needs ergonomics
5. **Device Loss**: Recovery not fully implemented
6. **Culling**: No frustum culling yet

## WebGPU Requirements

### Browser Support
- Chrome 113+ (stable WebGPU)
- Edge 113+ (stable WebGPU)
- Firefox Nightly (behind flag)
- Safari Technology Preview

### Feature Detection
```typescript
if (!navigator.gpu) {
  throw new Error("WebGPU not supported");
}

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
  throw new Error("No GPU adapter available");
}
```

### Required Features
- Bind group layouts
- Vertex/fragment shaders
- Instanced rendering
- Depth/stencil testing

## Performance Considerations

### Batching Strategy
- Group by material + mesh
- Use instanced rendering
- Minimize bind group switches
- Pre-allocate instance buffers

### Resource Pooling
- Cache compiled pipelines
- Reuse bind groups
- Pool uniform buffers
- Share vertex/index buffers

## Integration Points

### With ACS Package
- Extends Component class
- Uses Scene queries
- Emits/listens to events
- Accesses via ResourceComponent

### With Documentation Package
- Provides rendering for examples
- Must maintain stable API
- Used in interactive demos

## Build & Development

```bash
# Build the package
bun run build

# Watch mode for development
bun run dev

# Type checking
bun run typecheck

# Run tests
bun test
```

## Export Structure
Main exports from `src/index.ts`:
- Core: `EngineContext`
- Components: `TransformComponent`, `MeshRendererComponent`, `CameraComponent`
- Resources: `ShaderResource`, `MeshResource`, `MaterialResource`
- Rendering: `WebGPUProcessor`, `RenderGraph`, `GPUResourcePool`
- Math: `Transform`, `Vec3`, `Quat`, `Mat4`
- Utils: `GeometryUtils`