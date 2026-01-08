import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/auth.service'

export function useAuth() {
  const { user, isLoading, isAuthenticated, setUser, setLoading, logout } =
    useAuthStore()

  useEffect(() => {
    // Load user on mount
    const loadUser = async () => {
      setLoading(true)
      const userData = await authService.getCurrentUser()
      setUser(userData)
    }

    loadUser()
  }, [setUser, setLoading])

  const refreshGuilds = async () => {
    const userData = await authService.refreshGuilds()
    if (userData) {
      setUser(userData)
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
    refreshGuilds,
  }
}
