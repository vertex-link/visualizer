import {
  CameraComponent,
  MaterialResource,
  MeshRendererComponent,
  ProjectionType,
  ShaderResource,
  TransformComponent,
  type Vec3,
  PointLightComponent,
  DirectionalLightComponent,
} from "@vertex-link/engine";
import { Actor, ResourceComponent, type Scene } from "@vertex-link/space";
import { CubeMeshResource } from "@/example-resources/CubeMeshResource";
import shaderWGSL from "./shaders/lit.wgsl?raw";

/**
 * Creates a perspective camera actor
 */
export function createCamera(
  scene: Scene,
  canvas: HTMLCanvasElement,
  position: Vec3 = [0, 0, 40],
): Actor {
  const cameraActor = new Actor("Camera");
  const camTransform = cameraActor.addComponent(TransformComponent);
  camTransform.position = position;
  camTransform.lookAt([0, 0, 0]);

  const cam = cameraActor.addComponent(CameraComponent, {
    projectionType: ProjectionType.PERSPECTIVE,
    perspectiveConfig: {
      fov: Math.PI / 3,
      aspect: canvas.width / canvas.height,
      near: 0.1,
      far: 200,
    },
    isActive: true,
  });

  console.log(`📷 Camera at:`, camTransform.position);
  console.log(`📷 Camera aspect:`, canvas.width / canvas.height);

  scene.addActor(cameraActor);
  return cameraActor;
}

/**
 * Creates a cube with lit material
 */
export function createLitCube(
  scene: Scene,
  position: Vec3 = [0, 0, 0],
  color: [number, number, number, number] = [0.8, 0.8, 0.8, 1.0],
): Actor {
  const cubeActor = new Actor(`Cube_${Math.random().toString(36).slice(2, 9)}`);
  const transform = cubeActor.addComponent(TransformComponent);
  cubeActor.addComponent(MeshRendererComponent);

  transform.position = position;

  console.log(`🧊 Cube at:`, position);

  // Create resources
  const cubeMesh = new CubeMeshResource(1);
  const shader = new ShaderResource("LitShader", {
    vertexSource: shaderWGSL,
    fragmentSource: shaderWGSL,
    entryPoints: { vertex: "vs_main", fragment: "fs_main" },
  } as any);

  // Create material with bind groups [0, 1] for globals + lights
  const material = new MaterialResource("LitMaterial", {
    shader,
    uniforms: {
      color: {
        type: "vec4",
        size: 16,
        value: color,
      },
    },
    vertexLayout: {
      stride: 32, // position(12) + normal(12) + uv(8)
      attributes: [
        { location: 0, format: "float32x3", offset: 0 }, // position
        { location: 1, format: "float32x3", offset: 12 }, // normal
        { location: 2, format: "float32x2", offset: 24 }, // uv
      ],
    },
    renderState: {
      cullMode: "back",
      depthWrite: true,
      depthTest: true,
      blendMode: "none",
    },
    bindGroups: [0, 1], // This shader uses group 0 (globals) and group 1 (lights)
  });

  const resources = cubeActor.addComponent(ResourceComponent);
  resources.add(cubeMesh);
  resources.add(material);

  scene.addActor(cubeActor);
  return cubeActor;
}

/**
 * Creates a point light actor
 */
export function createPointLight(
  scene: Scene,
  position: Vec3,
  color: Vec3 = [1, 1, 1],
  intensity = 5.0,
  radius = 20.0,
): Actor {
  const lightActor = new Actor(`PointLight_${Math.random().toString(36).slice(2, 9)}`);
  const transform = lightActor.addComponent(TransformComponent);
  transform.position = position;

  lightActor.addComponent(PointLightComponent, {
    color,
    intensity,
    radius,
    enabled: true,
  });

  scene.addActor(lightActor);
  return lightActor;
}

/**
 * Creates a directional light actor (like sunlight)
 */
export function createDirectionalLight(
  scene: Scene,
  color: Vec3 = [1, 1, 1],
  intensity = 0.5,
): Actor {
  const lightActor = new Actor("DirectionalLight");

  lightActor.addComponent(DirectionalLightComponent, {
    color,
    intensity,
    enabled: true,
  });

  scene.addActor(lightActor);
  return lightActor;
}
