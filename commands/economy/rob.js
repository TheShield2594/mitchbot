const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    attemptRob,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    formatRelativeTimestamp,
    getEconomyConfig,
    initEconomy,
} = require("../../utils/economy");

const robSuccessMessages = [
    "sneaked into their house and took",
    "distracted them and pickpocketed",
    "hacked their account and transferred",
    "mugged them in an alley and stole",
    "broke into their vault and grabbed",
    "convinced them to hand over",
    "used social engineering to steal",
    "intercepted their payment and took",
    "scammed them out of",
    "ambushed them and ran off with",
];

const robFailMessages = [
    "tried to rob them but they called the police",
    "attempted to steal from them but got caught",
    "tried sneaking in but triggered an alarm",
    "approached them but they fought back",
    "tried to pickpocket but they noticed",
    "attempted a heist but security stopped you",
    "tried to scam them but they saw through it",
    "broke in but they had a guard dog",
    "tried to mug them but they knew martial arts",
    "attempted theft but bystanders intervened",
];

function getRandomSuccessMessage() {
    return robSuccessMessages[Math.floor(Math.random() * robSuccessMessages.length)];
}

function getRandomFailMessage() {
    return robFailMessages[Math.floor(Math.random() * robFailMessages.length)];
}

const data = new SlashCommandBuilder()
    .setName("rob")
    .setDescription("Attempt to rob another user (high risk, high reward)")
    .addUserOption(option =>
        option
            .setName("user")
            .setDescription("The user to rob")
            .setRequired(true)
    );

async function execute(interaction) {
    if (!interaction.guildId) {
        await interaction.reply({
            content: "Robbing is only available inside servers.",
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

    const targetUser = interaction.options.getUser("user");

    // Don't allow robbing bots
    if (targetUser.bot) {
        await interaction.reply({
            content: "You can't rob bots!",
            ephemeral: true,
        });
        return;
    }

    const result = attemptRob(
        interaction.guildId,
        interaction.user.id,
        targetUser.id,
        new Date()
    );

    // Handle various error cases
    if (!result.ok) {
        let errorMessage = "";
        let errorTitle = "";

        switch (result.error) {
            case "cant_rob_self":
                errorMessage = "You can't rob yourself! That doesn't make any sense.";
                errorTitle = "Invalid Target";
                break;

            case "cooldown": {
                const embed = new EmbedBuilder()
                    .setColor(ECONOMY_EMBED_COLOR)
                    .setTitle("Rob Cooldown")
                    .setDescription("You need to wait before attempting another robbery!")
                    .addFields({
                        name: "Next rob available",
                        value: formatRelativeTimestamp(result.nextRobAt),
                        inline: true,
                    })
                    .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], ephemeral: true });
                return;
            }

            case "target_cooldown":
                errorMessage = `You've already robbed <@${result.targetId}> recently. Wait 24 hours before targeting them again.`;
                errorTitle = "Target Recently Robbed";
                break;

            case "target_too_poor":
                errorMessage = `<@${targetUser.id}> doesn't have enough ${config.currencyName} to rob. They need at least ${formatCoins(result.minimumBalance, config.currencyName)}.`;
                errorTitle = "Target Too Poor";
                break;

            case "insufficient_funds":
                errorMessage = `You don't have enough ${config.currencyName} to risk a robbery. You need at least ${formatCoins(result.minimumRequired || 50, config.currencyName)}.`;
                errorTitle = "Insufficient Funds";
                break;

            default:
                errorMessage = "An error occurred while attempting the robbery.";
                errorTitle = "Error";
        }

        await interaction.reply({
            content: `**${errorTitle}**\n${errorMessage}`,
            ephemeral: true,
        });
        return;
    }

    if (result.success) {
        // Rob succeeded
        const message = getRandomSuccessMessage();

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle("🎭 Robbery Successful!")
            .setDescription(`You ${message} **${formatCoins(result.stolenAmount, config.currencyName)}** from <@${targetUser.id}>!`)
            .addFields(
                { name: "Your new balance", value: formatCoins(result.balance, config.currencyName), inline: true },
                { name: "Next rob", value: formatRelativeTimestamp(result.nextRobAt), inline: true }
            )
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } else {
        // Rob failed
        const message = getRandomFailMessage();

        const embed = new EmbedBuilder()
            .setColor("#e74c3c")
            .setTitle("🚨 Robbery Failed!")
            .setDescription(`You ${message} and got fined **${formatCoins(result.penalty, config.currencyName)}**!`)
            .addFields(
                { name: "Your new balance", value: formatCoins(result.balance, config.currencyName), inline: true },
                { name: "Next rob", value: formatRelativeTimestamp(result.nextRobAt), inline: true }
            )
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
}

module.exports = {
    data,
    execute,
};
