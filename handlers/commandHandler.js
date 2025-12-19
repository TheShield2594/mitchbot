const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

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
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
      } else {
        console.warn(
          `[WARNING] The command at ${commandPath} is missing a required "data" or "execute" property.`
        );
      }
    }
  }

  return commands;
}

module.exports = { loadCommands };
