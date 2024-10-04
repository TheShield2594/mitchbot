const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gayrate')
        .setDescription('Calculate your gay rate!'),

    async execute(client, interaction) {
        const result = Math.ceil(Math.random() * 100);

        const embed = {
            title: `🏳️‍🌈・Gay rate`,
            desc: `You are ${result}% gay!`,
            type: 'editreply'
        }

        await interaction.reply({ embeds: [embed]});
    }
}