require('dotenv').config();
const { syncCommands } = require('../../utils/commandSync');

/**
 * Shared runner for command deployment/sync operations.
 * Extracts common logic for loading env vars and executing sync.
 */
const runCommandOperation = async ({ throwOnError = false } = {}) => {
  const token = process.env.CLIENT_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.COMMAND_GUILD_ID;

  try {
    await syncCommands({
      token,
      clientId,
      guildId,
      logger: console,
    });
  } catch (error) {
    console.error(error);
    if (throwOnError) {
      throw error;
    } else {
      process.exitCode = 1;
    }
  }
};

module.exports = { runCommandOperation };
