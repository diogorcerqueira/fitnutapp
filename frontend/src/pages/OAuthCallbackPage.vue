<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const error = ref('')

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const accessToken = params.get('accessToken')
  const refreshToken = params.get('refreshToken')
  const userId = params.get('userId')
  const name = params.get('name')
  const email = params.get('email')

  if (!accessToken || !refreshToken || !userId || !name || !email) {
    error.value = 'Autenticação Google falhou. Tenta novamente.'
    return
  }

  authStore.setSession(accessToken, refreshToken, { id: userId, name, email })
  router.replace('/dashboard')
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900">
    <div class="text-center">
      <div v-if="!error" class="text-white">
        <div class="text-lg mb-2">A autenticar...</div>
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
      </div>
      <div v-else class="text-red-400">{{ error }}</div>
    </div>
  </div>
</template>
