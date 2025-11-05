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

  const engine = new Engine({ canvas });
  await engine.initialize();

  const scene = new Scene("LitScene");
  engine.setScene(scene);

  // Create camera
  createCamera(scene, canvas, [0, 15, 30]);

  // Create directional light (like sunlight) - provides base illumination
  createDirectionalLight(scene, [1.0, 0.95, 0.9], 0.3);

  // Create a grid of cubes
  const gridSize = 5;
  const spacing = 3.0;

  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        const xPos = (x - Math.floor(gridSize / 2)) * spacing;
        const yPos = (y - Math.floor(gridSize / 2)) * spacing;
        const zPos = (z - Math.floor(gridSize / 2)) * spacing;

        // White/gray cubes to show lighting clearly
        const gray = 0.6 + Math.random() * 0.2;
        createLitCube(scene, [xPos, yPos, zPos], [gray, gray, gray, 1.0]);
      }
    }
  }

  // Create several colored point lights
  const lights = [
    { pos: [-10, 5, -10], color: [1.0, 0.2, 0.2], intensity: 15.0, radius: 25.0 }, // Red
    { pos: [10, 5, -10], color: [0.2, 1.0, 0.2], intensity: 15.0, radius: 25.0 },  // Green
    { pos: [-10, 5, 10], color: [0.2, 0.2, 1.0], intensity: 15.0, radius: 25.0 },  // Blue
    { pos: [10, 5, 10], color: [1.0, 1.0, 0.2], intensity: 15.0, radius: 25.0 },   // Yellow
    { pos: [0, 15, 0], color: [1.0, 0.5, 1.0], intensity: 20.0, radius: 30.0 },    // Magenta (top)
  ];

  for (const light of lights) {
    createPointLight(
      scene,
      light.pos as [number, number, number],
      light.color as [number, number, number],
      light.intensity,
      light.radius,
    );
  }

  // Start render loop
  engine.start();

  console.log("🎨 Lit scene initialized with dynamic lighting!");
  console.log(
    `- ${gridSize * gridSize * gridSize} cubes`,
  );
  console.log(`- ${lights.length} point lights`);
  console.log("- 1 directional light");

  return () => {
    engine.stop();
  };
}

const container = document.getElementById("container");
if (container) {
  init(container);
}
