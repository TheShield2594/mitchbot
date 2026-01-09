import { ShoppingBag, Settings } from 'lucide-react'

export default function Economy() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Economy System</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Configure currency, rewards, and shop items
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
            <ShoppingBag className="h-4 w-4" />
            Shop Items
          </button>
        </div>
      </div>

      {/* Configuration */}
      <div className="space-y-6">
        {/* Enable toggle */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Enable Economy</h3>
              <p className="text-sm text-muted-foreground">
                Allow members to earn and spend virtual currency
              </p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted">
              <span className="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-background" />
            </button>
          </div>
        </div>

        {/* Currency settings */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Currency Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Currency Name</label>
              <input
                type="text"
                placeholder="Coins"
                className="w-full rounded-lg border border-border bg-background px-4 py-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Currency Symbol</label>
              <input
                type="text"
                placeholder="💰"
                className="w-full rounded-lg border border-border bg-background px-4 py-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Starting Balance</label>
              <input
                type="number"
                placeholder="100"
                className="w-full rounded-lg border border-border bg-background px-4 py-2"
              />
            </div>
          </div>
        </div>

        {/* Rewards */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Rewards</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Daily Reward</label>
              <input
                type="number"
                placeholder="100"
                className="w-full rounded-lg border border-border bg-background px-4 py-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">Amount users receive daily</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Daily Cooldown (hours)</label>
              <input
                type="number"
                placeholder="24"
                className="w-full rounded-lg border border-border bg-background px-4 py-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">Hours between daily claims</p>
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
