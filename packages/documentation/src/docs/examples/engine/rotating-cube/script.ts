import { Engine } from "@vertex-link/engine";
import { Scene } from "@vertex-link/space";
import { createCamera, createRotatingCube } from "./composables";

async function init(container: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);

  const context = new Engine({ canvas });
  await context.initialize();

  const scene = new Scene("RotatingCubeScene");
  context.setScene(scene);
  // Create camera and rotating cube using composables
  createCamera(scene, canvas, [0, 0, 40]);
  // Create a 3D grid of rotating cubes
  const gridSize = 10; // 2x2x2 grid (adjust as needed)
  const spacing = 1.2; // Space between cubes

  
  type Color = [number, number, number, number];
  // Helper function to generate random color
  const getRandomColor: () => Color = () => [
    Math.random(), // R
    Math.random(), // G
    Math.random(), // B
    1.0, // A
  ];

  // Helper function to generate random speed
  const getRandomSpeed = () => Math.random() * 2.0 + 0.2; // Random speed between 0.2 and 2.2

  // Create cubes in a 3D grid
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        const xPos = (x - Math.floor(gridSize / 2)) * spacing;
        const yPos = (y - Math.floor(gridSize / 2)) * spacing;
        const zPos = (z - Math.floor(gridSize / 2)) * spacing;

        // Generate random speed and color for each cube
        const speed = getRandomSpeed();
        const color = getRandomColor();

        // Create cube with calculated position, random speed, and random color
        createRotatingCube(scene, speed, [xPos, yPos, zPos], color);
      }
    }
  }
  // Start render loop
  context.start();

  return () => {
    context.stop();
  };
}

const container = document.getElementById("container");
if (container) {
  init(container);
}
