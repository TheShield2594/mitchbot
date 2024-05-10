const { request } = require(`undici`);
const { SlashCommandBuilder } = require(`discord.js`);

// Extract the generate_random_compliment function to a separate file or outside the execute function
// async function generate_random_compliment() {
//     const adjectives = [
//         "amazing", "awesome", "outstanding", "fantastic", "incredible", "exceptional", "remarkable", "wonderful", "phenomenal", "extraordinary", "terrific", "impressive", "marvelous", "magnificent", "outstanding", "excellence", "superb", "splendid", "admirable", "spectacular", "fabulous", "brilliant", "genius", "stellar", "first-rate", "dazzling", "breathtaking", "awe-inspiring", "exemplary", "peerless", "unparalleled", "top-notch", "grand", "majestic", "supreme", "noble", "distinguished", "virtuoso", "masterful", "unrivaled", "sensational", "world-class", "unbeatable", "exceptionally talented", "striking", "classy", "resplendent", "splendiferous", "eminent", "radiant"
//     ];
//     const nouns = [
//         "achievements", "accomplishments", "excellence", "success", "triumph", "victory", "mastery", "brilliance", "talent", "expertise", "skill", "creativity", "innovation", "leadership", "influence", "charisma", "kindness", "generosity", "compassion", "wisdom", "intelligence", "insight", "empathy", "patience", "dedication", "commitment", "diligence", "resilience", "positivity", "optimism", "endurance", "fortitude", "integrity", "honesty", "sincerity", "trustworthiness", "loyalty", "support", "encouragement", "inspiration", "motivation", "enthusiasm", "spirit", "courage", "determination", "perseverance", "tenacity", "happiness", "joy"
//     ];
//     const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
//     const noun = nouns[Math.floor(Math.random() * nouns.length)];
//     const noun2 = nouns[Math.floor(Math.random() * nouns.length)];
//     const sentence_options = [
//         `Your ${noun} is a shining example of ${adjective} ${noun}.`,
//         `Your ${noun} embodies ${adjective} ${noun2} at its finest.`,
//         `Your ${noun} reflects your ${adjective} ${noun2} brilliantly.`,
//         `Your ${noun} reflects your ${adjective} ${noun2} remarkably.`,
//         `Your ${noun} showcases your ${adjective} ${noun2} beautifully.`,
//         `Your ${noun} is a testament to your ${adjective} ${noun2}.`,
//         `Your ${noun} displays your ${adjective} ${noun2} with pride.`,
//         `You possess an ${adjective} ${noun2} that inspires others.`,
//         `Your ${noun} is a true example of ${adjective} ${noun2}.`,
//         `You've achieved ${adjective} ${noun2} through dedication.`,
//         `Your ${noun} is a source of ${adjective} ${noun2}.`,
//         `Your ${noun} is a true example of ${adjective} ${noun2}.`,
//         `You've achieved ${adjective} ${noun2} through dedication.`,
//         `Your ${noun} radiates ${adjective} ${noun2} to those around you.`,
//         `You inspire with your ${adjective} ${noun} ${noun2}.`,
//         `Your ${noun} is filled with ${adjective} ${noun2}.`,
//         `Your ${noun} is a symbol of ${adjective} ${noun2}.`,
//         `Your ${noun} is a reminder of your ${adjective} ${noun2}.`
//     ];
//     const compliment = sentence_options[Math.floor(Math.random() * sentence_options.length)];
//     return compliment;
// }

module.exports = {
    data: new SlashCommandBuilder()
        .setName(`praise`)
        .setDescription(`Hey you're pretty cool.`)
        .addUserOption((option) =>
            option.setName(`user`).setDescription(`Let's be nice to people`)),
    async execute(interaction) {
        console.log('hit 1');
        if (!interaction.inGuild()) {
            await interaction.reply({
                content: "This command can only be used in a server.",
                ephemeral: true
            });
            return;
        }

        console.log('hit 2');
        if (!interaction.memberPermissions.has("MANAGE_MESSAGES")) {
            await interaction.reply({
                content: "You don't have permission to use this command.",
                ephemeral: true
            });
            return;
        }
        console.log('hit 3');

        try {
            console.log('hit 4');
            await interaction.deferReply();
            const mentionedUser = interaction.options.getUser("user") ?? interaction.user;
            const compliment = generate_random_compliment();
            const message = await interaction.editReply(`${mentionedUser} ${compliment}`);
            message.react("🙏");
        } catch (error) {
            console.log('hit 5');
            console.error(`Error executing command:`, error);
            await interaction.reply({
                content: "An error occurred while executing the command.",
                ephemeral: true
            });
        }
    }
};