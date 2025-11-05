<template>
  <div class="feature-layout">
    <!-- Mobile Header Bar -->
    <header v-if="isMobile" class="mobile-header">
      <button
        class="mobile-menu-button"
        @click="toggleDrawer"
        aria-label="Toggle navigation menu"
      >
        <i class="pi pi-bars"></i>
      </button>
      <h1 class="mobile-title">
        <i class="pi pi-bolt"></i>
        <span>Vertex Link</span>
      </h1>
    </header>

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
      position="left"
      class="mobile-drawer"
      :dismissable="true"
      :showCloseIcon="true"
    >
      <template #header>
        <div class="drawer-header">
          <h2 class="drawer-title">
            <i class="pi pi-bolt"></i>
            <span>Vertex Link</span>
          </h2>
        </div>
      </template>
      <div class="drawer-menu-container">
        <Sidebar :categories="categories" @navigate="closeDrawer" />
      </div>
    </Drawer>

    <main class="main-content" :class="{ 'mobile-main': isMobile }">
      <router-view />
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
  flex-direction: column;
  height: 100vh;
  background-color: var(--p-surface-ground);
  color: var(--p-text-color);
  overflow: hidden;
}

/* Mobile Header Bar */
.mobile-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--p-surface-card);
  border-bottom: 1px solid var(--p-surface-border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  min-height: 3.5rem;
}

.mobile-menu-button {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border: none;
  border-radius: 0.375rem;
  background-color: transparent;
  color: var(--p-text-color);
  font-size: 1.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.mobile-menu-button:hover {
  background-color: var(--p-surface-hover);
}

.mobile-menu-button:active {
  background-color: var(--p-surface-100);
  transform: scale(0.95);
}

.mobile-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: var(--p-text-color);
}

.mobile-title .pi {
  color: var(--p-primary-color);
  font-size: 1.25rem;
}

/* Desktop Sidebar */
.sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--p-surface-border);
  background-color: var(--p-surface-card);
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

/* Mobile Drawer */
.drawer-header {
  width: 100%;
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--p-text-color);
}

.drawer-title .pi {
  color: var(--p-primary-color);
}

.drawer-menu-container {
  padding: 0.5rem;
  overflow-y: auto;
}

/* Drawer styling overrides */
:deep(.mobile-drawer) {
  width: 280px;
  max-width: 85vw;
}

:deep(.mobile-drawer .p-drawer-content) {
  display: flex;
  flex-direction: column;
  padding: 0;
  height: 100%;
}

:deep(.mobile-drawer .p-drawer-header) {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--p-surface-border);
  flex-shrink: 0;
}

/* PanelMenu touch-friendly adjustments */
:deep(.mobile-drawer .p-panelmenu-panel) {
  margin-bottom: 0.25rem;
}

:deep(.mobile-drawer .p-panelmenu-header-content) {
  padding: 0.875rem 1rem;
  min-height: 48px;
}

:deep(.mobile-drawer .p-panelmenu-item-content) {
  padding: 0.75rem 1rem;
  min-height: 44px;
}

/* Main Content */
.main-content {
  flex-grow: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.mobile-main {
  /* Mobile main content doesn't need extra padding since header handles it */
  display: flex;
  flex-direction: column;
}

/* Desktop Layout */
@media (min-width: 768px) {
  .feature-layout {
    flex-direction: row;
  }

  .main-content {
    height: 100vh;
  }
}

/* Smooth scrolling for better mobile experience */
@media (max-width: 767px) {
  .main-content {
    -webkit-overflow-scrolling: touch;
  }
}
</style>
