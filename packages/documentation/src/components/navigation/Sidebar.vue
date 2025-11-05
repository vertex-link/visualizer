<template>
  <PanelMenu :model="menuModel" />
</template>

<script setup lang="ts">
import type { MenuItem } from "primevue/menuitem";
import PanelMenu from "primevue/panelmenu";
import { computed } from "vue";
import { useRouter } from "vue-router";
import type { Category } from "@/types/features";

const props = defineProps<{
  categories: Category[];
}>();

const emit = defineEmits<{
  navigate: [];
}>();

// 1. FIX: Get the router instance to handle navigation programmatically.
const router = useRouter();

/**
 * Transforms the `categories` prop into the data structure
 * required by PrimeVue's PanelMenu component.
 */
const menuModel = computed<MenuItem[]>(() => {
  if (!props.categories) return [];

  return props.categories.map((category) => ({
    key: category.id,
    label: category.title,
    items: category.features.map((feature) => ({
      key: feature.id,
      label: feature.title,
      // 2. FIX: Add an explicit `command` to ensure navigation works reliably.
      // This is more robust than relying solely on the `route` property.
      command: () => {
        router.push(feature.route);
        // Emit navigate event for mobile drawer to close
        emit("navigate");
      },
    })),
  }));
});
</script>
