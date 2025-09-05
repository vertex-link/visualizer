import type { RouteRecordRaw } from "vue-router";
import { createRouter, createWebHistory } from "vue-router";
import MarkdownRenderer from "@/components/MarkdownRenderer.vue";

// Adjust the component import path as needed
import FeatureContainer from "@/components/showcase/FeatureContainer.vue";
import WelcomeComponent from "@/components/Welcome.vue";
import { useFeatures } from "@/composables/features";

function generateFeatureRoutes(): RouteRecordRaw[] {
  const { categories } = useFeatures();
  const routes: RouteRecordRaw[] = [];

  for (const category of categories.value) {
    for (const feature of category.features) {
      // Ensure unique route names by including category
      const routeName = `${category.id}-${feature.id}`;

      if (feature.type === "complex") {
        routes.push({
          path: feature.route,
          name: routeName,
          component: FeatureContainer,
          meta: {
            title: feature.title,
            category: feature.category,
            featureId: feature.id,
            content: feature.content,
            entryUrl: feature.entryUrl,
            description: feature.description,
            parameters: feature.parameters,
          },
        });
      } else {
        routes.push({
          path: feature.route,
          name: routeName,
          component: MarkdownRenderer,
          props: {
            content: feature.content,
          },
          meta: {
            title: feature.title,
            category: feature.category,
            featureId: feature.id,
          },
        });
      }
    }
  }

  return routes;
}

export function createDocumentationRouter() {
  const { categories } = useFeatures();

  // Always use /welcome as safe fallback
  const safeRedirectPath = "/welcome";

  // Try to find a valid first feature route
  let firstFeatureRoute = safeRedirectPath;
  if (categories.value.length > 0 && categories.value[0].features.length > 0) {
    firstFeatureRoute = categories.value[0].features[0].route;
  }

  const featureRoutes = generateFeatureRoutes();

  const routes: RouteRecordRaw[] = [
    // Safe welcome route
    {
      path: "/welcome",
      name: "welcome",
      component: WelcomeComponent,
      meta: {
        title: "Welcome",
      },
    },
    // Root redirect
    {
      path: "/",
      redirect: firstFeatureRoute,
    },
    // All feature routes
    ...featureRoutes,
    // Catch-all - only add if we have valid routes
    ...(featureRoutes.length > 0
      ? [
          {
            path: "/:pathMatch(.*)*",
            redirect: safeRedirectPath,
          },
        ]
      : []),
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

  // Add error handling
  router.onError((error) => {
    console.error("Router error:", error);
    router.push("/welcome");
  });

  return router;
}
