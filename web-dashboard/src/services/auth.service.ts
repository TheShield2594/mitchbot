import api from '@/lib/api'
import type { User } from '@/types/api.types'

export const authService = {
  // Get current user from session
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get<User>('/api/user')
      return response.data
    } catch (error) {
      return null
    }
  },

  // Refresh guilds from Discord API
  async refreshGuilds(): Promise<User | null> {
    try {
      const response = await api.post<User>('/api/user/refresh-guilds')
      return response.data
    } catch (error) {
      console.error('Failed to refresh guilds:', error)
      return null
    }
  },
}
