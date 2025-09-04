import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { useFeatures } from "@/composables/features";

// Adjust the component import path as needed
import FeatureContainer from "@/components/showcase/FeatureContainer.vue";
import WelcomeComponent from "@/components/Welcome.vue";
import MarkdownRenderer from "@/components/MarkdownRenderer.vue";

function generateFeatureRoutes(): RouteRecordRaw[] {
  const { categories } = useFeatures();
  const routes: RouteRecordRaw[] = [];

  for (const category of categories.value) {
    for (const feature of category.features) {
      if (feature.type === 'example') {
        routes.push({
          path: feature.route,
          name: feature.id,
          // Use your main feature container component here
          component: FeatureContainer,
          meta: {
            title: feature.title,
            category: feature.category,
            featureId: feature.id,
            content: feature.content,
            entryUrl: feature.entryUrl,
          },
        });
      } else {
        routes.push({
          path: feature.route,
          name: feature.id,
          component: MarkdownRenderer,
          props: {
            content: feature.content,
          },
          meta: {
            title: feature.title,
          },
        });
      }
    }
  }

  return routes;
}

export function createDocumentationRouter() {
  const { categories } = useFeatures();

  // 1. Determine a safe and dynamic redirect path
  let defaultRedirectPath = '/welcome'; // Default to our new safe route
  if (categories.value.length > 0 && categories.value[0].features.length > 0) {
    // If features exist, redirect to the very first one
    defaultRedirectPath = categories.value[0].features[0].route;
  }

  const routes: RouteRecordRaw[] = [
    // 2. Add the static, safe welcome route
    {
      path: '/welcome',
      name: 'welcome',
      component: WelcomeComponent,
    },
    {
      path: "/",
      redirect: defaultRedirectPath, // 3. Use the dynamic redirect path
    },
    ...generateFeatureRoutes(),
    // 4. Point the catch-all to the safe path, NOT back to "/"
    {
      path: "/:pathMatch(.*)*",
      redirect: defaultRedirectPath,
    },
  ];

  const router = createRouter({
    history: createWebHistory(),
    routes,
  });

  router.beforeEach((to, from, next) => {
    const title = to.meta?.title as string;
    document.title = title ? `${title} | Vertex Link Features` : "Vertex Link Features";
    next();
  });

  return router;
}