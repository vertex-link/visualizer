<template>
  <button
    class="theme-toggle"
    @click="toggleTheme"
    :aria-label="`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`"
    :title="`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`"
  >
    <i v-if="currentTheme === 'light'" class="pi pi-moon"></i>
    <i v-else class="pi pi-sun"></i>
  </button>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme';

const { currentTheme, toggleTheme } = useTheme();
</script>

<style scoped>
.theme-toggle {
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

.theme-toggle:hover {
  background-color: var(--p-surface-hover);
}

.theme-toggle:active {
  background-color: var(--p-surface-100);
  transform: scale(0.95);
}

.theme-toggle i {
  transition: transform 0.3s ease;
}

.theme-toggle:hover i {
  transform: rotate(15deg);
}
</style>
