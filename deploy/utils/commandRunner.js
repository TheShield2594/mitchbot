const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
});
const { syncCommands } = require('../../utils/commandSync');

/**
 * Shared runner for command deployment/sync operations.
 * Extracts common logic for loading env vars and executing sync.
 */
const runCommandOperation = async ({ throwOnError = false } = {}) => {
  console.log('Starting command deployment...');
  console.log('Loading environment variables from:', path.resolve(__dirname, '../../.env'));

  const token = process.env.CLIENT_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.COMMAND_GUILD_ID;

  // Validate required environment variables
  const missing = [];
  if (!token) missing.push('CLIENT_TOKEN');
  if (!clientId) missing.push('CLIENT_ID');

  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}\nPlease create a .env file from .env.example and fill in the required values.`;
    console.error(errorMsg);
    if (throwOnError) {
      throw new Error(errorMsg);
    } else {
      process.exitCode = 1;
      return;
    }
  }

  if (guildId) {
    console.log('Deploying to specific guild:', guildId);
  } else {
    console.log('Deploying globally (this may take up to an hour to propagate)');
  }

  try {
    await syncCommands({
      token,
      clientId,
      guildId,
      logger: console,
    });
    console.log('Command deployment completed successfully!');
  } catch (error) {
    console.error('Command deployment failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    if (throwOnError) {
      throw error;
    } else {
      process.exitCode = 1;
    }
  }
};

module.exports = { runCommandOperation };
