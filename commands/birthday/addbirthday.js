const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, GatewayIntentBits } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

const TOKEN = 'CLIENT_TOKEN';
const CLIENT_ID = 'CLIENT_ID'; // Your bot's client ID
const GUILD_ID = '641450750639341569'; // The server ID where you want to deploy the commands

const commands = [
    new SlashCommandBuilder()
        .setName('add_birthday')
        .setDescription('Add a Birthday')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to add a birthday for')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('date')
                .setDescription('The birthday in MM-DD format')
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