<template>
  <div class="control-panel">
    <div class="panel-header">
      <i class="pi pi-sliders-h" style="font-size: 1.1rem"></i>
      <h4>{{ title }}</h4>
    </div>

    <div class="panel-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
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

.panel-header i {
  color: var(--color-accent);
  font-size: 20px;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
