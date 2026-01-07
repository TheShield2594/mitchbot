const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    getLeaderboard,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    getEconomyConfig,
    initEconomy,
} = require("../../utils/economy");
const { getLeaderboard: getXPLeaderboard, initXP } = require("../../utils/xp");

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

        const type = interaction.options.getString("type") || "economy";

        // If XP leaderboard is requested, use XP leaderboard logic
        if (type === "xp") {
            try {
                await initXP();

                const xpLeaderboard = getXPLeaderboard(interaction.guildId, 10);

                if (xpLeaderboard.length === 0) {
                    await interaction.reply({
                        content: "No one has earned XP yet. Start chatting to gain XP!",
                        ephemeral: true,
                    });
                    return;
                }

                // Build leaderboard text
                const medals = ['🥇', '🥈', '🥉'];
                const leaderboardText = xpLeaderboard
                    .map((entry, index) => {
                        const medal = medals[index] ?? `**${index + 1}.**`;
                        return `${medal} <@${entry.userId}> - **Level ${entry.level}** (${entry.totalXp.toLocaleString()} XP)`;
                    })
                    .join('\n');

                const embed = new EmbedBuilder()
                    .setColor(0xffd700)
                    .setTitle(`${interaction.guild?.name ?? interaction.guildId} - XP Leaderboard`)
                    .setDescription(leaderboardText)
                    .setFooter({ text: `Showing top ${xpLeaderboard.length} users` })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                return;
            } catch (error) {
                console.error("Error loading XP leaderboard:", error);
                await interaction.reply({
                    content: "An error occurred while loading the XP leaderboard. Please try again later.",
                    ephemeral: true,
                });
                return;
            }
        }

        // Economy leaderboard logic
        try {
            await initEconomy();

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
                const medal = medals[index] ?? `**${index + 1}.**`;
                return `${medal} <@${entry.userId}> - ${formatCoins(entry.balance, config.currencyName)}`;
            }).join("\n");

            const embed = new EmbedBuilder()
                .setColor(ECONOMY_EMBED_COLOR)
                .setTitle(`💰 ${interaction.guild?.name ?? interaction.guildId} - Economy Leaderboard`)
                .setDescription(description)
                .setFooter({ text: `Currency: ${config.currencyName}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error("Error loading economy leaderboard:", error);
            await interaction.reply({
                content: "An error occurred while retrieving the economy leaderboard. Please try again later.",
                ephemeral: true,
            });
            return;
        }
    },
};
