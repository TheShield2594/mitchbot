import { NavLink, useParams } from 'react-router-dom'
import {
  Shield,
  FileText,
  Coins,
  TrendingUp,
  BarChart3,
  MessageCircle,
  Settings,
  Home
} from 'lucide-react'

const navItems = [
  { to: '', icon: Home, label: 'Overview', end: true },
  { to: 'automod', icon: Shield, label: 'Auto-Moderation' },
  { to: 'logging', icon: FileText, label: 'Logging' },
  { to: 'economy', icon: Coins, label: 'Economy' },
  { to: 'xp', icon: TrendingUp, label: 'XP & Leveling' },
  { to: 'analytics', icon: BarChart3, label: 'Analytics' },
  { to: 'welcome', icon: MessageCircle, label: 'Welcome Messages' },
  { to: 'settings', icon: Settings, label: 'Settings' },
]

export function GuildNav() {
  const { guildId } = useParams<{ guildId: string }>()

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const to = item.to ? `/guild/${guildId}/${item.to}` : `/guild/${guildId}`

        return (
          <NavLink
            key={item.to}
            to={to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}
