<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await authStore.register(name.value, email.value, password.value)
    router.push('/login')
  } catch (e: unknown) {
    error.value = extrairMensagemErro(e) || 'Erro ao criar conta. Tenta novamente.'
  } finally {
    loading.value = false
  }
}

function extrairMensagemErro(e: unknown): string {
  if (e && typeof e === 'object' && 'response' in e) {
    const res = (e as { response?: { data?: { message?: string } } }).response
    return res?.data?.message ?? ''
  }
  return ''
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900">
    <div class="bg-gray-800 rounded-xl p-8 w-full max-w-md shadow-xl">
      <h1 class="text-2xl font-bold text-white mb-6">Criar Conta</h1>

      <form @submit.prevent="handleSubmit" novalidate>
        <div class="mb-4">
          <label class="block text-sm text-gray-400 mb-1" for="name">Nome</label>
          <input
            id="name"
            v-model="name"
            type="text"
            required
            autocomplete="name"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            placeholder="O teu nome"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm text-gray-400 mb-1" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            placeholder="email@exemplo.pt"
          />
        </div>

        <div class="mb-6">
          <label class="block text-sm text-gray-400 mb-1" for="password">Palavra-passe</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            autocomplete="new-password"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            placeholder="••••••••"
          />
        </div>

        <div v-if="error" class="mb-4 text-red-400 text-sm">{{ error }}</div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
        >
          {{ loading ? 'A criar conta...' : 'Criar Conta' }}
        </button>
      </form>

      <p class="mt-4 text-sm text-gray-400 text-center">
        Já tens conta?
        <RouterLink to="/login" class="text-indigo-400 hover:text-indigo-300">Entrar</RouterLink>
      </p>
    </div>
  </div>
</template>
