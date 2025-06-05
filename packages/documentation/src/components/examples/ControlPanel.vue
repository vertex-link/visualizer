<template>
  <div class="control-panel">
    <div class="panel-header">
      <span class="material-icons">tune</span>
      <BaseText variant="h4">{{ title }}</BaseText>
    </div>

    <div class="panel-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseText from '../../components/base/BaseText.vue'

interface Props {
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Controls'
})
</script>

<style scoped>
.control-panel {
  padding: var(--space-6);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.panel-header .material-icons {
  color: var(--color-accent);
  font-size: 20px;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
