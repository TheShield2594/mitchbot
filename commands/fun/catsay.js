const axios = require('axios');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cat-gif')
        .setDescription('Sends a random cat gif'),
    async execute(interaction) {
        try {
            const res = await axios.get('https://cataas.com/cat/gif');
            if (res.data.memes && res.data.memes.length > 0) {
                const randomIndex = Math.floor(Math.random() * res.data.memes.length);
                const randomGif = res.data.memes[randomIndex].url;
                await interaction.reply(randomGif);
            } else {
                await interaction.reply("No gif found :(");
            }
        } catch (err) {
            console.error('Error fetching gif:', err);
            await interaction.reply("Failed to fetch a gif. Please try again later.");
        }
    },
};