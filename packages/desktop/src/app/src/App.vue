<template>
  <div id="app">
    <!-- Custom title bar for window controls -->
    <div class="title-bar" @mousedown="handleTitleBarMouseDown">
      <div class="title-content">
        <div class="title-text">vertex-link</div>
        <div class="version">v0.1.0</div>
      </div>
      <div class="window-controls">
        <button class="control-btn minimize" @click="minimizeWindow">−</button>
        <button class="control-btn close" @click="closeWindow">×</button>
      </div>
    </div>

    <!-- Canvas for 3D rendering -->
    <main class="editor-main">
      <canvas
        ref="canvasRef"
        class="render-canvas"
        @click="initEngine"
      ></canvas>

      <!-- Overlay info -->
      <div class="overlay-info" v-if="!engineStarted">
        <div class="info-content">
          <div class="logo">⚡</div>
          <h2>vertex link engine</h2>
          <p>click to start</p>
        </div>
      </div>

      <div class="overlay-info bottom" v-if="engineStarted">
        <div class="status-text">{{ status }}</div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  CameraComponent,
  MeshRendererComponent,
  ProjectionType,
  TransformComponent,
  WebGPUProcessor,
} from "@vertex-link/engine";
import { Actor, Context, EventBus, ResourceComponent, Scene } from "@vertex-link/orbits";
import { onMounted, onUnmounted, ref } from "vue";

import { RotatingComponent } from "./RotatingComponent";
import { BasicMaterialResource } from "./resources/BasicMaterialResource";
import { CubeMeshResource } from "./resources/CubeMeshResource";

const canvasRef = ref<HTMLCanvasElement>();
const engineStarted = ref(false);
const status = ref("initializing...");

// Demo controls
const cubeCount = ref(1); // Just one cube like you wanted
const rotationSpeed = ref(1.0);

// Demo state
let processor: WebGPUProcessor | null = null;
let scene: Scene | null = null;
let cubes: Actor[] = [];

const initEngine = async () => {
  if (engineStarted.value || !canvasRef.value) return;

  try {
    status.value = "Starting WebGPU...";

    // Initialize context and WebGPU processor
    const context = new Context();

    processor = new WebGPUProcessor(
      canvasRef.value,
      "desktop-renderer",
      context.eventBus,
      () => context,
    );

    context.addProcessor(processor);

    await processor.initialize();

    console.log(processor);

    status.value = "Creating scene...";

    // Create scene
    scene = new Scene("RotatingCubesScene");
    context.setScene(scene);

    status.value = "creating cubes...";

    // Create cubes using EXACT pattern from working documentation
    await createCubes();

    // Create camera
    createCamera(canvasRef.value);

    status.value = "Starting render loop...";

    // Start rendering
    processor.start();

    engineStarted.value = true;
    status.value = "Running";

    console.log("✅ Rotating cubes demo started successfully");
  } catch (error) {
    status.value = `error: ${error}`;
    console.error("❌ Failed to start demo:", error);
  }
};

/**
 * Create rotating cubes - EXACT COPY from working documentation!
 */
async function createCubes() {
  if (!scene) return;

  cubes = [];

  const cubeMeshResourceInstance = new CubeMeshResource(1.0);

  for (let i = 0; i < cubeCount.value; i++) {
    // Create actor
    const cubeActor = new Actor(`Cube${i}`);

    // Add transform - simple positioning for one cube
    const transform = cubeActor.addComponent(TransformComponent);
    transform.setPosition(0, 0, 0); // Center the single cube

    // Add resources (auto-load, auto-compile!) - exactly like working example
    const resources = cubeActor.addComponent(ResourceComponent);
    resources.add(cubeMeshResourceInstance);
    resources.add(new BasicMaterialResource([Math.random(), Math.random(), Math.random(), 1.0]));

    // Add behavior and rendering - exactly like working example
    cubeActor.addComponent(RotatingComponent);
    const cubeRotation = cubeActor.getComponent(RotatingComponent);
    if (cubeRotation) {
      cubeRotation.speed = rotationSpeed.value * (0.5 + Math.random());
    }
    cubeActor.addComponent(MeshRendererComponent);

    // Add to scene
    scene.addActor(cubeActor);
    cubes.push(cubeActor);
  }

  console.log(`Created ${cubes.length} cubes with simplified resource system`);
}

/**
 * Create camera - exactly like working example
 */
function createCamera(canvas: HTMLCanvasElement) {
  if (!scene) return;

  const camera = new Actor("Camera");

  const cameraTransform = camera.addComponent(TransformComponent);
  cameraTransform.setPosition(0, 0.5, 3);

  camera.addComponent(CameraComponent, {
    projectionType: ProjectionType.PERSPECTIVE,
    perspectiveConfig: {
      fov: Math.PI / 3,
      aspect: canvas.width / canvas.height,
      near: 0.1,
      far: 100.0,
    },
    isActive: true,
  });

  scene.addActor(camera);
}

// Window controls
const handleTitleBarMouseDown = () => {
  if (window.electronAPI?.startDrag) {
    window.electronAPI.startDrag();
  }
};

const minimizeWindow = () => {
  if (window.electronAPI?.minimize) {
    window.electronAPI.minimize();
  }
};

const closeWindow = () => {
  if (window.electronAPI?.close) {
    window.electronAPI.close();
  }
};

// Cleanup
onUnmounted(() => {
  if (processor) {
    processor.stop?.();
  }
  if (scene) {
    scene.clear?.();
  }
});

// Auto-resize canvas
onMounted(() => {
  const handleResize = () => {
    if (canvasRef.value) {
      const rect = canvasRef.value.parentElement?.getBoundingClientRect();
      if (rect) {
        canvasRef.value.width = rect.width;
        canvasRef.value.height = rect.height;
      }
    }
  };

  window.addEventListener("resize", handleResize);
  handleResize();

  onUnmounted(() => {
    window.removeEventListener("resize", handleResize);
  });
});
</script>

<style scoped>
/* ... rest of your styles stay the same ... */
* {
  box-sizing: border-box;
}

#app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
  background: transparent;
  overflow: hidden;
  color: #ffffff;
}

.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  cursor: move;
  user-select: none;
  -webkit-app-region: drag;
}

.title-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-text {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
  opacity: 0.9;
}

.version {
  font-size: 10px;
  opacity: 0.5;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
}

.window-controls {
  display: flex;
  gap: 6px;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.15s ease;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.9);
}

.minimize:hover {
  background: rgba(255, 193, 7, 0.8);
  color: #000;
}

.close:hover {
  background: rgba(220, 53, 69, 0.8);
  color: #fff;
}

.editor-main {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.render-canvas {
  width: 100%;
  height: 100%;
  cursor: pointer;
  background: transparent;
}

.overlay-info {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.overlay-info.bottom {
  align-items: flex-end;
  padding: 20px;
}

.info-content {
  text-align: center;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  padding: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: auto;
}

.logo {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.8;
}

.info-content h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 300;
  letter-spacing: 1px;
  opacity: 0.9;
}

.info-content p {
  margin: 0;
  font-size: 14px;
  opacity: 0.6;
  letter-spacing: 0.5px;
}

.status-text {
  font-size: 11px;
  opacity: 0.7;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  letter-spacing: 0.3px;
}

/* Scrollbar styling for minimal look */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
