const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, GatewayIntentBits } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');

const TOKEN = 'CLIENT_TOKEN';
const CLIENT_ID = 'CLIENT_ID'; // Your bot's client ID
const GUILD_ID = '641450750639341569'; // The server ID where you want to deploy the commands

const commands = [
    new SlashCommandBuilder()
        .setName('remove_birthday')
        .setDescription('Remove a birthday reminder')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to remove a birthday for')
                .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();