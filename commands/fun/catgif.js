const { SlashCommandBuilder } = require('discord.js');
const fetch = require("node-fetch");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cat')
        .setDescription('Get a random cat image!'),

    async execute(client, interaction) {
        await interaction.deferReply();
        try {
            const res = await fetch(`https://some-random-api.com/img/cat`);
            const json = await res.json();

            client.embed({
                title: `🐱・Random Cat`,
                image: json.link,
                type: 'editreply'
            }, interaction);
        } catch (error) {
            console.error('Error fetching cat image:', error);
            await interaction.editReply({
                content: 'Sorry, something went wrong fetching the cat image!'
            });
        }
    }
}
