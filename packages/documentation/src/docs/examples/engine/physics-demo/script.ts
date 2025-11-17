import { Engine, PhysicsProcessor } from "@vertex-link/engine";
import { Scene } from "@vertex-link/space";
import { createCamera, createGround, createPhysicsCube } from "./composables";

async function init(container: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);

  const engine = new Engine({ canvas });

  // Initialize physics processor
  const physicsProcessor = new PhysicsProcessor();
  engine.getContext().addProcessor(physicsProcessor);
  await physicsProcessor.initialize();

  await engine.initialize();

  const scene = new Scene("PhysicsScene");
  engine.setScene(scene);

  // Create camera
  createCamera(scene, canvas, [0, 10, 25]);

  // Create ground (static physics body)
  createGround(scene);

  // Create initial falling cubes
  const initialCubes = 5;
  for (let i = 0; i < initialCubes; i++) {
    const x = (Math.random() - 0.5) * 10;
    const y = 10 + i * 3;
    const z = (Math.random() - 0.5) * 10;
    createPhysicsCube(scene, [x, y, z]);
  }

  // Add click-to-spawn interaction
  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const z = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    // Spawn cube above the ground
    createPhysicsCube(scene, [x * 10, 15, z * 10]);
  });

  // Start render loop
  engine.start();

  return () => {
    engine.stop();
  };
}

const container = document.getElementById("container");
if (container) {
  init(container);
}
