import { Engine, WebGPUProcessor } from "@vertex-link/engine";
import { Scene, Actor } from "@vertex-link/space";
import { createScene, createCamera, createCube } from "./composables";
import { createGizmo, SelectionManagerComponent, SelectableComponent } from "@vertex-link/engine";

/**
 * Main entry point for gizmo editor example
 * Demonstrates multi-scene overlay rendering with gizmo manipulation
 */
export async function init(container: HTMLElement): Promise<() => void> {
  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);

  // Create engine
  const engine = new Engine({ canvas });
  await engine.initialize();

  // Create content scene (3D objects)
  const contentScene = createScene("ContentScene");

  // Create camera
  const camera = createCamera(contentScene, canvas);

  // Create some cubes to manipulate
  const cube1 = createCube(contentScene, [-2, 0, 0], [1, 0, 0, 1]); // Red cube
  cube1.addComponent(SelectableComponent);

  const cube2 = createCube(contentScene, [0, 0, 0], [0, 1, 0, 1]); // Green cube
  cube2.addComponent(SelectableComponent);

  const cube3 = createCube(contentScene, [2, 0, 0], [0, 0, 1, 1]); // Blue cube
  cube3.addComponent(SelectableComponent);

  // Create overlay scene (gizmos and editor tools)
  const overlayScene = new Scene("OverlayScene");

  // Create gizmo in overlay scene
  const gizmo = createGizmo(overlayScene, canvas, camera, null);

  // Create selection manager
  const selectionManager = new Actor("SelectionManager");
  selectionManager.addComponent(SelectionManagerComponent, contentScene, canvas, camera);
  contentScene.addActor(selectionManager);

  // Get WebGPU processor and set up multi-scene rendering
  const processor = engine
    .getContext()
    .processors.find((p) => p instanceof WebGPUProcessor) as WebGPUProcessor;

  if (processor) {
    processor.setContentScene(contentScene);
    processor.addOverlayScene("gizmo", overlayScene);
  }

  // Set engine scene (for camera - legacy)
  engine.setScene(contentScene);

  // Start rendering
  engine.start();

  // Return cleanup function
  return () => {
    engine.stop();
    container.removeChild(canvas);
  };
}

// Auto-init if demo.html
if (typeof window !== "undefined") {
  const container = document.getElementById("app");
  if (container) {
    init(container).catch(console.error);
  }
}
