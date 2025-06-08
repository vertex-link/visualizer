import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// Import views
import Home from '../views/Home.vue'
import Documentation from '../views/Documentation.vue'
import Components from '../views/Components.vue'
import Examples from '../views/Examples.vue'
import About from '../views/About.vue'

// Import example components
import RotatingCubesExample from '../examples/rotating-cubes/RotatingCubesExample.vue'
import ResourceExample from '../examples/resourecs/ResourceExample.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      title: 'Home'
    }
  },
  {
    path: '/documentation',
    name: 'Documentation',
    component: Documentation,
    meta: {
      title: 'Documentation'
    }
  },
  {
    path: '/components',
    name: 'Components',
    component: Components,
    meta: {
      title: 'Components'
    }
  },
  {
    path: '/examples',
    name: 'Examples',
    component: Examples,
    meta: {
      title: 'Examples'
    }
  },
  {
    path: '/examples/rotating-cubes',
    name: 'RotatingCubes',
    component: RotatingCubesExample,
    meta: {
      title: 'Rotating Cubes Demo',
      layout: 'fullscreen' // Custom layout for examples
    }
  },
  {
    path: '/examples/resources',
    name: 'RotatingCubes',
    component: ResourceExample,
    meta: {
      title: 'Rotating Cubes Demo',
      layout: 'fullscreen' // Custom layout for examples
    }
  },
  {
    path: '/about',
    name: 'About',
    component: About,
    meta: {
      title: 'About'
    }
  },
  // Catch-all route for 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
    meta: {
      title: 'Page Not Found'
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // Always scroll to top when navigating to a new route
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Global navigation guard to update document title
router.beforeEach((to, from, next) => {
  const title = to.meta?.title as string
  if (title) {
    document.title = `${title} | Vertex Link Documentation`
  }
  next()
})

export default router
