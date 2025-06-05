<template>
  <div class="layout" :class="{ 'layout-fullscreen': isFullscreen }">
    <AppHeader v-if="!isFullscreen" />

    <!-- Fullscreen example header -->
    <div v-if="isFullscreen" class="example-header">
      <div class="container">
        <div class="example-nav">
          <Button
            variant="secondary"
            icon="arrow_back"
            @click="$router.back()"
          >
            Back to Examples
          </Button>
          <BaseText variant="h3">{{ currentPageTitle }}</BaseText>
        </div>
      </div>
    </div>

    <main class="main" :class="{ 'main-fullscreen': isFullscreen }">
      <div v-if="!isFullscreen" class="container">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>

      <!-- Fullscreen content (no container) -->
      <router-view
        v-if="isFullscreen"
        v-slot="{ Component }"
      >
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <AppFooter v-if="!isFullscreen" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './AppHeader.vue'
import AppFooter from './AppFooter.vue'
import Button from '../base/Button.vue'
import BaseText from '../base/BaseText.vue'

const route = useRoute()

const isFullscreen = computed(() => {
  return route.meta?.layout === 'fullscreen'
})

const currentPageTitle = computed(() => {
  return route.meta?.title as string || 'Example'
})
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-fullscreen {
  height: 100vh;
  overflow: hidden;
}

.example-header {
  background-color: var(--color-surface-primary);
  border-bottom: var(--border-width) solid var(--color-border);
  padding: var(--space-4) 0;
  z-index: var(--z-header);
}

.example-nav {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.main {
  flex: 1;
  padding: var(--space-8) 0;
}

.main-fullscreen {
  padding: 0;
  flex: 1;
  overflow: hidden;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-base);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .main {
    padding: var(--space-4) 0;
  }

  .example-nav {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
}
</style>
