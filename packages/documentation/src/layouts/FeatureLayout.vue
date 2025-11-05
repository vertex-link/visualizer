<template>
  <div class="feature-layout">
    <!-- Mobile Hamburger Menu Button -->
    <button
      v-if="isMobile"
      class="mobile-menu-button"
      @click="toggleDrawer"
      aria-label="Toggle navigation menu"
    >
      <i class="pi pi-bars"></i>
    </button>

    <!-- Desktop Sidebar -->
    <aside v-if="!isMobile" class="sidebar">
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

    <!-- Mobile Drawer -->
    <Drawer
      v-model:visible="drawerVisible"
      :header="null"
      position="left"
      class="mobile-drawer"
    >
      <div class="sidebar-header">
        <h2 class="sidebar-title">
          <i class="pi pi-bolt"></i>
          <span>Vertex Link</span>
        </h2>
      </div>
      <div class="sidebar-menu-container">
        <Sidebar :categories="categories" @navigate="closeDrawer" />
      </div>
    </Drawer>

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
import Drawer from "primevue/drawer";
import { ref, onMounted, onUnmounted } from "vue";

const { categories } = useFeatures();

// Mobile detection with 768px breakpoint
const MOBILE_BREAKPOINT = 768;
const isMobile = ref(false);
const drawerVisible = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT;
  // Close drawer if switching to desktop
  if (!isMobile.value) {
    drawerVisible.value = false;
  }
};

const toggleDrawer = () => {
  drawerVisible.value = !drawerVisible.value;
};

const closeDrawer = () => {
  drawerVisible.value = false;
};

onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});
</script>

<style scoped>
.feature-layout {
  display: flex;
  height: 100vh;
  position: relative;
  /* Use theme variables for background and text color */
  background-color: var(--p-surface-ground);
  color: var(--p-text-color);
}

/* Mobile Hamburger Button */
.mobile-menu-button {
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 1000;
  width: 3rem;
  height: 3rem;
  border: none;
  border-radius: 0.5rem;
  background-color: var(--p-primary-color);
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.mobile-menu-button:hover {
  background-color: var(--p-primary-600);
  transform: scale(1.05);
}

.mobile-menu-button:active {
  transform: scale(0.95);
}

/* Desktop Sidebar */
.sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--p-surface-border);
}

.sidebar-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--p-surface-border);
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
  color: var(--p-primary-color);
}

.sidebar-menu-container {
  flex-grow: 1;
  overflow-y: auto;
  padding: 0.75rem;
}

/* Mobile Drawer Styling */
:deep(.mobile-drawer .p-drawer-content) {
  display: flex;
  flex-direction: column;
  padding: 0;
}

:deep(.mobile-drawer .sidebar-header) {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--p-surface-border);
}

:deep(.mobile-drawer .sidebar-menu-container) {
  flex-grow: 1;
  overflow-y: auto;
  padding: 0.75rem;
}

/* Main Content */
.main-content {
  flex-grow: 1;
  overflow-y: auto;
}

/* Mobile Responsive Adjustments */
@media (max-width: 767px) {
  .main-content {
    padding-top: 1rem;
  }

  /* Add padding to avoid hamburger button overlap */
  .documentation-container {
    padding: 1rem;
  }
}

/* Tablet and Desktop */
@media (min-width: 768px) {
  .main-content {
    padding: 0;
  }
}
</style>
