import {
  CameraComponent,
  type Engine,
  MaterialResource,
  MeshRendererComponent,
  ProjectionType,
  ShaderResource,
  TransformComponent,
  type Vec3,
  WebGPUProcessor,
  GridComponent,
  GeometryUtils,
  MeshResource,
  GRID_VERTEX_SHADER,
  GRID_FRAGMENT_SHADER,
  type GridConfig,
  type MaterialDescriptor,
  type ShaderDescriptor,
} from "@vertex-link/engine";
import { Actor, ResourceComponent, type Scene, useUpdate } from "@vertex-link/space";
import { CubeMeshResource } from "@/example-resources/CubeMeshResource";
import { CameraLookAtComponent } from "./CameraLookAtComponent";
import { CameraPivotComponent } from "./CameraPivotComponent";
import { RotatingComponent } from "./RotatingComponent";
import fragmentWGSL from "./shaders/cube.frag.wgsl?raw";
// Load shader files as text
import vertexWGSL from "./shaders/cube.vert.wgsl?raw";
import { onUpdated } from "vue";

/**
 * Creates a perspective camera actor and adds it to the scene
 */
export function createCamera(
  scene: Scene,
  canvas: HTMLCanvasElement,
  position: Vec3 = [0, 0, 0],
  pivotPoint: Vec3 = [0, 0, 0],
): Actor {
  const cameraActor = new Actor("Camera");
  const camTransform = cameraActor.addComponent(TransformComponent);
  camTransform.position = position;
  camTransform.lookAt(pivotPoint);
  cameraActor.addComponent(CameraComponent, {
    projectionType: ProjectionType.PERSPECTIVE,
    perspectiveConfig: {
      fov: Math.PI / 3,
      aspect: canvas.width / canvas.height,
      near: 0.1,
      far: 100,
    },
    isActive: true,
  });

  // Add pivot component for mouse-controlled rotation
  cameraActor.addComponent(CameraPivotComponent, canvas, pivotPoint);

  // Add look-at component to continuously face the pivot point
  cameraActor.addComponent(CameraLookAtComponent, pivotPoint);

  useUpdate(WebGPUProcessor, (deltaTime) => {
    console.log("rotation", camTransform.rotation)
  }, camTransform)
  
  scene.addActor(cameraActor);
  return cameraActor;
}

/**
 * Creates a rotating cube actor with the specified rotation speed
 */
export function createRotatingCube(
  scene: Scene,
  speed = 0.8,
  position: [number, number, number] = [0, 0, 0],
  color: [number, number, number, number] = [0.9, 0.6, 0.2, 1.0],
): Actor {
  // const context = engineContext.getContext();
  const cubeActor = new Actor("Cube");
  const transform = cubeActor.addComponent(TransformComponent);
  cubeActor.addComponent(MeshRendererComponent);

  transform.position = position;

  // Add rotation component with speed
  const rotationComponent = cubeActor.addComponent(RotatingComponent);
  rotationComponent.speed = speed;

  // Resources via ResourceComponent
  const cubeMesh = new CubeMeshResource(1);

  const shaderDescriptor: ShaderDescriptor = {
    vertexSource: vertexWGSL,
    fragmentSource: fragmentWGSL,
    entryPoints: { vertex: "vs_main", fragment: "fs_main" },
  };

  const shader = new ShaderResource("CubeShader", shaderDescriptor);
  const material = MaterialResource.createBasic("CubeMaterial", shader, color);

  const resources = cubeActor.addComponent(ResourceComponent);
  resources.add(cubeMesh);
  resources.add(material);

  scene.addActor(cubeActor);

  return cubeActor;
}

/**
 * Creates a grid actor with shader-based grid rendering.
 * The grid uses procedural rendering with anti-aliased lines, colored axes,
 * and distance-based fading for an infinite appearance.
 *
 * @param scene - Scene to add the grid to
 * @param config - Grid configuration options
 * @returns The created grid actor with GridComponent attached
 *
 * @example
 * ```typescript
 * // Create a horizontal grid
 * const grid = createGrid(scene, {
 *   size: 100,
 *   color: [0.5, 0.5, 0.5, 1.0],
 *   plane: "xz",
 *   visible: true
 * });
 *
 * // Toggle grid visibility
 * const gridComponent = grid.getComponent(GridComponent);
 * gridComponent.toggle();
 * ```
 */
export function createGrid(scene: Scene, config: GridConfig = {}): Actor {
  // Apply defaults and validate
  const {
    size = 100,
    color = [0.5, 0.5, 0.5, 1.0] as [number, number, number, number],
    visible = true,
    plane = "xz",
    layer = -1000, // Render in background by default
  } = config;

  // Validate parameters
  if (size <= 0) {
    throw new Error(`Grid size must be positive, got: ${size}`);
  }

  for (let i = 0; i < 4; i++) {
    if (color[i] < 0 || color[i] > 1) {
      throw new Error(`Grid color values must be in range [0, 1], got: ${color}`);
    }
  }

  // Create unique actor name with ID to avoid collisions
  const gridActor = new Actor(`Grid_${plane.toUpperCase()}`);
  const transform = gridActor.addComponent(TransformComponent);
  gridActor.addComponent(MeshRendererComponent, { enabled: visible, layer });
  gridActor.addComponent(GridComponent);

  // Position grid at origin
  transform.position = [0, 0, 0];

  // Set rotation based on plane orientation
  switch (plane) {
    case "xy":
      // XY plane - no rotation needed (default orientation)
      transform.setRotationEuler(Math.PI / 2, 0, 0);
      break;
    case "xz":
      // XZ plane (horizontal) - default grid orientation
      break;
    case "yz":
      // YZ plane (vertical wall) - rotate 90 degrees around Z
      transform.setRotationEuler(0, 0, Math.PI / 2);
      break;
  }

  // Create grid mesh using GeometryUtils
  const gridMeshDescriptor = GeometryUtils.createGrid(size);
  const gridMesh = new MeshResource(`GridMesh_${gridActor.id}`, gridMeshDescriptor);

  // Create grid shader using exported shader sources
  const shaderDescriptor: ShaderDescriptor = {
    vertexSource: GRID_VERTEX_SHADER,
    fragmentSource: GRID_FRAGMENT_SHADER,
    entryPoints: { vertex: "vs_main", fragment: "fs_main" },
  };

  const gridShader = new ShaderResource(`GridShader_${gridActor.id}`, shaderDescriptor);

  // Create material with alpha blending for transparency
  const materialDescriptor: MaterialDescriptor = {
    shader: gridShader,
    vertexLayout: {
      stride: 32, // position(12) + normal(12) + uv(8)
      attributes: [
        { location: 0, format: "float32x3", offset: 0 }, // position
        { location: 1, format: "float32x3", offset: 12 }, // normal
        { location: 2, format: "float32x2", offset: 24 }, // uv
      ],
    },
    renderState: {
      cullMode: "none", // Render both sides
      depthWrite: false, // Don't write to depth buffer (for transparency)
      depthTest: true, // Still test depth
      blendMode: "alpha", // Enable alpha blending
    },
  };

  const gridMaterial = new MaterialResource(`GridMaterial_${gridActor.id}`, materialDescriptor);

  // Add resources to the actor
  const resources = gridActor.addComponent(ResourceComponent);
  resources.add(gridMesh);
  resources.add(gridMaterial);

  scene.addActor(gridActor);

  return gridActor;
}
