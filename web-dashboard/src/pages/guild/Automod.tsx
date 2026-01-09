import { useState } from 'react'
import { Shield, AlertTriangle, MessageSquare, Lock } from 'lucide-react'

export default function Automod() {
  const [activeTab, setActiveTab] = useState<'overview' | 'filters' | 'spam' | 'antiraid'>('overview')

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Shield },
    { id: 'filters' as const, label: 'Content Filters', icon: AlertTriangle },
    { id: 'spam' as const, label: 'Spam Protection', icon: MessageSquare },
    { id: 'antiraid' as const, label: 'Anti-Raid', icon: Lock },
  ]

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Auto-Moderation</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Keep your server safe with automated moderation tools
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-border">
        <div className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Overview cards */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Content Filters</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Word filters, invite blocking, and link filtering
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Spam Protection</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Message spam, mention spam, and caps spam detection
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Anti-Raid</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Account age verification and join spam protection
              </p>
            </div>
          </div>
        )}

        {activeTab === 'filters' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Word Filter</h3>
              <p className="text-sm text-muted-foreground">
                Automatically delete messages containing blacklisted words
              </p>
              {/* Word filter config will go here */}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Invite Filter</h3>
              <p className="text-sm text-muted-foreground">
                Block Discord invite links from other servers
              </p>
              {/* Invite filter config will go here */}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Link Filter</h3>
              <p className="text-sm text-muted-foreground">
                Control which links can be posted in your server
              </p>
              {/* Link filter config will go here */}
            </div>
          </div>
        )}

        {activeTab === 'spam' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Message Spam</h3>
              <p className="text-sm text-muted-foreground">
                Detect and punish users sending too many messages
              </p>
              {/* Message spam config will go here */}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Mention Spam</h3>
              <p className="text-sm text-muted-foreground">
                Prevent mass mentioning of users and roles
              </p>
              {/* Mention spam config will go here */}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Caps Spam</h3>
              <p className="text-sm text-muted-foreground">
                Block messages with excessive capital letters
              </p>
              {/* Caps spam config will go here */}
            </div>
          </div>
        )}

        {activeTab === 'antiraid' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Account Age Verification</h3>
              <p className="text-sm text-muted-foreground">
                Automatically kick or ban accounts younger than a specified age
              </p>
              {/* Account age config will go here */}
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Join Spam Protection</h3>
              <p className="text-sm text-muted-foreground">
                Detect and stop raid attempts with rapid user joins
              </p>
              {/* Join spam config will go here */}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
