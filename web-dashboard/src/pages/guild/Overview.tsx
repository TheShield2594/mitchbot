import { useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Shield, FileText, Coins, TrendingUp, BarChart3, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function GuildOverview() {
  const { guildId } = useParams<{ guildId: string }>()
  const { user } = useAuth()

  const guild = user?.guilds?.find((g) => g.id === guildId)

  const quickLinks = [
    {
      to: 'automod',
      icon: Shield,
      label: 'Auto-Moderation',
      description: 'Configure automated moderation rules',
    },
    {
      to: 'logging',
      icon: FileText,
      label: 'Logging',
      description: 'Track server events and actions',
    },
    {
      to: 'economy',
      icon: Coins,
      label: 'Economy',
      description: 'Manage currency and shop items',
    },
    {
      to: 'xp',
      icon: TrendingUp,
      label: 'XP & Leveling',
      description: 'Reward active members with XP',
    },
    {
      to: 'analytics',
      icon: BarChart3,
      label: 'Analytics',
      description: 'View server statistics and insights',
    },
    {
      to: 'settings',
      icon: Settings,
      label: 'Settings',
      description: 'General server configuration',
    },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">{guild?.name} Dashboard</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Manage your server settings and features
        </p>
      </div>

      {/* Quick access cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.to}
              to={link.to}
              className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold group-hover:text-primary">{link.label}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{link.description}</p>
            </Link>
          )
        })}
      </div>

      {/* Server stats */}
      <div className="mt-8 rounded-lg border border-border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Server Information</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Server ID</p>
            <p className="mt-1 font-mono text-sm">{guild?.id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Your Role</p>
            <p className="mt-1 text-sm">
              {guild?.owner ? (
                <span className="font-medium text-primary">Owner</span>
              ) : (
                <span className="font-medium text-blue-500">Manager</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Features</p>
            <p className="mt-1 text-sm">{guild?.features?.length || 0} enabled</p>
          </div>
        </div>
      </div>
    </div>
  )
}
