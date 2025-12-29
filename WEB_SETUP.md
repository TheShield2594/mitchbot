# Mitchbot Web Dashboard Setup Guide

## Overview

Your bot now has a comprehensive web dashboard for managing settings! Here's what's been added:

### ✨ New Features

1. **Moderation Commands** (11 commands)
   - `/kick` - Kick members
   - `/ban` - Ban members
   - `/timeout` - Timeout members
   - `/warn` - Warn members
   - `/purge` - Bulk delete messages
   - `/slowmode` - Set channel slowmode
   - `/lock` / `/unlock` - Lock/unlock channels
   - `/warnings` - View member warnings
   - `/clearwarnings` - Clear member warnings
   - `/modlogs` - View moderation logs

2. **Automod System** (configurable via web UI or `/automod` command)
   - Word/phrase filtering
   - Server invite link blocking
   - External link filtering (whitelist/blacklist)
   - Spam detection (message spam, duplicate spam)
   - Mention spam detection
   - Caps spam detection
   - Configurable actions: delete, warn, timeout, kick, ban
   - Whitelisted roles/channels (immune to automod)
   - **All disabled by default** - configure via web UI

3. **Fun Commands** (7 new commands)
   - `/trivia` - Random trivia questions
   - `/joke` - Random jokes
   - `/quote` - Inspirational quotes
   - `/flip` - Coin flip
   - `/roll` - Dice roller
   - `/roast` - Get roasted by Mitch
   - `/compliment` - Backhanded compliments

4. **Web Dashboard** (http://localhost:3000)
   - Discord OAuth2 login
   - Server selection
   - Automod configuration panel
   - Moderation logs viewer
   - Birthday management
   - Bot settings (log channel, etc.)

## Setup Instructions

### 1. Environment Variables

You need to add these new environment variables to your `.env` file:

```bash
# Web Dashboard Configuration
WEB_PORT=3000
SESSION_SECRET=your_random_secret_here_change_this
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
CALLBACK_URL=http://localhost:3000/auth/callback
```

**How to get these values:**

1. **DISCORD_CLIENT_SECRET**:
   - Go to https://discord.com/developers/applications
   - Select your bot application
   - Go to "OAuth2" → "General"
   - Copy the "Client Secret"

2. **SESSION_SECRET**:
   - Generate a random string (e.g., use a password generator)
   - This is used to secure user sessions

3. **CALLBACK_URL**:
   - For local testing: `http://localhost:3000/auth/callback`
   - For production: `https://yourdomain.com/auth/callback`
   - **Important**: Add this URL to your Discord app's OAuth2 Redirect URIs:
     - Go to Discord Developer Portal → Your App → OAuth2 → Redirects
     - Add your callback URL

### 2. OAuth2 Setup in Discord Developer Portal

1. Go to https://discord.com/developers/applications
2. Select your bot application
3. Go to "OAuth2" → "General"
4. Under "Redirects", add your callback URL:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

### 3. Deploy Commands

Run this command to deploy all slash commands to Discord:

```bash
npm run deploy
```

This will register all 46 commands (including the new ones) with Discord.

### 4. Start the Bot

```bash
npm start
```

The bot will start with:
- Discord bot (listening for commands and automod)
- Web server (running on http://localhost:3000)

### 5. Access the Web Dashboard

1. Open http://localhost:3000 in your browser
2. Click "Login with Discord"
3. Authorize the application
4. Select your server
5. Start configuring!

## Web Dashboard Features

### Automod Configuration

- **Enable/Disable**: Master switch for all automod features
- **Word Filter**: Add/remove banned words or phrases
- **Invite Filter**: Block Discord server invites (optionally allow your own)
- **Link Filter**: Whitelist or blacklist domains
- **Spam Detection**: Detect message spam, mention spam, and caps spam

### Moderation Logs

View all moderation actions:
- Manual actions (kick, ban, warn, etc.)
- Automod violations and actions taken
- Timestamps and moderators

### Bot Settings

- Set moderation log channel
- Manage birthdays
- More features coming soon!

## Important Notes

1. **Automod is disabled by default** - You must enable it in the web UI
2. **Permissions**: Users need "Manage Server" permission to access the dashboard
3. **Security**: Change the SESSION_SECRET from the default!
4. **Production**: Update CALLBACK_URL when deploying to production

## Troubleshooting

### "Not authenticated" error
- Make sure you've added the CALLBACK_URL to Discord's OAuth2 redirects
- Clear your browser cookies and try logging in again

### Commands not showing up
- Run `npm run deploy` to register commands with Discord
- Wait a few minutes for Discord to update (global commands can take up to 1 hour)

### Web dashboard not loading
- Check that WEB_PORT is not in use
- Make sure all environment variables are set
- Check console for errors

## Architecture

```
mitchbot/
├── commands/
│   ├── moderation/     # All moderation commands
│   ├── fun/           # Fun commands
│   └── ...
├── events/
│   ├── automod.js     # Automod event handler
│   └── ...
├── utils/
│   └── moderation.js  # Moderation utilities & config
├── web/
│   ├── server.js      # Express server
│   ├── routes/
│   │   ├── api.js     # API endpoints
│   │   └── auth.js    # OAuth2 routes
│   ├── middleware/
│   │   └── auth.js    # Auth middleware
│   └── public/        # Static files (HTML/CSS/JS)
└── data/
    └── moderation.json # Per-guild automod config
```

## Next Steps

1. Set up environment variables
2. Deploy commands
3. Start the bot
4. Configure automod via web UI
5. Enjoy your enhanced Mitchbot!

Need help? Check the console logs for detailed error messages.
