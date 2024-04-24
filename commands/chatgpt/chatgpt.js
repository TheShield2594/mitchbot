const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('mitch')
		.setDescription('Chat with Mitch')
        .addStringOption(option => 
            option.setName('message')
            .setDescription('The message to send to Mitch')
            .setRequired(true)),
	async execute(interaction) {
        //Temporary response
        await interaction.reply('Mitch is thinking...');

        const message = interaction.option.getString('message');

        const response = await fetch('http://localhost8080/chat', {
            method: 'POST',
            body: JSON.stringify({
                model:"gpt-3.5-turbo",
                messages: [{"role": "user", "constant": message}],
                temp: 0.6
            }),
            headers:{
                'Content-Type': 'application/json'
            }
        });

        const responseData = await response.json();
        const messageContent = responseData.content;

        //Edit message with final message
        await interaction.editReply(messageContent);


    },
};