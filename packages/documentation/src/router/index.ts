import { discoverFeatures } from "@/utils/feature-discovery";
import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

// Auto-generate routes from discovered features
function generateFeatureRoutes(): RouteRecordRaw[] {
  const categories = discoverFeatures();
  const routes: RouteRecordRaw[] = [];

  for (const category of categories) {
    for (const feature of category.features) {
      routes.push({
        path: feature.route,
        name: feature.id,
        component: feature.component,
        meta: {
          title: feature.title,
          category: feature.category,
          featureId: feature.id,
        },
      });
    }
  }

  return routes;
}

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: "/features/examples/actor-system", // Default to first ACS feature
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
