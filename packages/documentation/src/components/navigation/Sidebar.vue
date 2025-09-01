<template>
  <nav class="sidebar-nav">
    <div
      v-for="category in categories"
      :key="category.id"
      class="category-section"
    >
      <div class="category-header">
        <i :class="`pi ${category.icon}`"></i>
        <span class="category-title">{{ category.title }}</span>
      </div>
      
      <div class="feature-list">
        <router-link
          v-for="feature in category.features"
          :key="feature.id"
          :to="feature.route"
          class="feature-link"
          :class="{ active: currentFeature === feature.id }"
        >
          <span class="feature-title">{{ feature.title }}</span>
          <Tag 
            :value="feature.complexity" 
            :severity="getComplexitySeverity(feature.complexity)"
            class="complexity-tag"
          />
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import type { FeatureCategory } from "@/types/features";
import Tag from "primevue/tag";

interface Props {
  categories: FeatureCategory[];
  currentFeature?: string;
}

defineProps<Props>();

function getComplexitySeverity(complexity: string) {
  switch (complexity) {
    case "basic":
      return "success";
    case "intermediate":
      return "warning";
    case "advanced":
      return "danger";
    default:
      return "info";
  }
}
</script>

<style scoped>
.sidebar-nav {
  padding: 1rem 0;
  overflow-y: auto;
  flex: 1;
}

.category-section {
  margin-bottom: 2rem;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-primary-500);
}

.feature-list {
  display: flex;
  flex-direction: column;
}

.feature-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem 0.75rem 2rem;
  text-decoration: none;
  color: var(--p-primary-700);
  transition: all 0.15s ease;
  border-left: 3px solid transparent;
}

.feature-link:hover {
  background-color: var(--p-surface-100);
  color: var(--p-primary-800);
}

.feature-link.active {
  background-color: var(--p-accent-50);
  color: var(--p-accent-600);
  border-left-color: var(--p-accent-500);
  font-weight: 500;
}

.feature-title {
  font-size: 0.875rem;
}

.complexity-tag {
  font-size: 0.625rem;
}
</style>
