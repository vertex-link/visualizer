<template>
  <component :is="tag" :class="classes">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'label' | 'mono'
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent'
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'body',
  color: 'primary',
  weight: 'normal'
})

const tag = computed(() => {
  switch (props.variant) {
    case 'h1': return 'h1'
    case 'h2': return 'h2'  
    case 'h3': return 'h3'
    case 'h4': return 'h4'
    case 'label': return 'label'
    case 'mono': return 'code'
    default: return 'p'
  }
})

const classes = computed(() => {
  const base = [`variant-${props.variant}`, `text-${props.color}`]
  
  if (props.weight !== 'normal') base.push(`font-${props.weight}`)
  if (props.size) base.push(`text-size-${props.size}`)
  
  return base
})
</script>

<style scoped>
.variant-h1 {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-black);
  line-height: var(--line-height-tight);
  letter-spacing: -0.01em;
  text-transform: uppercase;
}

.variant-h2 {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);  
  line-height: var(--line-height-tight);
}

.variant-h3 {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
}

.variant-h4 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
}

.variant-body {
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
}

.variant-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.variant-mono {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
}

.text-size-xs { font-size: var(--font-size-xs); }
.text-size-sm { font-size: var(--font-size-sm); }
.text-size-base { font-size: var(--font-size-base); }
.text-size-lg { font-size: var(--font-size-lg); }
.text-size-xl { font-size: var(--font-size-xl); }
</style>