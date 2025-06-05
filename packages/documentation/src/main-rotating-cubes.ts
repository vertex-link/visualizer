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
  TransformComponent, UniformDescriptor,
  VertexLayout,
  WebGPUProcessor
} from "@vertex-link/engine";
import { Actor, ProcessorRegistry, Scene, ServiceRegistry } from "@vertex-link/acs";
import { RotatingComponent } from "./RotatingComponent";
import basicShaderSource from "../../engine/src/webgpu/shaders/basic.wgsl?raw";



// Generic helper to get a resource from its handle and ensure it's compiled
async function initializeAndGetResource<
  TResource extends Resource & {
    setDevice?: (device: GPUDevice, format?: GPUTextureFormat) => void;
    compile?: () => Promise<void>;
  },
>(
  handle: ResourceHandle<TResource> | null,
  device: GPUDevice,
  preferredFormat?: GPUTextureFormat, // Optional: only for material-like resources
): Promise<TResource> {
  if (!handle) {
    // Attempt to extract a meaningful ID or fallback for the error message.
    const handleId = (handle as any)?.resourceId || "unknown";
    throw new Error(`Invalid resource handle provided (ID: ${handleId}).`);
  }

  const resource = await handle.get();
  if (!resource) {
    // Similar to above, try to get resourceId for better error logging.
    const resourceId = (handle as any)?.resourceId || "unknown";
    throw new Error(`Failed to get resource from handle (ID: ${resourceId}).`);
  }

  if (resource.setDevice) {
    if (resource instanceof MaterialResource && preferredFormat) {
      resource.setDevice(device, preferredFormat);
    } else if (typeof resource.setDevice === "function") {
      // Assuming other resources with setDevice take only the device argument.
      (resource.setDevice as (d: GPUDevice) => void)(device);
    }
  }
  if (resource.compile) {
    await resource.compile();
  }
  return resource;
}

const string: string = 'test';

console.log(string);

async function rotatingCubesDemo() {
  const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
  const statusDiv = document.getElementById("status")!;

  function log(msg: string) {
    console.log(msg);
    if (statusDiv) statusDiv.textContent = msg;
  }

  try {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    log(`Canvas: ${canvas.width}x${canvas.height}`);

    // 1. Setup Core Systems
    log("Initializing core systems...");
    const resourceManager = new ResourceManager();
    await resourceManager.initialize();

    const serviceRegistry = new ServiceRegistry();
    serviceRegistry.register(IResourceManagerKey, resourceManager);

    const gpuProcessor = new WebGPUProcessor(canvas, "webgpu");
    await gpuProcessor.initialize();
    const device = gpuProcessor.getDevice()!;
    if (!device) throw new Error("Failed to get WebGPU device from processor.");
    resourceManager.setDevice(device); // Important for ResourceManager's internal compilation logic if it were used

    const scene = new Scene("RotatingCubesScene");
    gpuProcessor.setScene(scene);
    ProcessorRegistry.register(gpuProcessor);

    // 2. Define and Load Common Resources
    log("Loading common resources...");

    // Shader
    const loadedShaderSource = basicShaderSource;
    const shaderHandle = createShaderHandle(
      resourceManager,
      "StandardShader",
      loadedShaderSource,
      loadedShaderSource,
    );
    const standardShader = await initializeAndGetResource<ShaderResource>(shaderHandle, device);
    log(`Shader compiled: ${standardShader.isCompiled}`);

    // Mesh
    const cubeMeshDescriptor: MeshDescriptor = GeometryUtils.createBox(
      2.0,
      2.0,
      2.0,
    );
    const cubeMeshHandle = createMeshHandle(
      resourceManager,
      "StdCubeMesh",
      cubeMeshDescriptor,
    );
    const cubeMesh = await initializeAndGetResource<MeshResource>(cubeMeshHandle, device);
    log(`Mesh compiled: ${cubeMesh.isCompiled}`);

    // Vertex Layout
    const defaultVertexLayout: VertexLayout = {
      stride: cubeMeshDescriptor.vertexStride,
      attributes: cubeMeshDescriptor.vertexAttributes.map(
        (
          // @ts-ignore
          attr: EngineVertexAttribute,
          index: number,
        ): PipelineVertexAttribute => ({
          location: index,
          format: (attr.type +
            (attr.size > 1 ? `x${attr.size}` : "")) as GPUVertexFormat,
          offset: attr.offset,
        }),
      ),
    };

    // Materials
    const materialDefs: {
      name: string;
      color: number[];
      uniforms: Record<string, UniformDescriptor>;
    }[] = [
        {
          name: "RedMaterial",
          color: [1.0, 0.2, 0.2, 1.0],
          uniforms: {
            color: { type: "vec4", size: 16, value: [1.0, 0.2, 0.2, 1.0] },
          },
        },
        {
          name: "GreenMaterial",
          color: [0.2, 1.0, 0.2, 1.0],
          uniforms: {
            color: { type: "vec4", size: 16, value: [0.2, 1.0, 0.2, 1.0] },
          },
        },
        {
          name: "BlueMaterial",
          color: [0.2, 0.2, 1.0, 1.0],
          uniforms: {
            color: { type: "vec4", size: 16, value: [0.2, 0.2, 1.0, 1.0] },
          },
        },
      ];

    const materialResources: MaterialResource[] = [];
    for (const def of materialDefs) {
      const materialHandle = await createMaterialHandle(
        resourceManager,
        def.name,
        shaderHandle!, // Shader handle is guaranteed to be non-null here
        def.uniforms,
        defaultVertexLayout,
      ) as ResourceHandle<MaterialResource>;
      const materialRes = await initializeAndGetResource<MaterialResource>(
        materialHandle,
        device,
        (gpuProcessor as any).renderer.getFormat(),
      );
      materialResources.push(materialRes);
      log(`Material ${def.name} compiled: ${materialRes.isCompiled}`);
    }

    // 3. Create Actors (Cubes)
    log("Creating actors...");
    const cubeConfigs = [
      {
        name: "RedCube",
        position: [-3.5, 0, 0],
        material: materialResources[0],
        rotationSpeed: 0.4,
      },
      {
        name: "GreenCube",
        position: [0, 0, 0],
        material: materialResources[1],
        rotationSpeed: 0.6,
      },
      {
        name: "BlueCube",
        position: [3.5, 0, 0],
        material: materialResources[2],
        rotationSpeed: 0.8,
      },
    ];

    for (const config of cubeConfigs) {
      const cubeActor = new Actor(config.name);
      const transform = cubeActor.addComponent(TransformComponent);
      transform.setPosition(
        config.position[0],
        config.position[1],
        config.position[2],
      );

      cubeActor.addComponent(MeshRendererComponent, {
        mesh: cubeMesh, // Pass the initialized MeshResource
        material: config.material, // Pass the initialized MaterialResource
      });

      const rotator = cubeActor.addComponent(RotatingComponent);
      rotator.speed = config.rotationSpeed;

      scene.addActor(cubeActor);
      log(`Created ${config.name}`);
    }

    // 4. Setup Camera
    // ... (camera setup remains the same as your previous version)
    log("Setting up camera...");
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
    log(`Camera positioned at [${cameraTransform.position.join(", ")}]`);

    // 5. Start the Engine's Processor
    await new Promise((resolve) => setTimeout(resolve, 100));
    gpuProcessor.start();
    log("🚀 Rotating Cubes Demo Running!");
  } catch (error) {
    const e = error as Error;
    log(`❌ DEMO ERROR: ${e.message}`);
    console.error("Full error:", e);
    if (e.stack) console.error("Stack:", e.stack);
  }
}

rotatingCubesDemo();
