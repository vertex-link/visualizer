<template>
  <div class="components">
    <div class="api-header">
      <BaseText variant="h1" class="mb-4">API REFERENCE</BaseText>
      <BaseText variant="body" color="secondary" class="mb-8">
        Core classes and components from @vertex-link/acs and @vertex-link/engine packages.
      </BaseText>
    </div>

    <!-- ACS Package -->
    <section class="api-section">
      <BaseText variant="h2" class="mb-6">@VERTEX-LINK/ACS</BaseText>
      <div class="grid grid-2 gap-6">
        <Card variant="outlined">
          <BaseText variant="h4" color="accent" class="mb-2">Scene</BaseText>
          <BaseText variant="body" size="sm" color="secondary" class="mb-4">
            Manages collections of Actors and provides querying capabilities.
          </BaseText>
          <div class="api-methods">
            <code>addActor(actor: Actor)</code>
            <code>removeActor(id: string)</code>
            <code>query&lt;T&gt;(component: ComponentType&lt;T&gt;)</code>
          </div>
        </Card>

        <Card variant="outlined">
          <BaseText variant="h4" color="accent" class="mb-2">Actor</BaseText>
          <BaseText variant="body" size="sm" color="secondary" class="mb-4">
            Entity container that holds Components and provides component management.
          </BaseText>
          <div class="api-methods">
            <code>addComponent&lt;T&gt;(type: ComponentType&lt;T&gt;)</code>
            <code>getComponent&lt;T&gt;(type: ComponentType&lt;T&gt;)</code>
            <code>removeComponent&lt;T&gt;(type: ComponentType&lt;T&gt;)</code>
          </div>
        </Card>

        <Card variant="outlined">
          <BaseText variant="h4" color="accent" class="mb-2">Component</BaseText>
          <BaseText variant="body" size="sm" color="secondary" class="mb-4">
            Base class for all components. Encapsulates data and behavior.
          </BaseText>
          <div class="api-methods">
            <code>@Update() update(deltaTime: number)</code>
            <code>@OnEvent(EventType) handler(event: Event)</code>
          </div>
        </Card>

        <Card variant="outlined">
          <BaseText variant="h4" color="accent" class="mb-2">EventBus</BaseText>
          <BaseText variant="body" size="sm" color="secondary" class="mb-4">
            Type-safe event system for decoupled component communication.
          </BaseText>
          <div class="api-methods">
            <code>emit&lt;T&gt;(event: T)</code>
            <code>subscribe&lt;T&gt;(type: EventType&lt;T&gt;, handler: Function)</code>
          </div>
        </Card>
      </div>
    </section>

    <!-- Engine Package -->
    <section class="api-section">
      <BaseText variant="h2" class="mb-6">@VERTEX-LINK/ENGINE</BaseText>
      <div class="grid grid-2 gap-6">
        <Card variant="outlined">
          <BaseText variant="h4" color="accent" class="mb-2">WebGPUProcessor</BaseText>
          <BaseText variant="body" size="sm" color="secondary" class="mb-4">
            Manages WebGPU rendering pipeline and update loops.
          </BaseText>
          <div class="api-methods">
            <code>start(): Promise&lt;void&gt;</code>
            <code>stop(): void</code>
            <code>render(scene: Scene): void</code>
          </div>
        </Card>

        <Card variant="outlined">
          <BaseText variant="h4" color="accent" class="mb-2">ResourceManager</BaseText>
          <BaseText variant="body" size="sm" color="secondary" class="mb-4">
            Handles loading, compilation, and management of assets.
          </BaseText>
          <div class="api-methods">
            <code>load&lt;T&gt;(path: string): Promise&lt;T&gt;</code>
            <code>create&lt;T&gt;(type: ResourceType&lt;T&gt;): T</code>
            <code>compile(resource: Resource): Promise&lt;void&gt;</code>
          </div>
        </Card>

        <Card variant="outlined">
          <BaseText variant="h4" color="accent" class="mb-2">MeshRendererComponent</BaseText>
          <BaseText variant="body" size="sm" color="secondary" class="mb-4">
            Renders mesh geometry with materials using the WebGPU pipeline.
          </BaseText>
          <div class="api-methods">
            <code>setMesh(mesh: MeshResource)</code>
            <code>setMaterial(material: MaterialResource)</code>
          </div>
        </Card>

        <Card variant="outlined">
          <BaseText variant="h4" color="accent" class="mb-2">TransformComponent</BaseText>
          <BaseText variant="body" size="sm" color="secondary" class="mb-4">
            Manages 3D position, rotation, and scale transformations.
          </BaseText>
          <div class="api-methods">
            <code>setPosition(x: number, y: number, z: number)</code>
            <code>rotate(x: number, y: number, z: number)</code>
            <code>getMatrix(): Matrix4</code>
          </div>
        </Card>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import BaseText from '../components/base/BaseText.vue'
import Card from '../components/base/Card.vue'
</script>

<style scoped>
.components {
  max-width: var(--container-max-width);
}

.api-header {
  text-align: center;
  margin-bottom: var(--space-12);
}

.api-section {
  margin-bottom: var(--space-16);
}

.api-methods {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.api-methods code {
  padding: var(--space-2);
  background-color: var(--color-surface-tertiary);
  border-radius: var(--border-radius-sm);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
  border: var(--border-width) solid var(--color-border);
}
</style>