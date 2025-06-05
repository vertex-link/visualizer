<template>
  <div :class="classes">
    <div v-if="title || $slots.header" class="card-header">
      <slot name="header">
        <BaseText v-if="title" variant="h4">{{ title }}</BaseText>
      </slot>
    </div>
    
    <div class="card-content">
      <slot />
    </div>
    
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseText from './BaseText.vue'

interface Props {
  title?: string
  variant?: 'default' | 'outlined' | 'elevated'
  interactive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  interactive: false
})

const classes = computed(() => [
  'card',
  `card-${props.variant}`,
  { 'card-interactive': props.interactive }
])
</script>

<style scoped>
.card {
  background-color: var(--color-surface-primary);
  border-radius: var(--border-radius-base);
  transition: all var(--transition-base);
}

.card-default {
  border: var(--border-width) solid var(--color-border);
}

.card-outlined {
  border: var(--border-width-thick) solid var(--color-border);
}

.card-elevated {
  border: var(--border-width) solid var(--color-border);
  box-shadow: var(--shadow-base);
}

.card-interactive {
  cursor: pointer;
}

.card-interactive:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
}

.card-elevated.card-interactive:hover {
  box-shadow: var(--shadow-lg);
}

.card-header {
  padding: var(--space-4) var(--space-6) var(--space-2);
  border-bottom: var(--border-width) solid var(--color-divider);
}

.card-content {
  padding: var(--space-6);
}

.card-footer {
  padding: var(--space-2) var(--space-6) var(--space-4);
  border-top: var(--border-width) solid var(--color-divider);
}

.card-header + .card-content {
  padding-top: var(--space-4);
}

.card-content + .card-footer {
  padding-top: var(--space-2);
}
</style>