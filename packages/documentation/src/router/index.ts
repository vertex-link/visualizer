import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { useFeatures } from "@/composables/features";
import MarkdownRenderer from "@/components/MarkdownRenderer.vue";

function generateFeatureRoutes(): RouteRecordRaw[] {
  const { categories } = useFeatures();
  const routes: RouteRecordRaw[] = [];

  for (const category of categories.value) {
    for (const feature of category.features) {
      routes.push({
        path: feature.route,
        name: feature.id,
        component: MarkdownRenderer,
        meta: {
          title: feature.title,
          category: feature.category,
          featureId: feature.id,
          content: feature.content,
        },
      });
    }
  }

  return routes;
}

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/features/examples/actor-system-demo", // Default to first ACS feature
  },
  ...generateFeatureRoutes(),
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Update document title
router.beforeEach((to, from, next) => {
  const title = to.meta?.title as string;
  document.title = title ? `${title} | Vertex Link Features` : "Vertex Link Features";
  next();
});

export default router;
