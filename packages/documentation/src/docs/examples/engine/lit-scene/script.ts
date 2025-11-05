import { Engine, TransformComponent, PointLightComponent, DirectionalLightComponent } from "@vertex-link/engine";
import { Scene, type Actor } from "@vertex-link/space";
import {
  createCamera,
  createLitCube,
  createPointLight,
  createDirectionalLight,
  createPlane,
} from "./composables";

// Store actors globally for parameter updates
let pointLightActor: Actor;
let dirLightActor: Actor;

async function init(container: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);

  const engine = new Engine({ canvas });
  await engine.initialize();

  const scene = new Scene("LitScene");
  engine.setScene(scene);

  // Create camera looking down at the scene
  createCamera(scene, canvas, [0, 8, 12]);

  // Create ground plane (horizontal, at y=0)
  createPlane(scene, [0, 0, 0], 20, 20, [0.5, 0.5, 0.5, 1.0]);

  // Create cube above ground
  createLitCube(scene, [0, 1, 0], [0.8, 0.2, 0.2, 1.0]);

  // Create directional light from above (like sun)
  dirLightActor = createDirectionalLight(scene, [1.0, 0.95, 0.9], 0.5);

  // Create point light above the scene
  pointLightActor = createPointLight(scene, [3, 5, 3], [1.0, 0.8, 0.5], 10.0, 15.0);

  // Start render loop
  engine.start();

  return () => {
    engine.stop();
  };
}

// Listen for parameter updates from documentation system
window.addEventListener('message', (event) => {
  const { key, value } = event.data;

  if (!pointLightActor || !dirLightActor) return;

  const pointTransform = pointLightActor.getComponent(TransformComponent);
  const pointLight = pointLightActor.getComponent(PointLightComponent);
  const dirLight = dirLightActor.getComponent(DirectionalLightComponent);

  // Handle parameter updates
  switch (key) {
    // Point light enabled/disabled
    case 'pointEnabled':
      if (pointLight) pointLight.enabled = value;
      break;

    // Point light position
    case 'pointX':
      if (pointTransform) pointTransform.position[0] = value;
      break;
    case 'pointY':
      if (pointTransform) pointTransform.position[1] = value;
      break;
    case 'pointZ':
      if (pointTransform) pointTransform.position[2] = value;
      break;

    // Point light properties
    case 'pointIntensity':
      if (pointLight) pointLight.intensity = value;
      break;
    case 'pointRadius':
      if (pointLight) pointLight.radius = value;
      break;

    // Directional light
    case 'dirEnabled':
      if (dirLight) dirLight.enabled = value;
      break;
    case 'dirIntensity':
      if (dirLight) dirLight.intensity = value;
      break;
  }
});

const container = document.getElementById("container");
if (container) {
  init(container);
}
