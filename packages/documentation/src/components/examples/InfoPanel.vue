<template>
  <div class="info-panel">
    <div class="panel-header">
      <i class="pi pi-info-circle" style="font-size: 1.1rem"></i>
      <h4>{{ title }}</h4>
    </div>

    <div class="panel-content">
      <slot />

      <div v-if="features.length > 0" class="features-section">
        <label class="section-label">FEATURES</label>
        <div class="feature-list">
          <div
            v-for="feature in features"
            :key="feature"
            class="feature-item"
          >
            <i class="pi pi-check-circle" style="font-size: 0.9rem; color: var(--color-success);"></i>
            <span class="feature-text">{{ feature }}</span>
          </div>
        </div>
      </div>

      <div v-if="technologies.length > 0" class="tech-section">
        <label class="section-label">TECHNOLOGIES</label>
        <div class="tech-tags">
          <span
            v-for="tech in technologies"
            :key="tech"
            class="tech-tag"
          >
            {{ tech }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  features?: string[]
  technologies?: string[]
}

withDefaults(defineProps<Props>(), {
  title: 'Example Information',
  features: () => [],
  technologies: () => []
})
</script>

<style scoped>
.info-panel {
  padding: var(--space-6);
  border-bottom: var(--border-width) solid var(--color-divider);
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

.features-section,
.tech-section {
  display: flex;
  flex-direction: column;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.feature-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.feature-item .material-icons {
  font-size: 16px;
  color: var(--color-success);
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tech-tag {
  padding: var(--space-1) var(--space-3);
  background-color: var(--color-surface-tertiary);
  border-radius: var(--border-radius-base);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.mb-2 {
  margin-bottom: var(--space-2);
}
</style>
