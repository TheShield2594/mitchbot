import { Outlet, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { GuildNav } from '@/components/guild/GuildNav'

export function GuildLayout() {
  const { guildId } = useParams<{ guildId: string }>()
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Find the current guild from user's guilds
  const guild = user?.guilds?.find((g) => g.id === guildId)

  const iconUrl = guild?.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`
    : null

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 flex items-center gap-4 border-b border-border bg-background p-4 lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-lg p-2 hover:bg-accent"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-3">
          {iconUrl ? (
            <img src={iconUrl} alt={guild?.name} className="h-8 w-8 rounded-full" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {guild?.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-semibold">{guild?.name}</span>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-border bg-card transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col">
            {/* Guild header */}
            <div className="border-b border-border p-6">
              <Link
                to="/dashboard"
                className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
              <div className="flex items-center gap-3">
                {iconUrl ? (
                  <img src={iconUrl} alt={guild?.name} className="h-12 w-12 rounded-full" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                    {guild?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{guild?.name}</h2>
                  <p className="text-xs text-muted-foreground">ID: {guild?.id}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4">
              <GuildNav />
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
