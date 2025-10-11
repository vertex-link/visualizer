import { Scene } from "@vertex-link/acs";
import { EngineContext } from "@vertex-link/engine";
import { createCamera, createRotatingCube } from "./composables";

async function init(container: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);

  const context = new EngineContext(canvas);
  await context.initialize();

  const scene = new Scene("RotatingCubeScene");
  context.setScene(scene);

  // Create camera and rotating cube using composables
  createCamera(scene, canvas);
  createRotatingCube(scene, context, 0.8);

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
