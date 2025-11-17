import {
  CameraComponent,
  type Engine,
  MaterialResource,
  MeshRendererComponent,
  ProjectionType,
  ShaderResource,
  TransformComponent,
  type Vec3, WebGPUProcessor,
} from "@vertex-link/engine";
import {Actor, ResourceComponent, type Scene, useUpdate} from "@vertex-link/orbits";
import { CubeMeshResource } from "@/example-resources/CubeMeshResource";
import { CameraLookAtComponent } from "./CameraLookAtComponent";
import { CameraPivotComponent } from "./CameraPivotComponent";
import { RotatingComponent } from "./RotatingComponent";
import fragmentWGSL from "./shaders/cube.frag.wgsl?raw";
// Load shader files as text
import vertexWGSL from "./shaders/cube.vert.wgsl?raw";
import {onUpdated} from "vue";

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
  const shader = new ShaderResource(
    "CubeShader",
    {
      vertexSource: vertexWGSL,
      fragmentSource: fragmentWGSL,
      entryPoints: { vertex: "vs_main", fragment: "fs_main" },
    } as any,
    // context,
  );
  const material = MaterialResource.createBasic(
    "CubeMaterial",
    shader,
    color,
    // context,
  );

  const resources = cubeActor.addComponent(ResourceComponent);
  resources.add(cubeMesh);
  resources.add(material);

  scene.addActor(cubeActor);

  return cubeActor;
}
