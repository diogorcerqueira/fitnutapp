import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/login', component: () => import('../pages/LoginPage.vue'), meta: { public: true } },
  { path: '/register', component: () => import('../pages/RegisterPage.vue'), meta: { public: true } },
  { path: '/oauth-callback', component: () => import('../pages/OAuthCallbackPage.vue'), meta: { public: true } },
  { path: '/dashboard', component: () => import('../pages/DashboardPage.vue') },
  { path: '/profile', component: () => import('../pages/ProfilePage.vue') },
  { path: '/exercises', component: () => import('../pages/ExercisesPage.vue') },
  { path: '/workout-plans', component: () => import('../pages/WorkoutPlansPage.vue') },
  { path: '/workout-plans/:id', component: () => import('../pages/WorkoutPlanDetailPage.vue') },
  { path: '/workouts/log', component: () => import('../pages/WorkoutLogPage.vue') },
  { path: '/workouts/history', component: () => import('../pages/WorkoutHistoryPage.vue') },
  { path: '/nutrition', component: () => import('../pages/NutritionPage.vue') },
  { path: '/recommendations', component: () => import('../pages/RecommendationsPage.vue') },
  { path: '/admin', component: () => import('../pages/AdminPage.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const authStore = useAuthStore()
  const isPublic = to.meta.public === true

  if (!isPublic && !authStore.isAuthenticated) {
    return '/login'
  }

  if (isPublic && authStore.isAuthenticated) {
    return '/dashboard'
  }
})

export default router
