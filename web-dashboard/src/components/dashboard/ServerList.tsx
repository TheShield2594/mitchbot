import { useState, useMemo } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { ServerCard } from './ServerCard'
import type { Guild } from '@/types/api.types'

interface ServerListProps {
  guilds: Guild[]
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function ServerList({ guilds, onRefresh, isRefreshing = false }: ServerListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'manageable' | 'all'>('manageable')

  // Filter guilds where user has MANAGE_GUILD permission (0x20) or is owner
  const manageableGuilds = useMemo(() => {
    return guilds.filter((guild) => {
      if (guild.owner) return true
      const permissions = parseInt(guild.permissions, 10)
      const safePermissions = Number.isNaN(permissions) ? 0 : permissions
      return (safePermissions & 0x20) !== 0
    })
  }, [guilds])

  // Create a Set of manageable guild IDs for O(1) lookup
  const manageableGuildIds = useMemo(
    () => new Set(manageableGuilds.map((g) => g.id)),
    [manageableGuilds]
  )

  // Filter guilds based on active tab and search query
  const filteredGuilds = useMemo(() => {
    let filtered = activeTab === 'manageable' ? manageableGuilds : guilds

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((guild) =>
        guild.name.toLowerCase().includes(query) || guild.id.includes(query)
      )
    }

    return filtered
  }, [guilds, manageableGuilds, activeTab, searchQuery])

  return (
    <div className="space-y-6">
      {/* Header with tabs and actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex gap-2 rounded-lg border border-border bg-muted p-1">
          <button
            type="button"
            onClick={() => setActiveTab('manageable')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'manageable'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Manageable ({manageableGuilds.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Servers ({guilds.length})
          </button>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Servers
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search servers by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Server grid */}
      {filteredGuilds.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGuilds.map((guild) => (
            <ServerCard
              key={guild.id}
              guild={guild}
              hasManagePermission={manageableGuildIds.has(guild.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/50 p-12 text-center">
          <p className="text-lg font-semibold text-muted-foreground">
            {searchQuery.trim()
              ? 'No servers found matching your search'
              : activeTab === 'manageable'
              ? 'No manageable servers found'
              : 'No servers found'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {activeTab === 'manageable'
              ? 'You need Manager or Owner permissions to manage a server'
              : 'Make sure you are logged in with the correct Discord account'}
          </p>
        </div>
      )}
    </div>
  )
}
