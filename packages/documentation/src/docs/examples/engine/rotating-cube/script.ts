import { Engine, GridComponent } from "@vertex-link/engine";
import { Scene } from "@vertex-link/space";
import { createCamera, createRotatingCube, createGrid } from "./composables";

async function init(container: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);

  const context = new Engine({ canvas });
  await context.initialize();

  const scene = new Scene("RotatingCubeScene");
  context.setScene(scene);

  // Create camera and grid
  createCamera(scene, canvas, [0, 0, 40]);
  const gridActor = createGrid(scene, {
    size: 100,
    color: [0.5, 0.5, 0.5, 1.0],
    plane: "xz",
    visible: true,
    layer: -1000,
  });
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

  // Setup grid toggle UI and controls
  const gridComponent = gridActor.getComponent(GridComponent);
  if (!gridComponent) {
    throw new Error("GridComponent not found on grid actor");
  }

  // Helper function to update button text
  const updateButtonText = (button: HTMLButtonElement) => {
    button.textContent = gridComponent.isVisible() ? "Hide Grid [G]" : "Show Grid [G]";
  };

  // Create toggle button with CSS class
  const toggleButton = document.createElement("button");
  toggleButton.className = "grid-toggle-button";
  Object.assign(toggleButton.style, {
    position: "absolute",
    top: "10px",
    left: "10px",
    padding: "10px 20px",
    backgroundColor: "#333",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: "14px",
    zIndex: "1000",
    transition: "background-color 0.2s",
  });

  // Hover effect
  toggleButton.addEventListener("mouseenter", () => {
    toggleButton.style.backgroundColor = "#555";
  });
  toggleButton.addEventListener("mouseleave", () => {
    toggleButton.style.backgroundColor = "#333";
  });

  // Toggle grid on click
  toggleButton.addEventListener("click", () => {
    gridComponent.toggle();
    updateButtonText(toggleButton);
  });

  // Set initial button text
  updateButtonText(toggleButton);

  container.appendChild(toggleButton);

  // Add keyboard shortcut (G key)
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "g" || e.key === "G") {
      gridComponent.toggle();
      updateButtonText(toggleButton);
    }
  };

  window.addEventListener("keydown", handleKeyPress);

  return () => {
    context.stop();
    toggleButton.remove();
    window.removeEventListener("keydown", handleKeyPress);
  };
}

const container = document.getElementById("container");
if (container) {
  init(container);
}
