const axios = require('axios');
const { SlashCommandBuilder } = require('discord.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('cat')
		.setDescription('Sends a random cat'),
	async execute(interaction) {
        const res = await axios.get('https://cataas.com/cat?position=center');
        if (res.data.memes[0].url){
            interaction.reply(res.data.cat[0].url);
        }
        else{
            interaction.reply("No cat found :(");
        }
	},
};