import "reflect-metadata"
import {
  CameraComponent,
  createMaterialHandle,
  createMeshHandle,
  createShaderHandle,
  GeometryUtils,
  IResourceManagerKey,
  MaterialResource,
  MeshDescriptor,
  MeshRendererComponent,
  MeshResource,
  PipelineVertexAttribute,
  ProjectionType,
  Resource,
  ResourceHandle,
  ResourceManager,
  ShaderResource,
  TransformComponent,
  UniformDescriptor,
  VertexLayout,
  WebGPUProcessor
} from "@vertex-link/engine";
import { Actor, ProcessorRegistry, Scene, ServiceRegistry } from "@vertex-link/acs";
import { RotatingComponent } from "./RotatingComponent";

// Import local shader file
import basicShaderSource from "../../../../engine/src/webgpu/shaders/basic.wgsl?raw";

export interface DemoConfig {
  cubeCount?: number;
  rotationSpeed?: number;
  cameraDistance?: number;
  colors?: number[][];
}

export interface DemoStatus {
  isRunning: boolean;
  error?: string;
  loadingProgress: number;
  frameRate: number;
  objectCount: number;
  currentStep?: string;
}

// Generic helper to get a resource from its handle and ensure it's compiled
async function initializeAndGetResource<
  TResource extends Resource & {
    setDevice?: (device: GPUDevice, format?: GPUTextureFormat) => void;
    compile?: () => Promise<void>;
  },
>(
  handle: ResourceHandle<TResource> | null,
  device: GPUDevice,
  preferredFormat?: GPUTextureFormat,
): Promise<TResource> {
  if (!handle) {
    throw new Error(`Invalid resource handle provided.`);
  }

  const resource = await handle.get();
  if (!resource) {
    throw new Error(`Failed to get resource from handle.`);
  }

  if (resource.setDevice) {
    if (resource instanceof MaterialResource && preferredFormat) {
      resource.setDevice(device, preferredFormat);
    } else if (typeof resource.setDevice === "function") {
      (resource.setDevice as (d: GPUDevice) => void)(device);
    }
  }
  if (resource.compile) {
    await resource.compile();
  }
  return resource;
}

export class RotatingCubesDemo {
  private canvas: HTMLCanvasElement;
  private resourceManager!: ResourceManager;
  private serviceRegistry!: ServiceRegistry;
  private gpuProcessor!: WebGPUProcessor;
  private scene!: Scene;
  private cubeActors: Actor[] = [];
  private cameraActor!: Actor;

  private config: Required<DemoConfig>;
  private status: DemoStatus = {
    isRunning: false,
    loadingProgress: 0,
    frameRate: 0,
    objectCount: 0,
    currentStep: 'Ready to start'
  };

  private statusCallbacks: ((status: DemoStatus) => void)[] = [];
  private frameRateTimer?: number;
  private lastFrameTime = 0;

  // Store resources
  private cubeMesh!: MeshResource;
  private materials!: MaterialResource[];

  constructor(canvas: HTMLCanvasElement, config: DemoConfig = {}) {
    this.canvas = canvas;
    this.config = {
      cubeCount: config.cubeCount ?? 3,
      rotationSpeed: config.rotationSpeed ?? 0.5,
      cameraDistance: config.cameraDistance ?? 8,
      colors: config.colors ?? [
        [1.0, 0.2, 0.2, 1.0], // Red
        [0.2, 1.0, 0.2, 1.0], // Green
        [0.2, 0.2, 1.0, 1.0], // Blue
        [1.0, 1.0, 0.2, 1.0], // Yellow
        [1.0, 0.2, 1.0, 1.0], // Magenta
        [0.2, 1.0, 1.0, 1.0], // Cyan
      ]
    };

    console.log('RotatingCubesDemo constructor called');
  }

  public onStatusUpdate(callback: (status: DemoStatus) => void): void {
    this.statusCallbacks.push(callback);
    callback(this.status);
  }

  private updateStatus(updates: Partial<DemoStatus>): void {
    this.status = { ...this.status, ...updates };
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this.status);
      } catch (error) {
        console.error('Error in status callback:', error);
      }
    });
  }

  public async initialize(): Promise<void> {
    try {
      console.log('🚀 Starting demo initialization...');

      // Check WebGPU support
      if (!navigator.gpu) {
        throw new Error('WebGPU is not supported in this browser. Please use Chrome/Edge with WebGPU enabled.');
      }

      this.updateStatus({ loadingProgress: 10, currentStep: 'Setting up canvas...' });

      // Setup canvas
      this.canvas.width = this.canvas.clientWidth || 800;
      this.canvas.height = this.canvas.clientHeight || 600;
      console.log(`Canvas size: ${this.canvas.width}x${this.canvas.height}`);

      this.updateStatus({ loadingProgress: 20, currentStep: 'Initializing systems...' });

      // Setup core systems
      this.resourceManager = new ResourceManager();
      await this.resourceManager.initialize();

      this.serviceRegistry = new ServiceRegistry();
      this.serviceRegistry.register(IResourceManagerKey, this.resourceManager);

      this.updateStatus({ loadingProgress: 40, currentStep: 'Initializing WebGPU...' });

      this.gpuProcessor = new WebGPUProcessor(this.canvas, "webgpu");
      await this.gpuProcessor.initialize();

      const device = this.gpuProcessor.getDevice();
      if (!device) {
        throw new Error("Failed to get WebGPU device");
      }

      this.resourceManager.setDevice(device);

      this.scene = new Scene("RotatingCubesScene");
      this.gpuProcessor.setScene(this.scene);
      ProcessorRegistry.register(this.gpuProcessor);

      this.updateStatus({ loadingProgress: 60, currentStep: 'Loading resources...' });
      await this.loadResources();

      this.updateStatus({ loadingProgress: 80, currentStep: 'Creating actors...' });
      await this.createActors();

      this.updateStatus({ loadingProgress: 95, currentStep: 'Setting up monitoring...' });
      this.setupFrameRateMonitoring();

      this.updateStatus({
        loadingProgress: 100,
        currentStep: 'Ready!',
        error: undefined
      });

      console.log('✅ Demo initialization complete!');

    } catch (error) {
      console.error('❌ Demo initialization failed:', error);
      this.updateStatus({
        error: error instanceof Error ? error.message : 'Unknown initialization error',
        loadingProgress: 0,
        currentStep: 'Failed'
      });
      throw error;
    }
  }

  private async loadResources(): Promise<void> {
    const device = this.gpuProcessor.getDevice()!;

    try {
      // Use shader source with fallback
      let shaderSource = basicShaderSource;

      if (!shaderSource || shaderSource.trim() === '') {
        console.error('Shader not found!');
      }

      const shaderHandle = createShaderHandle(
        this.resourceManager,
        "StandardShader",
        shaderSource,
        shaderSource,
      );

      if (!shaderHandle) {
        throw new Error('Failed to create shader handle');
      }

      const standardShader = await initializeAndGetResource<ShaderResource>(shaderHandle, device);
      console.log(`✅ Shader compiled: ${standardShader.isCompiled}`);

      // Create mesh
      const cubeMeshDescriptor: MeshDescriptor = GeometryUtils.createBox(2.0, 2.0, 2.0);
      const cubeMeshHandle = createMeshHandle(
        this.resourceManager,
        "StdCubeMesh",
        cubeMeshDescriptor,
      );

      if (!cubeMeshHandle) {
        throw new Error('Failed to create mesh handle');
      }

      this.cubeMesh = await initializeAndGetResource<MeshResource>(cubeMeshHandle, device);
      console.log(`✅ Mesh compiled: ${this.cubeMesh.isCompiled}`);

      // Setup vertex layout
      const defaultVertexLayout: VertexLayout = {
        stride: cubeMeshDescriptor.vertexStride,
        attributes: cubeMeshDescriptor.vertexAttributes.map(
          (attr: any, index: number): PipelineVertexAttribute => ({
            location: index,
            format: (attr.type + (attr.size > 1 ? `x${attr.size}` : "")) as GPUVertexFormat,
            offset: attr.offset,
          }),
        ),
      };

      // Create materials
      this.materials = [];
      for (let i = 0; i < this.config.cubeCount; i++) {
        const colorIndex = i % this.config.colors.length;
        const color = this.config.colors[colorIndex];

        const uniforms: Record<string, UniformDescriptor> = {
          color: { type: "vec4", size: 16, value: color },
        };

        const materialHandle = await createMaterialHandle(
          this.resourceManager,
          `Material_${i}`,
          shaderHandle,
          uniforms,
          defaultVertexLayout,
        ) as ResourceHandle<MaterialResource>;

        if (!materialHandle) {
          throw new Error(`Failed to create material handle for cube ${i}`);
        }

        const materialRes = await initializeAndGetResource<MaterialResource>(
          materialHandle,
          device,
          (this.gpuProcessor as any).renderer?.getFormat() || 'bgra8unorm',
        );

        this.materials.push(materialRes);
        console.log(`✅ Material ${i} compiled: ${materialRes.isCompiled}`);
      }

    } catch (error) {
      console.error('❌ Failed to load resources:', error);
      throw error;
    }
  }

  private async createActors(): Promise<void> {
    try {
      // Create cubes
      this.cubeActors = [];
      const spacing = 4.0;
      const startX = -(this.config.cubeCount - 1) * spacing / 2;

      for (let i = 0; i < this.config.cubeCount; i++) {
        const cubeActor = new Actor(`Cube_${i}`);
        const transform = cubeActor.addComponent(TransformComponent);
        transform.setPosition(startX + i * spacing, 0, 0);

        cubeActor.addComponent(MeshRendererComponent, {
          mesh: this.cubeMesh,
          material: this.materials[i],
        });

        const rotator = cubeActor.addComponent(RotatingComponent);
        rotator.speed = this.config.rotationSpeed * (0.8 + i * 0.2);

        this.scene.addActor(cubeActor);
        this.cubeActors.push(cubeActor);
      }

      // Create camera
      this.cameraActor = new Actor("MainCamera");
      const cameraTransform = this.cameraActor.addComponent(TransformComponent);
      cameraTransform.setPosition(0, 1.5, this.config.cameraDistance);

      this.cameraActor.addComponent(CameraComponent, {
        projectionType: ProjectionType.PERSPECTIVE,
        perspectiveConfig: {
          fov: Math.PI / 3,
          aspect: this.canvas.width / this.canvas.height,
          near: 0.1,
          far: 100.0,
        },
        isActive: true,
      });

      this.scene.addActor(this.cameraActor);
      this.updateStatus({ objectCount: this.cubeActors.length + 1 });

    } catch (error) {
      console.error('❌ Failed to create actors:', error);
      throw error;
    }
  }

  private setupFrameRateMonitoring(): void {
    this.frameRateTimer = setInterval(() => {
      if (this.status.isRunning) {
        const now = performance.now();
        if (this.lastFrameTime > 0) {
          const deltaTime = now - this.lastFrameTime;
          const fps = Math.round(1000 / deltaTime);
          this.updateStatus({ frameRate: fps });
        }
        this.lastFrameTime = now;
      }
    }, 1000) as any;
  }

  public start(): void {
    if (this.status.isRunning) return;

    try {
      this.gpuProcessor.start();
      this.updateStatus({ isRunning: true, error: undefined });
      console.log('✅ Demo started');
    } catch (error) {
      console.error('❌ Failed to start demo:', error);
      this.updateStatus({
        error: error instanceof Error ? error.message : 'Failed to start',
        isRunning: false
      });
    }
  }

  public stop(): void {
    if (!this.status.isRunning) return;
    this.gpuProcessor.stop();
    this.updateStatus({ isRunning: false });
  }

  public updateConfig(newConfig: Partial<DemoConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.rotationSpeed !== undefined) {
      this.cubeActors.forEach((actor, i) => {
        const rotator = actor.getComponent(RotatingComponent);
        if (rotator) {
          rotator.speed = this.config.rotationSpeed * (0.8 + i * 0.2);
        }
      });
    }

    if (newConfig.cameraDistance !== undefined) {
      const cameraTransform = this.cameraActor.getComponent(TransformComponent);
      if (cameraTransform) {
        cameraTransform.setPosition(0, 1.5, this.config.cameraDistance);
      }
    }
  }

  public handleResize(): void {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.gpuProcessor.handleResize();
  }

  public getStatus(): DemoStatus {
    return { ...this.status };
  }

  public getConfig(): DemoConfig {
    return { ...this.config };
  }

  public dispose(): void {
    this.stop();

    if (this.frameRateTimer) {
      clearInterval(this.frameRateTimer);
    }

    this.statusCallbacks.length = 0;

    this.cubeActors.forEach(actor => {
      if (this.scene) {
        this.scene.removeActor(actor);
      }
    });

    if (this.cameraActor && this.scene) {
      this.scene.removeActor(this.cameraActor);
    }

    if (this.scene) {
      this.scene.dispose();
    }
  }
}
