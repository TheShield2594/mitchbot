const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
  console.log('I am ready!');
});

client.on('message', message => {
  // If the message starts with "/giveaway"
  if (message.content.startsWith('/giveaway')) {
    // Get the arguments from the message
    const args = message.content.split(' ');

    // Check if the user has provided all the required arguments
    if (args.length < 4) {
      return message.channel.send('Please provide all the required arguments: /giveaway <prize> <winners> <duration>');
    }

    // Get the prize, winners, and duration from the arguments
    const prize = args[1];
    const winners = args[2];
    const duration = args[3];

    // Create a new giveaway object
    const giveaway = new Discord.Giveaway(client, {
      prize: prize,
      winners: winners,
      duration: duration,
    });

    // Start the giveaway
    giveaway.start();

    // Send a message to the channel announcing the giveaway
    message.channel.send(`Giveaway started for ${prize}! Ends in ${duration}. React with 🎉 to enter.`);
  }
});

client.login('CLIENT_TOKEN');