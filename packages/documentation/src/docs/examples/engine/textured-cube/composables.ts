import {
  CameraComponent,
  ImageResource,
  MaterialResource,
  MeshRendererComponent,
  ProjectionType,
  SamplerResource,
  ShaderResource,
  TransformComponent,
  type Vec3,
} from "@vertex-link/engine";
import { Actor, ResourceComponent, type Scene } from "@vertex-link/space";
import { CubeMeshResource } from "@/example-resources/CubeMeshResource";
import { createCheckerboardTexture } from "./createProceduralTexture";
import fragmentWGSL from "./shaders/textured.frag.wgsl?raw";
import vertexWGSL from "./shaders/textured.vert.wgsl?raw";

/**
 * Creates a perspective camera actor
 */
export function createCamera(
  scene: Scene,
  canvas: HTMLCanvasElement,
  position: Vec3 = [0, 0, 5],
): Actor {
  const cameraActor = new Actor("Camera");
  const camTransform = cameraActor.addComponent(TransformComponent);
  camTransform.position = position;
  camTransform.lookAt([0, 0, 0]);

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
 * Creates a textured rotating cube
 * Demonstrates ImageResource and SamplerResource usage
 */
export async function createTexturedCube(
  scene: Scene,
  position: Vec3 = [0, 0, 0],
  color: [number, number, number, number] = [1.0, 1.0, 1.0, 1.0],
): Promise<Actor> {
  const cubeActor = new Actor("TexturedCube");
  const transform = cubeActor.addComponent(TransformComponent);
  cubeActor.addComponent(MeshRendererComponent);

  transform.position = position;

  // Create mesh
  const cubeMesh = new CubeMeshResource(1);

  // Create shader with texture bindings
  const shader = new ShaderResource("TexturedShader", {
    vertexSource: vertexWGSL,
    fragmentSource: fragmentWGSL,
    entryPoints: { vertex: "vs_main", fragment: "fs_main" },
  });

  // Create material (slots will be auto-created from shader bindings)
  const material = MaterialResource.createBasic("TexturedMaterial", shader, color);

  // Wait for material to discover slots
  await material.whenReady();

  console.log("✨ Material slots discovered:", Array.from(material.getSlots().keys()));

  // Create procedural texture
  const textureData = await createCheckerboardTexture(256, 32);

  // Create ImageResource with default sampler
  const diffuseTexture = new ImageResource("DiffuseTexture", {
    source: textureData,
    sRGB: true,
  });

  // Optional: Create custom sampler (or use texture's default)
  const customSampler = new SamplerResource("CustomSampler", {
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
    addressModeU: "repeat",
    addressModeV: "repeat",
  });

  // Fill material slots
  material
    .slot("diffuseTexture", diffuseTexture)
    .slot("diffuseSampler", customSampler); // Or let it use texture's default

  // Add resources to actor
  const resources = cubeActor.addComponent(ResourceComponent);
  resources.add(cubeMesh);
  resources.add(material);

  scene.addActor(cubeActor);

  console.log("🎨 Textured cube created successfully!");

  return cubeActor;
}

/**
 * Simple rotation component
 */
export class RotationComponent {
  public speed = 1.0;

  update(transform: TransformComponent, deltaTime: number): void {
    const rotation = transform.rotation;
    rotation[1] += this.speed * deltaTime; // Rotate around Y axis
    transform.rotation = rotation;
  }
}
