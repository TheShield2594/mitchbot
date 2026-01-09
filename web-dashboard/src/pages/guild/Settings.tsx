import { Save, AlertTriangle } from 'lucide-react'

export default function Settings() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Settings</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          General server configuration and preferences
        </p>
      </div>

      {/* Configuration */}
      <div className="space-y-6">
        {/* Bot prefix */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Command Prefix</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="botPrefix" className="mb-2 block text-sm font-medium">
                Prefix
              </label>
              <input
                id="botPrefix"
                type="text"
                placeholder="!"
                maxLength={5}
                className="w-full max-w-xs rounded-lg border border-border bg-background px-4 py-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Character(s) that trigger bot commands (max 5 characters)
              </p>
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Language & Locale</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="language" className="mb-2 block text-sm font-medium">
                Language
              </label>
              <select
                id="language"
                className="w-full max-w-xs rounded-lg border border-border bg-background px-4 py-2"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="ja">日本語</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Language for bot responses and messages
              </p>
            </div>

            <div>
              <label htmlFor="timezone" className="mb-2 block text-sm font-medium">
                Timezone
              </label>
              <select
                id="timezone"
                className="w-full max-w-xs rounded-lg border border-border bg-background px-4 py-2"
              >
                <option value="UTC">UTC (GMT+0)</option>
                <option value="America/New_York">Eastern Time (GMT-5)</option>
                <option value="America/Chicago">Central Time (GMT-6)</option>
                <option value="America/Los_Angeles">Pacific Time (GMT-8)</option>
                <option value="Europe/London">London (GMT+0)</option>
                <option value="Europe/Paris">Paris (GMT+1)</option>
                <option value="Asia/Tokyo">Tokyo (GMT+9)</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                Used for timestamps and scheduled events
              </p>
            </div>
          </div>
        </div>

        {/* Moderation */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Moderation Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-Delete Bot Messages</div>
                <div className="text-sm text-muted-foreground">
                  Automatically delete bot responses after 30 seconds
                </div>
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

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">DM on Moderation Action</div>
                <div className="text-sm text-muted-foreground">
                  Send DM to users when they are warned, muted, or banned
                </div>
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
        </div>

        {/* Danger zone */}
        <div className="rounded-lg border border-destructive bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="flex-1">
              <h3 className="mb-2 text-lg font-semibold text-destructive">Danger Zone</h3>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Reset all bot settings for this server to defaults
                  </p>
                  <button
                    type="button"
                    className="rounded-lg border border-destructive bg-background px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10"
                  >
                    Reset Configuration
                  </button>
                </div>

                <div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Permanently delete all bot data for this server (cannot be undone)
                  </p>
                  <button
                    type="button"
                    className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete All Data
                  </button>
                </div>
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
            <Save className="h-4 w-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
