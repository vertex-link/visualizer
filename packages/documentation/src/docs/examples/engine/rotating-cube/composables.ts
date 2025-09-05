import { Actor, ResourceComponent, type Scene, useUpdate } from "@vertex-link/acs";
import {
  CameraComponent,
  MaterialResource,
  MeshRendererComponent,
  ProjectionType,
  ShaderResource,
  TransformComponent,
} from "@vertex-link/engine";
import { CubeMeshResource } from "@/example-resources/CubeMeshResource";
import { RotatingComponent } from "./RotatingComponent";
import fragmentWGSL from "./shaders/cube.frag.wgsl?raw";
// Load shader files as text
import vertexWGSL from "./shaders/cube.vert.wgsl?raw";

/**
 * Creates a perspective camera actor and adds it to the scene
 */
export function createCamera(scene: Scene, canvas: HTMLCanvasElement): Actor {
  const cameraActor = new Actor("Camera");
  const camTransform = cameraActor.addComponent(TransformComponent);
  camTransform.position = [0, 0, 3];

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

  scene.addActor(cameraActor);
  return cameraActor;
}

/**
 * Creates a rotating cube actor with the specified rotation speed
 */
export function createRotatingCube(
  scene: Scene,
  speed: number = 0.8,
  color: [number, number, number, number] = [0.9, 0.6, 0.2, 1.0],
): Actor {
  const cubeActor = new Actor("Cube");
  const transform = cubeActor.addComponent(TransformComponent);
  cubeActor.addComponent(MeshRendererComponent);

  // Add rotation component with speed
  const rotationComponent = cubeActor.addComponent(RotatingComponent);
  rotationComponent.speed = speed;

  // Resources via ResourceComponent
  const cubeMesh = new CubeMeshResource(1);
  const shader = new ShaderResource("CubeShader", {
    vertexSource: vertexWGSL,
    fragmentSource: fragmentWGSL,
    entryPoints: { vertex: "vs_main", fragment: "fs_main" },
  } as any);
  const material = MaterialResource.createBasic("CubeMaterial", shader, color);

  const resources = cubeActor.addComponent(ResourceComponent);
  resources.add(cubeMesh);
  resources.add(material);

  scene.addActor(cubeActor);

  // Use composable for rotation updates instead of manual processor registration
  useUpdate(
    "webgpu",
    rotationComponent.tick.bind(rotationComponent),
    rotationComponent,
    `${cubeActor.id}:rotation`,
  );

  return cubeActor;
}
