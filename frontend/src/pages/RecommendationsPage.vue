<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { getRecommendations, type Recommendation, type FocusArea } from '../api/ai'

const authStore = useAuthStore()
const recommendations = ref<Recommendation[]>([])
const loading = ref(true)
const error = ref('')

const FOCUS_LABELS: Record<FocusArea, string> = {
  nutrition: 'Nutrição',
  workout: 'Treino',
  recovery: 'Recuperação'
}

const FOCUS_CLASSES: Record<FocusArea, string> = {
  nutrition: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  workout: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  recovery: 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
}

onMounted(async () => {
  if (!authStore.user?.id) {
    error.value = 'Utilizador não autenticado.'
    loading.value = false
    return
  }
  try {
    const res = await getRecommendations(authStore.user.id)
    recommendations.value = res.data.recommendations
  } catch {
    error.value = 'Erro ao carregar recomendações.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-white mb-6">Recomendações de IA</h1>

    <div v-if="loading" class="text-gray-400">A carregar...</div>
    <div v-else-if="error" class="text-red-400">{{ error }}</div>
    <div v-else-if="recommendations.length === 0" class="text-gray-500">Nenhuma recomendação disponível.</div>

    <div v-else class="space-y-4">
      <div
        v-for="rec in recommendations"
        :key="rec.id"
        class="bg-gray-800 rounded-xl p-5"
      >
        <div class="flex items-center gap-3 mb-3">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            :class="FOCUS_CLASSES[rec.focus_area]"
          >
            {{ FOCUS_LABELS[rec.focus_area] }}
          </span>
          <span class="text-xs text-gray-500">{{ formatDate(rec.created_at) }}</span>
        </div>
        <p class="text-gray-300 text-sm leading-relaxed">{{ rec.recommendation }}</p>
      </div>
    </div>
  </div>
</template>
