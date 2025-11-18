import {
  CameraComponent,
  MaterialResource,
  MeshRendererComponent,
  ObjResource,
  ProjectionType,
  ShaderResource,
  TransformComponent,
  type Vec3,
} from "@vertex-link/engine";
import { Actor, ResourceComponent, type Scene } from "@vertex-link/space";
import { CameraLookAtComponent } from "../rotating-cube/CameraLookAtComponent";
import { CameraPivotComponent } from "../rotating-cube/CameraPivotComponent";
import { RotatingComponent } from "../rotating-cube/RotatingComponent";
import cubeObjFile from "./cube.obj?raw";
import fragmentWGSL from "../rotating-cube/shaders/cube.frag.wgsl?raw";
import vertexWGSL from "../rotating-cube/shaders/cube.vert.wgsl?raw";

/**
 * Creates a perspective camera actor and adds it to the scene
 */
export function createCamera(
  scene: Scene,
  canvas: HTMLCanvasElement,
  position: Vec3 = [0, 0, 5],
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

  scene.addActor(cameraActor);
  return cameraActor;
}

/**
 * Creates a rotating model from OBJ file
 */
export function createObjModel(
  scene: Scene,
  speed = 0.8,
  position: [number, number, number] = [0, 0, 0],
  color: [number, number, number, number] = [0.2, 0.6, 0.9, 1.0],
): Actor {
  const modelActor = new Actor("ObjModel");
  const transform = modelActor.addComponent(TransformComponent);
  modelActor.addComponent(MeshRendererComponent);

  transform.position = position;

  // Add rotation component
  const rotationComponent = modelActor.addComponent(RotatingComponent);
  rotationComponent.speed = speed;

  // Create ObjResource from inline OBJ content
  const objMesh = new ObjResource(
    "CubeMesh",
    cubeObjFile, // OBJ file content loaded as string
    {
      centerModel: false,
      scale: 1.0,
      generateNormals: false, // Use normals from OBJ file
    }
  );

  // Create shader and material
  const shader = new ShaderResource("ObjShader", {
    vertexSource: vertexWGSL,
    fragmentSource: fragmentWGSL,
    entryPoints: { vertex: "vs_main", fragment: "fs_main" },
  } as any);

  const material = MaterialResource.createBasic("ObjMaterial", shader, color);

  // Add resources to actor
  const resources = modelActor.addComponent(ResourceComponent);
  resources.add(objMesh);
  resources.add(material);

  scene.addActor(modelActor);

  return modelActor;
}
