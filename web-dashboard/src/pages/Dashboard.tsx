import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ServerList } from '@/components/dashboard/ServerList'
import { Loader2 } from 'lucide-react'

export default function Dashboard() {
  const { user, isLoading, refreshGuilds } = useAuth()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshGuilds()
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Loading your servers...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">
            Please log in to view your servers
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold">My Servers</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Manage your Discord servers with {user.global_name || user.username}
          </p>
        </div>

        {/* Server List */}
        <ServerList
          guilds={user.guilds || []}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </div>
    </div>
  )
}
