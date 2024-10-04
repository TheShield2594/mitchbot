const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gayrate')
        .setDescription('Calculate your gay rate!'),

    async execute(client, interaction) {
        var result = Math.ceil(Math.random() * 100);

        client.embed({
            title: `🏳️‍🌈・Gay rate`,
            desc: `You are ${result}% gay!`,
            type: 'editreply'
        }, interaction);
    }
}