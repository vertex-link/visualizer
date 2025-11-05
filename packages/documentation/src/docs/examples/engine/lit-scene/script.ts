import { Engine } from "@vertex-link/engine";
import { Scene } from "@vertex-link/space";
import {
  createCamera,
  createLitCube,
  createPointLight,
  createDirectionalLight,
} from "./composables";

async function init(container: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);

  console.log(`📐 Canvas size: ${canvas.width}x${canvas.height}`);
  console.log(`📐 Container size: ${container.clientWidth}x${container.clientHeight}`);

  const engine = new Engine({ canvas });
  await engine.initialize();

  const scene = new Scene("LitScene");
  engine.setScene(scene);

  // Create camera
  createCamera(scene, canvas, [0, 5, 10]);

  // Create one cube above origin
  console.log("Creating cube at [0, 2, 0]");
  createLitCube(scene, [0, 2, 0], [0.8, 0.8, 0.8, 1.0]);

  // Create directional light
  console.log("Creating directional light");
  createDirectionalLight(scene, [1.0, 0.95, 0.9], 0.5);

  // Create one point light
  console.log("Creating point light at [3, 3, 3]");
  createPointLight(scene, [3, 3, 3], [1.0, 0.5, 0.5], 10.0, 15.0);

  // Start render loop
  engine.start();

  console.log("🎨 Lit scene initialized with dynamic lighting!");
  console.log("- 1 cube");
  console.log("- 1 point light");
  console.log("- 1 directional light");

  return () => {
    engine.stop();
  };
}

const container = document.getElementById("container");
if (container) {
  init(container);
}
