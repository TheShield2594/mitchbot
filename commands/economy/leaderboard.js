const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    getLeaderboard,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    getEconomyConfig,
    initEconomy,
} = require("../../utils/economy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription("View the economy leaderboard")
        .addStringOption(option =>
            option.setName("type")
                .setDescription("Type of leaderboard to view")
                .addChoices(
                    { name: "Economy (Richest)", value: "economy" },
                    { name: "XP & Levels", value: "xp" }
                )
                .setRequired(false)
        ),
    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Leaderboards are only available inside servers.",
                ephemeral: true,
            });
            return;
        }

        await initEconomy();

        const type = interaction.options.getString("type") || "economy";

        // If XP leaderboard is requested, defer to existing XP leaderboard logic
        if (type === "xp") {
            await interaction.reply({
                content: "Please use the `/levels leaderboard` command for XP rankings.",
                ephemeral: true,
            });
            return;
        }

        const config = getEconomyConfig(interaction.guildId);

        if (!config.enabled) {
            await interaction.reply({
                content: "The economy system is disabled in this server.",
                ephemeral: true,
            });
            return;
        }

        const leaderboard = getLeaderboard(interaction.guildId, 10);

        if (leaderboard.length === 0) {
            await interaction.reply({
                content: "No one has any currency yet! Use `/daily` or `/work` to start earning.",
                ephemeral: true,
            });
            return;
        }

        const medals = ["🥇", "🥈", "🥉"];
        const description = leaderboard.map((entry, index) => {
            const medal = index < 3 ? medals[index] : `**${index + 1}.**`;
            return `${medal} <@${entry.userId}> - ${formatCoins(entry.balance, config.currencyName)}`;
        }).join("\n");

        const embed = new EmbedBuilder()
            .setColor(ECONOMY_EMBED_COLOR)
            .setTitle(`💰 ${interaction.guild.name} - Economy Leaderboard`)
            .setDescription(description)
            .setFooter({ text: `Currency: ${config.currencyName}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
