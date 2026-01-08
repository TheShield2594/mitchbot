// User types
export interface User {
  id: string
  username: string
  discriminator: string
  avatar: string | null
  guilds: Guild[]
  accessToken?: string
}

// Guild types
export interface Guild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
  features: string[]
}

// Guild configuration types
export interface GuildConfig {
  guildId: string
  automod: AutomodConfig
  logging: LoggingConfig
  birthdays: BirthdaysConfig
  economy: EconomyConfig
  xp: XPConfig
  reactionRoles: ReactionRolesConfig
  welcome: WelcomeConfig
}

export interface AutomodConfig {
  enabled: boolean
  wordFilter: WordFilterConfig
  inviteFilter: InviteFilterConfig
  linkFilter: LinkFilterConfig
  spam: SpamConfig
  mentionSpam: MentionSpamConfig
  capsSpam: CapsSpamConfig
  attachmentSpam: AttachmentSpamConfig
  emojiSpam: EmojiSpamConfig
  antiRaid: AntiRaidConfig
  whitelist: WhitelistConfig
}

export interface WordFilterConfig {
  enabled: boolean
  words: string[]
  action: ModAction
  threshold: number
}

export interface InviteFilterConfig {
  enabled: boolean
  action: ModAction
  threshold: number
  allowOwnServer: boolean
}

export interface LinkFilterConfig {
  enabled: boolean
  whitelist: string[]
  blacklist: string[]
  action: ModAction
  threshold: number
}

export interface SpamConfig {
  enabled: boolean
  messageThreshold: number
  timeWindow: number
  duplicateThreshold: number
  action: ModAction
  timeoutDuration: number
}

export interface MentionSpamConfig {
  enabled: boolean
  threshold: number
  action: ModAction
  warnThreshold: number
}

export interface CapsSpamConfig {
  enabled: boolean
  percentage: number
  minLength: number
  action: ModAction
}

export interface AttachmentSpamConfig {
  enabled: boolean
  threshold: number
  timeWindow: number
  action: ModAction
  warnThreshold: number
}

export interface EmojiSpamConfig {
  enabled: boolean
  threshold: number
  action: ModAction
}

export interface AntiRaidConfig {
  accountAge: {
    enabled: boolean
    days: number
    action: 'kick' | 'ban'
  }
  joinSpam: {
    enabled: boolean
    threshold: number
    timeWindow: number
    action: 'kick' | 'ban'
  }
  verification: {
    enabled: boolean
    channel: string | null
    role: string | null
    message: string
  }
}

export interface WhitelistConfig {
  roles: string[]
  channels: string[]
}

export interface LoggingConfig {
  enabled: boolean
  channel: string | null
}

export interface BirthdaysConfig {
  enabled: boolean
  channel: string | null
  role: string | null
  message: string
}

export interface EconomyConfig {
  enabled: boolean
  currencyName: string
  currencySymbol: string
  dailyReward: number
  dailyCooldown: number
  workRewardMin: number
  workRewardMax: number
  workCooldown: number
  startingBalance: number
}

export interface XPConfig {
  enabled: boolean
  xpMin: number
  xpMax: number
  cooldown: number
  announceLevelUp: boolean
  levelUpChannel: string | null
  levelUpMessage: string
  levelRoles: LevelRole[]
  xpGainChannels: string[]
  noXpChannels: string[]
  noXpRoles: string[]
  channelMultipliers: Record<string, number>
  roleMultipliers: Record<string, number>
}

export interface LevelRole {
  level: number
  roleId: string
}

export interface ReactionRolesConfig {
  enabled: boolean
  messages: ReactionRoleMessage[]
}

export interface ReactionRoleMessage {
  messageId: string
  channelId: string
  roles: ReactionRole[]
}

export interface ReactionRole {
  emoji: string
  roleId: string
}

export interface WelcomeConfig {
  welcome: {
    enabled: boolean
    channel: string | null
    message: string
  }
  leave: {
    enabled: boolean
    channel: string | null
    message: string
  }
}

export type ModAction = 'delete' | 'warn' | 'timeout' | 'kick' | 'ban'

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
