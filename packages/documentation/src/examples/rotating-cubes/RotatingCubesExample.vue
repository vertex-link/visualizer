<template>
  <ExampleContainer
    title="Rotating Cubes"
    :is-running="demoStatus.isRunning"
    :can-start="canStart"
    :status-text="statusText"
    @start="startDemo"
    @stop="stopDemo"
    @reset="resetDemo"
    ref="container"
  >
    <template #info>
      <InfoPanel
        title="WebGPU Rendering Demo"
        :features="features"
        :technologies="technologies"
      >
        <BaseText variant="body" size="sm" color="secondary">
          This demo showcases the WebGPU rendering pipeline with multiple rotating cube entities
          using the Actor-Component-System architecture. Each cube is an individual actor with
          transform, mesh renderer, and rotation components.
        </BaseText>

        <!-- Error Display -->
        <div v-if="demoStatus.error" class="error-section">
          <BaseText variant="label" color="tertiary" class="mb-2">ERROR</BaseText>
          <div class="error-message">
            <BaseText variant="mono" size="sm" color="secondary">{{ demoStatus.error }}</BaseText>
          </div>
          <div class="error-help">
            <BaseText variant="body" size="xs" color="tertiary">
              Make sure you're using a WebGPU-compatible browser (Chrome/Edge with WebGPU enabled).
            </BaseText>
          </div>
        </div>

        <!-- Loading Progress -->
        <div v-if="demoStatus.loadingProgress < 100 && demoStatus.loadingProgress > 0" class="loading-section">
          <BaseText variant="label" color="tertiary" class="mb-2">LOADING PROGRESS</BaseText>
          <div class="progress-info">
            <BaseText variant="body" size="sm">{{ demoStatus.currentStep || 'Loading...' }}</BaseText>
            <BaseText variant="mono" size="xs" color="tertiary">{{ demoStatus.loadingProgress }}%</BaseText>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: demoStatus.loadingProgress + '%' }"
            ></div>
          </div>
        </div>

        <!-- Performance Stats -->
        <div v-if="demoStatus.isRunning" class="stats-section">
          <BaseText variant="label" color="tertiary" class="mb-2">PERFORMANCE</BaseText>
          <div class="stats-grid">
            <div class="stat-item">
              <BaseText variant="mono" size="sm">{{ demoStatus.frameRate }} FPS</BaseText>
              <BaseText variant="body" size="xs" color="tertiary">Frame Rate</BaseText>
            </div>
            <div class="stat-item">
              <BaseText variant="mono" size="sm">{{ demoStatus.objectCount }}</BaseText>
              <BaseText variant="body" size="xs" color="tertiary">Objects</BaseText>
            </div>
          </div>
        </div>

        <!-- Debug Info -->
        <div v-if="showDebugInfo" class="debug-section">
          <BaseText variant="label" color="tertiary" class="mb-2">DEBUG INFO</BaseText>
          <div class="debug-info">
            <BaseText variant="mono" size="xs">Canvas: {{ canvasInfo }}</BaseText>
            <BaseText variant="mono" size="xs">WebGPU: {{ webgpuSupport }}</BaseText>
            <BaseText variant="mono" size="xs">Demo Instance: {{ !!demo }}</BaseText>
          </div>
        </div>
      </InfoPanel>
    </template>

    <template #controls>
      <ControlPanel>
        <ControlGroup
          type="slider"
          label="Rotation Speed"
          v-model="controls.rotationSpeed"
          :min="0"
          :max="2"
          :step="0.1"
          :precision="1"
          @update:model-value="updateRotationSpeed"
          :disabled="!demoStatus.isRunning"
        />

        <ControlGroup
          type="slider"
          label="Camera Distance"
          v-model="controls.cameraDistance"
          :min="4"
          :max="20"
          :step="0.5"
          :precision="1"
          @update:model-value="updateCameraDistance"
          :disabled="!demoStatus.isRunning"
        />

        <ControlGroup
          type="select"
          label="Cube Count"
          v-model="controls.cubeCount"
          :options="cubeCountOptions"
          @update:model-value="updateCubeCount"
          :disabled="demoStatus.isRunning"
        />

        <ControlGroup
          type="button"
          label="Actions"
          button-text="Reset Camera"
          button-icon="center_focus_strong"
          @action="resetCamera"
          :disabled="!demoStatus.isRunning"
        />

        <ControlGroup
          type="toggle"
          label="Debug Info"
          v-model="showDebugInfo"
        />
      </ControlPanel>
    </template>
  </ExampleContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import ExampleContainer from '../../components/examples/ExampleContainer.vue'
import InfoPanel from '../../components/examples/InfoPanel.vue'
import ControlPanel from '../../components/examples/ControlPanel.vue'
import ControlGroup from '../../components/examples/ControlGroup.vue'
import BaseText from '../../components/base/BaseText.vue'
import { RotatingCubesDemo, type DemoConfig, type DemoStatus } from './RotatingCubesDemo'

const container = ref<InstanceType<typeof ExampleContainer>>()
const demo = ref<RotatingCubesDemo>()
const showDebugInfo = ref(false)

const demoStatus = ref<DemoStatus>({
  isRunning: false,
  loadingProgress: 0,
  frameRate: 0,
  objectCount: 0,
  currentStep: 'Ready to start'
})

const controls = ref({
  rotationSpeed: 0.5,
  cameraDistance: 8,
  cubeCount: 3
})

const features = [
  'WebGPU Rendering Pipeline',
  'Actor-Component-System',
  'Real-time 3D Transforms',
  'Material System',
  'Performance Monitoring'
]

const technologies = [
  'WebGPU',
  'TypeScript',
  'WGSL Shaders',
  'Component Architecture'
]

const cubeCountOptions = [
  { value: 1, label: '1 Cube' },
  { value: 2, label: '2 Cubes' },
  { value: 3, label: '3 Cubes' },
  { value: 4, label: '4 Cubes' },
  { value: 5, label: '5 Cubes' },
  { value: 6, label: '6 Cubes' }
]

const canStart = computed(() => {
  // Allow starting if:
  // 1. No error AND not currently running AND
  // 2. Either not initialized yet (loadingProgress === 0) OR fully loaded (loadingProgress === 100)
  return !demoStatus.value.error &&
         !demoStatus.value.isRunning &&
         (demoStatus.value.loadingProgress === 0 || demoStatus.value.loadingProgress === 100)
})

const statusText = computed(() => {
  if (demoStatus.value.error) return 'Error'
  if (demoStatus.value.loadingProgress > 0 && demoStatus.value.loadingProgress < 100) {
    return demoStatus.value.currentStep || 'Loading...'
  }
  if (demoStatus.value.isRunning) return 'Running'
  return 'Ready'
})

const canvasInfo = computed(() => {
  if (!container.value?.canvas) return 'Not available'
  const canvas = container.value.canvas as HTMLCanvasElement
  return `${canvas.width}x${canvas.height}`
})

const webgpuSupport = computed(() => {
  return navigator.gpu ? 'Supported' : 'Not supported'
})

const updateDemoStatus = (status: DemoStatus) => {
  console.log('Status update received:', status)
  demoStatus.value = status
}

const startDemo = async () => {
  console.log('🚀 Starting demo...')

  if (!container.value?.canvas) {
    console.error('❌ No canvas available')
    demoStatus.value = {
      ...demoStatus.value,
      error: 'Canvas not available. Please refresh the page.'
    }
    return
  }

  // Check WebGPU support first
  if (!navigator.gpu) {
    demoStatus.value = {
      ...demoStatus.value,
      error: 'WebGPU not supported. Use Chrome/Edge with WebGPU enabled.'
    }
    return
  }

  try {
    // Wait for next tick to ensure canvas is properly mounted
    await nextTick()

    const canvas = container.value.canvas as HTMLCanvasElement
    console.log('📊 Canvas info:', {
      element: canvas,
      clientSize: `${canvas.clientWidth}x${canvas.clientHeight}`,
      actualSize: `${canvas.width}x${canvas.height}`,
      style: canvas.style.cssText
    })

    // Create demo instance if it doesn't exist
    if (!demo.value) {
      demo.value = new RotatingCubesDemo(canvas, {
        cubeCount: controls.value.cubeCount,
        rotationSpeed: controls.value.rotationSpeed,
        cameraDistance: controls.value.cameraDistance
      })

      console.log('✅ Demo instance created')

      // Set up status callback
      demo.value.onStatusUpdate(updateDemoStatus)
      console.log('✅ Status callback registered')

      // Initialize demo
      console.log('🔄 Initializing demo...')
      await demo.value.initialize()
    }

    console.log('🔄 Starting demo...')
    demo.value.start()

    console.log('✅ Demo started successfully!')

  } catch (error) {
    console.error('❌ Failed to start demo:', error)
    demoStatus.value = {
      ...demoStatus.value,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      isRunning: false,
      loadingProgress: 0
    }
  }
}

const stopDemo = () => {
  console.log('🛑 Stopping demo...')
  if (demo.value) {
    demo.value.stop()
    console.log('✅ Demo stopped')
  }
}

const resetDemo = async () => {
  console.log('🔄 Resetting demo...')

  if (demo.value) {
    demo.value.dispose()
    demo.value = undefined
    console.log('✅ Demo instance disposed')
  }

  demoStatus.value = {
    isRunning: false,
    loadingProgress: 0,
    frameRate: 0,
    objectCount: 0,
    currentStep: 'Ready to start'
  }

  // Reset controls to defaults
  controls.value = {
    rotationSpeed: 0.5,
    cameraDistance: 8,
    cubeCount: 3
  }

  console.log('✅ Demo reset complete')
}

const updateRotationSpeed = (value: number) => {
  if (demo.value) {
    demo.value.updateConfig({ rotationSpeed: value })
  }
}

const updateCameraDistance = (value: number) => {
  if (demo.value) {
    demo.value.updateConfig({ cameraDistance: value })
  }
}

const updateCubeCount = (value: number) => {
  // This requires recreating the demo
  controls.value.cubeCount = value
  if (demoStatus.value.isRunning) {
    // Auto-restart with new cube count
    stopDemo()
    setTimeout(() => startDemo(), 500)
  }
}

const resetCamera = () => {
  controls.value.cameraDistance = 8
  updateCameraDistance(8)
}

// Handle window resize
const handleResize = () => {
  if (demo.value) {
    demo.value.handleResize()
  }
}

onMounted(() => {
  console.log('🔧 Component mounted')
  window.addEventListener('resize', handleResize)

  // Check WebGPU support on mount
  if (!navigator.gpu) {
    demoStatus.value = {
      ...demoStatus.value,
      error: 'WebGPU not supported in this browser. Please use Chrome or Edge with WebGPU enabled.',
      currentStep: 'WebGPU not available'
    }
  }
})

onUnmounted(() => {
  console.log('🔧 Component unmounting')
  window.removeEventListener('resize', handleResize)
  if (demo.value) {
    demo.value.dispose()
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
