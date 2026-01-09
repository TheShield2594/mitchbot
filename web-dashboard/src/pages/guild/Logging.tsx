import { UserPlus, UserMinus, MessageCircle, Settings } from 'lucide-react'

export default function Logging() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Server Logging</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Track important events in your server
        </p>
      </div>

      {/* Logging Configuration */}
      <div className="space-y-6">
        {/* Main logging toggle */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Enable Logging</h3>
              <p className="text-sm text-muted-foreground">
                Log important server events to a designated channel
              </p>
            </div>
            <button
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors hover:bg-muted/80"
            >
              <span className="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-background transition-transform" />
            </button>
          </div>
        </div>

        {/* Log channel selection */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Log Channel</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Select the channel where log messages will be sent
          </p>
          <select className="w-full rounded-lg border border-border bg-background px-4 py-2">
            <option>Select a channel...</option>
          </select>
        </div>

        {/* Event types */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-6 text-lg font-semibold">Event Types</h3>
          <div className="space-y-4">
            {[
              { icon: UserPlus, label: 'Member Joins', description: 'Log when users join the server' },
              { icon: UserMinus, label: 'Member Leaves', description: 'Log when users leave the server' },
              { icon: MessageCircle, label: 'Message Deletes', description: 'Log deleted messages' },
              { icon: Settings, label: 'Server Updates', description: 'Log server setting changes' },
            ].map((event) => {
              const Icon = event.icon
              return (
                <div key={event.label} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{event.label}</div>
                      <div className="text-sm text-muted-foreground">{event.description}</div>
                    </div>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted">
                    <span className="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-background" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
