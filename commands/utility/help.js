const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("node:path");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Get a list of all the commands form the discord bot."),
    async execute(interaction) {
        await interaction.deferReply();
        const commandFolder = fs.readdirSync(
            path.join(__dirname, "..", "..", "commands")
        );

        const commandList = [];
        for (const folder of commandFolder) {
            const commandFiles = fs
                .readdirSync(
                    path.join(__dirname, "..", "..", "commands", folder)
                )
                .filter((file) => file.endsWith(".js"));
            for (const file of commandFiles) {
                const command = require(path.join(
                    __dirname,
                    "..",
                    "..",
                    "commands",
                    folder,
                    file
                ));
                if ("data" in command && "execute" in command) {
                    commandList.push({
                        name: command.data.name,
                        description: command.data.description,
                    });
                }
            }
        }

        const exampleEmbed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle(`Commands`)
            .setAuthor({ name: interaction.user.username });

        commandList.forEach((command) => {
            exampleEmbed.addFields({
                name: command.name,
                value: command.description,
            });
        });

        await interaction.editReply({ embeds: [exampleEmbed] });
    },
};
