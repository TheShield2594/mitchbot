require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { registerEvents } = require('./handlers/eventHandler');
const startWebServer = require('./web/server');
const { acquireInstanceLock } = require('./utils/instanceLock');
const logger = require('./utils/logger');

/**
 * Main startup function
 */
async function startBot() {
  // Acquire instance lock to prevent multiple instances from corrupting data
  logger.info('Attempting to acquire instance lock...');
  const lockAcquired = await acquireInstanceLock();

  if (!lockAcquired) {
    logger.error('FATAL: Another instance of the bot is already running.');
    logger.error('Cannot start - this would cause data corruption.');
    logger.error('If you believe this is an error, check for:');
    logger.error('  1. Another bot process running (check with: ps aux | grep node)');
    logger.error('  2. Stale lock in Redis (check REDIS_URL connection)');
    logger.error('  3. Stale .instance.lock file in data/ directory');
    process.exit(1);
  }

  logger.info('Instance lock acquired - bot is the sole instance');

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
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
    logger.warn('Web dashboard will start without Discord bot functionality');
  });

  // Start web server
  startWebServer(client);
}

// Start the bot
startBot().catch((error) => {
  logger.error('Fatal error during bot startup', { error });
  process.exit(1);
});
