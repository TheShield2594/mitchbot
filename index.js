require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { registerEvents } = require('./handlers/eventHandler');
const deployCommands = require('./deploy/deployCommands');

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
deployCommands();

client.login(process.env.CLIENT_TOKEN);
