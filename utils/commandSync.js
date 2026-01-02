const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const { validateCommandMetadata } = require('./commandValidation');

const loadCommandDefinitions = ({ logger = console } = {}) => {
  const commands = [];
  const errors = [];
  const foldersPath = path.join(__dirname, '..', 'commands');
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);

      if (!('data' in command && 'execute' in command)) {
        errors.push(
          `Command at ${filePath} is missing required "data" or "execute" property.`
        );
        continue;
      }

      const metadata = command.data.toJSON();
      const validationErrors = validateCommandMetadata(metadata);

      if (validationErrors.length > 0) {
        errors.push(
          `Command metadata invalid at ${filePath}:\n- ${validationErrors.join(
            '\n- '
          )}`
        );
        continue;
      }

      commands.push(metadata);
    }
  }

  if (errors.length > 0) {
    logger.error('Command metadata validation failed.', { errors });
  }

  return { commands, errors };
};

const syncCommands = async ({ token, clientId, guildId, logger = console }) => {
  if (!token) {
    throw new Error('Discord bot token is required to sync commands.');
  }

  if (!clientId) {
    throw new Error('Discord application client ID is required to sync commands.');
  }

  const { commands, errors } = loadCommandDefinitions({ logger });

  if (errors.length > 0) {
    throw new Error('Command metadata validation failed. See logs for details.');
  }

  const rest = new REST().setToken(token);
  const route = guildId
    ? Routes.applicationGuildCommands(clientId, guildId)
    : Routes.applicationCommands(clientId);

  logger.info(
    `Started refreshing ${commands.length} application (/) commands.`
  );
  const data = await rest.put(route, { body: commands });
  logger.info(`Successfully reloaded ${data.length} application (/) commands.`);

  return data;
};

module.exports = { loadCommandDefinitions, syncCommands };
