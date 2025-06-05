<template>
  <div class="about">
    <div class="about-header">
      <BaseText variant="h1" class="mb-4">ABOUT VERTEX LINK</BaseText>
      <BaseText variant="body" color="secondary" class="mb-8">
        Learn more about the framework, its development, and technical specifications.
      </BaseText>
    </div>

    <!-- Overview -->
    <section class="about-section">
      <BaseText variant="h2" class="mb-4">OVERVIEW</BaseText>
      <BaseText variant="body" color="secondary" class="mb-6">
        Vertex Link is a modular and flexible TypeScript framework designed for game development 
        and interactive 3D applications. Built with modern web technologies and emphasizing 
        component-based architecture, it aims to become a powerful, open-source web engine.
      </BaseText>
      <BaseText variant="body" color="secondary">
        The framework leverages modern TypeScript features, including decorators, for an 
        intuitive and efficient developer experience while maintaining high performance 
        through WebGPU rendering.
      </BaseText>
    </section>

    <!-- Technical Info -->
    <section class="about-section">
      <BaseText variant="h2" class="mb-6">TECHNICAL SPECIFICATIONS</BaseText>
      <div class="grid grid-2 gap-6">
        <Card variant="outlined">
          <BaseText variant="h4" color="accent" class="mb-4">ARCHITECTURE</BaseText>
          <div class="spec-list">
            <div class="spec-item">
              <span class="spec-label">Framework</span>
              <span class="spec-value">Vue.js 3.x</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Language</span>
              <span class="spec-value">TypeScript</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Build System</span>
              <span class="spec-value">Vite</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Graphics API</span>
              <span class="spec-value">WebGPU</span>
            </div>
          </div>
        </Card>

        <Card variant="outlined">
          <BaseText variant="h4" color="accent" class="mb-4">CAPABILITIES</BaseText>
          <div class="spec-list">
            <div class="spec-item">
              <span class="spec-label">Rendering</span>
              <span class="spec-value">Real-time 3D</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Components</span>
              <span class="spec-value">Modular Design</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Events</span>
              <span class="spec-value">Type-safe EventBus</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Assets</span>
              <span class="spec-value">Resource Management</span>
            </div>
          </div>
        </Card>
      </div>
    </section>

    <!-- Status -->
    <section class="about-section">
      <BaseText variant="h2" class="mb-6">DEVELOPMENT STATUS</BaseText>
      <Card variant="elevated">
        <div class="status-grid">
          <div class="status-item">
            <BaseText variant="label" color="tertiary" class="mb-2">VERSION</BaseText>
            <BaseText variant="mono" color="primary">v0.1.0</BaseText>
          </div>
          <div class="status-item">
            <BaseText variant="label" color="tertiary" class="mb-2">STAGE</BaseText>
            <BaseText variant="mono" color="primary">ALPHA</BaseText>
          </div>
          <div class="status-item">
            <BaseText variant="label" color="tertiary" class="mb-2">STATUS</BaseText>
            <Status variant="active">ACTIVE DEVELOPMENT</Status>
          </div>
          <div class="status-item">
            <BaseText variant="label" color="tertiary" class="mb-2">LICENSE</BaseText>
            <BaseText variant="mono" color="primary">OPEN SOURCE</BaseText>
          </div>
        </div>
      </Card>
    </section>

    <!-- Packages -->
    <section class="about-section">
      <BaseText variant="h2" class="mb-6">PACKAGES</BaseText>
      <div class="packages-list">
        <div class="package-item">
          <span class="material-icons">package_2</span>
          <div class="package-info">
            <BaseText variant="h4" class="mb-1">@vertex-link/acs</BaseText>
            <BaseText variant="body" size="sm" color="secondary">
              Core Actor-Component-System architecture with event handling and service management.
            </BaseText>
          </div>
        </div>
        <div class="package-item">
          <span class="material-icons">package_2</span>
          <div class="package-info">
            <BaseText variant="h4" class="mb-1">@vertex-link/engine</BaseText>
            <BaseText variant="body" size="sm" color="secondary">
              WebGPU rendering engine with resource management and advanced graphics capabilities.
            </BaseText>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import BaseText from '../components/base/BaseText.vue'
import Card from '../components/base/Card.vue'
import Status from '../components/base/Status.vue'
</script>

<style scoped>
.about {
  max-width: var(--content-max-width);
}

.about-header {
  text-align: center;
  margin-bottom: var(--space-12);
}

.about-section {
  margin-bottom: var(--space-16);
}

.spec-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.spec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: var(--border-width) solid var(--color-divider);
}

.spec-item:last-child {
  border-bottom: none;
}

.spec-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: var(--font-weight-medium);
}

.spec-value {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-6);
}

.status-item {
  text-align: center;
}

.packages-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.package-item {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  padding: var(--space-4);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--border-radius-base);
  background-color: var(--color-surface-secondary);
}

.package-item .material-icons {
  font-size: 24px;
  color: var(--color-accent);
  margin-top: var(--space-1);
}

.package-info {
  flex: 1;
}

@media (max-width: 640px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
  
  .status-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>