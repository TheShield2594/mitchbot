const axios = require('axios');
const { SlashCommandBuilder } = require('discord.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('cat gif')
		.setDescription('Sends a random cat gif'),
	async execute(interaction) {
        const res = await axios.get('https://cataas.com/cat/gif');
        if (res.data.memes[0].url){
            interaction.reply(res.data.memes[0].url);
        }
        else{
            interaction.reply("No gif found :(");
        }
	},
};