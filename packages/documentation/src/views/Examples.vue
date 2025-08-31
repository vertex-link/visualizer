<template>
  <div class="examples">
    <div class="examples-header">
      <h1 class="mb-4">Examples</h1>
      <p class="mb-8">Minimal set of demos. Pick one to open.</p>
    </div>

    <div class="examples-grid">
      <!-- Rotating Cubes Demo -->
      <Card class="example-card">
        <template #title>Rotating Cubes</template>
        <template #subtitle>
          <Tag value="WebGPU" severity="success" />
        </template>
        <p>
          Demonstrates the WebGPU rendering pipeline with rotating cube entities
          using the Actor-Component-System architecture.
        </p>
        <template #footer>
          <div class="example-actions">
            <router-link to="/examples/rotating-cubes">
              <Button label="Launch Demo" icon="pi pi-play" />
            </router-link>
          </div>
        </template>
      </Card>

      <!-- Resource Handling Demo -->
      <Card class="example-card">
        <template #title>Resource Handling</template>
        <template #subtitle>
          <Tag value="zig/wasm" severity="info" />
        </template>
        <p>
          Demonstrates how resource handling works and what they can do.
        </p>
        <template #footer>
          <div class="example-actions">
            <router-link to="/examples/resources">
              <Button label="Launch Demo" icon="pi pi-play" />
            </router-link>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
</script>

<style scoped>
.examples {
  max-width: 1100px;
  margin: 0 auto;
}

.examples-header {
  text-align: center;
  margin-bottom: 2rem;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
}

.example-card {
  height: fit-content;
}

.example-actions {
  display: flex;
  gap: 0.5rem;
}

.example-actions a {
  text-decoration: none;
}
</style>
