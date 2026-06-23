<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import NavBar from './components/NavBar.vue'

const route = useRoute()
const authStore = useAuthStore()

const showNav = computed(() => authStore.isAuthenticated && route.meta.public !== true)
</script>

<template>
  <div class="flex min-h-screen bg-gray-900">
    <NavBar v-if="showNav" />
    <main :class="showNav ? 'flex-1 ml-64 p-8' : 'flex-1 p-8'">
      <RouterView />
    </main>
  </div>
</template>
