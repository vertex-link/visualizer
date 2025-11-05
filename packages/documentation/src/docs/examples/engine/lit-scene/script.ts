import { Engine, TransformComponent, PointLightComponent, DirectionalLightComponent } from "@vertex-link/engine";
import { Scene } from "@vertex-link/space";
import {
  createCamera,
  createLitCube,
  createPointLight,
  createDirectionalLight,
  createPlane,
} from "./composables";

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
  const groundPlane = createPlane(scene, [0, 0, 0], 20, 20, [0.5, 0.5, 0.5, 1.0]);

  // Create cube above ground
  const cube = createLitCube(scene, [0, 1, 0], [0.8, 0.2, 0.2, 1.0]);

  // Create directional light from above (like sun)
  const dirLight = createDirectionalLight(scene, [1.0, 0.95, 0.9], 0.5);

  // Create point light above the scene
  const pointLight = createPointLight(scene, [3, 5, 3], [1.0, 0.8, 0.5], 10.0, 15.0);

  // Setup UI controls
  setupLightControls(pointLight, dirLight);

  // Start render loop
  engine.start();

  return () => {
    engine.stop();
  };
}

function setupLightControls(pointLightActor: any, dirLightActor: any) {
  const pointTransform = pointLightActor.getComponent(TransformComponent);
  const pointLight = pointLightActor.getComponent(PointLightComponent);
  const dirLight = dirLightActor.getComponent(DirectionalLightComponent);

  // Point light controls
  const pointEnabled = document.getElementById("pointEnabled") as HTMLInputElement;
  const pointX = document.getElementById("pointX") as HTMLInputElement;
  const pointY = document.getElementById("pointY") as HTMLInputElement;
  const pointZ = document.getElementById("pointZ") as HTMLInputElement;
  const pointIntensity = document.getElementById("pointIntensity") as HTMLInputElement;
  const pointRadius = document.getElementById("pointRadius") as HTMLInputElement;

  // Value displays
  const pointXValue = document.getElementById("pointXValue")!;
  const pointYValue = document.getElementById("pointYValue")!;
  const pointZValue = document.getElementById("pointZValue")!;
  const pointIntensityValue = document.getElementById("pointIntensityValue")!;
  const pointRadiusValue = document.getElementById("pointRadiusValue")!;

  // Point light event listeners
  pointEnabled.addEventListener("change", () => {
    pointLight.enabled = pointEnabled.checked;
  });

  pointX.addEventListener("input", () => {
    const val = parseFloat(pointX.value);
    pointTransform.position[0] = val;
    pointXValue.textContent = val.toFixed(1);
  });

  pointY.addEventListener("input", () => {
    const val = parseFloat(pointY.value);
    pointTransform.position[1] = val;
    pointYValue.textContent = val.toFixed(1);
  });

  pointZ.addEventListener("input", () => {
    const val = parseFloat(pointZ.value);
    pointTransform.position[2] = val;
    pointZValue.textContent = val.toFixed(1);
  });

  pointIntensity.addEventListener("input", () => {
    const val = parseFloat(pointIntensity.value);
    pointLight.intensity = val;
    pointIntensityValue.textContent = val.toFixed(1);
  });

  pointRadius.addEventListener("input", () => {
    const val = parseFloat(pointRadius.value);
    pointLight.radius = val;
    pointRadiusValue.textContent = val.toFixed(1);
  });

  // Directional light controls
  const dirEnabled = document.getElementById("dirEnabled") as HTMLInputElement;
  const dirIntensity = document.getElementById("dirIntensity") as HTMLInputElement;
  const dirIntensityValue = document.getElementById("dirIntensityValue")!;

  dirEnabled.addEventListener("change", () => {
    dirLight.enabled = dirEnabled.checked;
  });

  dirIntensity.addEventListener("input", () => {
    const val = parseFloat(dirIntensity.value);
    dirLight.intensity = val;
    dirIntensityValue.textContent = val.toFixed(1);
  });
}

const container = document.getElementById("container");
if (container) {
  init(container);
}
