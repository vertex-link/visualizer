import { Engine } from "@vertex-link/engine";
import { Scene } from "@vertex-link/space";
import { createCamera, createObjModel } from "./composables";

export function setupDemo(canvas: HTMLCanvasElement) {
  console.log("Setting up OBJ import demo");

  // Create engine
  const engine = new Engine({ canvas });

  // Create scene
  const scene = new Scene();
  engine.context.setActiveScene(scene);

  // Create camera
  createCamera(scene, canvas, [0, 2, 5], [0, 0, 0]);

  // Create OBJ model from file
  createObjModel(scene, 0.5, [0, 0, 0], [0.2, 0.6, 0.9, 1.0]);

  // Initialize and start engine
  engine.initialize().then(() => {
    console.log("OBJ import demo initialized");
    engine.start();
  });

  return engine;
}
