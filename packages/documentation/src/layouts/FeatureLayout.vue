<template>
  <div class="feature-layout">
    <!-- Sidebar Navigation -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">
          <i class="pi pi-bolt"></i>
          Vertex Link
        </h2>
      </div>
      
      <Sidebar :categories="categories" :current-feature="currentFeatureId" />
    </aside>
    
    <!-- Main content area -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import Sidebar from "@/components/navigation/Sidebar.vue";
import { discoverFeatures } from "@/utils/feature-discovery";
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const categories = discoverFeatures();

const currentFeatureId = computed(() => route.meta?.featureId as string);
</script>

<style scoped>
.feature-layout {
  display: flex;
  height: 100vh;
  background-color: var(--p-surface-0);
}

.sidebar {
  width: 280px;
  background-color: var(--p-surface-50);
  border-right: var(--p-border-width) solid var(--p-surface-200);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 1.5rem 1rem 1rem;
  border-bottom: var(--p-border-width) solid var(--p-surface-200);
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--p-primary-800);
  margin: 0;
}

.main-content {
  flex: 1;
  overflow: hidden;
}
</style>
