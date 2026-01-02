const { request } = require('undici');
const { SlashCommandBuilder } = require('discord.js');
const { checkCooldown, setCooldown } = require('../../utils/cooldowns');
const logger = require('../../utils/logger');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('meme')
		.setDescription('Sends a random meme'),
	async execute(interaction) {
        const cooldown = checkCooldown(interaction.user.id, "meme", 5000);
        if (cooldown.onCooldown) {
            await interaction.reply({
                content: `Wait ${cooldown.remainingTime}s.`,
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply();
        try {
            const res = await request('https://meme-api.com/gimme/1', {
                signal: AbortSignal.timeout(5000)
            });
            const data = await res.body.json();
            if (data.memes && data.memes[0] && data.memes[0].url){
                await interaction.editReply(data.memes[0].url);
                setCooldown(interaction.user.id, "meme", 5000);
            } else {
                await interaction.editReply("No meme found.");
            }
        } catch (error) {
            logger.error('Error fetching meme', {
                guildId: interaction.guildId,
                channelId: interaction.channelId,
                userId: interaction.user.id,
                commandName: interaction.commandName,
                error,
            });
            await interaction.editReply("Failed to fetch meme.");
        }
	},
};
