<template>
  <header class="header">
    <div class="container">
      <div class="header-content">
        <!-- Brand -->
        <router-link to="/" class="brand">
          <span class="material-icons">memory</span>
          <span class="brand-text">VERTEX LINK</span>
        </router-link>

        <!-- Navigation -->
        <nav class="nav">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ active: $route.path === item.path }"
          >
            {{ item.label }}
          </router-link>
        </nav>

        <!-- Status -->
        <div class="status status-active">
          ONLINE
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const navItems = [
  { path: '/', label: 'HOME' },
  { path: '/documentation', label: 'DOCS' },
  { path: '/components', label: 'API' },
  { path: '/examples', label: 'EXAMPLES' }
]
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: var(--z-dropdown);
  background-color: var(--color-surface-primary);
  border-bottom: var(--border-width) solid var(--color-border);
  backdrop-filter: blur(8px);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  gap: var(--space-8);
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-family-display);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-sm);
  letter-spacing: 0.1em;
  transition: color var(--transition-base);
}

.brand:hover {
  color: var(--color-accent);
}

.brand .material-icons {
  font-size: 18px;
  color: var(--color-accent);
}

.nav {
  display: flex;
  gap: var(--space-6);
}

@media (max-width: 640px) {
  .nav {
    display: none;
  }
}
</style>