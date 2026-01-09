import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Save, AlertTriangle, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function Settings() {
  const { guildId } = useParams<{ guildId: string }>()

  // Form state
  const [botPrefix, setBotPrefix] = useState('!')
  const [language, setLanguage] = useState('en')
  const [timezone, setTimezone] = useState('UTC')
  const [autoDeleteMessages, setAutoDeleteMessages] = useState(false)
  const [dmOnModAction, setDmOnModAction] = useState(false)

  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')

  // Refs for cleanup
  const timeoutRefs = useRef<number[]>([])

  // Helper to schedule timeout with cleanup tracking
  const scheduleTimeout = (callback: () => void, delay: number) => {
    const timeoutId = setTimeout(callback, delay)
    timeoutRefs.current.push(timeoutId)
    return timeoutId
  }

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout)
      timeoutRefs.current = []
    }
  }, [])

  // Handle save
  const handleSave = async () => {
    // Validate botPrefix
    const trimmedPrefix = botPrefix.trim()
    if (!trimmedPrefix) {
      setSaveStatus('error')
      setSaveMessage('Bot prefix cannot be empty')
      scheduleTimeout(() => setSaveStatus('idle'), 3000)
      return
    }

    if (!guildId) {
      setSaveStatus('error')
      setSaveMessage('Guild ID is missing')
      scheduleTimeout(() => setSaveStatus('idle'), 3000)
      return
    }

    setIsSaving(true)
    setSaveStatus('idle')
    setSaveMessage('')

    try {
      const response = await fetch(`/api/guild/${guildId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            prefix: trimmedPrefix,
            language,
            timezone,
            autoDeleteMessages,
            dmOnModAction,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      setSaveStatus('success')
      setSaveMessage('Settings saved successfully!')
      scheduleTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus('error')
      setSaveMessage('Failed to save settings. Please try again.')
      scheduleTimeout(() => setSaveStatus('idle'), 5000)
    } finally {
      setIsSaving(false)
    }
  }

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
                value={botPrefix}
                onChange={(e) => setBotPrefix(e.target.value)}
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
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
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
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-border bg-background px-4 py-2"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
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
                aria-label={`Auto-delete bot messages, ${autoDeleteMessages ? 'enabled' : 'disabled'}`}
                aria-checked={autoDeleteMessages}
                onClick={() => setAutoDeleteMessages(!autoDeleteMessages)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoDeleteMessages ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                    autoDeleteMessages ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
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
                aria-label={`DM on moderation action, ${dmOnModAction ? 'enabled' : 'disabled'}`}
                aria-checked={dmOnModAction}
                onClick={() => setDmOnModAction(!dmOnModAction)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  dmOnModAction ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                    dmOnModAction ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
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

        {/* Save button and status */}
        <div className="flex flex-col items-end gap-3">
          {saveStatus !== 'idle' && (
            <div
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
                saveStatus === 'success'
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {saveStatus === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>{saveMessage}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
