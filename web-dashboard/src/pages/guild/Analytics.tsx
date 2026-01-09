import { BarChart3, Users, MessageSquare, TrendingUp } from 'lucide-react'

export default function Analytics() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Analytics</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Track server growth and activity metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Members</p>
              <p className="mt-2 text-3xl font-bold">1,234</p>
              <p className="mt-1 text-xs text-green-500">+12% this month</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Messages Today</p>
              <p className="mt-2 text-3xl font-bold">456</p>
              <p className="mt-1 text-xs text-green-500">+8% from yesterday</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Users</p>
              <p className="mt-2 text-3xl font-bold">89</p>
              <p className="mt-1 text-xs text-green-500">+5% this week</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Commands Used</p>
              <p className="mt-2 text-3xl font-bold">234</p>
              <p className="mt-1 text-xs text-green-500">+15% this week</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Member Growth Chart */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Member Growth</h3>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Chart will be displayed here
          </div>
        </div>

        {/* Message Activity Chart */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Message Activity</h3>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Chart will be displayed here
          </div>
        </div>

        {/* Top Commands */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Top Commands</h3>
          <div className="space-y-3">
            {[
              { name: '/help', count: 45 },
              { name: '/level', count: 32 },
              { name: '/balance', count: 28 },
              { name: '/daily', count: 24 },
            ].map((cmd, i) => (
              <div key={cmd.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="font-mono text-sm">{cmd.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{cmd.count} uses</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Users */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Most Active Users</h3>
          <div className="space-y-3">
            {[
              { name: 'User123', messages: 156 },
              { name: 'CoolGamer', messages: 142 },
              { name: 'SuperMod', messages: 128 },
              { name: 'ChatMaster', messages: 115 },
            ].map((user, i) => (
              <div key={user.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm">{user.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{user.messages} messages</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
