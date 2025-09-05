<template>
  <div class="feature-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">
          <i class="pi pi-bolt"></i>
          <span>Vertex Link</span>
        </h2>
      </div>
      <div class="sidebar-menu-container">
        <Sidebar :categories="categories" />
      </div>
    </aside>

    <main class="main-content">
      <div class="documentation-container">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import Sidebar from "@/components/navigation/Sidebar.vue";
import { useFeatures } from "@/composables/features";

// Script is simplified as the 'currentFeatureId' prop is no longer needed.
const { categories } = useFeatures();
</script>

<style scoped>
.feature-layout {
  display: flex;
  height: 100vh;
  /* Use theme variables for background and text color */
  background-color: var(--p-surface-ground);
  color: var(--p-text-color);
}

.sidebar {
  width: 280px;
  flex-shrink: 0; /* Prevent sidebar from shrinking on smaller screens */
  display: flex;
  flex-direction: column;
  /* Use theme variables for sidebar background and border */
}

.sidebar-header {
  padding: 1.25rem 1.5rem;
}

.sidebar-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.sidebar-title .pi {
  /* Use theme variable for the icon color */
  color: var(--p-primary-color);
}

.sidebar-menu-container {
  flex-grow: 1; /* Allow this container to fill the remaining vertical space */
  overflow-y: auto;
  padding: 0.75rem; /* Add some breathing room around the PanelMenu */
}

.main-content {
  flex-grow: 1; /* Allow main content to expand and fill the space */
  overflow-y: auto; /* Enable scrolling only for the main content area */
}
</style>
