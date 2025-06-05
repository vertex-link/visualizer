<template>
  <div class="examples">
    <div class="examples-header">
      <BaseText variant="h1" class="mb-4">EXAMPLES</BaseText>
      <BaseText variant="body" color="secondary" class="mb-8">
        Interactive demonstrations of Vertex Link's capabilities and features.
      </BaseText>
    </div>

    <div class="examples-grid">
      <!-- Rotating Cubes Demo -->
      <Card variant="elevated" interactive class="example-card">
        <template #header>
          <div class="example-header">
            <div class="example-icon">
              <span class="material-icons">3d_rotation</span>
            </div>
            <div>
              <BaseText variant="h3">ROTATING CUBES</BaseText>
              <Status variant="active" size="sm">WEBGPU</Status>
            </div>
          </div>
        </template>
        
        <BaseText variant="body" size="sm" color="secondary" class="mb-4">
          Demonstrates the WebGPU rendering pipeline with rotating cube entities 
          using the Actor-Component-System architecture.
        </BaseText>
        
        <div class="example-features">
          <BaseText variant="label" color="tertiary" class="mb-2">FEATURES</BaseText>
          <div class="feature-tags">
            <span class="tag">WebGPU Rendering</span>
            <span class="tag">Component System</span>
            <span class="tag">3D Transforms</span>
            <span class="tag">Real-time Updates</span>
          </div>
        </div>
        
        <template #footer>
          <div class="example-actions">
            <Button variant="primary" icon="play_arrow">
              Launch Demo
            </Button>
            <Button variant="secondary" icon="code">
              View Source
            </Button>
          </div>
        </template>
      </Card>

      <!-- Placeholder for Future Examples -->
      <Card variant="outlined" class="example-card placeholder">
        <div class="placeholder-content">
          <span class="material-icons placeholder-icon">upcoming</span>
          <BaseText variant="h4" color="tertiary" class="mb-2">MORE EXAMPLES</BaseText>
          <BaseText variant="body" size="sm" color="tertiary">
            Additional demos and tutorials coming soon.
          </BaseText>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseText from '../components/base/BaseText.vue'
import Button from '../components/base/Button.vue'
import Card from '../components/base/Card.vue'
import Status from '../components/base/Status.vue'
</script>

<style scoped>
.examples {
  max-width: var(--container-max-width);
}

.examples-header {
  text-align: center;
  margin-bottom: var(--space-12);
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--space-8);
}

.example-card {
  height: fit-content;
}

.example-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.example-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-accent-light);
  border-radius: var(--border-radius-base);
}

.example-icon .material-icons {
  font-size: 24px;
  color: var(--color-accent);
}

.example-features {
  margin-top: var(--space-4);
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tag {
  padding: var(--space-1) var(--space-3);
  background-color: var(--color-surface-tertiary);
  border-radius: var(--border-radius-base);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}

.example-actions {
  display: flex;
  gap: var(--space-3);
}

.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.placeholder-content {
  text-align: center;
}

.placeholder-icon {
  font-size: 48px;
  color: var(--color-text-tertiary);
  margin-bottom: var(--space-4);
}

@media (max-width: 640px) {
  .examples-grid {
    grid-template-columns: 1fr;
  }
  
  .example-actions {
    flex-direction: column;
  }
}
</style>