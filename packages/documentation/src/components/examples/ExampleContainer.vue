<!-- packages/documentation/src/examples/components/ExampleContainer.vue -->
<template>
  <div class="example-container">
    <div class="example-header">
      <div class="example-title">
        <BaseText variant="h2">{{ title }}</BaseText>
        <Status :variant="status" size="sm">{{ statusText }}</Status>
      </div>
      <div class="example-actions">
        <Button
          v-if="!isRunning"
          variant="primary"
          icon="play_arrow"
          @click="$emit('start')"
          :disabled="!canStart"
        >
          {{ statusText === 'Loading...' ? 'Initializing...' : 'Start Demo' }}
        </Button>
        <Button
          v-else
          variant="secondary"
          icon="stop"
          @click="$emit('stop')"
        >
          Stop Demo
        </Button>
        <Button
          variant="secondary"
          icon="refresh"
          @click="$emit('reset')"
          :disabled="isRunning"
        >
          Reset
        </Button>
      </div>
    </div>

    <div class="example-content">
      <div class="canvas-container">
        <canvas
          ref="canvas"
          class="example-canvas"
          :width="canvasSize.width"
          :height="canvasSize.height"
        />
        <div v-if="!isRunning" class="canvas-overlay">
          <div class="overlay-content">
            <span class="material-icons">play_circle</span>
            <BaseText variant="h4" color="secondary">
              {{ canStart ? 'Click Start to Begin' : (statusText || 'Loading...') }}
            </BaseText>
          </div>
        </div>
      </div>

      <div class="example-sidebar">
        <slot name="info" />
        <slot name="controls" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import BaseText from '../../components/base/BaseText.vue'
import Button from '../../components/base/Button.vue'
import Status from '../../components/base/Status.vue'

interface Props {
  title: string
  isRunning?: boolean
  canStart?: boolean
  statusText?: string
}

const props = withDefaults(defineProps<Props>(), {
  isRunning: false,
  canStart: true,
  statusText: 'Ready'
})

const emit = defineEmits<{
  start: []
  stop: []
  reset: []
}>()

const canvas = ref<HTMLCanvasElement>()
const canvasSize = ref({ width: 800, height: 600 })

const status = computed(() => {
  if (!props.canStart) return 'error'
  if (props.isRunning) return 'active'
  return 'inactive'
})

const updateCanvasSize = () => {
  const container = canvas.value?.parentElement
  if (container) {
    const { width, height } = container.getBoundingClientRect()
    canvasSize.value = {
      width: Math.floor(width),
      height: Math.floor(height * 0.8) // Leave some space for UI
    }
  }
}

onMounted(() => {
  updateCanvasSize()
  window.addEventListener('resize', updateCanvasSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasSize)
})

defineExpose({
  canvas
})
</script>

<style scoped>
.example-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 80vh;
}

.example-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-6);
  border-bottom: var(--border-width) solid var(--color-border);
  background-color: var(--color-surface-secondary);
}

.example-title {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.example-actions {
  display: flex;
  gap: var(--space-3);
}

.example-content {
  display: flex;
  flex: 1;
  min-height: 0;
}

.canvas-container {
  position: relative;
  flex: 1;
  background-color: var(--color-surface-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.example-canvas {
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--border-radius-base);
  background-color: #1a1a1a;
}

.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--border-radius-base);
}

.overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  text-align: center;
}

.overlay-content .material-icons {
  font-size: 48px;
  color: var(--color-accent);
}

.example-sidebar {
  width: 320px;
  background-color: var(--color-surface-primary);
  border-left: var(--border-width) solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .example-content {
    flex-direction: column;
  }

  .example-sidebar {
    width: 100%;
    min-height: 200px;
    border-left: none;
    border-top: var(--border-width) solid var(--color-border);
  }
}

@media (max-width: 640px) {
  .example-header {
    flex-direction: column;
    gap: var(--space-4);
    align-items: stretch;
  }

  .example-actions {
    justify-content: center;
  }
}
</style>
