<script setup lang="ts">
import { ref } from 'vue'
import { triggerRecommendation, triggerWeeklySummary, triggerSimulateWorkout } from '../api/admin'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface DemoAction {
  id: string
  label: string
  description: string
  chain: string[]
  status: Status
  result: string
}

const actions = ref<DemoAction[]>([
  {
    id: 'recommend',
    label: 'Gerar Recomendação IA',
    description: 'Chama o LLM com os dados do utilizador (treinos, refeições, perfil) e gera uma recomendação personalizada. Envia email de notificação.',
    chain: ['LLM (OpenRouter)', 'ai.recommendations (BD)', 'RabbitMQ → notification-service', 'Email (Mailpit)'],
    status: 'idle',
    result: '',
  },
  {
    id: 'simulate-workout',
    label: 'Simular Treino Concluído',
    description: 'Publica o evento workout.completed no RabbitMQ. O AI Service consome-o automaticamente e gera uma nova recomendação.',
    chain: ['RabbitMQ → ai-service', 'LLM (OpenRouter)', 'RabbitMQ → notification-service', 'Email (Mailpit)'],
    status: 'idle',
    result: '',
  },
  {
    id: 'weekly-summary',
    label: 'Resumo Semanal',
    description: 'Força a geração do resumo semanal normalmente enviado às segundas-feiras às 08:00. Envia o email com estatísticas da semana.',
    chain: ['LLM (OpenRouter)', 'RabbitMQ → notification-service', 'Email (Mailpit)'],
    status: 'idle',
    result: '',
  },
])

async function run(action: DemoAction) {
  if (action.status === 'loading') return
  action.status = 'loading'
  action.result = ''
  try {
    let res: any
    if (action.id === 'recommend') res = await triggerRecommendation()
    else if (action.id === 'simulate-workout') res = await triggerSimulateWorkout()
    else if (action.id === 'weekly-summary') res = await triggerWeeklySummary()

    action.status = 'success'
    if (res?.data?.recommendation) {
      action.result = res.data.recommendation
    } else if (res?.data?.status) {
      action.result = `Em processamento — verifica o Mailpit em localhost:8025`
    } else {
      action.result = `Evento publicado: ${res?.data?.triggered ?? 'ok'}`
    }
  } catch (err: any) {
    action.status = 'error'
    const status = err?.response?.status
    const detail = err?.response?.data?.detail || err?.response?.data?.error || err.message || 'Erro desconhecido'
    action.result = status === 429 ? `Rate limit excedida (${status}) — tenta novamente` : detail
  }
}

function reset(action: DemoAction) {
  action.status = 'idle'
  action.result = ''
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-white">Administração — Demo</h1>
      <p class="text-sm text-gray-400 mt-1">Acções para demonstração em tempo real dos fluxos assíncronos do sistema.</p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div
        v-for="action in actions"
        :key="action.id"
        class="bg-gray-800 rounded-xl p-6 flex flex-col"
      >
        <!-- Header -->
        <div class="mb-4">
          <h2 class="text-white font-semibold text-base mb-2">{{ action.label }}</h2>
          <p class="text-sm text-gray-400 leading-relaxed">{{ action.description }}</p>
        </div>

        <!-- Event chain -->
        <div class="mb-5 flex-1">
          <p class="text-xs text-gray-500 uppercase tracking-wider mb-2">Cadeia de eventos</p>
          <ol class="space-y-1">
            <li
              v-for="(step, i) in action.chain"
              :key="i"
              class="flex items-center gap-2 text-xs text-gray-400"
            >
              <span class="w-4 h-4 rounded-full bg-gray-700 text-gray-400 flex items-center justify-center text-xs shrink-0">{{ i + 1 }}</span>
              {{ step }}
            </li>
          </ol>
        </div>

        <!-- Result -->
        <div
          v-if="action.status === 'success' && action.result"
          class="mb-4 bg-gray-700 rounded-lg p-3 text-sm text-green-300 leading-relaxed"
        >
          {{ action.result }}
        </div>
        <div
          v-else-if="action.status === 'error'"
          class="mb-4 bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-300"
        >
          {{ action.result }}
        </div>

        <!-- Button -->
        <div class="flex gap-2">
          <button
            :disabled="action.status === 'loading'"
            @click="run(action)"
            :class="[
              'flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors',
              action.status === 'loading' ? 'bg-gray-600 text-gray-400 cursor-not-allowed' :
              action.status === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
              action.status === 'error'   ? 'bg-red-600 hover:bg-red-700 text-white' :
              'bg-indigo-500 hover:bg-indigo-600 text-white'
            ]"
          >
            <span v-if="action.status === 'loading'">A executar...</span>
            <span v-else-if="action.status === 'success'">&#10003; Executado</span>
            <span v-else-if="action.status === 'error'">&#10007; Erro — repetir</span>
            <span v-else>Executar</span>
          </button>
          <button
            v-if="action.status !== 'idle'"
            @click="reset(action)"
            class="px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 transition-colors"
            title="Repor"
          >&#8635;</button>
        </div>
      </div>
    </div>

    <!-- Mailpit hint -->
    <div class="mt-8 bg-gray-800 rounded-xl p-4 flex items-start gap-3">
      <span class="text-yellow-400 text-xl mt-0.5">&#9993;</span>
      <div>
        <p class="text-sm font-semibold text-white mb-1">Verificar emails enviados</p>
        <p class="text-sm text-gray-400">
          Abre o <span class="font-mono text-indigo-300">Mailpit</span> em
          <span class="font-mono text-indigo-300">http://localhost:8025</span>
          para ver todos os emails gerados pelos eventos acima.
        </p>
      </div>
    </div>
  </div>
</template>
