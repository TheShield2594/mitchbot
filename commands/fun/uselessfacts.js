const axios = require('axios');
const { SlashCommandBuilder } = require('discord.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('fact')
		.setDescription('Sends todays random fact'),
	async execute(interaction) {
        const res = await axios.get('uselessfacts.com/api/v2/facts/today/random?language=en');
        if (res.data.fact[0].url){
            interaction.reply(res.data.fact[0].url);
        }
        else{
            interaction.reply("No fact found :(");
        }
	},
};