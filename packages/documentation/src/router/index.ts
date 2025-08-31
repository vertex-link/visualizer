import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// Minimal views
import Examples from '../views/Examples.vue'

// Import example components
import RotatingCubesExample from '../examples/rotating-cubes/RotatingCubesExample.vue'
import ResourceExample from '../examples/resourecs/ResourceExample.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/examples' },
  {
    path: '/examples',
    name: 'Examples',
    component: Examples,
    meta: { title: 'Examples' }
  },
  {
    path: '/examples/rotating-cubes',
    name: 'RotatingCubes',
    component: RotatingCubesExample,
    meta: { title: 'Rotating Cubes Demo' }
  },
  {
    path: '/examples/resources',
    name: 'Resources',
    component: ResourceExample,
    meta: { title: 'Resources' }
  },
  // Catch-all route for 404 -> redirect to examples to keep it minimal
  { path: '/:pathMatch(.*)*', redirect: '/examples' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
})

router.beforeEach((to, from, next) => {
  const title = to.meta?.title as string
  document.title = title ? `${title} | Vertex Link` : 'Vertex Link'
  next()
})

export default router
