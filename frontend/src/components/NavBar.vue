<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/exercises', label: 'Exercícios' },
  { to: '/workout-plans', label: 'Planos de Treino' },
  { to: '/workouts/log', label: 'Registar Treino' },
  { to: '/workouts/history', label: 'Histórico de Treinos' },
  { to: '/nutrition', label: 'Nutrição' },
  { to: '/recommendations', label: 'Recomendações' },
  { to: '/profile', label: 'Perfil' }
]
</script>

<template>
  <aside class="fixed top-0 left-0 h-full w-64 bg-gray-800 flex flex-col z-10">
    <div class="p-6 border-b border-gray-700">
      <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Bem-vindo</p>
      <p class="text-white font-semibold truncate">{{ authStore.user?.name ?? '—' }}</p>
    </div>

    <nav class="flex-1 py-4 overflow-y-auto">
      <RouterLink
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        class="flex items-center px-6 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
        active-class="bg-gray-700 text-white border-r-2 border-indigo-500"
      >
        {{ link.label }}
      </RouterLink>
    </nav>

    <div class="p-4 border-t border-gray-700">
      <button
        class="w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
        @click="handleLogout"
      >
        Sair
      </button>
    </div>
  </aside>
</template>
