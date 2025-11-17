import {
  CameraComponent,
  GltfResource,
  ModelComponent,
  ProjectionType,
  TransformComponent,
  type Vec3,
} from "@vertex-link/engine";
import { Actor, ResourceComponent, type Scene } from "@vertex-link/space";

/**
 * Creates a perspective camera actor and adds it to the scene
 */
export function createCamera(
  scene: Scene,
  canvas: HTMLCanvasElement,
  position: Vec3 = [0, 0, 0],
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
      far: 1000,
    },
    isActive: true,
  });

  scene.addActor(cameraActor);
  return cameraActor;
}

/**
 * Creates a GLTF model actor from a URL
 *
 * Example usage:
 * ```typescript
 * const model = createGltfModel(scene, "/path/to/model.gltf", [0, 0, 0]);
 * ```
 */
export function createGltfModel(
  scene: Scene,
  url: string,
  position: Vec3 = [0, 0, 0],
  scale: Vec3 = [1, 1, 1],
  rotation: Vec3 = [0, 0, 0],
): Actor {
  // 1. CREATE ACTOR
  const modelActor = new Actor("GltfModel");

  // 2. ADD COMPONENTS
  const transform = modelActor.addComponent(TransformComponent);
  modelActor.addComponent(ModelComponent);

  transform.position = position;
  transform.scale = scale;
  transform.rotation = rotation;

  // 3. CREATE GLTF RESOURCE (auto-loads and compiles)
  const gltfResource = new GltfResource("Model", { url });

  // 4. ATTACH RESOURCE TO ACTOR
  const resources = modelActor.addComponent(ResourceComponent);
  resources.add(gltfResource);

  // 5. ADD TO SCENE
  scene.addActor(modelActor);

  return modelActor;
}

/**
 * Creates a rotating GLTF model actor
 *
 * This adds a simple rotation animation to the model
 */
export function createRotatingGltfModel(
  scene: Scene,
  url: string,
  position: Vec3 = [0, 0, 0],
  rotationSpeed: Vec3 = [0, 0.01, 0],
): Actor {
  const model = createGltfModel(scene, url, position);
  const transform = model.getComponent(TransformComponent);

  if (transform) {
    // Add simple rotation in the update loop
    // Note: In a real application, you'd use a proper Component for this
    // but for the example, we'll keep it simple
    setInterval(() => {
      transform.rotation = [
        transform.rotation[0] + rotationSpeed[0],
        transform.rotation[1] + rotationSpeed[1],
        transform.rotation[2] + rotationSpeed[2],
      ];
    }, 16); // ~60fps
  }

  return model;
}
