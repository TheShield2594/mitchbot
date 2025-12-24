const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("dadjoke")
        .setDescription("I'm hungry. Hello Hungry I'm dad."),
      
    async execute(interaction) {
        await interaction.deferReply();
        const dadJokeURL = await request("https://icanhazdadjoke.com", {headers: {Accept: "application/json"}});
        const {joke}  = await dadJokeURL.body.json()
        await interaction.editReply(`${joke}`);
    },
};
