<template>
  <button 
    :class="classes"
    :disabled="disabled"
    v-bind="$attrs"
  >
    <span v-if="icon" class="material-icons">{{ icon }}</span>
    <span v-if="$slots.default"><slot /></span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'accent'
  size?: 'sm' | 'base' | 'lg'
  icon?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'base'
})

const classes = computed(() => [
  'btn',
  `btn-${props.variant}`,
  `btn-${props.size}`
])
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-family-display);
  font-weight: var(--font-weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: var(--border-width-thick) solid transparent;
  border-radius: var(--border-radius-none);
  transition: all var(--transition-base);
  cursor: pointer;
  user-select: none;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-sm {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-xs);
}

.btn-base {
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-sm);
}

.btn-lg {
  padding: var(--space-4) var(--space-8);
  font-size: var(--font-size-base);
}

.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-text-inverse);
  border-color: var(--color-primary);
}

.btn-primary:hover {
  background-color: var(--color-accent);
  border-color: var(--color-accent);
}

.btn-secondary {
  background-color: transparent;
  color: var(--color-text-primary);
  border-color: var(--color-border);
}

.btn-secondary:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.btn-accent {
  background-color: var(--color-accent);
  color: var(--color-text-inverse);
  border-color: var(--color-accent);
}

.btn-accent:hover {
  background-color: var(--color-accent-bright);
  border-color: var(--color-accent-bright);
}

.material-icons {
  font-size: 1.2em;
}
</style>