const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const {
    claimCrime,
    ECONOMY_EMBED_COLOR,
    formatCoins,
    formatRelativeTimestamp,
    getEconomyConfig,
    initEconomy,
} = require("../../utils/economy");

const crimeSuccessMessages = [
    "robbed a convenience store",
    "hacked into a secure database",
    "pickpocketed a wealthy tourist",
    "stole a valuable painting from a museum",
    "broke into a jewelry store",
    "smuggled contraband across the border",
    "scammed people with a phishing scheme",
    "counterfeited some currency",
    "stole packages from doorsteps",
    "embezzled funds from a corporation",
    "sold stolen electronics on the black market",
    "pulled off a bank heist",
    "fenced stolen goods for profit",
    "ran an underground gambling ring",
    "orchestrated an identity theft scheme",
];

const crimeFailMessages = [
    "tried to rob a store but got caught by security",
    "attempted a hack but triggered an alarm",
    "got caught pickpocketing and had to pay a fine",
    "broke into a building but it was a police station",
    "tried smuggling goods but got searched at the border",
    "ran a scam but the victim reported you",
    "attempted theft but tripped the alarm system",
    "got arrested mid-heist and had to pay bail",
    "tried to fence stolen goods to an undercover cop",
    "started a scheme but your partner snitched",
    "attempted fraud but got caught by investigators",
    "tried to rob someone who was a martial artist",
    "got caught on security cameras and had to pay damages",
    "tried to steal but the owner was home",
    "attempted a crime but it was a sting operation",
];

function getRandomSuccessMessage() {
    return crimeSuccessMessages[Math.floor(Math.random() * crimeSuccessMessages.length)];
}

function getRandomFailMessage() {
    return crimeFailMessages[Math.floor(Math.random() * crimeFailMessages.length)];
}

const data = new SlashCommandBuilder()
    .setName("crime")
    .setDescription("Commit a crime for high risk, high reward currency (might fail!)");

async function execute(interaction) {
    if (!interaction.guildId) {
        await interaction.reply({
            content: "Crime is only available inside servers.",
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

    const result = claimCrime(interaction.guildId, interaction.user.id, new Date());

    if (!result.ok) {
        const embed = new EmbedBuilder()
            .setColor(ECONOMY_EMBED_COLOR)
            .setTitle("Crime Cooldown")
            .setDescription("The heat is on! Lay low for a while before attempting another crime.")
            .addFields({
                name: "Next crime available",
                value: formatRelativeTimestamp(result.nextCrimeAt),
                inline: true,
            })
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    if (result.success) {
        // Crime succeeded
        const crimeMessage = getRandomSuccessMessage();

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle("🎭 Crime Successful!")
            .setDescription(`You ${crimeMessage} and got away with **${formatCoins(result.reward, config.currencyName)}**!`)
            .addFields(
                { name: "New balance", value: formatCoins(result.balance, config.currencyName), inline: true },
                { name: "Next crime", value: formatRelativeTimestamp(result.nextCrimeAt), inline: true }
            )
            .setFooter({ text: `Guild: ${interaction.guild?.name || "Unknown"}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } else {
        // Crime failed
        const failMessage = getRandomFailMessage();

        const embed = new EmbedBuilder()
            .setColor("#e74c3c")
            .setTitle("🚨 Crime Failed!")
            .setDescription(`You ${failMessage} and lost **${formatCoins(result.penalty, config.currencyName)}**!`)
            .addFields(
                { name: "New balance", value: formatCoins(result.balance, config.currencyName), inline: true },
                { name: "Next crime", value: formatRelativeTimestamp(result.nextCrimeAt), inline: true }
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
