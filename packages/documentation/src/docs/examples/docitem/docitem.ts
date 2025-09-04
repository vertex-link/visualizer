import { Scene, Actor } from '@vertex-link/acs';
import { EngineContext, PerspectiveCamera, TransformComponent } from '@vertex-link/engine';

// This code runs inside the iframe
const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;

// if (canvas) {
//     const engineContext = new EngineContext(canvas);
//     engineContext.initialize().then(() => {
//         const scene = new Scene("DemoScene");
//
//         // Create a camera
//         const camera = new PerspectiveCamera("Camera");
//         camera.getTransformComponent().setPosition(0, 0, 5);
//         scene.addActor(camera);
//
//         // Add other actors...
//
//         engineContext.setScene(scene);
//         engineContext.start();
//     });
// }