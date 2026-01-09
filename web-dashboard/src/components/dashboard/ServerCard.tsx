import { Settings, Users, CheckCircle, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Guild } from '@/types/api.types'

interface ServerCardProps {
  guild: Guild
  hasManagePermission: boolean
}

export function ServerCard({ guild, hasManagePermission }: ServerCardProps) {
  const iconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : null

  const clientId = import.meta.env.VITE_CLIENT_ID

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg">
      {/* Status badge */}
      <div className="absolute right-4 top-4">
        {hasManagePermission ? (
          <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-500">
            <CheckCircle className="h-3 w-3" />
            <span>Can Manage</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            <XCircle className="h-3 w-3" />
            <span>View Only</span>
          </div>
        )}
      </div>

      {/* Server icon */}
      <div className="mb-4 flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full bg-muted">
          {iconUrl ? (
            <img src={iconUrl} alt={guild.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-xl font-bold text-primary">
              {guild.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-lg font-semibold">{guild.name}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>ID: {guild.id}</span>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="mb-4 flex flex-wrap gap-2">
        {guild.owner && (
          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            Owner
          </span>
        )}
        {hasManagePermission && !guild.owner && (
          <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500">
            Manager
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {hasManagePermission ? (
          <Link
            to={`/guild/${guild.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Settings className="h-4 w-4" />
            Manage Server
          </Link>
        ) : clientId ? (
          <a
            href={`https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
          >
            Add Bot
          </a>
        ) : (
          <button
            type="button"
            disabled
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-semibold text-muted-foreground opacity-50 cursor-not-allowed"
            title="Bot client ID not configured"
          >
            Add Bot (Unavailable)
          </button>
        )}
      </div>

      {/* Hover effect */}
      <div className="absolute inset-0 -z-10 rounded-lg bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  )
}
