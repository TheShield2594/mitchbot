import { TrendingUp, Award, Settings } from 'lucide-react'

export default function XP() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">XP & Leveling</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Reward active members with experience points and levels
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-border">
        <div className="flex gap-4">
          <button className="flex items-center gap-2 border-b-2 border-primary px-4 py-3 text-sm font-medium text-primary">
            <Settings className="h-4 w-4" />
            Configuration
          </button>
          <button className="flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
            <Award className="h-4 w-4" />
            Level Rewards
          </button>
          <button className="flex items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
            <TrendingUp className="h-4 w-4" />
            Leaderboard
          </button>
        </div>
      </div>

      {/* Configuration */}
      <div className="space-y-6">
        {/* Enable toggle */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Enable XP System</h3>
              <p className="text-sm text-muted-foreground">
                Allow members to gain XP and level up
              </p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted">
              <span className="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-background" />
            </button>
          </div>
        </div>

        {/* XP settings */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">XP Settings</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Min XP Per Message</label>
              <input
                type="number"
                placeholder="15"
                className="w-full rounded-lg border border-border bg-background px-4 py-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Max XP Per Message</label>
              <input
                type="number"
                placeholder="25"
                className="w-full rounded-lg border border-border bg-background px-4 py-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Cooldown (seconds)</label>
              <input
                type="number"
                placeholder="60"
                className="w-full rounded-lg border border-border bg-background px-4 py-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">Prevent XP farming</p>
            </div>
          </div>
        </div>

        {/* Level up announcements */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Level Up Announcements</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Announce Level Ups</div>
                <div className="text-sm text-muted-foreground">Send a message when users level up</div>
              </div>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted">
                <span className="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-background" />
              </button>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Announcement Channel</label>
              <select className="w-full rounded-lg border border-border bg-background px-4 py-2">
                <option>Same channel as message</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Level Up Message</label>
              <input
                type="text"
                placeholder="Congratulations {user}, you reached level {level}!"
                className="w-full rounded-lg border border-border bg-background px-4 py-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Variables: {'{user}'}, {'{level}'}
              </p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:bg-primary/90">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
