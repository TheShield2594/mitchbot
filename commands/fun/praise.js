const { request } = require(`undici`);
const { SlashCommandBuilder, PermissionsBitField } = require(`discord.js`);

// Extract the generate_random_compliment function to a separate file or outside the execute function
async function generate_random_compliment() {
    const adjectives = [
        "massive", "huge", "outstanding", "large", "incredible", "exceptional", "enormous", "wonderful", "phenomenal", "extraordinary", "mammoth", "impressive", "marvelous", "magnificent", "outstanding", "excellence", "superb", "splendid", "admirable", "spectacular", "fabulous", "brilliant", "genius", "stellar", "first-rate", "dazzling", "breathtaking", "awe-inspiring", "exemplary", "peerless", "unparalleled", "top-notch", "grand", "majestic", "supreme", "noble", "distinguished", "virtuoso", "masterful", "unrivaled", "sensational", "world-class", "unbeatable", "exceptionally talented", "striking", "gigantic", "resplendent", "splendiferous", "eminent", "radiant", "huge"
    ];
    const nouns = [
        "dong", "penis", "dangle", "schlong", "stiffy", "peanits", "shaft", "wang", "member", "pecker", "weenie", "winkie", "willy", "joystick", "peter", "johnson", "wood", "manhood", "phallus", "banana", "choad", "bald-headed hermit", "anaconda", "dingus", "donger", "hog", "donger", "fire hose", "sausage", "meat", "meat rod", "one eyed trouser snake", "peen", "wiener", "unit", "meat tube", "tallywhacker", "pee pee", "pickle", "thingy", "third leg", "wick", "thingy", "package", "python", "shmekl", "skin flute", "meat steak", "ween", ""
    ];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const noun2 = nouns[Math.floor(Math.random() * nouns.length)];
    const sentence_options = [
        `Your ${noun} is ${adjective}.`
        
    ];
    const compliment = sentence_options[Math.floor(Math.random() * sentence_options.length)];
    return compliment;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName(`praise`)
        .setDescription(`Hey you're pretty cool.`)
        .addUserOption((option) =>
            option.setName(`user`).setDescription(`Let's be nice to people`)),
    async execute(interaction) {
        if (!interaction.inGuild()) {
            await interaction.reply({
                content: "This command can only be used in a server.",
                ephemeral: true
            });
            return;
        }

        try {
            await interaction.deferReply();
            const compliment = await generate_random_compliment();
            const mentionedUser = interaction.options.getUser("user") ?? interaction.user;
            await interaction.editReply(`${mentionedUser} ${compliment}`);
        } catch (error) {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "Failed to process your command, please try again.", ephemeral: true });
            }
        }
        
    }
};