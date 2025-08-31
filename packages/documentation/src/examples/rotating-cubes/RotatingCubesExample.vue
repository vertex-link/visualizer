<template>
  <ExampleContainer
    title="Rotating Cubes"
    :is-running="isRunning"
    :can-start="canStart"
    :status-text="statusText"
    @start="startDemo"
    @stop="stopDemo"
    @reset="resetDemo"
    ref="container"
  >
    <template #info>
      <InfoPanel
        title="Rotating Cubes Demo"
        :features="[
          'Simplified Resource System',
          'Auto-loading Resources',
          'Type-safe Resource Access',
          'WebGPU Rendering Pipeline',
          'Component-based Architecture',
          'Real-time Rotation'
        ]"
        :technologies="['WebGPU', 'TypeScript', 'Actor-Component-System']"
      >
        <p>
          This demo showcases the simplified resource system where resources auto-load
          and auto-compile without ResourceManager complexity. Each cube uses the new
          ResourceComponent pattern with type-safe resource access.
        </p>
      </InfoPanel>
    </template>

    <template #controls>
      <ControlPanel title="Demo Controls">
        <ControlGroup
          type="slider"
          label="Number of Cubes"
          :min="1"
          :max="10000"
          :step="1"
          v-model="cubeCount"
          @update:model-value="recreateCubes"
        />

        <ControlGroup
          type="slider"
          label="Rotation Speed"
          :min="0"
          :max="3"
          :step="0.1"
          :precision="1"
          v-model="rotationSpeed"
          @update:model-value="updateRotationSpeed"
        />

        <ControlGroup
          type="toggle"
          label="Auto-rotate Colors"
          v-model="autoRotateColors"
        />

        <ControlGroup
          type="button"
          label="Actions"
          button-text="Randomize Colors"
          button-icon="palette"
          @action="randomizeColors"
        />
      </ControlPanel>
    </template>
  </ExampleContainer>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import {
  Actor,
  Scene,
  ResourceComponent
} from '@vertex-link/acs'
import {
  EngineContext,
  TransformComponent,
  MeshRendererComponent,
  CameraComponent,
  ProjectionType,
  Transform,
  WebGPUProcessor,
} from '@vertex-link/engine'

// Import example components
import ExampleContainer from '../../components/examples/ExampleContainer.vue'
import InfoPanel from '../../components/examples/InfoPanel.vue'
import ControlPanel from '../../components/examples/ControlPanel.vue'
import ControlGroup from '../../components/examples/ControlGroup.vue'

// Import simplified resource classes
// import basicShaderSource from '@vertex-link/engine/webgpu/shaders/basic.wgsl'
import { CubeMeshResource } from '../resources/CubeMeshResource'
import { BasicMaterialResource } from '../resources/BasicMaterialResource'
import { RotatingComponent } from './RotatingComponent'

// ==================== Demo State ====================

const container = ref<InstanceType<typeof ExampleContainer>>()
const isRunning = ref(false)
const canStart = ref(false)
const statusText = ref('Initializing...')

// Demo controls
const cubeCount = ref(5)
const rotationSpeed = ref(1.0)
const autoRotateColors = ref(false)

// Demo state
let engineContext: EngineContext | null = null
let cubes: Actor[] = []
let colorRotationInterval: number | undefined = undefined
const rotatorTaskId = Symbol('rotatorTask')

// ==================== Demo Logic ====================

async function startDemo() {
  try {
    const canvas = container.value?.canvas
    if (!canvas) {
      throw new Error('Canvas not available')
    }

    statusText.value = 'Starting WebGPU...'

    // Initialize EngineContext
    engineContext = new EngineContext(canvas)
    await engineContext.initialize()

    statusText.value = 'Creating scene...'

    // Create scene and set it on the context
    const scene = new Scene("RotatingCubesScene")
    engineContext.setScene(scene)

    // Create cubes
    await createCubes()

    // Create camera
    createCamera(canvas)

    statusText.value = 'Starting render loop...'

    // Register a per-frame task to tick RotatingComponent on all cubes (Phase 0: no decorators)
    const processor = engineContext.get(WebGPUProcessor)
    processor?.addTask({
      id: rotatorTaskId,
      update: (deltaTime: number) => {
        // deltaTime is in seconds already from Processor convention
        for (const cube of cubes) {
          const rot = cube.getComponent(RotatingComponent)
          rot?.tick(deltaTime)
        }
      },
      context: null,
    })

    // Start rendering
    engineContext.start()

    // Start color rotation if enabled
    if (autoRotateColors.value) {
      startColorRotation()
    }

    isRunning.value = true
    statusText.value = 'Running'

    console.log('✅ Rotating cubes demo started successfully')

  } catch (error) {
    console.error('❌ Failed to start demo:', error)
    statusText.value = 'Failed to start'
    canStart.value = true
  }
}

function stopDemo() {
  if (engineContext) {
    const processor = engineContext.get(WebGPUProcessor)
    processor?.removeTask(rotatorTaskId)
    engineContext.stop()
  }

  if (colorRotationInterval) {
    clearInterval(colorRotationInterval)
    colorRotationInterval = undefined
  }

  isRunning.value = false
  statusText.value = 'Stopped'
}

function resetDemo() {
  stopDemo()

  // Clear scene
  const scene = engineContext?.getScene();
  if (scene) {
    scene.clear()
  }

  cubes = []
  engineContext = null

  statusText.value = 'Ready'
  canStart.value = true
}

/**
 * Create rotating cubes - SIMPLIFIED VERSION!
 */
async function createCubes() {
  const scene = engineContext?.getScene();
  if (!scene) return

  cubes = []

  const cubeMehsResourceInstance = new CubeMeshResource(1.0);

  for (let i = 0; i < cubeCount.value; i++) {
    // Create actor
    const cubeActor = new Actor(`Cube${i}`)

    // Add transform - arrange in 10x10x10 grid
    const transform = cubeActor.addComponent(TransformComponent)
    const gridSize = 10
    const spacing = 2.0

    // Calculate 3D grid position (max 10x10x10)
    const x = (i % gridSize) * spacing - (gridSize - 1) * spacing / 2
    const y = (Math.floor(i / gridSize) % gridSize) * spacing - (gridSize - 1) * spacing / 2
    const z = (Math.floor(i / (gridSize * gridSize))) * spacing - (gridSize - 1) * spacing / 2

    transform.setPosition(x, y, z)

    // Add resources (auto-load, auto-compile!)
    const resources = cubeActor.addComponent(ResourceComponent)
    resources.add(cubeMehsResourceInstance)
    resources.add(new BasicMaterialResource([
      Math.random(),
      Math.random(),
      Math.random(),
      1.0
    ]))

    // Add behavior and rendering
    cubeActor.addComponent(RotatingComponent)
    const cubeRotation = cubeActor.getComponent(RotatingComponent);
    if(cubeRotation) {
      cubeRotation.speed = rotationSpeed.value * (0.5 + Math.random())
    }
    cubeActor.addComponent(MeshRendererComponent)

    // Add to scene
    scene.addActor(cubeActor)
    cubes.push(cubeActor)
  }

  console.log(`Created ${cubes.length} cubes with simplified resource system`)
}

/**
 * Create camera
 */
function createCamera(canvas: HTMLCanvasElement) {
  const scene = engineContext?.getScene();
  if (!scene) return

  const camera = new Actor("Camera")

  const cameraTransform = camera.addComponent(TransformComponent)
  cameraTransform.setPosition(0, 3, 15)

  camera.addComponent(CameraComponent, {
    projectionType: ProjectionType.PERSPECTIVE,
    perspectiveConfig: {
      fov: Math.PI / 3,
      aspect: canvas.width / canvas.height,
      near: 0.1,
      far: 100.0
    },
    isActive: true
  })

  scene.addActor(camera)
}

/**
 * Recreate cubes when count changes
 */
async function recreateCubes() {
  const scene = engineContext?.getScene();
  if (!scene || !isRunning.value) return

  // Remove existing cubes
  cubes.forEach(cube => scene!.removeActor(cube))

  // Create new cubes
  await createCubes()
}

/**
 * Update rotation speed for all cubes
 */
function updateRotationSpeed() {
  cubes.forEach(cube => {
    const rotator = cube.getComponent(RotatingComponent)
    if (rotator) {
      rotator.speed = rotationSpeed.value * (0.5 + Math.random())
    }
  })
}

/**
 * Randomize cube colors
 */
function randomizeColors() {
  cubes.forEach(cube => {
    const resources = cube.getComponent(ResourceComponent)
    const material = resources?.get(BasicMaterialResource)
    if (material) {
      material.setUniform('color', [Math.random(), Math.random(), Math.random(), 1.0])
    }
  })
}

/**
 * Start automatic color rotation
 */
function startColorRotation() {
  if (colorRotationInterval) return

  //@ts-ignore
  colorRotationInterval = setInterval(() => {
    if (autoRotateColors.value && isRunning.value) {
      randomizeColors()
    }
  }, 2000)
}

// ==================== Lifecycle ====================

onMounted(async () => {
  try {
    // Check WebGPU support
    if (!navigator.gpu) {
      statusText.value = 'WebGPU not supported'
      return
    }

    statusText.value = 'Ready'
    canStart.value = true

  } catch (error) {
    console.error('❌ Failed to initialize:', error)
    statusText.value = 'Initialization failed'
  }
})

onUnmounted(() => {
  resetDemo()
})

// Watch auto-rotate colors
watch(autoRotateColors, (newValue) => {
  if (newValue && isRunning.value) {
    startColorRotation()
  } else if (colorRotationInterval) {
    clearInterval(colorRotationInterval)
    colorRotationInterval = undefined
  }
})
</script>

<style scoped>
.loading-section,
.stats-section,
.error-section,
.debug-section {
  margin-top: var(--space-4);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.progress-bar {
  width: 100%;
  height: 4px;
  background-color: var(--color-surface-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--color-accent);
  transition: width 0.3s ease;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2);
  background-color: var(--color-surface-secondary);
  border-radius: var(--border-radius-base);
}

.error-message {
  padding: var(--space-3);
  background-color: rgba(239, 68, 68, 0.1);
  border: var(--border-width) solid rgba(239, 68, 68, 0.3);
  border-radius: var(--border-radius-base);
  margin-bottom: var(--space-2);
}

.error-help {
  padding: var(--space-2);
  background-color: var(--color-surface-secondary);
  border-radius: var(--border-radius-base);
}

.debug-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  background-color: var(--color-surface-secondary);
  border-radius: var(--border-radius-base);
  font-family: var(--font-family-mono);
}

.mb-2 {
  margin-bottom: var(--space-2);
}
</style>
