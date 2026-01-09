import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { TrendingUp, Award, Settings, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

type TabType = 'configuration' | 'rewards' | 'leaderboard'

export default function XP() {
  const { guildId } = useParams<{ guildId: string }>()
  const [activeTab, setActiveTab] = useState<TabType>('configuration')
  const [xpEnabled, setXpEnabled] = useState(false)
  const [announcementsEnabled, setAnnouncementsEnabled] = useState(false)

  // XP settings state
  const [minXpPerMessage, setMinXpPerMessage] = useState<number>(15)
  const [maxXpPerMessage, setMaxXpPerMessage] = useState<number>(25)
  const [xpCooldown, setXpCooldown] = useState<number>(60)

  // Announcement settings state
  const [announcementChannel, setAnnouncementChannel] = useState<string>('same')
  const [levelUpMessage, setLevelUpMessage] = useState<string>('Congratulations {user}, you reached level {level}!')

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Save state
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState<string>('')

  // Loading state
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string>('')

  // Refs for cleanup
  const timeoutRefs = useRef<number[]>([])

  // Helper to schedule timeout with cleanup tracking
  const scheduleTimeout = (callback: () => void, delay: number) => {
    const timeoutId = setTimeout(callback, delay)
    timeoutRefs.current.push(timeoutId)
    return timeoutId
  }

  // Load guild XP config on mount
  useEffect(() => {
    if (!guildId) {
      setIsLoading(false)
      setLoadError('Guild ID is missing')
      return
    }

    const fetchConfig = async () => {
      setIsLoading(true)
      setLoadError('')

      try {
        const response = await api.get(`/api/guild/${guildId}/xp/config`)
        const config = response.data

        // Populate form with loaded data
        setXpEnabled(config.enabled ?? false)
        setMinXpPerMessage(config.xpMin ?? 15)
        setMaxXpPerMessage(config.xpMax ?? 25)
        setXpCooldown(config.cooldown ?? 60)
        setAnnouncementsEnabled(config.announcements ?? false)
        setAnnouncementChannel(config.announcementChannel ?? 'same')
        setLevelUpMessage(config.levelUpMessage ?? 'Congratulations {user}, you reached level {level}!')
      } catch (error: any) {
        console.error('Failed to load XP config:', error)
        setLoadError(error.response?.data?.message || 'Failed to load XP configuration')
      } finally {
        setIsLoading(false)
      }
    }

    fetchConfig()
  }, [guildId])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout)
      timeoutRefs.current = []
    }
  }, [])

  // Validate inputs
  const validateInputs = () => {
    const newErrors: Record<string, string> = {}

    if (minXpPerMessage < 0) {
      newErrors.minXpPerMessage = 'Must be at least 0'
    }

    if (maxXpPerMessage < 0) {
      newErrors.maxXpPerMessage = 'Must be at least 0'
    }

    if (minXpPerMessage > maxXpPerMessage) {
      newErrors.minXpPerMessage = 'Min XP cannot be greater than Max XP'
    }

    if (xpCooldown < 0) {
      newErrors.xpCooldown = 'Must be at least 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle save
  const handleSave = async () => {
    // Validate first
    if (!validateInputs()) {
      setSaveStatus('error')
      setSaveMessage('Please fix validation errors before saving')
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
      const config = {
        enabled: xpEnabled,
        xpMin: minXpPerMessage,
        xpMax: maxXpPerMessage,
        cooldown: xpCooldown,
        announcements: announcementsEnabled,
        announcementChannel: announcementChannel,
        levelUpMessage: levelUpMessage,
        // These would normally come from additional form fields
        xpGainChannels: [],
        noXpChannels: [],
        noXpRoles: [],
        channelMultipliers: {},
        roleMultipliers: {},
      }

      await api.post(`/api/guild/${guildId}/xp/config`, config)

      setSaveStatus('success')
      setSaveMessage('XP configuration saved successfully!')
      scheduleTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error: any) {
      console.error('Failed to save XP config:', error)
      setSaveStatus('error')
      setSaveMessage(
        error.response?.data?.message || 'Failed to save XP configuration. Please try again.'
      )
      scheduleTimeout(() => setSaveStatus('idle'), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">XP & Leveling</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Reward active members with experience points and levels
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Error state */}
      {!isLoading && loadError && (
        <div className="rounded-lg border border-destructive bg-destructive/5 p-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{loadError}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      {!isLoading && !loadError && (
        <>

      {/* Tabs */}
      <div className="mb-8 border-b border-border">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('configuration')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'configuration'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-4 w-4" />
            Configuration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rewards')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'rewards'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Award className="h-4 w-4" />
            Level Rewards
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'leaderboard'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Leaderboard
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'configuration' && (
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
            <button
              type="button"
              role="switch"
              aria-checked={xpEnabled}
              onClick={() => setXpEnabled(!xpEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                xpEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  xpEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* XP settings */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">XP Settings</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="minXpPerMessage" className="mb-2 block text-sm font-medium">
                Min XP Per Message
              </label>
              <input
                id="minXpPerMessage"
                type="number"
                min="0"
                value={minXpPerMessage}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10)
                  setMinXpPerMessage(Number.isNaN(value) ? 0 : value)
                }}
                onBlur={validateInputs}
                className={`w-full rounded-lg border bg-background px-4 py-2 ${
                  errors.minXpPerMessage ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors.minXpPerMessage && (
                <p className="mt-1 text-xs text-destructive">{errors.minXpPerMessage}</p>
              )}
            </div>
            <div>
              <label htmlFor="maxXpPerMessage" className="mb-2 block text-sm font-medium">
                Max XP Per Message
              </label>
              <input
                id="maxXpPerMessage"
                type="number"
                min="0"
                value={maxXpPerMessage}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10)
                  setMaxXpPerMessage(Number.isNaN(value) ? 0 : value)
                }}
                onBlur={validateInputs}
                className={`w-full rounded-lg border bg-background px-4 py-2 ${
                  errors.maxXpPerMessage ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors.maxXpPerMessage && (
                <p className="mt-1 text-xs text-destructive">{errors.maxXpPerMessage}</p>
              )}
            </div>
            <div>
              <label htmlFor="xpCooldown" className="mb-2 block text-sm font-medium">
                Cooldown (seconds)
              </label>
              <input
                id="xpCooldown"
                type="number"
                min="0"
                value={xpCooldown}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10)
                  setXpCooldown(Number.isNaN(value) ? 0 : value)
                }}
                onBlur={validateInputs}
                className={`w-full rounded-lg border bg-background px-4 py-2 ${
                  errors.xpCooldown ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors.xpCooldown && (
                <p className="mt-1 text-xs text-destructive">{errors.xpCooldown}</p>
              )}
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
              <button
                type="button"
                role="switch"
                aria-checked={announcementsEnabled}
                onClick={() => setAnnouncementsEnabled(!announcementsEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  announcementsEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                    announcementsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div>
              <label htmlFor="announcementChannel" className="mb-2 block text-sm font-medium">
                Announcement Channel
              </label>
              <select
                id="announcementChannel"
                value={announcementChannel}
                onChange={(e) => setAnnouncementChannel(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2"
              >
                <option value="same">Same channel as message</option>
              </select>
            </div>
            <div>
              <label htmlFor="levelUpMessage" className="mb-2 block text-sm font-medium">
                Level Up Message
              </label>
              <input
                id="levelUpMessage"
                type="text"
                value={levelUpMessage}
                onChange={(e) => setLevelUpMessage(e.target.value)}
                placeholder="Congratulations {user}, you reached level {level}!"
                className="w-full rounded-lg border border-border bg-background px-4 py-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Variables: {'{user}'}, {'{level}'}
              </p>
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
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Rewards tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <Award className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-muted-foreground">
              Level Rewards Coming Soon
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure role rewards and perks for reaching specific levels
            </p>
          </div>
        </div>
      )}

      {/* Leaderboard tab */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold text-muted-foreground">
              Leaderboard Coming Soon
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              View top members ranked by XP and level
            </p>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  )
}
