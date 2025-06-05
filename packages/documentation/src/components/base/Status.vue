<template>
  <div :class="classes">
    <span class="status-dot"></span>
    <span class="status-text">
      <slot />
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'active' | 'warning' | 'error' | 'inactive'
  size?: 'sm' | 'base'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'active',
  size: 'base'
})

const classes = computed(() => [
  'status',
  `status-${props.variant}`,
  `status-${props.size}`
])
</script>

<style scoped>
.status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-family-mono);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
  flex-shrink: 0;
}

.status-sm {
  font-size: var(--font-size-xs);
}

.status-sm .status-dot {
  width: 4px;
  height: 4px;
}

.status-base {
  font-size: var(--font-size-xs);
}

.status-active {
  color: var(--color-success);
}

.status-warning {
  color: var(--color-warning);
}

.status-error {
  color: var(--color-error);
}

.status-inactive {
  color: var(--color-text-tertiary);
}
</style>