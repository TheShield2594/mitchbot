require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { registerEvents } = require('./handlers/eventHandler');
const startWebServer = require('./web/server');

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

client.login(process.env.CLIENT_TOKEN);

// Start web server
startWebServer(client);
