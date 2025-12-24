const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch'); // Import fetch for making HTTP requests

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mitch')
        .setDescription('Chat with Mitch')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send to Mitch')
                .setRequired(true)),
    async execute(interaction) {
        // Temporary response
        await interaction.deferReply();

        // Get the message from user input
        const message = interaction.options.getString('message'); // Corrected from option to options

        // Send the message to ChatGPT API for processing
        const response = await fetch('https://chatgpt.com/g/g-pAZVhYw7V-mitch-roaster', {
            method: 'POST',
            body: JSON.stringify({
                // model: "gpt-3.5-turbo",
                messages: [{ "role": "user", "content": message }], // Corrected constant to content
                temperature: 0.6
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Parse the response from ChatGPT API
        const responseData = await response.json();
        console.log(responseData);
        const messageContent = responseData.choices[0].text.trim(); // Get the response text
        console.log(messageContent);

        // Edit the initial response with the final response from ChatGPT
        await interaction.editReply(messageContent);
    },
};
