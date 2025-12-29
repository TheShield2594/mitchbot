require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { registerEvents } = require('./handlers/eventHandler');
const startWebServer = require('./web/server');
const logger = require('./utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

loadCommands(client);
registerEvents(client);

// Handle Discord connection errors
client.on('error', (error) => {
  logger.error('Discord client error', { error });
});

// Start Discord bot
client.login(process.env.CLIENT_TOKEN).catch((error) => {
  logger.error('Failed to connect to Discord', { error });
  console.error('❌ Discord bot failed to connect:', error.message);
  console.log('⚠️  Web dashboard will start without Discord bot functionality');
});

// Start web server
startWebServer(client);
