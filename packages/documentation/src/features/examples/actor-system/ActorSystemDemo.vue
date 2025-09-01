<template>
  <FeatureContainer
    title="Actor System"
    description="Demonstrates actor creation, management, and hierarchy"
    :parameters="parameters"
    :documentation="documentation"
    @parameter-change="handleParameterChange"
  >
    <template #demo>
      <canvas 
        ref="canvas"
        width="800" 
        height="600"
        class="demo-canvas"
      />
    </template>
  </FeatureContainer>
</template>

<script setup lang="ts">
import FeatureContainer from "@/components/showcase/FeatureContainer.vue";
import { BasicMaterialResource } from "@/examples/resources/BasicMaterialResource";
import { CubeMeshResource } from "@/examples/resources/CubeMeshResource";
import { Actor, ProcessorRegistry, Scene } from "@vertex-link/acs";
import { ResourceComponent } from "@vertex-link/acs";
import {
  CameraComponent,
  MeshRendererComponent,
  ProjectionType,
  TransformComponent,
  WebGPUProcessor,
} from "@vertex-link/engine";
import { onMounted, onUnmounted, ref } from "vue";
import definition from "./definition";
import docsContent from "./docs.md?raw";

const canvas = ref<HTMLCanvasElement>();
const parameters = definition.parameters;
const documentation = docsContent;

// Demo state
let processor: WebGPUProcessor | null = null;
let scene: Scene | null = null;
let actors: Actor[] = [];

// Demo parameters
let actorCount = 5;
let showHierarchy = true;
let spawnPattern: "grid" | "circle" | "random" = "grid";

async function initializeDemo() {
  if (!canvas.value) return;

  try {
    // Create scene and processor
    scene = new Scene();
    processor = new WebGPUProcessor(canvas.value, "webgpu");
    // Register globally so resources can discover the processor
    ProcessorRegistry.register(processor);
    await processor.initialize();
    processor.setScene(scene);

    // Create initial actors
    createActors();

    // Ensure there is an active camera
    createCamera();

    // Start processor
    processor.start();
  } catch (error) {
    console.error("Failed to initialize demo:", error);
  }
}

function createActors() {
  if (!scene) return;

  // Clear existing actors
  actors.forEach((actor) => scene!.removeActor(actor));
  actors = [];

  // Create new actors based on parameters
  const cubeMesh = new CubeMeshResource(0.5);
  for (let i = 0; i < actorCount; i++) {
    const actor = new Actor(`demo-actor-${i}`);
    // Add TransformComponent via Actor API so the Actor context is bound correctly
    const transform = actor.addComponent(TransformComponent);

    // Position based on spawn pattern
    const position = calculatePosition(i, spawnPattern);
    transform.setPosition(position.x, position.y, position.z);

    // Add resources so the engine has something to render
    const resources = actor.addComponent(ResourceComponent);
    resources.add(cubeMesh); // share a single mesh across actors
    resources.add(new BasicMaterialResource([Math.random(), Math.random(), Math.random(), 1.0]));

    // Add renderer so it participates in batching
    actor.addComponent(MeshRendererComponent);

    scene.addActor(actor);
    actors.push(actor);
  }
}

function calculatePosition(index: number, pattern: string) {
  switch (pattern) {
    case "grid":
      const cols = Math.ceil(Math.sqrt(actorCount));
      const x = ((index % cols) - cols / 2) * 2;
      const z = (Math.floor(index / cols) - cols / 2) * 2;
      return { x, y: 0, z };

    case "circle":
      const angle = (index / actorCount) * Math.PI * 2;
      return {
        x: Math.cos(angle) * 3,
        y: 0,
        z: Math.sin(angle) * 3,
      };

    case "random":
      return {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 4,
        z: (Math.random() - 0.5) * 10,
      };

    default:
      return { x: 0, y: 0, z: 0 };
  }
}

function handleParameterChange(key: string, value: any) {
  switch (key) {
    case "actorCount":
      actorCount = value;
      createActors();
      break;
    case "showHierarchy":
      showHierarchy = value;
      // Update hierarchy visualization (placeholder)
      break;
    case "spawnPattern":
      spawnPattern = value;
      createActors();
      break;
  }
}

function cleanup() {
  if (processor) {
    processor.stop();
    // Unregister to prevent duplicate registration on re-entry
    try {
      ProcessorRegistry.unregister(processor.name);
    } catch {}
    // WebGPUProcessor currently does not implement dispose(); release via stop() and let GC handle the rest.
    // Add explicit renderer/device cleanup here if/when implemented in engine.
    // Safeguard in case future versions add dispose():
    if (typeof (processor as any).dispose === "function") {
      try {
        (processor as any).dispose();
      } catch {}
    }
    processor = null;
  }
  scene = null;
  actors = [];
}

onMounted(initializeDemo);
onUnmounted(cleanup);

function createCamera() {
  if (!scene || !canvas.value) return;
  const camActor = new Actor("Camera");
  const t = camActor.addComponent(TransformComponent);
  t.setPosition(0, 3, 10);
  camActor.addComponent(CameraComponent, {
    projectionType: ProjectionType.PERSPECTIVE,
    perspectiveConfig: {
      fov: Math.PI / 3,
      aspect: canvas.value.width / canvas.value.height,
      near: 0.1,
      far: 100,
    },
    isActive: true,
  });
  scene.addActor(camActor);
}
</script>

<style scoped>
.demo-canvas {
  border: var(--p-border-width) solid var(--p-surface-200);
  border-radius: var(--p-border-radius);
  box-shadow: var(--p-shadow-md);
}
</style>
