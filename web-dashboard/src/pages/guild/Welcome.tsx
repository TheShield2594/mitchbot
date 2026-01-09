import { MessageCircle, Send } from 'lucide-react'

export default function Welcome() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Welcome Messages</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Greet new members with customized welcome messages
        </p>
      </div>

      {/* Configuration */}
      <div className="space-y-6">
        {/* Enable toggle */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Enable Welcome Messages</h3>
              <p className="text-sm text-muted-foreground">
                Send a message when new members join the server
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={false}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors"
            >
              <span className="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-background transition-transform" />
            </button>
          </div>
        </div>

        {/* Channel selection */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Welcome Channel</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="welcomeChannel" className="mb-2 block text-sm font-medium">
                Channel
              </label>
              <select
                id="welcomeChannel"
                className="w-full rounded-lg border border-border bg-background px-4 py-2"
              >
                <option>Select a channel...</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose where welcome messages will be sent
              </p>
            </div>
          </div>
        </div>

        {/* Welcome message */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Message Content</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="welcomeMessage" className="mb-2 block text-sm font-medium">
                Welcome Message
              </label>
              <textarea
                id="welcomeMessage"
                rows={4}
                placeholder="Welcome {user} to {server}! We're glad to have you here."
                className="w-full rounded-lg border border-border bg-background px-4 py-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Variables: {'{user}'}, {'{server}'}, {'{memberCount}'}
              </p>
            </div>

            <div>
              <label htmlFor="welcomeEmbed" className="mb-2 block text-sm font-medium">
                Embed Color
              </label>
              <input
                id="welcomeEmbed"
                type="color"
                defaultValue="#5865F2"
                className="h-10 w-20 rounded-lg border border-border bg-background"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Preview</h3>
          <div className="rounded-lg border-l-4 border-primary bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10">
                <MessageCircle className="h-10 w-10 p-2 text-primary" />
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-semibold">Bot Name</span>
                  <span className="rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                    BOT
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Welcome @NewUser to Server Name! We're glad to have you here.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
