import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface AuthUser {
  id: string
  name: string
  email: string
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))
  const user = ref<AuthUser | null>(JSON.parse(localStorage.getItem('user') ?? 'null'))

  const isAuthenticated = computed(() => !!accessToken.value)

  function setTokens(access: string, refresh: string) {
    accessToken.value = access
    refreshToken.value = refresh
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
  }

  function setUser(u: AuthUser) {
    user.value = u
    localStorage.setItem('user', JSON.stringify(u))
  }

  async function login(email: string, password: string) {
    const { default: api } = await import('../api/axios')
    const res = await api.post<{ accessToken: string; refreshToken: string; user: AuthUser }>(
      '/api/v1/auth/login',
      { email, password }
    )
    setTokens(res.data.accessToken, res.data.refreshToken)
    setUser(res.data.user)
  }

  async function register(name: string, email: string, password: string) {
    const { default: api } = await import('../api/axios')
    await api.post('/api/v1/auth/register', { name, email, password })
  }

  async function logout() {
    try {
      if (refreshToken.value) {
        const { default: api } = await import('../api/axios')
        await api.post('/api/v1/auth/logout', { refreshToken: refreshToken.value })
      }
    } finally {
      accessToken.value = null
      refreshToken.value = null
      user.value = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
  }

  function setAccessToken(token: string) {
    accessToken.value = token
    localStorage.setItem('accessToken', token)
  }

  function setSession(access: string, refresh: string, u: AuthUser) {
    setTokens(access, refresh)
    setUser(u)
  }

  return { accessToken, refreshToken, user, isAuthenticated, login, register, logout, setTokens, setUser, setAccessToken, setSession }
})
