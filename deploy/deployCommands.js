require('dotenv').config();
const { syncCommands } = require('../utils/commandSync');

const BOT_TOKEN = process.env.CLIENT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const COMMAND_GUILD_ID = process.env.COMMAND_GUILD_ID;

const deploy = async () => {
    try {
        await syncCommands({
            token: BOT_TOKEN,
            clientId: CLIENT_ID,
            guildId: COMMAND_GUILD_ID,
            logger: console,
        });
    } catch (error) {
        console.error(error);
        throw error;
    }
};

// Run if called directly
if (require.main === module) {
    deploy();
}

module.exports = deploy;
