import { Shield, TrendingUp, Coins, BarChart3, MessageSquare, Zap } from 'lucide-react'

const features = [
  {
    name: 'Advanced Moderation',
    description: 'Auto-moderation, word filters, spam detection, and comprehensive logging to keep your server safe.',
    icon: Shield,
  },
  {
    name: 'Leveling System',
    description: 'Reward active members with XP, levels, and role rewards. Track engagement with detailed leaderboards.',
    icon: TrendingUp,
  },
  {
    name: 'Economy System',
    description: 'Virtual currency, daily rewards, shop items, and role purchases to boost server engagement.',
    icon: Coins,
  },
  {
    name: 'Analytics Dashboard',
    description: 'Track member growth, command usage, and server activity with beautiful charts and insights.',
    icon: BarChart3,
  },
  {
    name: 'Welcome Messages',
    description: 'Greet new members and say goodbye to those who leave with customizable messages.',
    icon: MessageSquare,
  },
  {
    name: 'Lightning Fast',
    description: '99.9% uptime with instant command responses. Built for reliability and performance.',
    icon: Zap,
  },
]

export function Features() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-primary">Everything you need</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Powerful features for your community
          </p>
          <p className="mt-6 text-lg leading-8 text-muted-foreground">
            MitchBot comes packed with all the tools you need to manage and grow your Discord server.
          </p>
        </div>

        {/* Features grid */}
        <div className="mx-auto mt-16 max-w-7xl sm:mt-20 lg:mt-24">
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.name}
                className="group relative rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50 hover:shadow-lg"
              >
                {/* Icon */}
                <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary ring-1 ring-primary/20">
                  <feature.icon className="h-6 w-6" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold leading-7">{feature.name}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>

                {/* Hover effect */}
                <div className="absolute inset-0 -z-10 rounded-2xl bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
