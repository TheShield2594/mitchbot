const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const logger = require('../utils/logger');
const { validateCommandMetadata } = require('../utils/commandValidation');

function loadCommands(client) {
  const commands = [];
  const commandsPath = path.join(__dirname, '..', 'commands');
  const commandFolders = fs.readdirSync(commandsPath);

  client.commands = new Collection();

  for (const folder of commandFolders) {
    const commandFolderPath = path.join(commandsPath, folder);
    const commandFiles = fs
      .readdirSync(commandFolderPath)
      .filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const commandPath = path.join(commandFolderPath, file);
      const command = require(commandPath);

      if ('data' in command && 'execute' in command) {
        const metadata = command.data.toJSON();
        const validationErrors = validateCommandMetadata(metadata);

        if (validationErrors.length > 0) {
          logger.warn('Command metadata failed validation', {
            commandPath,
            errors: validationErrors,
          });
          continue;
        }

        client.commands.set(command.data.name, command);
        commands.push(metadata);
      } else {
        logger.warn('Command missing required data or execute property', {
          commandPath,
        });
      }
    }
  }

  return commands;
}

module.exports = { loadCommands };
