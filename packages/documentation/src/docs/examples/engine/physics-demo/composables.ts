import {
  CameraComponent,
  ColliderComponent,
  MaterialResource,
  MeshRendererComponent,
  PhysicsProcessor,
  ProjectionType,
  RigidBodyComponent,
  ShaderResource,
  TransformComponent,
  type Vec3,
} from "@vertex-link/engine";
import { Actor, ResourceComponent, type Scene } from "@vertex-link/space";
import { CubeMeshResource } from "@/example-resources/CubeMeshResource";
import { CameraLookAtComponent } from "../rotating-cube/CameraLookAtComponent";
import { CameraPivotComponent } from "../rotating-cube/CameraPivotComponent";
import fragmentWGSL from "./shaders/cube.frag.wgsl?raw";
import vertexWGSL from "./shaders/cube.vert.wgsl?raw";

/**
 * Creates a perspective camera actor
 */
export function createCamera(
  scene: Scene,
  canvas: HTMLCanvasElement,
  position: Vec3 = [0, 10, 25],
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
      far: 200,
    },
    isActive: true,
  });

  // Add pivot component for mouse-controlled rotation
  cameraActor.addComponent(CameraPivotComponent, canvas, pivotPoint);

  // Add look-at component
  cameraActor.addComponent(CameraLookAtComponent, pivotPoint);

  scene.addActor(cameraActor);
  return cameraActor;
}

/**
 * Creates a physics-enabled cube that falls and collides
 */
export function createPhysicsCube(
  scene: Scene,
  position: Vec3 = [0, 10, 0],
  size = 1.0,
): Actor {
  const cubeActor = new Actor(`PhysicsCube_${Date.now()}_${Math.random()}`);

  // Transform component (synced by physics)
  const transform = cubeActor.addComponent(TransformComponent);
  transform.position = position;

  // Rigid body (dynamic = affected by physics)
  const rigidBody = cubeActor.addComponent(RigidBodyComponent, {
    type: "dynamic",
    mass: 1.0,
    gravityScale: 1.0,
  });

  // Add some random initial velocity for variety
  rigidBody.linearVelocity = [
    (Math.random() - 0.5) * 2,
    0,
    (Math.random() - 0.5) * 2,
  ];

  // Collider (box shape)
  const halfSize = size / 2;
  cubeActor.addComponent(ColliderComponent, {
    shape: "box",
    size: [halfSize, halfSize, halfSize],
    friction: 0.5,
    restitution: 0.5, // Bouncy!
  });

  // Rendering
  cubeActor.addComponent(MeshRendererComponent);

  // Random color for each cube
  const color: [number, number, number, number] = [
    Math.random() * 0.5 + 0.5, // 0.5 - 1.0
    Math.random() * 0.5 + 0.5,
    Math.random() * 0.5 + 0.5,
    1.0,
  ];

  const cubeMesh = new CubeMeshResource(size);
  const shader = new ShaderResource("PhysicsCubeShader", {
    vertexSource: vertexWGSL,
    fragmentSource: fragmentWGSL,
    entryPoints: { vertex: "vs_main", fragment: "fs_main" },
  } as any);
  const material = MaterialResource.createBasic(
    `PhysicsCubeMaterial_${cubeActor.id}`,
    shader,
    color,
  );

  const resources = cubeActor.addComponent(ResourceComponent);
  resources.add(cubeMesh);
  resources.add(material);

  scene.addActor(cubeActor);
  return cubeActor;
}

/**
 * Creates a static ground plane
 */
export function createGround(scene: Scene): Actor {
  const groundActor = new Actor("Ground");

  // Transform
  const transform = groundActor.addComponent(TransformComponent);
  transform.position = [0, -0.5, 0];

  // Static rigid body (immovable)
  groundActor.addComponent(RigidBodyComponent, {
    type: "static",
  });

  // Large box collider for the ground
  groundActor.addComponent(ColliderComponent, {
    shape: "box",
    size: [25, 0.5, 25], // 50x1x50 box
    friction: 0.7,
    restitution: 0.3,
  });

  // Rendering
  groundActor.addComponent(MeshRendererComponent);

  const groundMesh = new CubeMeshResource(1);
  const shader = new ShaderResource("GroundShader", {
    vertexSource: vertexWGSL,
    fragmentSource: fragmentWGSL,
    entryPoints: { vertex: "vs_main", fragment: "fs_main" },
  } as any);
  const material = MaterialResource.createBasic(
    "GroundMaterial",
    shader,
    [0.2, 0.2, 0.2, 1.0], // Dark gray
  );

  const resources = groundActor.addComponent(ResourceComponent);
  resources.add(groundMesh);
  resources.add(material);

  // Scale to match collider size
  transform.scale = [50, 1, 50];

  scene.addActor(groundActor);
  return groundActor;
}
