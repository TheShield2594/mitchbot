const axios = require('axios');
const { SlashCommandBuilder } = require('discord.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('meme')
		.setDescription('Sends a random meme'),
	async execute(interaction) {
        await interaction.deferReply();
        try {
            const res = await axios.get('https://meme-api.com/gimme/1', {
                timeout: 5000
            });
            if (res.data.memes && res.data.memes[0] && res.data.memes[0].url){
                await interaction.editReply(res.data.memes[0].url);
            } else {
                await interaction.editReply("No meme found.");
            }
        } catch (error) {
            console.error('Error fetching meme:', error);
            await interaction.editReply("Failed to fetch meme.");
        }
	},
};
