const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const {
    getBalance,
    addBalance,
    getEconomyConfig,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    initEconomy,
} = require("../../utils/economy");
const logger = require("../../utils/logger");

// Active duels storage (in-memory, resets on bot restart)
const activeDuels = new Map();

const data = new SlashCommandBuilder()
    .setName("duel")
    .setDescription("Challenge another user to a coin flip duel!")
    .addUserOption(option =>
        option
            .setName("opponent")
            .setDescription("The user you want to challenge")
            .setRequired(true)
    )
    .addIntegerOption(option =>
        option
            .setName("amount")
            .setDescription("Amount to bet (both players contribute)")
            .setRequired(true)
            .setMinValue(1)
    );

async function execute(interaction) {
    if (!interaction.guildId) {
        await interaction.reply({
            content: "Duels are only available inside servers.",
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

    const challenger = interaction.user;
    const opponent = interaction.options.getUser("opponent");
    const betAmount = interaction.options.getInteger("amount");

    // Validation checks
    if (opponent.bot) {
        await interaction.reply({
            content: "You can't duel bots!",
            ephemeral: true,
        });
        return;
    }

    if (opponent.id === challenger.id) {
        await interaction.reply({
            content: "You can't duel yourself!",
            ephemeral: true,
        });
        return;
    }

    const challengerBalance = getBalance(interaction.guildId, challenger.id);
    const opponentBalance = getBalance(interaction.guildId, opponent.id);

    if (challengerBalance < betAmount) {
        await interaction.reply({
            content: `You don't have enough ${config.currencyName}! You need ${formatCoins(betAmount, config.currencyName)} but only have ${formatCoins(challengerBalance, config.currencyName)}.`,
            ephemeral: true,
        });
        return;
    }

    if (opponentBalance < betAmount) {
        await interaction.reply({
            content: `${opponent.username} doesn't have enough ${config.currencyName} to accept this duel! They need ${formatCoins(betAmount, config.currencyName)} but only have ${formatCoins(opponentBalance, config.currencyName)}.`,
            ephemeral: true,
        });
        return;
    }

    const duelId = `${interaction.guildId}-${interaction.id}`;

    // Check if either user already has an active duel
    for (const [id, duel] of activeDuels.entries()) {
        if ((duel.challengerId === challenger.id || duel.opponentId === challenger.id) && id.startsWith(interaction.guildId)) {
            await interaction.reply({
                content: "You already have an active duel! Finish it first.",
                ephemeral: true,
            });
            return;
        }
        if ((duel.challengerId === opponent.id || duel.opponentId === opponent.id) && id.startsWith(interaction.guildId)) {
            await interaction.reply({
                content: `${opponent.username} already has an active duel!`,
                ephemeral: true,
            });
            return;
        }
    }

    // Create duel
    const duel = {
        challengerId: challenger.id,
        challengerUsername: challenger.username,
        opponentId: opponent.id,
        opponentUsername: opponent.username,
        bet: betAmount,
        guildId: interaction.guildId,
    };

    activeDuels.set(duelId, duel);

    // Create buttons
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`duel_accept_${duelId}`)
                .setLabel("⚔️ Accept Duel")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`duel_decline_${duelId}`)
                .setLabel("❌ Decline")
                .setStyle(ButtonStyle.Danger)
        );

    const embed = new EmbedBuilder()
        .setColor(ECONOMY_EMBED_COLOR)
        .setTitle("⚔️ Duel Challenge!")
        .setDescription(
            `${challenger} has challenged ${opponent} to a duel!\n\n` +
            `**Bet Amount:** ${formatCoins(betAmount, config.currencyName)} (each)\n` +
            `**Total Pot:** ${formatCoins(betAmount * 2, config.currencyName)}\n\n` +
            `${opponent}, do you accept the challenge?`
        )
        .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row] });

    // Set timeout to auto-decline after 1 minute
    const timeoutId = setTimeout(async () => {
        if (activeDuels.has(duelId)) {
            activeDuels.delete(duelId);

            try {
                await interaction.editReply({
                    content: `⏱️ The duel challenge expired. ${opponent.username} did not respond in time.`,
                    components: [],
                    embeds: [],
                });
            } catch (error) {
                logger.warn("Failed to send duel expiration notification", {
                    duelId,
                    error,
                });
            }
        }
    }, 60000);

    duel.timeoutId = timeoutId;
}

// Handle button interactions
async function handleDuelButton(interaction) {
    if (!interaction.customId.startsWith("duel_")) return false;

    const match = interaction.customId.match(/^duel_(accept|decline)_(.+)$/);

    if (!match) {
        logger.error("Invalid duel customId format", {
            customId: interaction.customId,
            userId: interaction.user.id,
        });
        return false;
    }

    const action = match[1];
    const duelId = match[2];

    if (!activeDuels.has(duelId)) {
        await interaction.update({
            content: "This duel has expired or already been completed.",
            components: [],
            embeds: [],
        });
        return true;
    }

    const duel = activeDuels.get(duelId);

    // Verify it's the opponent clicking
    if (duel.opponentId !== interaction.user.id) {
        await interaction.reply({
            content: "This duel challenge isn't for you!",
            ephemeral: true,
        });
        return true;
    }

    await initEconomy();
    const config = getEconomyConfig(duel.guildId);

    if (action === "decline") {
        // Opponent declined
        const embed = new EmbedBuilder()
            .setColor("#e74c3c")
            .setTitle("⚔️ Duel Declined")
            .setDescription(`${interaction.user.username} declined the duel challenge.`)
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        if (duel.timeoutId) clearTimeout(duel.timeoutId);
        activeDuels.delete(duelId);
        await interaction.update({ embeds: [embed], components: [] });
        return true;
    }

    // Opponent accepted - check balances again
    const challengerBalance = getBalance(duel.guildId, duel.challengerId);
    const opponentBalance = getBalance(duel.guildId, duel.opponentId);

    if (challengerBalance < duel.bet) {
        const embed = new EmbedBuilder()
            .setColor("#e74c3c")
            .setTitle("⚔️ Duel Cancelled")
            .setDescription(`The challenger no longer has enough ${config.currencyName} to complete this duel.`)
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        if (duel.timeoutId) clearTimeout(duel.timeoutId);
        activeDuels.delete(duelId);
        await interaction.update({ embeds: [embed], components: [] });
        return true;
    }

    if (opponentBalance < duel.bet) {
        const embed = new EmbedBuilder()
            .setColor("#e74c3c")
            .setTitle("⚔️ Duel Cancelled")
            .setDescription(`You no longer have enough ${config.currencyName} to accept this duel.`)
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        if (duel.timeoutId) clearTimeout(duel.timeoutId);
        activeDuels.delete(duelId);
        await interaction.update({ embeds: [embed], components: [] });
        return true;
    }

    // Deduct bets from both players
    addBalance(duel.guildId, duel.challengerId, -duel.bet, {
        type: "duel",
        action: "bet_placed",
        bet: duel.bet,
        opponent: duel.opponentId,
        reason: "Duel bet placed",
    });

    addBalance(duel.guildId, duel.opponentId, -duel.bet, {
        type: "duel",
        action: "bet_placed",
        bet: duel.bet,
        opponent: duel.challengerId,
        reason: "Duel bet placed",
    });

    // Determine winner (50/50 coin flip)
    const challengerWins = Math.random() < 0.5;
    const winnerId = challengerWins ? duel.challengerId : duel.opponentId;
    const winnerUsername = challengerWins ? duel.challengerUsername : duel.opponentUsername;
    const loserId = challengerWins ? duel.opponentId : duel.challengerId;
    const loserUsername = challengerWins ? duel.opponentUsername : duel.challengerUsername;

    const pot = duel.bet * 2;

    // Award pot to winner
    addBalance(duel.guildId, winnerId, pot, {
        type: "duel",
        action: "won",
        bet: duel.bet,
        winnings: pot,
        opponent: loserId,
        reason: "Duel victory",
    });

    const winnerBalance = getBalance(duel.guildId, winnerId);
    const loserBalance = getBalance(duel.guildId, loserId);

    const embed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("⚔️ Duel Complete!")
        .setDescription(
            `🎉 **${winnerUsername}** wins the duel!\n\n` +
            `**Winner:** <@${winnerId}>\n` +
            `**Loser:** <@${loserId}>\n` +
            `**Pot:** ${formatCoins(pot, config.currencyName)}\n\n` +
            `${winnerUsername} walked away with ${formatCoins(pot, config.currencyName)}!`
        )
        .addFields(
            { name: `${winnerUsername}'s Balance`, value: formatCoins(winnerBalance, config.currencyName), inline: true },
            { name: `${loserUsername}'s Balance`, value: formatCoins(loserBalance, config.currencyName), inline: true }
        )
        .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
        .setTimestamp();

    if (duel.timeoutId) clearTimeout(duel.timeoutId);
    activeDuels.delete(duelId);
    await interaction.update({ embeds: [embed], components: [] });

    return true;
}

module.exports = {
    data,
    execute,
    handleDuelButton,
};
