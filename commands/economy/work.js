const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    claimWork,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    getEconomyConfig,
    initEconomy,
} = require("../../utils/economy");
const { formatRelativeTimestamp } = require("../../utils/timeFormatters");

const workMessages = [
    "worked as a programmer and debugged some code",
    "delivered packages around the server",
    "worked at a coffee shop and served customers",
    "mowed lawns in the neighborhood",
    "walked dogs at the local park",
    "tutored students after school",
    "worked as a cashier at the store",
    "helped organize files in an office",
    "painted houses for clients",
    "fixed computers for people",
    "created content for social media",
    "designed graphics for a project",
    "wrote articles for a blog",
    "cleaned cars at a car wash",
    "stocked shelves at a warehouse",
];

function getRandomWorkMessage() {
    return workMessages[Math.floor(Math.random() * workMessages.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("work")
        .setDescription("Work to earn currency"),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Work is only available inside servers.",
                ephemeral: true,
            });
            return;
        }

        await initEconomy();

        const config = getEconomyConfig(interaction.guildId);

        if (!config.enabled) {
            await interaction.reply({
                content: "The economy system is disabled in this server.",
                ephemeral: true,
            });
            return;
        }

        const result = claimWork(interaction.guildId, interaction.user.id, new Date());

        if (!result.ok) {
            const embed = new EmbedBuilder()
                .setColor(ECONOMY_EMBED_COLOR)
                .setTitle("Work Cooldown")
                .setDescription("You're tired from your last job. Take a break!")
                .addFields({
                    name: "Next work available",
                    value: formatRelativeTimestamp(result.nextWorkAt),
                    inline: true,
                })
                .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const workMessage = getRandomWorkMessage();

        const embed = new EmbedBuilder()
            .setColor(ECONOMY_EMBED_COLOR)
            .setTitle("Work Complete!")
            .setDescription(`You ${workMessage} and earned **${formatCoins(result.reward, config.currencyName)}**!`)
            .addFields(
                { name: "New balance", value: formatCoins(result.balance, config.currencyName), inline: true },
                { name: "Next work", value: formatRelativeTimestamp(result.nextWorkAt), inline: true }
            )
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
