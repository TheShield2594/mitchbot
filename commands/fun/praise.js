const { request } = require("undici");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("praise")
        .setDescription("Hey you're pretty cool.")
        .addUserOption((option) =>
            option.setName("user").setDescription("Let's be nice to people.")),
    async execute(interaction) {
        const complimentURL = await request("https://complimentr.com/api/");
        const { compliments } = await complimentURL.body.json();

        await interaction.deferReply();
        const message = await interaction.editReply(
            `${
                interaction.options.getUser("user") ?? interaction.user
            } ${compliments[Math.floor(Math.random() * compliments.length)]}`
        );
        message.react("🙏");
    }
};