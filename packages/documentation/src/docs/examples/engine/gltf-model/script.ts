import { Engine } from "@vertex-link/engine";
import { Scene } from "@vertex-link/space";
import { createCamera, createGltfModel } from "./composables";

/**
 * GLTF Model Loading Example
 *
 * This example demonstrates how to:
 * 1. Load GLTF models using GltfResource
 * 2. Display them using ModelComponent
 * 3. Integrate with the existing rendering pipeline
 *
 * IMPORTANT: To use this example, you need to provide a GLTF model file.
 * You can download free GLTF models from:
 * - https://github.com/KhronosGroup/glTF-Sample-Models
 * - https://sketchfab.com (filter by glTF format)
 *
 * Replace the MODEL_URL below with the path to your GLTF file.
 */

// Replace this with your GLTF model URL
const MODEL_URL = "/path/to/your/model.gltf";

async function init(container: HTMLElement) {
  // Create canvas
  const canvas = document.createElement("canvas");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);

  // Initialize engine
  const engine = new Engine({ canvas });
  await engine.initialize();

  // Create scene
  const scene = new Scene("GltfModelScene");
  engine.setScene(scene);

  // Create camera
  createCamera(scene, canvas, [0, 2, 5]);

  // Load GLTF model
  // The model will automatically:
  // 1. Parse the GLTF file
  // 2. Create MeshResource for each mesh
  // 3. Create MaterialResource for each material
  // 4. Upload to GPU
  // 5. Be ready for rendering
  const model = createGltfModel(
    scene,
    MODEL_URL,
    [0, 0, 0], // position
    [1, 1, 1], // scale
    [0, 0, 0], // rotation
  );

  // Optional: Add rotation to the model
  const transform = model.getComponent(
    // @ts-ignore - TransformComponent is available
    window.TransformComponent || class {},
  );
  if (transform) {
    let rotation = 0;
    setInterval(() => {
      rotation += 0.01;
      transform.rotation = [0, rotation, 0];
    }, 16);
  }

  // Start render loop
  engine.start();

  // Cleanup function
  return () => {
    engine.stop();
  };
}

// Initialize when DOM is ready
const container = document.getElementById("container");
if (container) {
  init(container).catch((error) => {
    console.error("Failed to initialize GLTF example:", error);

    // Display helpful error message
    container.innerHTML = `
      <div style="padding: 20px; color: #ff6b6b;">
        <h3>Failed to load GLTF model</h3>
        <p>Error: ${error.message}</p>
        <p>Please make sure:</p>
        <ul>
          <li>You have updated MODEL_URL with a valid GLTF file path</li>
          <li>The GLTF file is accessible from the browser</li>
          <li>The file is a valid GLTF 2.0 format</li>
        </ul>
        <p>Download sample models from:
          <a href="https://github.com/KhronosGroup/glTF-Sample-Models" target="_blank">
            glTF-Sample-Models
          </a>
        </p>
      </div>
    `;
  });
}
