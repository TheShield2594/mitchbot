const { Client, GatewayIntentBits, Intents } = require('discord.js');
const fs = require('fs');
const schedule = require('node-schedule');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const TOKEN = 'CLIENT_TOKEN';

// Load birthdays from a JSON file
function loadBirthdays() {
    try {
        const data = fs.readFileSync('birthdays.json', 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(err);
        return {};
    }
}

// Save birthdays to a JSON file
function saveBirthdays(birthdays) {
    try {
        fs.writeFileSync('birthdays.json', JSON.stringify(birthdays, null, 4));
    } catch (err) {
        console.error(err);
    }
}

let birthdays = loadBirthdays();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Schedule daily birthday check at midnight
    schedule.scheduleJob('0 0 * * *', checkBirthdays);
});

client.on('messageCreate', async message => {
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).split(' ');
    const command = args.shift().toLowerCase();

    if (command === 'add_birthday') {
        const user = message.mentions.users.first();
        const date = args[1];

        if (!user || !date || !/^\d{2}-\d{2}$/.test(date)) {
            return message.channel.send('Usage: !add_birthday @user MM-DD');
        }

        birthdays[user.id] = date;
        saveBirthdays(birthdays);
        message.channel.send(`Added birthday for ${user.username} on ${date}`);
    }

    if (command === 'remove_birthday') {
        const user = message.mentions.users.first();

        if (!user || !birthdays[user.id]) {
            return message.channel.send('Usage: !remove_birthday @user');
        }

        delete birthdays[user.id];
        saveBirthdays(birthdays);
        message.channel.send(`Removed birthday for ${user.username}`);
    }
});

function checkBirthdays() {
    const today = new Date().toISOString().slice(5, 10); // MM-DD

    for (const userId in birthdays) {
        if (birthdays[userId] === today) {
            const user = client.users.cache.get(userId);
            if (user) {
                user.send(`Happy Birthday, ${user.username}! 🎉`);
            }
        }
    }
}

client.login(TOKEN);